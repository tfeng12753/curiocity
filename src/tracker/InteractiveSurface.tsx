import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { tracker } from './trackerStore';
import { arbiter, MOUNT_GRACE_MS } from './arbiter';
import { useTrackerState } from './useTracker';

export interface SurfacePoint {
  /** Position inside the surface, expressed in the surface's own view units. */
  x: number;
  y: number;
}

interface InteractiveSurfaceProps {
  children: ReactNode;
  /** Coordinate space handed to callbacks (defaults to a 100x100 box). */
  viewW?: number;
  viewH?: number;
  enabled?: boolean;
  /**
   * Identifies what the finger is currently aiming at. The dwell timer restarts
   * whenever this changes, so quantise it (a region id, a snapped cut position)
   * rather than returning raw coordinates.
   */
  getDwellKey?: (point: SurfacePoint) => string | null;
  onHover?: (point: SurfacePoint | null) => void;
  onCommit?: (point: SurfacePoint) => void;
  dwellMs?: number;
  /** Set false when a child element (e.g. a real button) handles mouse clicks. */
  pointerCommit?: boolean;
  /**
   * Switches this surface from hold-to-commit to draw-a-stroke. Holding is
   * wrong for an action that is inherently a movement, and it is the mechanism
   * that made the lesson feel like it acted on its own.
   */
  sliceMode?: boolean;
  /**
   * Containment test for the thing being sliced, in view units. A slice is
   * committed when the stroke crosses back out of it, so this defines where the
   * "all the way through" boundary is. Required when sliceMode is set.
   */
  isInsideTarget?: (point: SurfacePoint) => boolean;
  /** Fired with the completed stroke once it has cut all the way through. */
  onSlice?: (points: SurfacePoint[]) => void;
  /** The stroke as it is being drawn, or null once it ends. For previewing. */
  onStroke?: (points: SurfacePoint[] | null) => void;
  className?: string;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
}

/**
 * How far the fingertip may wander from where the hold began before the hold is
 * abandoned. This used to be 70px, which is wider than most buttons - a hand
 * drifting slowly across the screen stayed "on target" the whole way and banked
 * a full dwell on everything it passed. Velocity gating does most of the work
 * now, so this only has to catch a genuine change of mind.
 */
const DRIFT_LIMIT_PX = 26;
/**
 * Dwell only accrues while the hand is settled, but demanding perfect stillness
 * from a child holding their arm up is unrealistic - below this settle value
 * nothing accumulates at all, above it accrual scales with how still they are.
 */
const MIN_SETTLE_TO_CHARGE = 0.35;
/** A gesture commit also requires the hand to be at least this settled. */
const MIN_SETTLE_TO_GESTURE = 0.45;

/**
 * One interaction surface that behaves identically whether the student is using
 * a tracked fingertip (hover + hold to commit) or a mouse/trackpad (move +
 * click).
 *
 * In hand mode a surface does not decide for itself that it has been
 * activated. It *claims* candidacy each frame and the arbiter arms exactly one
 * winner; only that winner can charge a dwell or honour a commit gesture. See
 * arbiter.ts for why.
 */
