import { motion } from 'motion/react';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { FractionCanvas, type Skin } from '../FractionCanvas';
import { DialogueBox } from '../DialogueBox';
import type { Cut, ShapeKind } from '../fractionGeometry';

interface TeachNotationProps {
  numerator: number;
  denominator: number;
  word: string;
  line: string;
  kind: ShapeKind;
  skin?: Skin;
  cuts: Cut[];
  shaded: string[];
  onNext: () => void;
}

/**
 * The bridge between the object and the symbol: the shape on the left, the same
 * fraction written out on the right, with each number labelled.
 */
export function TeachNotation({
  numerator,
  denominator,
  word,
  line,
  kind,
  skin = 'plain',
  cuts,
  shaded,
  onNext,
}: TeachNotationProps) {
  return (
    <div className="task">
      <div className="task__stage task__stage--split">
        <FractionCanvas kind={kind} skin={skin} mode="view" cuts={cuts} shaded={shaded} size={280} />

        <motion.div
          className="notation"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 20 }}
        >
          <div className="notation__stack">
            <motion.span
              className="notation__num"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
            >
              {numerator}
            </motion.span>
            <span className="notation__bar" />
            <motion.span
              className="notation__den"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.32, type: 'spring', stiffness: 300, damping: 14 }}
            >
              {denominator}
            </motion.span>
          </div>

          <div className="notation__legend">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <b>{numerator}</b> = how many parts we have
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
              <b>{denominator}</b> = equal parts in the whole
            </motion.p>
            <motion.p
              className="notation__sentence"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.74 }}
            >
              {numerator} of {denominator} equal parts = <b>{numerator}/{denominator}</b>
            </motion.p>
          </div>

          <span className="notation__word">{word}</span>
        </motion.div>
      </div>

      <DialogueBox text={line} mood="happy" instruction={`${numerator}/${denominator} - ${word}`}>
        <DwellTarget onActivate={onNext} dwellMs={750}>
          <button className="btn btn--mint" onClick={onNext}>
            Got it →
          </button>
        </DwellTarget>
      </DialogueBox>
    </div>
  );
}
