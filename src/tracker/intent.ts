/*
  Reading intent out of raw fingertip motion.

  The tracker knows *where* the fingertip is. That alone is not enough to decide
  whether a student means to select something: a hand sweeping across the screen
  passes over every button on the way, and a hand that simply relaxes mid-motion
  looks identical to one that stopped on purpose. Both of those were firing
  commits, which is what made the interface feel like it clicked things by
  itself.

  So this module derives three things from the position stream:

    - velocity       how fast the fingertip is actually moving, in px/s
    - settle         0..1, how confidently the hand has come to rest
    - prediction     where the fingertip is heading if it keeps decelerating

  `settle` is what gates dwell: a hold only starts counting once the hand has
  genuinely stopped, so passing over a target costs nothing. `prediction` is
  what lets a target arm slightly *before* the finger arrives, which is what
  makes aiming feel like it anticipates you instead of lagging behind.

  There is no learned model here on purpose. Reaching motions have a
  well-understood shape - roughly bell-shaped velocity, decaying exponentially
  as the hand closes on its target - and extrapolating that decay is both
  cheaper and far easier to debug than a classifier, with no training data and
  no inference latency in the 60fps path.
*/

/** Velocity below this (px/s) counts as "stopped" for dwell purposes. */
const SETTLE_SPEED = 90;
/** Above this the hand is clearly travelling, and settle is pinned at 0. */
const MOVING_SPEED = 420;
/** Exponential smoothing applied to the velocity estimate itself. */
const VELOCITY_SMOOTHING = 0.35;
/**
 * Prediction is clamped to this many px ahead. Unbounded extrapolation of a
 * decaying exponential is wildly unstable near the start of a fast movement,
 * and a prediction further away than this is not useful for arming a target
 * anyway - nothing on screen is that far from where the hand already is.
 */
const MAX_PREDICTION_PX = 260;
/** Used when the hand is speeding up, where decay-to-rest has no solution. */
const FALLBACK_LOOKAHEAD_S = 0.12;

export interface Kinematics {
  /** Smoothed velocity, px/s. */
  vx: number;
  vy: number;
  /** Magnitude of the above. */
  speed: number;
  /**
   * 1 when the hand is at rest, 0 while it is clearly travelling, ramping
   * between SETTLE_SPEED and MOVING_SPEED. Dwell multiplies its accrual by
   * this, so a drifting hand charges a target slowly or not at all.
   */
  settle: number;
  /**
   * Where the fingertip is expected to come to rest. Equal to the current
   * position once the hand has stopped, so callers can use it unconditionally.
   */
  predictedX: number;
  predictedY: number;
}

const AT_REST: Kinematics = {
  vx: 0,
  vy: 0,
  speed: 0,
  settle: 1,
  predictedX: 0,
  predictedY: 0,
};

/**
 * Tracks one position stream and reports its kinematics. Stateful: feed it
 * every sample in order, and reset it whenever the signal is interrupted (the
 * hand leaving frame, or a switch between input sources) so a stale velocity
 * from before the gap cannot leak into the first sample after it.
 */
export function makeIntentEstimator() {
  let lastX: number | null = null;
  let lastY: number | null = null;
  let lastT = 0;
  let vx = 0;
  let vy = 0;
  let lastSpeed = 0;

  return {
    /** @param t seconds, monotonic. */
    update(x: number, y: number, t: number): Kinematics {
      if (lastX === null || lastY === null) {
        lastX = x;
        lastY = y;
        lastT = t;
        return { ...AT_REST, predictedX: x, predictedY: y };
      }

      const dt = t - lastT;
      // Two samples in the same frame carry no new velocity information, and
      // dividing by ~0 would produce an enormous spurious spike.
      if (dt < 1e-4) {
        return this.current(x, y);
      }

      const rawVx = (x - lastX) / dt;
      const rawVy = (y - lastY) / dt;
      vx += (rawVx - vx) * VELOCITY_SMOOTHING;
      vy += (rawVy - vy) * VELOCITY_SMOOTHING;

      const speed = Math.hypot(vx, vy);

      // Decay rate of the velocity profile, estimated from how much the speed
      // dropped over this interval: s(t) = s0 * e^(-lambda * t). Integrating
      // that to infinity gives a remaining travel of s/lambda, which is the
      // predicted landing distance.
      let lookahead = FALLBACK_LOOKAHEAD_S;
      if (lastSpeed > 1 && speed > 1 && speed < lastSpeed) {
        const lambda = -Math.log(speed / lastSpeed) / dt;
        if (lambda > 1e-3) lookahead = 1 / lambda;
      }
      lastSpeed = speed;

      const travel = speed * lookahead;
      const scale = travel > MAX_PREDICTION_PX ? MAX_PREDICTION_PX / travel : 1;

      lastX = x;
      lastY = y;
      lastT = t;

      return {
        vx,
        vy,
        speed,
        settle: settleFromSpeed(speed),
        predictedX: x + vx * lookahead * scale,
        predictedY: y + vy * lookahead * scale,
      };
    },

    /** The last computed kinematics, re-anchored to a position. */
    current(x: number, y: number): Kinematics {
      const speed = Math.hypot(vx, vy);
      return {
        vx,
        vy,
        speed,
        settle: settleFromSpeed(speed),
        predictedX: x,
        predictedY: y,
      };
    },

    reset() {
      lastX = null;
      lastY = null;
      lastT = 0;
      vx = 0;
      vy = 0;
      lastSpeed = 0;
    },
  };
}

/** 1 at or below SETTLE_SPEED, 0 at or above MOVING_SPEED, linear between. */
function settleFromSpeed(speed: number): number {
  if (speed <= SETTLE_SPEED) return 1;
  if (speed >= MOVING_SPEED) return 0;
  return 1 - (speed - SETTLE_SPEED) / (MOVING_SPEED - SETTLE_SPEED);
}

/**
 * A directional stroke, used for slicing. Accumulates points and reports
 * whether the motion so far reads as one clean sweep rather than a wander,
 * which is what distinguishes "cut here" from "move the hand around".
 */
export interface StrokeSample {
  x: number;
  y: number;
  t: number;
}

export interface StrokeShape {
  /** Straight-line distance from first to last point. */
  span: number;
  /** Total path length walked. */
  length: number;
  /**
   * span / length. 1.0 is a perfectly straight stroke; a wandering or
   * doubling-back path tends below ~0.8. Guards against a slow meander being
   * read as a deliberate slice.
   */
  straightness: number;
  /** Unit direction from first to last point. */
  dx: number;
  dy: number;
}

export function strokeShape(points: StrokeSample[]): StrokeShape | null {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const spanX = last.x - first.x;
  const spanY = last.y - first.y;
  const span = Math.hypot(spanX, spanY);
  if (span < 1e-6) return null;

  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  return {
    span,
    length,
    straightness: length > 1e-6 ? span / length : 1,
    dx: spanX / span,
    dy: spanY / span,
  };
}
