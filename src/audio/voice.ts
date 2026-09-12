/*
  Poly's narration - fetches lines from the voice proxy (server/) and plays
  them back with a live amplitude reading for lip-sync. Mirrors sound.ts:
  small, and never allowed to break a lesson if it fails.
*/
import { sfx } from './sound';

const ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '');
const CACHE_LIMIT = 40;

interface SpeakOptions {
  voiceId?: string;
  onAmplitude?: (level: number) => void;
  onEnd?: () => void;
}

const blobCache = new Map<string, string>();
let audioCtx: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentSource: MediaElementAudioSourceNode | null = null;
let currentRaf = 0;
let currentController: AbortController | null = null;

function cacheBlobUrl(key: string, url: string) {
  if (blobCache.size >= CACHE_LIMIT) {
    const oldestKey = blobCache.keys().next().value;
    if (oldestKey !== undefined) {
      URL.revokeObjectURL(blobCache.get(oldestKey)!);
      blobCache.delete(oldestKey);
    }
  }
  blobCache.set(key, url);
}

function stopPlayback() {
  cancelAnimationFrame(currentRaf);
  currentController?.abort();
  currentController = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio = null;
  }
  currentSource?.disconnect();
  currentSource = null;
}

function trackAmplitude(analyser: AnalyserNode, onAmplitude: (level: number) => void) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (const value of data) {
      const normalized = (value - 128) / 128;
      sumSquares += normalized * normalized;
    }
    onAmplitude(Math.min(1, Math.sqrt(sumSquares / data.length) * 4));
    currentRaf = requestAnimationFrame(tick);
  };
  currentRaf = requestAnimationFrame(tick);
}

export const voice = {
  async speak(text: string, { voiceId, onAmplitude, onEnd }: SpeakOptions = {}) {
    stopPlayback();
    if (sfx.isMuted() || !text.trim()) {
      onEnd?.();
      return;
    }

    const key = `${voiceId ?? ''}::${text}`;
    const controller = new AbortController();
    currentController = controller;
    let started = false;

    try {
      let url = blobCache.get(key);
      if (!url) {
        const response = await fetch(`${ENDPOINT}/speak`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        cacheBlobUrl(key, url);
      }
      if (controller.signal.aborted) return;

      const audioEl = new Audio(url);
      currentAudio = audioEl;
      audioEl.onended = () => {
        onAmplitude?.(0);
        onEnd?.();
      };

      if (onAmplitude) {
        audioCtx ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        source.connect(audioCtx.destination);
        currentSource = source;
        trackAmplitude(analyser, onAmplitude);
      }

      await audioEl.play();
      started = true;
    } catch {
      /* narration is a nicety - never let it break a lesson */
    } finally {
      // Aborted calls are superseded by whatever triggered the abort, which
      // owns the end signal - only a call that never started playback (and
      // wasn't cancelled) needs to resolve its own "done" state here.
      if (!started && !controller.signal.aborted) onEnd?.();
    }
  },

  stopAll() {
    stopPlayback();
  },
};

sfx.subscribe((muted) => {
  if (muted) voice.stopAll();
});
