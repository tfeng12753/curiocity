import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Curio, type CurioMood } from '../curio/Curio';
import { useVoiceover } from '../../hooks/useVoiceover';

interface DialogueBoxProps {
  text: string;
  mood?: CurioMood;
  /** Short bold instruction shown under the speech, e.g. "MAKE 1/2". */
  instruction?: string;
  children?: ReactNode;
}

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

export function DialogueBox({ text, mood = 'idle', instruction, children }: DialogueBoxProps) {
  const typed = useTypewriter(text);
  const { speaking, amplitude } = useVoiceover(text);

  return (
    <motion.div
      className="dialogue"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <div className="dialogue__avatar">
        <Curio mood={mood} size={128} talking={speaking} amplitude={amplitude} />
      </div>

      <div className="dialogue__body">
        <span className="dialogue__name">Curio</span>
        <p className="dialogue__text">
          {typed}
          <span className="dialogue__caret" aria-hidden="true" />
        </p>
        {instruction && <p className="dialogue__instruction">{instruction}</p>}
        {children && <div className="dialogue__actions">{children}</div>}
      </div>
    </motion.div>
  );
}
