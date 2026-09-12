/*
  Minimal ambient types for the Web Speech API's SpeechRecognition - it is
  not part of TypeScript's own DOM lib (it's still non-standard, Chromium/
  Safari-only), so nothing here comes from lib.dom.d.ts. Named with a "Like"
  suffix rather than the real interface names so this never collides if a
  future TS lib update adds proper types of its own.
*/
export {};

declare global {
  interface SpeechRecognitionResultLike {
    readonly isFinal: boolean;
    readonly length: number;
    [index: number]: { transcript: string };
  }

  interface SpeechRecognitionResultListLike {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike;
  }

  interface SpeechRecognitionEventLike extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultListLike;
  }

  interface SpeechRecognitionLike extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
