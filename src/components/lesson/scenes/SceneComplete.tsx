import { useEffect } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { BADGES, useProgress } from '../../../state/progress';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { Avatar } from '../Avatar';
import { Confetti } from '../Confetti';

const LEARNED = [
  'Whole',
  'Equal parts',
  'Halves',
  'Fourths',
  'Build fractions',
  'Identify fractions',
];

const RECAP = [
  { top: '1 WHOLE', bottom: 'all of it' },
  { top: '2 EQUAL PARTS', bottom: 'halves' },
  { top: '4 EQUAL PARTS', bottom: 'fourths' },
];

const FRACTIONS = ['1/2 = 1 out of 2', '1/4 = 1 out of 4', '3/4 = 3 out of 4'];

interface SceneCompleteProps {
  onReturn: () => void;
  onKeepExploring: () => void;
}

export function SceneComplete({ onReturn, onKeepExploring }: SceneCompleteProps) {
  const { completeLevel, awardBadge } = useProgress();

  useEffect(() => {
    completeLevel('math', 'fractions');
    awardBadge('fraction-explorer');
    awardBadge('equal-parts-expert');
    awardBadge('whole-to-part-master');
    sfx.play('levelUp');
  }, [completeLevel, awardBadge]);

  return (
    <motion.div
      className="complete"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Confetti count={40} />

      <div className="complete__hero">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
        >
          <Avatar mood="cheer" size={150} />
        </motion.div>
        <div>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
            You did it!
          </span>
          <h1>Fraction Adventure Complete! 🎉</h1>
          <p>
            Today you learned that a whole can be split into equal parts - and that fractions tell us
            how much of the whole we have.
          </p>
        </div>
      </div>

      <motion.div
        className="complete__badge"
        initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 12 }}
      >
        <span className="complete__badge-icon">{BADGES['fraction-explorer'].icon}</span>
        <div>
          <strong>{BADGES['fraction-explorer'].name}</strong>
          <span>New badge earned</span>
        </div>
      </motion.div>

      <div className="complete__panels">
        <section className="complete__panel">
          <h3>What you learned</h3>
          <ul className="complete__checks">
            {LEARNED.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
              >
                ✓ {item}
              </motion.li>
            ))}
          </ul>
        </section>

        <section className="complete__panel">
          <h3>The big idea</h3>
          <div className="complete__recap">
            {RECAP.map((row, i) => (
              <div key={row.top}>
                <strong>{row.top}</strong>
                <span>{row.bottom}</span>
                {i < RECAP.length - 1 && <i>↓</i>}
              </div>
            ))}
          </div>
          <ul className="complete__fractions">
            {FRACTIONS.map((fraction) => (
              <li key={fraction}>{fraction}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="complete__actions">
        <DwellTarget onActivate={onReturn} dwellMs={800}>
          <button className="btn btn--lg btn--sun" onClick={onReturn}>
            Return to Math City
          </button>
        </DwellTarget>
        <DwellTarget onActivate={onKeepExploring} dwellMs={800}>
          <button className="btn btn--ghost" onClick={onKeepExploring}>
            Continue exploring
          </button>
        </DwellTarget>
      </div>
    </motion.div>
  );
}
