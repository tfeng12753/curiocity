import { motion } from 'motion/react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import { BADGES, useProgress } from '../../state/progress';
import type { NavPanel } from './TopNav';
import './layout.css';

export function NavDrawer({ panel, onClose }: { panel: NavPanel; onClose: () => void }) {
  const { isLevelComplete, cityProgress, badges, totalComplete, totalLevels } = useProgress();
  if (!panel) return null;

  return (
    <>
      <motion.div
        className="drawer-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <button className="drawer__close" onClick={onClose} aria-label="Close panel">
          ✕
        </button>

        {panel === 'progress' ? (
          <>
            <h2>My Progress</h2>
            <p className="drawer__sub">
              {totalComplete} of {totalLevels} destinations explored across the Learnverse.
            </p>
            {CITY_ORDER.map((cityId) => {
              const city = CITIES[cityId];
              const { done, total } = cityProgress(cityId);
              return (
                <section className="drawer__city" key={cityId} data-city={cityId}>
                  <div className="drawer__city-head">
                    <strong>{city.name}</strong>
                    <span className="pill">
                      {done} / {total}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${(done / total) * 100}%` }} />
                  </div>
                  <ul className="drawer__levels">
                    {city.levels.map((level) => {
                      const done_ = isLevelComplete(cityId, level.id);
                      return (
                        <li key={level.id} className={done_ ? 'is-done' : ''}>
                          <span className="drawer__tick">{done_ ? '✓' : level.index}</span>
                          {level.name}
                          {level.status === 'soon' && !done_ && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', opacity: 0.7 }}>
                              Coming soon
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </>
        ) : (
          <>
            <h2>Achievements</h2>
            <p className="drawer__sub">Badges you collect by finishing adventures.</p>
            <div className="badge-grid">
              {Object.values(BADGES).map((badge) => {
                const earned = badges.includes(badge.id);
                return (
                  <div className={`badge-card ${earned ? 'is-earned' : ''}`} key={badge.id}>
                    <div className="badge-card__icon">{badge.icon}</div>
                    <strong>{badge.name}</strong>
                    <span>{earned ? badge.description : 'Not earned yet'}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}
