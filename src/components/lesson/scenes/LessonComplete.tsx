import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { BADGES, useProgress } from '../../../state/progress';
import { VEHICLES } from '../../../data/vehicles';
import { CITIES, type CityId } from '../../../data/cities';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { Curio } from '../../curio/Curio';
import { Icon } from '../../icons/Icon';
import { Confetti } from '../Confetti';
import { curio } from '../../../ai/curio';

interface RecapRow {
  top: string;
  bottom: string;
}

interface LessonCompleteProps {
  cityId: CityId;
  levelId: string;
  badgeId: string;
  title: string;
  blurb: string;
  learned: string[];
  recap: RecapRow[];
  fractions: string[];
  onReturn: () => void;
  onKeepExploring: () => void;
  /** Shown when this is the last lesson of a chapter, e.g. "Chapter 1 complete!" */
  chapterCompleteNote?: string;
}

/**
 * The generic lesson-complete screen used by every lesson except the very
 * first (which keeps its own bespoke SceneComplete). Data-driven so new
 * lessons don't need to hand-roll this whole layout each time - grants the
 * level's coin/vehicle reward via completeLevel and shows what was earned.
 */
export function LessonComplete({
  cityId,
  levelId,
  badgeId,
  title,
  blurb,
  learned,
  recap,
  fractions,
  onReturn,
  onKeepExploring,
  chapterCompleteNote,
}: LessonCompleteProps) {
  const { completeLevel, awardBadge } = useProgress();

  useEffect(() => {
    completeLevel(cityId, levelId);
    awardBadge(badgeId);
    sfx.play('levelUp');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /*
    The written blurb is the same for every child who finishes this level.
    Curio's version is about what THIS run actually covered, and arrives a
    beat later - the celebration is already on screen, so a slow or missing
    reply costs nothing.
  */
  const [curioRecap, setCurioRecap] = useState<string | null>(null);
  // Depends on the joined string, never on the `learned` array itself: callers
  // pass an inline literal, so a new reference arrives on every render and an
  // array dependency would re-run this - and bill another IFM call - forever.
  const learnedKey = learned.join('; ');

  useEffect(() => {
    let live = true;
    curio.recap(title, learnedKey).then((text) => {
      if (live && text) setCurioRecap(text);
    });
    return () => {
      live = false;
    };
  }, [title, learnedKey]);

  const badge = BADGES[badgeId];
  const level = CITIES[cityId].levels.find((entry) => entry.id === levelId);
  const vehicle = level?.rewardVehicleId ? VEHICLES[level.rewardVehicleId] : null;

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
          <Curio mood="cheer" size={150} />
        </motion.div>
        <div>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>
            You did it!
          </span>
          <h1>{title}</h1>
          <p>{curioRecap ?? blurb}</p>
          {vehicle && (
            <p className="complete__reward-line">
              <Icon name={vehicle.icon} size={22} />
              New ride unlocked: {vehicle.name}!
            </p>
          )}
          {chapterCompleteNote && (
            <p className="complete__reward-line">
              <Icon name="sparkle" size={22} />
              {chapterCompleteNote}
            </p>
          )}
        </div>
      </div>

      {badge && (
        <motion.div
          className="complete__badge"
          initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 12 }}
        >
          <span className="complete__badge-icon">
            <Icon name={badge.icon} size={46} />
          </span>
          <div>
            <strong>{badge.name}</strong>
            <span>New badge earned</span>
          </div>
        </motion.div>
      )}

      <div className="complete__panels">
        <section className="complete__panel">
          <h3>What you learned</h3>
          <ul className="complete__checks">
            {learned.map((item, i) => (
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
            {recap.map((row, i) => (
              <div key={row.top}>
                <strong>{row.top}</strong>
                <span>{row.bottom}</span>
                {i < recap.length - 1 && <i>↓</i>}
              </div>
            ))}
          </div>
          <ul className="complete__fractions">
            {fractions.map((fraction) => (
              <li key={fraction}>{fraction}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="complete__actions">
        <DwellTarget onActivate={onReturn} dwellMs={800}>
          <button className="btn btn--lg btn--sun" onClick={onReturn}>
            Return to {CITIES[cityId].name}
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
