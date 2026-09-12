import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Curio, type CurioMood } from '../curio/Curio';
import { useVoiceover } from '../../hooks/useVoiceover';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { curio } from '../../ai/curio';
import { sfx } from '../../audio/sound';
import { useSettings } from '../../hooks/useSettings';
import { DwellTarget } from '../../tracker/DwellTarget';

interface DialogueBoxProps {
  text: string;
  mood?: CurioMood;
  /** Short bold instruction shown under the speech, e.g. "MAKE 1/2". */
  instruction?: string;
  /** What this scene is about - given to Curio so answers stay in context. */
  topic?: string;
  children?: ReactNode;
}

/*
  Curio is never silent while she thinks, and never says the same thing twice
  in a row - a fixed "Loading..." is the fastest way to turn a character back
  into a spinner. These cost nothing: they are picked, not generated.
*/
const THINKING_LINES = [
  'Ooooh, good question. Let me have a think...',
  'Hold on, hold on - I am thinking my very best thoughts...',
  'Ooh! Nobody has asked me that today. Thinking...',
  'Right. Thinking cap on, properly on...',
  'What a brilliant thing to wonder about. One moment...',
];

/** Types Curio's line out so children read it instead of skipping it. */
function useTypewriter(text: string, speed = 16) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    setShown('');
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      if (index >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return shown;
}

export function DialogueBox({ text, mood = 'idle', instruction, topic, children }: DialogueBoxProps) {
  /*
    A child who wonders "but why?" mid-lesson has nowhere to put that question,
    and the moment passes. Asking is opt-in and never blocks the lesson: the
    scene's own line is always underneath, one tap away.
  */
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [thinkingLine, setThinkingLine] = useState(THINKING_LINES[0]);
  const { aiEnabled } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);

  // A new scene line means the lesson moved on, so a stale answer to the
  // previous step should not still be sitting there.
  useEffect(() => {
    setAnswer(null);
    setAsking(false);
    setQuestion('');
    pending.current?.abort();
  }, [text]);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  const spoken = answer ?? text;
  const typed = useTypewriter(spoken);
  const { speaking, amplitude } = useVoiceover(spoken);

  const ask = async (asked: string) => {
    const trimmed = asked.trim();
    if (!trimmed || thinking) return;

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;

    setThinking(true);
    setThinkingLine(THINKING_LINES[Math.floor(Math.random() * THINKING_LINES.length)]);
    sfx.play('tap');
    const reply = await curio.ask(trimmed, topic ?? text);
    if (controller.signal.aborted) return;

    setThinking(false);
    setAsking(false);
    setQuestion('');
    // A written apology is better than silence, and keeps her in character
    // when the backend is unreachable.
    setAnswer(
      reply ??
        "Oh no - my thinking cap has gone all wobbly! Ask me again in a minute and I bet it will have sorted itself out.",
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  // Speaking the question is the primary path here, not a bonus on top of
  // typing: the whole app is driven by pointing and gesture, and a keyboard
  // is the one input a hands-only, camera-driven session cannot use at all.
  // A final transcript submits itself - there is no reliable hands-free way
  // to "confirm" typed text afterwards anyway.
  const { supported: micSupported, listening, transcript, start: startListening, stop: stopListening } =
    useSpeechToText({ onFinalResult: (result) => void ask(result) });

  useEffect(() => {
    if (listening) setQuestion(transcript);
  }, [listening, transcript]);

  const toggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      sfx.play('tap');
      startListening();
    }
  };

  const openAsk = () => {
    setAsking(true);
  };

  const closeAsk = () => {
    stopListening();
    setAsking(false);
    setQuestion('');
  };

  const askAgain = () => {
    setAnswer(null);
    setAsking(true);
  };

  const backToLesson = () => setAnswer(null);

  return (
    <motion.div
      className="dialogue"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <div className="dialogue__avatar">
        <Curio
          mood={thinking ? 'think' : mood}
          size={128}
          talking={speaking}
          amplitude={amplitude}
        />
      </div>

      <div className="dialogue__body">
        <span className="dialogue__name">Curio</span>
        <p className="dialogue__text">
          {thinking ? thinkingLine : typed}
          <span className="dialogue__caret" aria-hidden="true" />
        </p>

        {!answer && !thinking && instruction && (
          <p className="dialogue__instruction">{instruction}</p>
        )}

        {asking ? (
          <form className="dialogue__ask" onSubmit={submit}>
            {micSupported && (
              <DwellTarget onActivate={toggleMic} dwellMs={650}>
                <button
                  type="button"
                  className={`dialogue__mic ${listening ? 'is-listening' : ''}`}
                  onClick={toggleMic}
                  aria-label={listening ? 'Stop and ask' : 'Ask by speaking'}
                >
                  {listening ? '⏺️' : '🎙️'}
                </button>
              </DwellTarget>
            )}
            <input
              ref={inputRef}
              className="dialogue__ask-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={listening ? 'Listening...' : 'Ask me anything at all...'}
              maxLength={200}
              aria-label="Ask Curio a question"
              readOnly={listening}
            />
            <DwellTarget onActivate={() => void ask(question)} dwellMs={650} disabled={!question.trim()}>
              <button type="submit" className="btn btn--sm" disabled={!question.trim()}>
                Ask
              </button>
            </DwellTarget>
            <DwellTarget onActivate={closeAsk} dwellMs={650}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={closeAsk}>
                Cancel
              </button>
            </DwellTarget>
          </form>
        ) : (
          <div className="dialogue__actions">
            {answer ? (
              <>
                <DwellTarget onActivate={askAgain}>
                  <button className="btn btn--ghost btn--sm" onClick={askAgain}>
                    Ooh, another one
                  </button>
                </DwellTarget>
                <DwellTarget onActivate={backToLesson}>
                  <button className="btn btn--sm" onClick={backToLesson}>
                    Back to the lesson →
                  </button>
                </DwellTarget>
              </>
            ) : (
              <>
                {children}
                {!thinking && aiEnabled && (
                  <DwellTarget onActivate={openAsk}>
                    <button className="btn btn--ghost btn--sm dialogue__ask-open" onClick={openAsk}>
                      🎙️ Ask me anything
                    </button>
                  </DwellTarget>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
