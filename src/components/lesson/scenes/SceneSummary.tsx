import { motion } from 'motion/react';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { FractionCanvas } from '../FractionCanvas';
import { DialogueBox } from '../DialogueBox';

const STEPS = [
  { label: 'WHOLE', caption: '1 whole', cuts: [], shaded: [] as string[] },
  {
    label: 'EQUAL PARTS',
    caption: '4 equal parts',
    cuts: [
      { axis: 'v' as const, t: 0.5 },
      { axis: 'h' as const, t: 0.5 },
    ],
    shaded: [] as string[],
  },
  {
    label: 'FRACTION',
    caption: '3/4 coloured',
    cuts: [
      { axis: 'v' as const, t: 0.5 },
      { axis: 'h' as const, t: 0.5 },
    ],
    shaded: ['r0c0', 'r0c1', 'r1c0'],
  },
];

const FACTS = [
  '1/2 = 1 out of 2 equal parts',
  '1/4 = 1 out of 4 equal parts',
  '2/4 = 2 out of 4 equal parts',
];

export function SceneSummary({ onNext }: { onNext: () => void }) {
  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">How fractions work</span>
        </div>

        <div className="summary-flow">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              className="summary-flow__item"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 * i, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <FractionCanvas kind="square" mode="view" cuts={step.cuts} shaded={step.shaded} size={130} />
              <strong>{step.label}</strong>
              <span>{step.caption}</span>
              {i < STEPS.length - 1 && <i className="summary-flow__arrow">→</i>}
            </motion.div>
          ))}
        </div>

        <motion.ul
          className="summary-facts"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {FACTS.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
          <li className="is-key">The parts always need to be EQUAL.</li>
        </motion.ul>
      </div>

      <DialogueBox
        text="A fraction tells us about parts of a whole. Split the whole into equal parts, then count the parts you have."
        mood="happy"
        instruction="Ready for your final challenge?"
      >
        <DwellTarget onActivate={onNext} dwellMs={750}>
          <button className="btn btn--sun btn--lg" onClick={onNext}>
            Start the challenge →
          </button>
        </DwellTarget>
      </DialogueBox>
    </div>
  );
}
