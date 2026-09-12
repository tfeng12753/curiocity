import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

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
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Ref rather than a hook dependency: recreating the recognition instance
  // every time the caller's callback identity changes would cut off
  // whatever phrase was mid-flight.
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
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
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [Ctor]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported: !!Ctor, listening, transcript, start, stop };
}
