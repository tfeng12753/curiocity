/*
  Curio's narration, with two tiers so she is never silent:

    1. ElevenLabs, via the server/ proxy, when an API key is configured -
       real character voice, with true amplitude for lip-sync.
    2. The browser's built-in speech synthesis otherwise - no key, no
       network, no cost. Lip-sync is approximated since there is no audio
       stream to analyse.

  Mirrors sound.ts: small, and never allowed to break a lesson if it fails.
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
let synthRaf = 0;
let currentController: AbortController | null = null;
/** Set while the browser-speech tier is talking, so it can be cancelled. */
let speakingWithBrowser = false;

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
  cancelAnimationFrame(synthRaf);
  currentController?.abort();
  currentController = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio = null;
  }
  currentSource?.disconnect();
  currentSource = null;

  if (speakingWithBrowser) {
    speakingWithBrowser = false;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* nothing to cancel */
    }
  }
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

/** A warm, clear English voice if the device has one. */
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch {
    return null;
  }
  if (voices.length === 0) return null;

  const preferred = ['Samantha', 'Google UK English Female', 'Karen', 'Moira', 'Google US English'];
  for (const name of preferred) {
    const match = voices.find((voice) => voice.name === name);
    if (match) return match;
  }
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? voices[0];
}

function speakWithBrowser(text: string, onAmplitude?: (level: number) => void, onEnd?: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) {
    onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickBrowserVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.98;
  utterance.pitch = 1.15;

  // There is no audio stream to measure here, so the mouth is driven by a
  // burbling oscillation for as long as she is talking - close enough to
  // read as speech without pretending to be real lip-sync.
  speakingWithBrowser = true;
  const startedAt = performance.now();
  const tick = () => {
    if (!speakingWithBrowser) return;
    const t = (performance.now() - startedAt) / 1000;
    const wave = 0.35 + 0.4 * Math.abs(Math.sin(t * 11)) + 0.2 * Math.abs(Math.sin(t * 4.3));
    onAmplitude?.(Math.min(1, wave));
    synthRaf = requestAnimationFrame(tick);
  };
  synthRaf = requestAnimationFrame(tick);

  const finish = () => {
    if (!speakingWithBrowser) return;
    speakingWithBrowser = false;
    cancelAnimationFrame(synthRaf);
    onAmplitude?.(0);
    onEnd?.();
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  try {
    synth.cancel();
    synth.speak(utterance);
  } catch {
    finish();
  }
}

/** Blob URL for an ElevenLabs take of this line, or null if that tier isn't available. */
async function fetchSpeechUrl(text: string, voiceId: string | undefined, controller: AbortController) {
  const key = `${voiceId ?? ''}::${text}`;
  const cached = blobCache.get(key);
  if (cached) return cached;

  const response = await fetch(`${ENDPOINT}/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
    signal: controller.signal,
  });
  if (!response.ok) return null;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  cacheBlobUrl(key, url);
  return url;
}

async function playUrl(url: string, onAmplitude?: (level: number) => void, onEnd?: () => void) {
  const audioEl = new Audio(url);
  currentAudio = audioEl;
  audioEl.onended = () => {
    onAmplitude?.(0);
    onEnd?.();
  };

  if (onAmplitude) {
    audioCtx ??= new (window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
}

export const voice = {
  async speak(text: string, { voiceId, onAmplitude, onEnd }: SpeakOptions = {}) {
    stopPlayback();
    if (sfx.isMuted() || !text.trim()) {
      onEnd?.();
      return;
    }

    const controller = new AbortController();
    currentController = controller;

    const url = await fetchSpeechUrl(text, voiceId, controller).catch(() => null);
    // An aborted request was superseded by a newer line, which now owns the
    // end signal - staying quiet here avoids two lines talking over each other.
    if (controller.signal.aborted) return;

    if (!url) {
      speakWithBrowser(text, onAmplitude, onEnd);
      return;
    }

    try {
      await playUrl(url, onAmplitude, onEnd);
    } catch {
      if (!controller.signal.aborted) speakWithBrowser(text, onAmplitude, onEnd);
    }
  },

  stopAll() {
    stopPlayback();
  },
};

sfx.subscribe((muted) => {
  if (muted) voice.stopAll();
});
