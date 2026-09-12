import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CITIES, type CityId, type LevelDefinition } from '../../data/cities';
import { useProgress } from '../../state/progress';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { VEHICLES } from '../../data/vehicles';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { Landmark } from './Landmarks';
import { Boat, Cloud } from '../world/IslandBase';
import './city.css';

/** Ambient sky and sea props so the map reads as a place, not a diagram. */
function CityDecor() {
  const clouds = [
    { left: '18%', top: '15%', scale: 1 },
    { left: '72%', top: '12%', scale: 0.7 },
    { left: '48%', top: '19%', scale: 0.5 },
  ];
  const boats = [
    { left: '8%', top: '82%', sail: '#ffffff' },
    { left: '46%', top: '90%', sail: '#ffd678' },
    { left: '90%', top: '86%', sail: '#ffffff' },
  ];

  return (
    <div className="city__decor">
      {clouds.map((cloud, i) => (
        <svg
          key={`cloud-${i}`}
          viewBox="-46 -26 92 52"
          width={150 * cloud.scale}
          height={85 * cloud.scale}
          style={{ left: cloud.left, top: cloud.top, opacity: 0.9 }}
        >
          <Cloud x={0} y={0} />
        </svg>
      ))}
      {boats.map((boat, i) => (
        <svg
          key={`boat-${i}`}
          viewBox="-20 -20 40 40"
          width="44"
          height="44"
          style={{ left: boat.left, top: boat.top }}
          className="float-slow"
        >
          <Boat x={0} y={0} sail={boat.sail} />
        </svg>
      ))}
    </div>
  );
}

