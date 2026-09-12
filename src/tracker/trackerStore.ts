import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { makeOneEuroFilter } from './oneEuro';
import { makeIntentEstimator, type Kinematics } from './intent';
import { arbiter } from './arbiter';

/*
  The single source of truth for "where is the student pointing right now".

  Two input modes feed the exact same cursor stream:
    - hand    : MediaPipe HandLandmarker, index fingertip (landmark 8), mirrored
                to match the mirrored camera preview and smoothed with One Euro.
    - pointer : mouse / trackpad / touch, used as a fully functional fallback.

  Cursor samples are published through a plain subscription list rather than React
  state: they arrive at 60fps and would otherwise re-render the whole lesson tree.
*/

export type TrackerMode = 'pointer' | 'hand';
export type TrackerStatus = 'idle' | 'starting' | 'ready' | 'error';

export interface CursorSample {
  x: number;
  y: number;
  visible: boolean;
  source: TrackerMode;
  /** Index finger and thumb held together - an optional "tap" gesture. */
  pinching: boolean;
  /**
   * True for one sample right when the commit gesture just fired - the
   * primary way to select things in hand mode. Always false in pointer
   * mode, where a click already does the same job. Named after the effect
   * ("activate this"), not the specific gesture, so callers don't need to
   * know that it currently means "the hand just opened" (see
   * detectPalmOpen below) rather than, say, a poke.
   *
   * Note this is a *global* signal: it says the gesture happened, not what it
   * applies to. Only the single arbiter-armed surface may act on it, which is
   * what stops one palm-open from firing every target under the cursor.
   */
  activate: boolean;
  /**
   * Monotonically increasing frame counter. The arbiter uses it to group all
   * of a frame's claims together before picking a winner.
   */
  seq: number;
  /** Velocity, settle confidence and predicted landing point - see intent.ts. */
  motion: Kinematics;
}

export interface TrackerState {
  mode: TrackerMode;
  status: TrackerStatus;
  handVisible: boolean;
  error: string | null;
  /** True once the student has seen (and answered) the camera onboarding. */
  onboarded: boolean;
  /*
    Why "the camera is on but nothing happens" used to be unanswerable.

    Between a live MediaStream and a moving cursor sit four things that can
    each fail silently: the video never decodes a frame, the model never
    downloads, inference throws on every frame, or inference runs fine and
    simply never sees a hand. All four look identical from the outside - a lit
    camera light and a cursor that does not move - so Settings reports them
    separately rather than making anyone guess.
  */
  diagnostics: TrackerDiagnostics;
}

export interface TrackerDiagnostics {
  /** The hand model is downloaded and inference is constructed. */
  modelReady: boolean;
  /** Video frames the loop has actually seen advance. Stuck at 0 = decode problem. */
  framesSeen: number;
  /** Frames inference ran on. Far below framesSeen = inference is throwing. */
  framesProcessed: number;
  /** Frames a hand was found in. 0 with the rest healthy = it just cannot see you. */
  handFrames: number;
  /** First inference error, which the loop used to swallow entirely. */
  detectError: string | null;
  /** Where the model was loaded from, since a blocked CDN is a common cause. */
  modelSource: string | null;
}

/*
  Which camera to open. `facingMode: 'user'` picks one for you, and on a
  machine with several - an external webcam, OBS's virtual camera, a Mac
  handing over to an iPhone via Continuity - it regularly picks the wrong one
  and the student sees a black rectangle or somebody else's desk. Settings lets
  them choose, and the choice is remembered, because a camera fix that has to
  be repeated on every visit is not a fix.
*/
const CAMERA_KEY = 'curio.camera.deviceId';

function readPreferredCamera(): string | null {
  try {
    return localStorage.getItem(CAMERA_KEY);
  } catch {
    return null;
  }
}

function writePreferredCamera(deviceId: string | null) {
  try {
    if (deviceId) localStorage.setItem(CAMERA_KEY, deviceId);
    else localStorage.removeItem(CAMERA_KEY);
  } catch {
    /* private browsing - the choice still holds for this visit */
  }
}

