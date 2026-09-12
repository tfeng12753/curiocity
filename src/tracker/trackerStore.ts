import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { makeOneEuroFilter } from './oneEuro';

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
}

export interface TrackerState {
  mode: TrackerMode;
  status: TrackerStatus;
  handVisible: boolean;
  error: string | null;
  /** True once the student has seen (and answered) the camera onboarding. */
  onboarded: boolean;
}

const WASM_LOCAL = '/mediapipe/wasm';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const cursorListeners = new Set<(sample: CursorSample) => void>();
const stateListeners = new Set<(state: TrackerState) => void>();
const dwellListeners = new Set<(progress: number) => void>();

let cursor: CursorSample = { x: 0, y: 0, visible: false, source: 'pointer', pinching: false };
let state: TrackerState = {
  mode: 'pointer',
  status: 'idle',
  handVisible: false,
  error: null,
  onboarded: false,
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

function emitCursor(next: CursorSample) {
  cursor = next;
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
  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(WASM_LOCAL);
  } catch {
    fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  }

  let lastError: unknown;
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
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

function loop() {
  rafId = requestAnimationFrame(loop);
  const el = video;
  if (!landmarker || !el || el.readyState < 2 || el.currentTime === lastVideoTime) return;
  lastVideoTime = el.currentTime;

  let landmarks;
  try {
    landmarks = landmarker.detectForVideo(el, performance.now()).landmarks?.[0];
  } catch {
    return;
  }

  if (!landmarks) {
    handMissingFrames += 1;
    // A couple of dropped frames is normal; only report the hand as gone after a
    // short run of them so the cursor does not flicker in and out.
    if (handMissingFrames > 6 && state.handVisible) {
      filterX.reset();
      filterY.reset();
      patchState({ handVisible: false });
      emitCursor({ ...cursor, visible: false, source: 'hand' });
    }
    return;
  }

  handMissingFrames = 0;
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

  emitCursor({
    x: filterX.filter(rawX, now),
    y: filterY.filter(rawY, now),
    visible: true,
    source: 'hand',
    pinching: pinchDistance / handSpan < 0.55,
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
    patchState({ onboarded: true });
  },

  usePointer(reason?: string) {
    patchState({ mode: 'pointer', status: 'idle', handVisible: false, error: reason ?? null });
  },

  async startCamera(): Promise<boolean> {
    if (state.status === 'ready' && state.mode === 'hand') return true;
    patchState({ status: 'starting', error: null });

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser has no camera access.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      const el = ensureVideo();
      el.srcObject = stream;
      await el.play();

      landmarker = await createLandmarker();
      lastVideoTime = -1;
      handMissingFrames = 0;
      filterX.reset();
      filterY.reset();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
      patchState({ mode: 'hand', status: 'ready', error: null });
      return true;
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Camera permission was blocked.'
          : error instanceof Error
            ? error.message
            : 'Camera interaction is not available.';
      this.stopCamera();
      patchState({ mode: 'pointer', status: 'error', error: message });
      return false;
    }
  },

  stopCamera() {
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
