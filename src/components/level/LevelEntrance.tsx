import { motion } from 'motion/react';
import { CITIES, type CityId } from '../../data/cities';
import { useProgress } from '../../state/progress';
import { VEHICLES } from '../../data/vehicles';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { Landmark } from '../city/Landmarks';
import './level.css';

interface LevelEntranceProps {
  cityId: CityId;
  levelId: string;
  onBack: () => void;
  onStart: () => void;
}

const DEFAULT_LEARNING_POINTS = [
  'Meet a whole and split it into equal parts',
  'Discover halves, fourths and what 3/4 means',
  'Build and colour fractions with your own finger',
];

export function LevelEntrance({ cityId, levelId, onBack, onStart }: LevelEntranceProps) {
  const city = CITIES[cityId];
  const level = city.levels.find((item) => item.id === levelId) ?? city.levels[0];
  const { isLevelComplete, isLevelUnlocked } = useProgress();
  const complete = isLevelComplete(cityId, level.id);
  const unlocked = isLevelUnlocked(cityId, level.id);
  const reward = level.rewardVehicleId ? VEHICLES[level.rewardVehicleId] : null;
  const prereq = city.levels.find((item) => item.id === level.requiresLevelId);

  return (
    <motion.div
      className="entrance"
      data-city={cityId}
      initial={{ opacity: 0, scale: 1.18 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="entrance__glow" />

      <button className="city__back entrance__back" onClick={onBack}>
        ← {city.name}
      </button>

      <div className="entrance__crumbs">
        {city.name} <span aria-hidden="true">/</span> {level.name} <span aria-hidden="true">/</span> Level 0
        {level.index}
      </div>

      <motion.div
        className="entrance__card"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 180, damping: 20 }}
      >
        <div className="entrance__art">
          <Landmark kind={level.landmark} />
        </div>

        <div>
          <span className="entrance__chip">
            Level 0{level.index} · {complete ? 'Completed' : unlocked ? 'Ready' : 'Locked'}
          </span>
          <h1>{level.name}</h1>
          <p className="entrance__tagline">{level.tagline}</p>

          <ul className="entrance__list">
            {(level.learningPoints ?? DEFAULT_LEARNING_POINTS).map((point) => (
              <li key={point}>
                <i>✦</i>
                {point}
              </li>
            ))}
          </ul>

          {reward && !complete && (
            <p className="entrance__reward">
              {unlocked ? 'Finish this to unlock:' : 'Reward:'} {reward.icon} {reward.name}
            </p>
          )}

          <div className="entrance__actions">
            {unlocked ? (
              <DwellTarget
                onActivate={() => {
                  sfx.play('travel');
                  onStart();
                }}
                dwellMs={800}
              >
                <button
                  className="btn btn--lg btn--city"
                  onClick={() => {
                    sfx.play('travel');
                    onStart();
                  }}
                >
                  {complete ? 'Play again' : 'Start level'} →
                </button>
              </DwellTarget>
            ) : (
              <button className="btn btn--lg btn--city" disabled>
                🔒 Finish {prereq?.name ?? 'the previous lesson'} first
              </button>
            )}
            <button className="btn btn--ghost" onClick={onBack}>
              Not yet
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