const WASM_LOCAL = '/mediapipe/wasm';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
/*
  The hand model is a 7.8MB download, and it was fetched from Google's CDN on
  every first camera start. That is the single most likely reason for "the
  camera light is on but nothing happens": on a slow connection it can outlast
  the start timeout, and on a school or office network storage.googleapis.com
  is often blocked outright - in both cases the camera is already live by the
  time the model gives up.

  scripts/sync-mediapipe-wasm.mjs now vendors it into public/ alongside the
  wasm, so the normal path is same-origin and browser-cached. The remote copy
  stays as a fallback for a build where that download did not happen.
*/
const MODEL_LOCAL = '/mediapipe/models/hand_landmarker.task';
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/** Resolves to the local model if this build actually shipped one. */
async function resolveModelUrl(): Promise<string> {
  try {
    const response = await fetch(MODEL_LOCAL, { method: 'HEAD' });
    // A SPA rewrite answers any path with index.html, so a 200 is not enough -
    // check it is really a model and not the app's own HTML.
    const type = response.headers.get('content-type') ?? '';
    if (response.ok && !type.includes('text/html')) return MODEL_LOCAL;
  } catch {
    /* fall through to the CDN */
  }
  return MODEL_CDN;
}

/** The onboarding gate ("Ready to interact?") is a once-ever thing, not a
 *  per-lesson one - remembered across reloads so a returning student who
 *  already learned the gesture is never asked again. */
const ONBOARDED_KEY = 'learnverse.onboarded.v1';

/** Increments per start, so a superseded attempt can recognise itself. */
let startAttempt = 0;

function loadOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    /* private browsing / storage disabled - onboarding just re-asks next time */
  }
}

const cursorListeners = new Set<(sample: CursorSample) => void>();
const stateListeners = new Set<(state: TrackerState) => void>();
const dwellListeners = new Set<(progress: number) => void>();

const AT_REST_MOTION: Kinematics = {
  vx: 0,
  vy: 0,
  speed: 0,
  settle: 1,
  predictedX: 0,
  predictedY: 0,
};

let cursor: CursorSample = {
  x: 0,
  y: 0,
  visible: false,
  source: 'pointer',
  pinching: false,
  activate: false,
  seq: 0,
  motion: AT_REST_MOTION,
};
let cursorSeq = 0;
let state: TrackerState = {
  mode: 'pointer',
  status: 'idle',
  handVisible: false,
  error: null,
  diagnostics: {
    modelReady: false,
    framesSeen: 0,
    framesProcessed: 0,
    handFrames: 0,
    detectError: null,
    modelSource: null,
  },
  onboarded: loadOnboarded(),
};
let dwell = 0;

let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let landmarker: HandLandmarker | null = null;
let rafId = 0;
let lastVideoTime = -1;
let handMissingFrames = 0;

const filterX = makeOneEuroFilter();
const filterY = makeOneEuroFilter();

// Intent is estimated from the *smoothed* position, not the raw landmark, so
// sensor jitter cannot masquerade as velocity and keep `settle` pinned at 0
// while the hand is actually holding still.
const handIntent = makeIntentEstimator();
const pointerIntent = makeIntentEstimator();

