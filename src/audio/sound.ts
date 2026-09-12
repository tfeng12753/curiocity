/*
  Tiny synthesised sound kit - no audio files, no network, nothing to preload.
  Every cue is a short envelope on an oscillator so the whole soundtrack stays
  under a few dozen lines and can never talk over the lesson.
*/

type Cue = 'tap' | 'hover' | 'cut' | 'shade' | 'success' | 'retry' | 'levelUp' | 'travel';

const STORAGE_KEY = 'learnverse.muted';

let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<(muted: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
}

function tone({ freq, duration, delay = 0, type = 'sine', gain = 0.12, sweepTo }: ToneOptions) {
  const context = audio();
  if (!context) return;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env).connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const CUES: Record<Cue, () => void> = {
  hover: () => tone({ freq: 620, duration: 0.07, gain: 0.04, type: 'triangle' }),
  tap: () => tone({ freq: 520, duration: 0.11, gain: 0.09, type: 'triangle', sweepTo: 720 }),
  cut: () => {
    tone({ freq: 900, duration: 0.1, gain: 0.07, type: 'sawtooth', sweepTo: 380 });
    tone({ freq: 320, duration: 0.16, gain: 0.05, type: 'sine', delay: 0.03 });
  },
  shade: () => tone({ freq: 440, duration: 0.13, gain: 0.07, type: 'sine', sweepTo: 660 }),
  success: () => {
    [523.25, 659.25, 783.99].forEach((freq, i) =>
      tone({ freq, duration: 0.22, delay: i * 0.075, gain: 0.1, type: 'triangle' }),
    );
  },
  retry: () => {
    tone({ freq: 360, duration: 0.16, gain: 0.06, type: 'sine' });
    tone({ freq: 300, duration: 0.2, delay: 0.1, gain: 0.05, type: 'sine' });
  },
  levelUp: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ freq, duration: 0.34, delay: i * 0.11, gain: 0.11, type: 'triangle' }),
    );
    tone({ freq: 196, duration: 0.6, delay: 0.1, gain: 0.05, type: 'sine' });
  },
  travel: () => tone({ freq: 240, duration: 0.5, gain: 0.06, type: 'sine', sweepTo: 640 }),
};

export const sfx = {
  play(cue: Cue) {
    try {
      CUES[cue]();
    } catch {
      /* audio is a nicety - never let it break a lesson */
    }
  },
  isMuted: () => muted,
  setMuted(next: boolean) {
    muted = next;
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* private browsing */
    }
    listeners.forEach((listener) => listener(muted));
  },
  subscribe(listener: (muted: boolean) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
