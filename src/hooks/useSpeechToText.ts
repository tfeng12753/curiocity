import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** If the mic never actually opens (permission dialog ignored, a
 *  permissions-policy silently blocking it in an embedded frame, odd
 *  browser quirks that fire no event at all), give up rather than leaving
 *  the UI reading "getting the microphone ready" forever. */
const START_TIMEOUT_MS = 6000;

interface UseSpeechToTextOptions {
  /** Called once a phrase is finalised - the natural place to auto-submit
   *  it, since a hands-only session has no keyboard to confirm with. */
  onFinalResult?: (text: string) => void;
}

/**
 * Lets a child speak their question instead of typing it. The whole app is
 * built around pointing and gesture - a keyboard is the one input a
 * camera-driven, hands-only session genuinely cannot use - so "Ask me
 * anything" needs a voice path, not just a text box.
 *
 * Wraps the Web Speech API's SpeechRecognition (Chrome, Edge, Safari; not
 * Firefox, which has never shipped it - `supported` says so up front so
 * callers can fall back to typing without users having to know why).
 */
export function useSpeechToText({ onFinalResult }: UseSpeechToTextOptions = {}) {
  const Ctor = getRecognitionCtor();
  // Distinct from `listening`: true from the moment start() is called until
  // the mic has genuinely opened (or given up) - the gap between tapping
  // "ask" and speech actually being captured, which is a real wait, not an
  // instant flip.
  const [starting, setStarting] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref rather than a hook dependency: recreating the recognition instance
  // every time the caller's callback identity changes would cut off
  // whatever phrase was mid-flight.
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const clearStartTimeout = () => {
    if (startTimeoutRef.current !== null) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };

  const teardown = useCallback(() => {
    clearStartTimeout();
    recognitionRef.current = null;
    setStarting(false);
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      clearStartTimeout();
      setStarting(false);
      setListening(true);
      setTranscript('');
    };
    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript ?? '';
      }
      setTranscript(text);
      if (event.results[event.results.length - 1]?.isFinal) {
        onFinalResultRef.current?.(text.trim());
      }
    };
    recognition.onerror = () => teardown();
    recognition.onend = () => teardown();

    recognitionRef.current = recognition;
    setStarting(true);
    startTimeoutRef.current = setTimeout(() => {
      recognitionRef.current?.abort();
      teardown();
    }, START_TIMEOUT_MS);

    try {
      recognition.start();
    } catch {
      // Some browsers throw synchronously (e.g. calling start() while a
      // permissions-policy blocks the feature outright) instead of firing
      // onerror - same outcome either way.
      teardown();
    }
  }, [Ctor, teardown]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported: !!Ctor, starting, listening, transcript, start, stop };
}