// --- "open palm" commit gesture -----------------------------------------
// A forward poke (jabbing the fingertip toward the camera) turned out to be
// hard to do reliably - it relies on MediaPipe's z estimate, which is noisy
// and needs calibrating against how far the student happens to be sitting
// from the camera. Opening the hand is a much more legible gesture (like
// releasing something, or a "stop" - easy to demonstrate, easy to repeat)
// and it's detected purely from 2D landmark ratios, which scale with hand
// size automatically, so there's nothing to calibrate per-student.
//
// A finger counts as "extended" when its fingertip is further from the
// wrist than its own middle knuckle - true while pointing (index only) or
// in a loose fist (none), and false-to-true for the other three fingers is
// exactly what changes when the hand opens. The thumb is left out: its
// extension direction depends on hand rotation in a way the other fingers'
// doesn't, and 3-of-4 is already a solid "the hand just opened" signal.
// The original thresholds were far too loose, and were the single biggest cause
// of the interface selecting things nobody asked it to:
//
//   - "open" needed only 3 of 4 fingers extended, and "closed" was merely
//     *not* open. A hand relaxing mid-movement swings between 1 and 4 extended
//     fingers all by itself, so ordinary motion manufactured a rising edge -
//     and therefore a commit - every few hundred milliseconds.
//   - a single ratio decided extension in both directions, so a finger hovering
//     near the threshold chattered between states frame to frame.
//
// Both are now hysteretic, and an open only counts when it follows a hand that
// was *held* unambiguously closed. Pointing at something (index only) then
// deliberately spreading all four fingers still passes easily; a hand that
// merely goes slack on the way somewhere does not.
const OPEN_LOOKBACK_MS = 600;
/** A closed state must persist this long before an open can commit. */
const CLOSED_HOLD_MS = 180;
const OPEN_COMMIT_COOLDOWN_MS = 560;
/** All four non-thumb fingers must be extended to read as "open". */
const OPEN_FINGER_COUNT = 4;
/** At most this many extended to read as "closed" - i.e. a fist or a point. */
const CLOSED_FINGER_COUNT = 1;
/** Hysteresis band: becoming extended is a higher bar than staying extended. */
const EXTEND_ENTER_RATIO = 1.28;
const EXTEND_EXIT_RATIO = 1.12;

let opennessHistory: { open: boolean; closed: boolean; t: number }[] = [];
let lastActivateAt = -Infinity;
const extendedState = [false, false, false, false];

function resetActivateDetector() {
  opennessHistory = [];
  lastActivateAt = -Infinity;
  extendedState.fill(false);
  pinching = false;
}

/**
 * Whether finger `slot` reads as extended, with hysteresis around the previous
 * answer so a borderline finger settles on one state instead of oscillating.
 */
function isFingerExtended(
  slot: number,
  tip: { x: number; y: number },
  midJoint: { x: number; y: number },
  wrist: { x: number; y: number },
): boolean {
  const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
  const jointDist = Math.hypot(midJoint.x - wrist.x, midJoint.y - wrist.y);
  const ratio = jointDist > 1e-6 ? tipDist / jointDist : 0;
  const threshold = extendedState[slot] ? EXTEND_EXIT_RATIO : EXTEND_ENTER_RATIO;
  extendedState[slot] = ratio > threshold;
  return extendedState[slot];
}

/** How many of the four non-thumb fingers are currently extended (0-4). */
function countExtendedFingers(landmarks: { x: number; y: number }[]): number {
  const wrist = landmarks[0];
  const pairs: [number, number][] = [
    [8, 6], // index tip, index pip
    [12, 10], // middle
    [16, 14], // ring
    [20, 18], // pinky
  ];
  return pairs.reduce(
    (count, [tip, joint], slot) =>
      count + (isFingerExtended(slot, landmarks[tip], landmarks[joint], wrist) ? 1 : 0),
    0,
  );
}

/**
 * Rising edge: the hand was *held* unambiguously closed, and is now fully open.
 * The held requirement is what separates a deliberate "release" gesture from a
 * hand that happened to pass through a half-closed pose on its way somewhere.
 */
