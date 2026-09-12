import { useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { FractionCanvas } from '../FractionCanvas';
import { DialogueBox } from '../DialogueBox';
import { Confetti } from '../Confetti';
import type { Cut, ShapeKind } from '../fractionGeometry';

interface Option {
  id: string;
  kind: ShapeKind;
  cuts: Cut[];
  shaded: string[];
  caption: string;
}

const OPTIONS: Option[] = [
  {
    id: 'half',
    kind: 'circle',
    cuts: [{ axis: 'radial', t: Math.PI / 2 }],
    shaded: ['s0'],
    caption: 'Circle',
  },
  {
    id: 'three-fourths',
    kind: 'square',
    cuts: [
      { axis: 'v', t: 0.5 },
      { axis: 'h', t: 0.5 },
    ],
    shaded: ['r0c0', 'r0c1', 'r1c0'],
    caption: 'Square',
  },
  {
    id: 'one-fourth',
    kind: 'rect',
    cuts: [
      { axis: 'v', t: 0.25 },
      { axis: 'v', t: 0.5 },
      { axis: 'v', t: 0.75 },
    ],
    shaded: ['r0c0'],
    caption: 'Bar',
  },
  { id: 'whole', kind: 'circle', cuts: [], shaded: ['whole'], caption: 'Whole' },
];

const ROUNDS = [
  {
    answer: 'half',
    objective: 'FIND 1/2',
    ask: 'Which picture shows one-half - one out of two equal parts?',
    success: 'Yes! One of the two equal parts is coloured. That is 1/2.',
  },
  {
    answer: 'three-fourths',
    objective: 'FIND 3/4',
    ask: 'Great. Now find three-fourths - three out of four equal parts.',
    success: 'Perfect! Three of the four equal parts is 3/4.',
  },
];

export function SceneRecognition({ onNext }: { onNext: () => void }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const current = ROUNDS[round];
  const solved = picked === current.answer;

  const choose = (id: string) => {
    if (solved) return;
    if (id === current.answer) {
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
    if (round === ROUNDS.length - 1) {
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
          <span className="task__objective-chip">{current.objective}</span>
          <span className="task__counter">
            Question {round + 1} / {ROUNDS.length}
          </span>
        </div>

        <div className="option-grid">
          {OPTIONS.map((option) => {
            const isAnswer = solved && option.id === current.answer;
            return (
              <DwellTarget key={option.id} onActivate={() => choose(option.id)} dwellMs={800}>
                <motion.button
                  className={`option ${isAnswer ? 'is-correct' : ''} ${wrong === option.id ? 'is-nudge' : ''}`}
                  onClick={() => choose(option.id)}
                  whileHover={{ y: -6 }}
                  aria-label={`${option.caption} option`}
                >
                  <FractionCanvas
                    kind={option.kind}
                    mode="view"
                    cuts={option.cuts}
                    shaded={option.shaded}
                    size={132}
                  />
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
        instruction={current.objective}
      >
        {solved ? (
          <DwellTarget onActivate={advance} dwellMs={750}>
            <button className="btn btn--mint" onClick={advance}>
              {round === ROUNDS.length - 1 ? 'Next →' : 'Next question →'}
            </button>
          </DwellTarget>
        ) : (
          <span className="dialogue__hint">Point at a picture and open your hand (or click) to choose.</span>
        )}
      </DialogueBox>
    </div>
  );
}
