import { useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { FractionCanvas } from '../FractionCanvas';
import { DialogueBox } from '../DialogueBox';
import { Confetti } from '../Confetti';
import type { Cut, ShapeKind } from '../fractionGeometry';

export interface CompareOption {
  id: string;
  kind: ShapeKind;
  cuts: Cut[];
  shaded: string[];
  fraction: string;
}

export interface CompareRound {
  left: CompareOption;
  right: CompareOption;
  /** id of whichever option is the bigger fraction. */
  answerId: string;
  ask: string;
  success: string;
}

/** "Which is bigger?" - point at the picture with more shaded, not the smaller pieces. */
export function SceneCompare({ rounds, onNext }: { rounds: CompareRound[]; onNext: () => void }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const current = rounds[round];
  const solved = picked === current.answerId;
  const options = [current.left, current.right];

  const choose = (id: string) => {
    if (solved) return;
    if (id === current.answerId) {
      sfx.play('success');
      setPicked(id);
      setWrong(null);
    } else {
      sfx.play('retry');
      setWrong(id);
      setTimeout(() => setWrong(null), 700);
    }
  };

  const advance = () => {
    if (round === rounds.length - 1) {
      onNext();
      return;
    }
    setRound(round + 1);
    setPicked(null);
  };

  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">WHICH IS BIGGER?</span>
          <span className="task__counter">
            Question {round + 1} / {rounds.length}
          </span>
        </div>

        <div className="option-grid option-grid--compare">
          {options.map((option) => {
            const isAnswer = solved && option.id === current.answerId;
            return (
              <DwellTarget key={option.id} onActivate={() => choose(option.id)} dwellMs={800}>
                <motion.button
                  className={`option ${isAnswer ? 'is-correct' : ''} ${wrong === option.id ? 'is-nudge' : ''}`}
                  onClick={() => choose(option.id)}
                  whileHover={{ y: -6 }}
                  aria-label={`${option.fraction} option`}
                >
                  <FractionCanvas
                    kind={option.kind}
                    mode="view"
                    cuts={option.cuts}
                    shaded={option.shaded}
                    size={148}
                  />
                  <span className="option__caption">{option.fraction}</span>
                  {isAnswer && <span className="option__tick">✓</span>}
                </motion.button>
              </DwellTarget>
            );
          })}
          {solved && <Confetti count={20} seed={round} />}
        </div>
      </div>

      <DialogueBox
        text={solved ? current.success : current.ask}
        mood={solved ? 'cheer' : wrong ? 'think' : 'idle'}
        instruction="WHICH IS BIGGER?"
      >
        {solved ? (
          <DwellTarget onActivate={advance} dwellMs={750}>
            <button className="btn btn--mint" onClick={advance}>
              {round === rounds.length - 1 ? 'Next →' : 'Next question →'}
            </button>
          </DwellTarget>
        ) : (
          <span className="dialogue__hint">Point at the bigger fraction and hold still (or click).</span>
        )}
      </DialogueBox>
    </div>
  );
}