function detectPalmOpen(extendedCount: number, nowMs: number): boolean {
  const isOpen = extendedCount >= OPEN_FINGER_COUNT;
  const isClosed = extendedCount <= CLOSED_FINGER_COUNT;
  opennessHistory.push({ open: isOpen, closed: isClosed, t: nowMs });
  while (opennessHistory.length > 1 && nowMs - opennessHistory[0].t > OPEN_LOOKBACK_MS) {
    opennessHistory.shift();
  }
  if (nowMs - lastActivateAt < OPEN_COMMIT_COOLDOWN_MS) return false;
  if (!isOpen) return false;

  // Find the most recent contiguous run of closed samples and check it lasted
  // long enough to have been intentional.
  let runEnd: number | null = null;
  let runStart: number | null = null;
  for (let i = opennessHistory.length - 1; i >= 0; i -= 1) {
    const sample = opennessHistory[i];
    if (sample.closed) {
      if (runEnd === null) runEnd = sample.t;
      runStart = sample.t;
    } else if (runEnd !== null) {
      break;
    }
  }

  const heldClosed = runStart !== null && runEnd !== null && runEnd - runStart >= CLOSED_HOLD_MS;
  if (!heldClosed) return false;

  lastActivateAt = nowMs;
  opennessHistory = [{ open: true, closed: false, t: nowMs }];
  return true;
}

// Pinch is measured as index-tip-to-thumb-tip distance over palm length, so it
// scales with hand size and camera distance without calibration. The old single
// 0.55 threshold sat inside the range a naturally pointing hand already
// occupies, so it reported a pinch that the student never made; these two
// values bracket a deliberate pinch with a dead band in between.
const PINCH_ENTER = 0.3;
const PINCH_EXIT = 0.46;
let pinching = false;

function detectPinch(normalisedDistance: number): boolean {
  pinching = normalisedDistance < (pinching ? PINCH_EXIT : PINCH_ENTER);
  return pinching;
}

function emitCursor(next: Omit<CursorSample, 'seq'>) {
  cursorSeq += 1;
  cursor = { ...next, seq: cursorSeq };
  // Closes the previous frame's target arbitration before any surface reacts to
  // this sample, so each surface reads a decision made with every claim in.
  arbiter.beginFrame();
  cursorListeners.forEach((listener) => listener(cursor));
}

function patchState(patch: Partial<TrackerState>) {
  const next = { ...state, ...patch };
  const changed = (Object.keys(patch) as (keyof TrackerState)[]).some((k) => state[k] !== next[k]);
  if (!changed) return;
  state = next;
  stateListeners.forEach((listener) => listener(state));
}

