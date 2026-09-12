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
import { speakable } from './speakable';

const ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '');
const CACHE_LIMIT = 40;

/*
  Narration is the biggest consumer of the ElevenLabs quota by far - every
  dialogue line in every lesson is a request, and the server's cache is lost
  whenever a free-tier instance spins down. This caps how many *new* lines one
  visit can synthesise; repeats still come from the cache below and cost
  nothing. Past the cap Curio keeps talking in the browser's own voice rather
  than going silent.
*/
const SYNTH_BUDGET = 40;
let synthesised = 0;

/**
 * Falling back to browser speech is meant to be graceful, not invisible. It was
 * invisible: because Curio still talked, a completely unreachable narration
 * proxy looked exactly like a working one, and the only way to notice was that
 * the ElevenLabs dashboard showed no usage at all.
 *
 * Logged once per session so the reason is always one console line away.
 */
let warnedAboutFallback = false;
function warnFallback(reason: string) {
  if (warnedAboutFallback) return;
  warnedAboutFallback = true;
  console.warn(
    `[voice] Falling back to browser speech - ElevenLabs narration is not reachable (${reason}). ` +
      `Tried ${ENDPOINT}/speak. Check that the proxy in server/ is deployed and that ` +
      `VITE_API_ENDPOINT pointed at it when this bundle was built.`,
  );
}

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

/**
 * A bright, friendly female English voice if the device has one.
 *
 * This tier matters more than "fallback" suggests - whenever the narration
 * proxy is unreachable it is the *only* voice anyone hears, so it gets the
 * same cheerful-female brief as Curio's ElevenLabs voice. The list previously
 * named only macOS and Chrome voices, which left every Windows machine falling
 * through to `voices[0]` - often a male default.
 */
function pickBrowserVoice(): SpeechSynthesisVoice | null {
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch {
    return null;
  }
  if (voices.length === 0) return null;

  const preferred = [
    'Samantha', // macOS
    'Google UK English Female',
    'Google US English',
    'Microsoft Aria Online (Natural) - English (United States)', // Windows 11
    'Microsoft Zira - English (United States)', // Windows 10
    'Karen',
    'Moira',
  ];
  for (const name of preferred) {
    const match = voices.find((voice) => voice.name === name);
    if (match) return match;
  }

  // Nothing named matched - prefer any English voice that advertises itself as
  // female before giving up and taking the system default.
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const female = english.find((voice) => /female|aria|zira|samantha|karen|moira|eva|hazel/i.test(voice.name));
  return female ?? english[0] ?? voices[0];
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
  // A touch quicker and brighter than neutral - reads as upbeat rather than
  // instructional, without tipping into cartoonish.
  utterance.rate = 1.02;
  utterance.pitch = 1.25;

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
  if (synthesised >= SYNTH_BUDGET) {
    warnFallback(`narration budget of ${SYNTH_BUDGET} new lines used up for this visit`);
    return null;
  }
  synthesised += 1;

  const response = await fetch(`${ENDPOINT}/speak`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, voiceId }),
    signal: controller.signal,
  });
  if (!response.ok) {
    warnFallback(`HTTP ${response.status}`);
    return null;
  }

  const blob = await response.blob();

  // A 200 is not enough on its own. When the proxy is missing, a static host
  // answers this path with whatever its rewrite rules say - an empty body, or
  // index.html - and both used to sail through as "success", get cached as a
  // broken blob URL, and only fail later at play() where the error was
  // swallowed. Checking that this is actually audio is what turns a silent
  // misconfiguration back into a visible one.
  if (blob.size === 0 || !blob.type.startsWith('audio/')) {
    warnFallback(`response was not audio (${blob.size} bytes, type "${blob.type || 'none'}")`);
    return null;
  }

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
  async speak(rawText: string, { voiceId, onAmplitude, onEnd }: SpeakOptions = {}) {
    stopPlayback();
    if (sfx.isMuted() || !rawText.trim()) {
      onEnd?.();
      return;
    }

    // Everything past this point works on the spoken form, so the cache keys,
    // the ElevenLabs request and the browser fallback all agree on one string
    // - and "1/2" is never read out as "one slash two".
    const text = speakable(rawText);

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
    } catch (error) {
      if (!controller.signal.aborted) {
        warnFallback(`playback failed (${error instanceof Error ? error.message : String(error)})`);
        speakWithBrowser(text, onAmplitude, onEnd);
      }
    }
  },

  stopAll() {
    stopPlayback();
  },
};

sfx.subscribe((muted) => {
  if (muted) voice.stopAll();
});