/** Smooth road through the destinations, drawn in percentage coordinates. */
function roadThrough(levels: LevelDefinition[], yOffset = 7) {
  const points = [...levels]
    .sort((a, b) => a.index - b.index)
    .map((level) => ({ x: level.x, y: level.y + yOffset }));
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

interface CitySceneProps {
  cityId: CityId;
  onBack: () => void;
  onOpenLevel: (levelId: string) => void;
}

export function CityScene({ cityId, onBack, onOpenLevel }: CitySceneProps) {
  const city = CITIES[cityId];
  const { isLevelComplete, isLevelUnlocked, cityProgress } = useProgress();
  const { done, total } = cityProgress(cityId);
  const [toast, setToast] = useState<string | null>(null);
  // The absolute-positioned map has `overflow: hidden` and node positions
  // tuned for wide screens, so anything narrower than that doesn't just look
  // cramped - it can clip destinations off-screen with no way to scroll to
  // them. Same breakpoint WorldScene already uses for its own narrow layout.
  const narrow = useMediaQuery('(max-width: 900px)');

  const showToast = (message: string) => {
    sfx.play('retry');
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const openLevel = (level: LevelDefinition) => {
    if (level.status !== 'playable') {
      showToast(`${level.name} is still being built - coming soon!`);
      return;
    }
    if (!isLevelUnlocked(cityId, level.id)) {
      const prereq = city.levels.find((entry) => entry.id === level.requiresLevelId);
      showToast(`Finish ${prereq?.name ?? 'the previous lesson'} first to unlock ${level.name}.`);
      return;
    }
    sfx.play('travel');
    onOpenLevel(level.id);
  };

  const describeLevel = (level: LevelDefinition) => {
    const complete = isLevelComplete(cityId, level.id);
    const unlocked = isLevelUnlocked(cityId, level.id);
    const playable = level.status === 'playable' && unlocked;
    const state = complete ? 'is-complete' : playable ? 'is-playable' : 'is-locked';
    const reward = level.rewardVehicleId ? VEHICLES[level.rewardVehicleId] : null;
    const badgeText = complete
      ? reward
        ? `${reward.icon} Completed`
        : '⭐ Completed'
      : playable
        ? `Level 0${level.index} · Start`
        : level.status === 'soon'
          ? 'Coming soon'
          : 'Locked';
    return { complete, playable, state, reward, badgeText };
  };

  return (
    <motion.div
      className="city"
      data-city={cityId}
      initial={{ opacity: 0, scale: 1.12 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="city__water-sparkle" />
      <CityDecor />

      <div className="city__hud">
        <button className="city__back" onClick={onBack}>
          ← World Map
        </button>
        <span className="city__title">{city.name}</span>
        <span className="pill city__progress">
          Your progress: {done} / {total}
        </span>
      </div>

      <p className="city__subtitle">{city.blurb}</p>

      {narrow ? (
        <div className="city__list">
          {(city.chapters ?? [null]).map((chapter) => {
            const levelsInChapter = chapter
              ? city.levels.filter((level) => level.chapterId === chapter.id)
              : city.levels;
            if (levelsInChapter.length === 0) return null;

            return (
              <div className="city__list-group" key={chapter?.id ?? 'all'}>
                {chapter && <h2 className="city__list-chapter">{chapter.name}</h2>}
                {levelsInChapter.map((level, i) => {
                  const { state, badgeText } = describeLevel(level);
                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * i + 0.1 }}
                    >
                      <DwellTarget onActivate={() => openLevel(level)} dwellMs={900}>
                        <button
                          className={`city__list-item ${state}`}
                          onClick={() => openLevel(level)}
                          onMouseEnter={() => sfx.play('hover')}
                        >
                          <span className="city__list-art">
                            <Landmark kind={level.landmark} />
                          </span>
                          <span className="city__list-body">
                            <strong>
                              {level.index}. {level.name}
                            </strong>
                            <span className="city__list-tagline">{level.tagline}</span>
                          </span>
                          <span className={`map-node__badge ${state === 'is-complete' ? 'is-done' : state === 'is-playable' ? 'is-start' : 'is-soon'}`}>
                            {badgeText}
                          </span>
                        </button>
                      </DwellTarget>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="city__stage">
          <svg className="city__roads" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path className="road-base" d={roadThrough(city.levels)} />
            <path className="road-dash" d={roadThrough(city.levels)} />
          </svg>

          {city.chapters?.map((chapter) => {
            const first = city.levels.find((level) => level.chapterId === chapter.id);
            if (!first) return null;
            return (
              <div
                key={chapter.id}
                className="map-chapter-label"
                style={{ left: `${first.x}%`, top: `${first.y - 16}%` }}
              >
                {chapter.name}
              </div>
            );
          })}

          {city.levels.map((level, i) => {
            const { complete, playable, state, badgeText } = describeLevel(level);

            return (
              <motion.div
                key={level.id}
                className={`map-node ${state}`}
                style={{ left: `${level.x}%`, top: `${level.y}%` }}
                initial={{ opacity: 0, y: 26, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.12 * i + 0.15, type: 'spring', stiffness: 180, damping: 18 }}
              >
                <DwellTarget onActivate={() => openLevel(level)} dwellMs={900}>
                  <button
                    className="map-node__button"
                    onClick={() => openLevel(level)}
                    onMouseEnter={() => sfx.play('hover')}
                    aria-label={`${level.name}. ${level.tagline}. ${
                      complete ? 'Completed' : playable ? 'Ready to play' : 'Locked'
                    }`}
                  >
                    <span className="map-node__pill">
                      <span className="map-node__index">{level.index}</span>
                      {level.name}
                    </span>

                    <span className="map-node__art">
                      <Landmark kind={level.landmark} />
                      <span className="map-node__status">
                        {complete ? '✓' : playable ? '▶' : '🔒'}
                      </span>
                    </span>

                    <span
                      className={`map-node__badge ${
                        complete ? 'is-done' : playable ? 'is-start' : 'is-soon'
                      }`}
                    >
                      {badgeText}
                    </span>
                  </button>
                </DwellTarget>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="city__stamp">
        <span style={{ fontSize: '1.4rem' }}>⭐</span>
        <span>
          <small>Completed</small>
          {done} / {total}
        </span>
      </div>

      <div className="city__hint">
        {city.status === 'playable'
          ? 'Tip: the glowing destination is ready to explore. Hover a place to see what you will learn.'
          : 'This city is still under construction - explore Math City to play the full lesson.'}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="city__toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            🔒 {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