function onPointerMove(event: PointerEvent | MouseEvent) {
  if (state.mode === 'hand' && state.handVisible) return;
  emitCursor({
    x: event.clientX,
    y: event.clientY,
    visible: true,
    source: 'pointer',
    pinching: false,
    activate: false,
    // Pointer commits on click rather than on a hold, so this is not used for
    // gating there - but the arbiter still needs a prediction to arm targets,
    // and hover affordances read better when they anticipate the cursor too.
    motion: pointerIntent.update(event.clientX, event.clientY, performance.now() / 1000),
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener(
    'pointerdown',
    (event) => {
      onPointerMove(event);
    },
    { passive: true },
  );
}

function ensureVideo(): HTMLVideoElement {
  if (video) return video;
  const el = document.createElement('video');
  el.playsInline = true;
  el.muted = true;
  el.autoplay = true;
  el.setAttribute('aria-hidden', 'true');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.left = '-10px';
  el.style.top = '-10px';
  document.body.appendChild(el);
  video = el;
  return el;
}

async function createLandmarker(): Promise<HandLandmarker> {
  // Loaded on demand: the tracking runtime is large, and a student browsing the
  // world map has not asked for a camera yet.
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');

  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
  } catch {
    fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  }

  const modelUrl = await resolveModelUrl();
  patchState({ diagnostics: { ...state.diagnostics, modelSource: modelUrl } });

  let lastError: unknown;
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Hand tracking could not start on this device.');
}

/*
  Frame counters live here rather than in the store because patchState on every
  animation frame would re-render the entire app sixty times a second. They are
  flushed into the store about once a second, which is plenty for a diagnostics
  readout that a human is looking at.
*/
const counters = { framesSeen: 0, framesProcessed: 0, handFrames: 0, detectError: null as string | null };
let lastCounterFlush = 0;

function flushCounters(force = false) {
  const now = performance.now();
  if (!force && now - lastCounterFlush < 1000) return;
  lastCounterFlush = now;
  patchState({
    diagnostics: {
      ...state.diagnostics,
      framesSeen: counters.framesSeen,
      framesProcessed: counters.framesProcessed,
      handFrames: counters.handFrames,
      detectError: counters.detectError,
    },
  });
}

function loop() {
  rafId = requestAnimationFrame(loop);
  const el = video;
  if (!landmarker || !el || el.readyState < 2 || el.currentTime === lastVideoTime) return;
  lastVideoTime = el.currentTime;
  counters.framesSeen += 1;

  let landmarks;
  try {
    landmarks = landmarker.detectForVideo(el, performance.now()).landmarks?.[0];
    counters.framesProcessed += 1;
  } catch (error) {
    // This used to be a bare `return`, which meant a model that threw on every
    // single frame was indistinguishable from a student holding their hand out
    // of shot. Keeping the first message is the whole difference.
    counters.detectError ??= error instanceof Error ? error.message : String(error);
    flushCounters();
    return;
  }

  flushCounters();

  if (!landmarks) {
    handMissingFrames += 1;
    // A couple of dropped frames is normal; only report the hand as gone after a
    // short run of them so the cursor does not flicker in and out.
    if (handMissingFrames > 6 && state.handVisible) {
      filterX.reset();
      filterY.reset();
      handIntent.reset();
      resetActivateDetector();
      patchState({ handVisible: false });
      // Holds the last known position so the cursor fades out where the hand
      // was rather than jumping, but carries nothing else over - seq is
      // assigned by emitCursor and the motion estimate is no longer valid.
      emitCursor({
        x: cursor.x,
        y: cursor.y,
        visible: false,
        source: 'hand',
        pinching: false,
        activate: false,
        motion: AT_REST_MOTION,
      });
    }
    return;
  }

  handMissingFrames = 0;
  counters.handFrames += 1;
  if (!state.handVisible) patchState({ handVisible: true });

  const tip = landmarks[8];
  const thumb = landmarks[4];
  const wrist = landmarks[0];
  const now = performance.now() / 1000;

  // Mirror x so moving right on screen matches moving right in real life.
  const rawX = (1 - tip.x) * window.innerWidth;
  const rawY = tip.y * window.innerHeight;

  const handSpan = Math.hypot(wrist.x - landmarks[9].x, wrist.y - landmarks[9].y) || 0.2;
  const pinchDistance = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);

  const x = filterX.filter(rawX, now);
  const y = filterY.filter(rawY, now);

  emitCursor({
    x,
    y,
    visible: true,
    source: 'hand',
    pinching: detectPinch(pinchDistance / handSpan),
    activate: detectPalmOpen(countExtendedFingers(landmarks), now * 1000),
    motion: handIntent.update(x, y, now),
  });
}