export function InteractiveSurface({
  children,
  viewW = 100,
  viewH = 100,
  enabled = true,
  getDwellKey,
  onHover,
  onCommit,
  dwellMs = 900,
  pointerCommit = true,
  sliceMode = false,
  isInsideTarget,
  onSlice,
  onStroke,
  className,
  style,
  role,
  ariaLabel,
}: InteractiveSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { mode } = useTrackerState();

  const dwellKeyRef = useRef<string | null>(null);
  /** Accumulated hold, in ms, already weighted by how still the hand was. */
  const chargeRef = useRef(0);
  const lastTickRef = useRef(0);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const insideRef = useRef(false);
  const pinchRef = useRef(false);

  const idRef = useRef<number | null>(null);
  if (idRef.current === null) idRef.current = arbiter.register();
  const id = idRef.current;

  const mountedAtRef = useRef(0);
  useEffect(() => {
    mountedAtRef.current = performance.now();
    return () => arbiter.release(id);
  }, [id]);

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const rect = hostRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const inside =
        clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      return {
        inside,
        area: rect.width * rect.height,
        point: {
          x: ((clientX - rect.left) / rect.width) * viewW,
          y: ((clientY - rect.top) / rect.height) * viewH,
        },
      };
    },
    [viewW, viewH],
  );

  const resetDwell = useCallback(() => {
    dwellKeyRef.current = null;
    anchorRef.current = null;
    chargeRef.current = 0;
    lastTickRef.current = 0;
    tracker.setDwell(0);
  }, []);

  // --- slicing -------------------------------------------------------------
  const strokeRef = useRef<SurfacePoint[]>([]);
  const wasInsideRef = useRef(false);

  const endStroke = useCallback(() => {
    strokeRef.current = [];
    wasInsideRef.current = false;
    onStroke?.(null);
  }, [onStroke]);

  /**
   * Feeds one position into the current stroke and reports whether that
   * completed a slice. A slice completes on the transition from inside the
   * target to outside it: the child has drawn all the way through, which is
   * both unambiguous and impossible to do by accident while merely moving
   * toward something else.
   */
  const advanceStroke = useCallback(
    (point: SurfacePoint | null) => {
      if (!isInsideTarget) return;

      if (!point) {
        endStroke();
        return;
      }

      const inside = isInsideTarget(point);
      const stroke = strokeRef.current;

      if (inside) {
        if (!wasInsideRef.current) {
          // Entering: keep the point just before the edge so the very first
          // segment still carries a direction.
          const lead = stroke.length > 0 ? [stroke[stroke.length - 1]] : [];
          strokeRef.current = [...lead, point];
          wasInsideRef.current = true;
        } else {
          stroke.push(point);
          // Long strokes are capped - a slice is decided by its overall
          // direction, and an unbounded buffer would let a child wander around
          // inside the shape for a while and still have it read as one sweep.
          if (stroke.length > 64) stroke.shift();
        }
        onStroke?.(strokeRef.current);
        return;
      }

      if (wasInsideRef.current) {
        // Leaving: this is the moment the cut goes all the way through.
        const completed = [...strokeRef.current, point];
        endStroke();
        if (completed.length >= 2) onSlice?.(completed);
        return;
      }

      // Outside and was outside - remember the position only as a possible
      // run-up into the shape.
      strokeRef.current = [point];
    },
    [isInsideTarget, onSlice, onStroke, endStroke],
  );

  // --- hand mode -----------------------------------------------------------
  useEffect(() => {
    if (!enabled || mode !== 'hand') return;

    const unsubscribe = tracker.subscribeCursor((sample) => {
      if (sample.source !== 'hand') return;

      if (!sample.visible) {
        if (insideRef.current) {
          insideRef.current = false;
          onHover?.(null);
        }
        resetDwell();
        if (sliceMode) advanceStroke(null);
        return;
      }

      const live = toLocal(sample.x, sample.y);
      if (!live) return;

      // Claim on either the live position or the predicted landing point, so a
      // target can arm just before the finger actually arrives. `direct` tells
      // the arbiter which of the two it was - a surface the finger is really
      // inside always outranks one that is only predicted.
      const predicted = toLocal(sample.motion.predictedX, sample.motion.predictedY);
      const candidate = live.inside || Boolean(predicted?.inside);
      if (candidate) arbiter.claim(id, live.area, live.inside);

      if (!live.inside) {
        if (insideRef.current) {
          insideRef.current = false;
          onHover?.(null);
          resetDwell();
        }
        // A fast swipe can jump from inside the shape to outside the whole
        // surface between two frames. The point is still meaningful in view
        // units, so it is fed through to close the stroke rather than dropped,
        // which would strand a slice that really did cut all the way through.
        if (sliceMode) advanceStroke(live.point);
        return;
      }

      insideRef.current = true;
      onHover?.(live.point);

      // Everything past this point is activation, and only the armed surface
      // may do it. A surface that is merely under the cursor still reports
      // hover (so it can show an affordance) but cannot charge or commit.
      if (!arbiter.isArmed(id)) {
        if (chargeRef.current !== 0) resetDwell();
        if (sliceMode) advanceStroke(null);
        return;
      }

      const now = performance.now();
      if (now - mountedAtRef.current < MOUNT_GRACE_MS) {
        resetDwell();
        return;
      }

      // Slicing has no hold and no gesture: the stroke itself is the whole
      // interaction, so none of the dwell machinery below applies.
      if (sliceMode) {
        advanceStroke(live.point);
        return;
      }

      const key = getDwellKey ? getDwellKey(live.point) : 'surface';
      if (key === null) {
        resetDwell();
        return;
      }

      const anchor = anchorRef.current;
      const drifted = anchor
        ? Math.hypot(sample.x - anchor.x, sample.y - anchor.y) > DRIFT_LIMIT_PX
        : true;

      if (key !== dwellKeyRef.current || drifted) {
        dwellKeyRef.current = key;
        chargeRef.current = 0;
        lastTickRef.current = now;
        anchorRef.current = { x: sample.x, y: sample.y };
        tracker.setDwell(0);
        return;
      }

      // Charge the hold in proportion to how still the hand is. Sweeping past a
      // target contributes essentially nothing; stopping on it fills at ~full
      // rate. This is the core of the fix for "buttons click themselves".
      const dt = Math.min(now - lastTickRef.current, 120);
      lastTickRef.current = now;
      const settle = sample.motion.settle;
      if (settle >= MIN_SETTLE_TO_CHARGE) {
        chargeRef.current += dt * settle;
      } else {
        // Actively moving again - bleed the hold back down rather than freezing
        // it, so a hand that passes over, leaves and returns starts fresh.
        chargeRef.current = Math.max(0, chargeRef.current - dt);
      }

      const pinchStarted = sample.pinching && !pinchRef.current;
      pinchRef.current = sample.pinching;

      // A deliberate gesture still needs the hand to be roughly stationary:
      // opening your hand mid-sweep is almost always incidental, not a choice.
      const steadyEnough = settle >= MIN_SETTLE_TO_GESTURE;
      const gestured = steadyEnough && (pinchStarted || sample.activate);
      const held = chargeRef.current >= dwellMs;

      if (!gestured && !held) {
        tracker.setDwell(chargeRef.current / dwellMs);
        return;
      }

      if (!arbiter.canCommit(now)) return;

      arbiter.noteCommit(now);
      chargeRef.current = 0;
      lastTickRef.current = now;
      tracker.setDwell(0);
      onCommit?.(live.point);
    });

    return () => {
      unsubscribe();
      resetDwell();
    };
  }, [
    enabled,
    mode,
    id,
    toLocal,
    getDwellKey,
    onHover,
    onCommit,
    dwellMs,
    resetDwell,
    sliceMode,
    advanceStroke,
  ]);

  useEffect(() => () => tracker.setDwell(0), []);

  // --- pointer mode --------------------------------------------------------
  // Slicing with a mouse is a drag, not a hover: the button has to be held, or
  // simply moving the cursor across the shape would cut it. The completion rule
  // is the same one the finger uses - the stroke has to leave the shape - so
  // both inputs teach the same "cut all the way through" motion.
  const draggingRef = useRef(false);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const mapped = toLocal(event.clientX, event.clientY);
    if (!mapped) return;
    onHover?.(mapped.point);
    if (sliceMode && draggingRef.current) advanceStroke(mapped.point);
  };

  const handlePointerLeave = () => {
    if (!enabled) return;
    onHover?.(null);
    if (sliceMode && draggingRef.current) {
      draggingRef.current = false;
      endStroke();
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const mapped = toLocal(event.clientX, event.clientY);
    if (!mapped || !mapped.inside) return;

    if (sliceMode) {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      advanceStroke(mapped.point);
      return;
    }

    if (!pointerCommit) return;
    if (getDwellKey && getDwellKey(mapped.point) === null) return;
    onCommit?.(mapped.point);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !sliceMode || !draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    // Releasing inside the shape means the slice never went through, so the
    // stroke is discarded rather than half-committed.
    endStroke();
  };

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ touchAction: 'none', ...style }}
      role={role}
      aria-label={ariaLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  );
}
