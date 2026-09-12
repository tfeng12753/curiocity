import { useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { FractionCanvas } from '../FractionCanvas';
import { DialogueBox } from '../DialogueBox';
import { Confetti } from '../Confetti';

type Step = 'greet' | 'ask' | 'wrong' | 'correct';

const LINES: Record<Step, string> = {
  greet: "Hi, I'm Poly! Today we're going to learn about fractions.",
  ask: 'First, look at this pizza. Is it one whole, or is it broken into pieces?',
  wrong: 'Look again - nobody has cut it yet. Every single piece is still joined up!',
  correct: 'Exactly! When we have all of something, we have ONE WHOLE.',
};

export function SceneIntro({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState<Step>('greet');

  const answer = (whole: boolean) => {
    if (whole) {
      sfx.play('success');
      setStep('correct');
    } else {
      sfx.play('retry');
      setStep('wrong');
    }
  };

  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">Meet the whole</span>
        </div>

        <div className="task__canvas-wrap">
          <FractionCanvas kind="circle" skin="pizza" mode="view" cuts={[]} size={330} />
          {step === 'correct' && (
            <motion.div
              className="task__success"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18 }}
            >
              <Confetti count={18} />
              <span className="task__success-label">1 WHOLE</span>
            </motion.div>
          )}
        </div>
      </div>

      <DialogueBox
        text={LINES[step]}
        mood={step === 'correct' ? 'cheer' : step === 'wrong' ? 'think' : 'idle'}
        instruction={step === 'greet' ? undefined : step === 'correct' ? 'ONE WHOLE = ALL OF IT' : 'YOUR TURN'}
      >
        {step === 'greet' && (
          <DwellTarget onActivate={() => setStep('ask')} dwellMs={750}>
            <button className="btn btn--city" onClick={() => setStep('ask')}>
              Let's go →
            </button>
          </DwellTarget>
        )}

        {(step === 'ask' || step === 'wrong') && (
          <div className="choice-row">
            <DwellTarget onActivate={() => answer(true)} dwellMs={800}>
              <button className="choice" onClick={() => answer(true)}>
                🍕 It's one whole
              </button>
            </DwellTarget>
            <DwellTarget onActivate={() => answer(false)} dwellMs={800}>
              <button className={`choice ${step === 'wrong' ? 'is-nudge' : ''}`} onClick={() => answer(false)}>
                🔪 It's in pieces
              </button>
            </DwellTarget>
          </div>
        )}

        {step === 'correct' && (
          <DwellTarget onActivate={onNext} dwellMs={750}>
            <button className="btn btn--mint" onClick={onNext}>
              Next →
            </button>
          </DwellTarget>
        )}
      </DialogueBox>
    </div>
  );
}