export const tracker = {
  getCursor: () => cursor,
  getState: () => state,
  getVideo: () => video,
  getDwell: () => dwell,

  subscribeCursor(listener: (sample: CursorSample) => void) {
    cursorListeners.add(listener);
    listener(cursor);
    return () => {
      cursorListeners.delete(listener);
    };
  },

  subscribeState(listener: (next: TrackerState) => void) {
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  },

  subscribeDwell(listener: (progress: number) => void) {
    dwellListeners.add(listener);
    listener(dwell);
    return () => {
      dwellListeners.delete(listener);
    };
  },

  setDwell(progress: number) {
    const clamped = Math.max(0, Math.min(1, progress));
    if (Math.abs(clamped - dwell) < 0.01 && clamped !== 0 && clamped !== 1) return;
    dwell = clamped;
    dwellListeners.forEach((listener) => listener(dwell));
  },

  markOnboarded() {
    saveOnboarded();
    patchState({ onboarded: true });
  },

  usePointer(reason?: string) {
    patchState({ mode: 'pointer', status: 'idle', handVisible: false, error: reason ?? null });
  },

  /** The camera the student last chose, if any. */
  preferredCamera: () => readPreferredCamera(),

  /**
   * Cameras this browser will admit to having. Labels are only populated once
   * permission has been granted at least once, so before that this returns
   * entries named "Camera 1", "Camera 2" - which is a browser privacy rule,
   * not a bug to work around.
   */
  async listCameras(): Promise<{ deviceId: string; label: string }[]> {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      return (devices ?? [])
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));
    } catch {
      return [];
    }
  },

  /** Stops and restarts the stream - the usual cure for a feed that has stalled. */
  async restartCamera(deviceId?: string): Promise<boolean> {
    this.stopCamera();
    patchState({ status: 'idle' });
    return this.startCamera(deviceId);
  },

  async startCamera(deviceId?: string): Promise<boolean> {
    if (deviceId !== undefined) writePreferredCamera(deviceId || null);
    if (state.status === 'ready' && state.mode === 'hand' && deviceId === undefined) return true;
    patchState({ status: 'starting', error: null });

    // getUserMedia can hang instead of rejecting (an OS-level block that never
    // surfaces a prompt, or a blocked model download) - a timeout keeps
    // "Warming up the camera" from being a dead end with no way out.
    const START_TIMEOUT_MS = 15_000;
    let timedOut = false;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timedOut = true;
        reject(new Error('Camera took too long to start. Check your camera permissions and try again.'));
      }, START_TIMEOUT_MS);
    });

    try {
      const attempt = ++startAttempt;
      await Promise.race([
        this._connectCamera(deviceId ?? readPreferredCamera() ?? undefined, attempt),
        timeout,
      ]);
      return true;
    } catch (error) {
      const message = timedOut
        ? (error as Error).message
        : error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was blocked.'
          : error instanceof Error
            ? error.message
            : 'Camera interaction is not available.';
      this.stopCamera();
      patchState({ mode: 'pointer', status: 'error', error: message });
      return false;
    }
  },

  async _connectCamera(deviceId: string | undefined, attempt: number) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser has no camera access.');
    }

    const video: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // A remembered camera can be unplugged by the time we ask for it again,
      // so `exact` would throw where the default would have worked. Preferring
      // it and letting the browser fall back keeps a stale choice harmless.
      ...(deviceId ? { deviceId: { ideal: deviceId } } : { facingMode: 'user' }),
    };

    stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    const el = ensureVideo();
    el.srcObject = stream;
    await el.play();

    // Built into a local first. A start that has already been abandoned - the
    // timeout fired while the model was downloading - must not resurrect
    // itself: it would restart the loop against a stream whose tracks are
    // stopped and leave the state reading "ready" while nothing worked. It
    // must also not touch the shared `landmarker`, because by the time it
    // finishes a *newer* start may have succeeded and put a working one there.
    const built = await createLandmarker();
    if (attempt !== startAttempt) {
      built.close?.();
      throw new Error('Camera start was superseded.');
    }
    landmarker = built;

    counters.framesSeen = 0;
    counters.framesProcessed = 0;
    counters.handFrames = 0;
    counters.detectError = null;
    patchState({ diagnostics: { ...state.diagnostics, modelReady: true } });

    lastVideoTime = -1;
    handMissingFrames = 0;
    filterX.reset();
    filterY.reset();
    handIntent.reset();
    resetActivateDetector();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
    patchState({ mode: 'hand', status: 'ready', error: null });
  },

  stopCamera() {
    // Any start still in flight is now abandoned. Without this, a start that
    // timed out would finish its model download minutes later and restart the
    // loop against a stream whose tracks are already stopped - the state would
    // read "ready" while nothing worked at all.
    startAttempt += 1;
    cancelAnimationFrame(rafId);
    rafId = 0;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) video.srcObject = null;
    landmarker?.close?.();
    landmarker = null;
    patchState({ handVisible: false });
  },
};
