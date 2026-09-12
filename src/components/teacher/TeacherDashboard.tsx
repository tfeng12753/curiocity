import { useState } from 'react';
import { motion } from 'motion/react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import { BADGES, useProgress } from '../../state/progress';
import { sfx } from '../../audio/sound';
import './teacher.css';

function levelStatus(
  complete: boolean,
  unlocked: boolean,
  comingSoon: boolean,
): { label: string; className: string } {
  if (complete) return { label: 'Complete', className: '' };
  if (comingSoon) return { label: 'Coming soon', className: 'pill--ghost' };
  if (!unlocked) return { label: 'Locked', className: 'pill--ghost' };
  return { label: 'Not started', className: 'pill--ghost' };
}

export function TeacherDashboard() {
  const {
    totalComplete,
    totalLevels,
    coins,
    badges,
    cityProgress,
    isLevelComplete,
    isLevelUnlocked,
    reset,
  } = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const earned = Object.values(BADGES).filter((badge) => badges.includes(badge.id)).length;

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      sfx.play('hover');
      return;
    }
    reset();
    setConfirmReset(false);
    sfx.play('tap');
  };

  return (
    <motion.div
      className="teacher"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="teacher__inner">
        <header className="teacher__hero">
          <p className="eyebrow">Teacher view</p>
          <h1>Student progress</h1>
          <p>
            This is the student who used this browser. Progress stays on this device and does not
            sync to other computers.
          </p>
          <div className="teacher__stats">
            <div className="teacher__stat">
              <span>Destinations</span>
              <strong>
                {totalComplete} / {totalLevels}
              </strong>
            </div>
            <div className="teacher__stat">
              <span>Coins</span>
              <strong>🪙 {coins}</strong>
            </div>
            <div className="teacher__stat">
              <span>Badges</span>
              <strong>
                {earned} / {Object.keys(BADGES).length}
              </strong>
            </div>
          </div>
        </header>

        {CITY_ORDER.map((cityId) => {
          const city = CITIES[cityId];
          const { done, total } = cityProgress(cityId);
          return (
            <section className="panel teacher__city" key={cityId} data-city={cityId}>
              <div className="drawer__city-head">
                <strong>{city.name}</strong>
                <span className="pill">
                  {done} / {total}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <ul className="teacher__levels">
                {city.levels.map((level) => {
                  const complete = isLevelComplete(cityId, level.id);
                  const unlocked = isLevelUnlocked(cityId, level.id);
                  const status = levelStatus(complete, unlocked, level.status === 'soon');
                  const prereq = city.levels.find((item) => item.id === level.requiresLevelId);
                  return (
                    <li key={level.id} className={complete ? 'is-done' : ''}>
                      <span className="drawer__tick">{complete ? '✓' : level.index}</span>
                      <span className="teacher__level-copy">
                        {level.name}
                        {prereq && !complete && !unlocked && <small>Needs {prereq.name} first</small>}
                      </span>
                      <span className={`pill teacher__status ${status.className}`}>{status.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <section className="panel teacher__badges">
          <div className="drawer__city-head">
            <strong>Badges</strong>
            <span className="pill">
              {earned} earned
            </span>
          </div>
          <div className="badge-grid">
            {Object.values(BADGES).map((badge) => {
              const got = badges.includes(badge.id);
              return (
                <div className={`badge-card ${got ? 'is-earned' : ''}`} key={badge.id}>
                  <div className="badge-card__icon">{badge.icon}</div>
                  <strong>{badge.name}</strong>
                  <span>{got ? badge.description : 'Not earned yet'}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel teacher__actions">
          <p>Reset clears this browser&apos;s save so the next student starts fresh.</p>
          <button
            type="button"
            className={`btn btn--sm teacher__reset ${confirmReset ? 'is-confirming' : ''}`}
            onClick={handleReset}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? 'Tap again to reset' : 'Reset this device'}
          </button>
        </section>
      </div>
    </motion.div>
  );
}
