import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { Confetti } from '../Confetti';
import { Icon } from '../../icons/Icon';
import { DialogueBox } from '../DialogueBox';
import { curio } from '../../../ai/curio';
import { RampCanvas } from './RampCanvas';
import { isOnTarget, type RampTarget } from './rampGeometry';

export interface RampTaskProps {
  target: RampTarget;
  objective: string;
  askLine: string;
  instruction: string;
  successLine: string;
  successLabel: string;
  nextLabel?: string;
  onSolved: () => void;
}

const TOO_SHORT_LINES = [
  'So close - the ball stopped short. Try a taller ramp!',
  'Almost! A bit more height should get it there.',
];
const TOO_FAR_LINES = [
  'Whoa, it rolled right past the flag! Try a shorter ramp.',
  'A little too much speed there - try a gentler slope.',
];

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * One ramp, one flag, one skill: does a taller ramp send the ball farther?
 * The physics equivalent of FractionTask - point to set a value, commit,
 * see what happens, try again if it's not quite right yet.
 */
export function RampTask({
  target,
  objective,
  askLine,
  instruction,
  successLine,
  successLabel,
  nextLabel = 'Next',
  onSolved,
}: RampTaskProps) {
  const [attempt, setAttempt] = useState(0);
  const [solved, setSolved] = useState(false);
  const [line, setLine] = useState(askLine);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);

  const handleLand = (landingX: number) => {
    if (isOnTarget(landingX, target)) {
      setSolved(true);
      setLine(successLine);
      sfx.play('success');
      return;
    }

    const misses = mistakeCount + 1;
    setMistakeCount(misses);
    setLine(landingX < target.x - target.tolerance ? pick(TOO_SHORT_LINES) : pick(TOO_FAR_LINES));
    sfx.play('retry');
    window.setTimeout(() => {
      setAttempt((current) => current + 1);
      if (misses < 2) setLine(askLine);
    }, 1300);
  };

  const requestHint = async () => {
    setHintLoading(true);
    const hint = await curio.hint(objective, instruction, mistakeCount);
    setHintLoading(false);
    if (hint) setLine(hint);
  };

  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">{objective}</span>
        </div>

        <div className="task__canvas-wrap">
          <RampCanvas key={attempt} target={target} onLand={handleLand} disabled={solved} />

          <AnimatePresence>
            {solved && (
              <motion.div
                className="task__success"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <Confetti />
                <span className="task__success-label">✓ {successLabel}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DialogueBox text={line} mood={solved ? 'cheer' : 'idle'} instruction={solved ? undefined : instruction}>
        {solved ? (
          <DwellTarget onActivate={onSolved} dwellMs={800}>
            <button className="btn btn--mint" onClick={onSolved}>
              {nextLabel} →
            </button>
          </DwellTarget>
        ) : (
          <>
            <span className="dialogue__hint">
              Point up or down the glowing line to set the ramp's height, then hold still (or open
              your hand, or click) to let the ball go.
            </span>
            {mistakeCount >= 2 && (
              <DwellTarget onActivate={requestHint} disabled={hintLoading}>
                <button className="btn btn--ghost btn--sm" onClick={requestHint} disabled={hintLoading}>
                  {hintLoading ? (
                    'Thinking...'
                  ) : (
                    <>
                      <Icon name="bulb" size={18} />
                      Get a hint from Curio
                    </>
                  )}
                </button>
              </DwellTarget>
            )}
          </>
        )}
      </DialogueBox>
    </div>
  );
}
