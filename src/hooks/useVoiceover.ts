import { useEffect, useRef, useState } from 'react';
import { voice } from '../audio/voice';

/** Speaks `text` through ElevenLabs as it changes, exposing live amplitude for lip-sync. */
export function useVoiceover(text: string, voiceId?: string) {
  const [speaking, setSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const amplitudeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setSpeaking(true);
    setAmplitude(0);

    void voice.speak(text, {
      voiceId,
      onAmplitude: (level) => {
        if (cancelled) return;
        amplitudeRef.current = level;
        setAmplitude(level);
      },
      onEnd: () => {
        if (cancelled) return;
        setSpeaking(false);
        setAmplitude(0);
      },
    });

    return () => {
      cancelled = true;
      voice.stopAll();
    };
  }, [text, voiceId]);

  return { speaking, amplitude };
}
