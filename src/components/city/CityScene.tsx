import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CITIES, type CityId, type LevelDefinition } from '../../data/cities';
import { useProgress } from '../../state/progress';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { VEHICLES } from '../../data/vehicles';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { Icon } from '../icons/Icon';
import { Landmark } from './Landmarks';
import { Boat, Cloud, IslandBase } from '../world/IslandBase';
import { PlayerCharacter } from '../player/PlayerCharacter';

/** Small helper so the island's grass can green up once a level is finished. */
const complete0 = (state: string) => state === 'is-complete';
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

/*
  Destinations sit in two rows - one above the road, one below - and the road
  itself runs through the band between them, so the route stays visible
  instead of being covered by the landmark art sitting on top of it. A
  level's authored `y` only decides which side of the road it belongs to.
*/
const ROW_ABOVE = 20;
const ROW_BELOW = 80;
const ROAD_ABOVE = 48;
const ROAD_BELOW = 52;

const isAboveRoad = (level: LevelDefinition) => level.y < 50;
const nodeY = (level: LevelDefinition) => (isAboveRoad(level) ? ROW_ABOVE : ROW_BELOW);
const roadY = (level: LevelDefinition) => (isAboveRoad(level) ? ROAD_ABOVE : ROAD_BELOW);

/** Smooth road running past the destinations, drawn in percentage coordinates. */
function roadThrough(levels: LevelDefinition[]) {
  const stops = [...levels].sort((a, b) => a.index - b.index);
  if (stops.length < 2) return '';

  const points = stops.map((level) => ({ x: level.x, y: roadY(level) }));
  // Run the route off both edges so it reads as a road passing through town
  // rather than one that starts and stops at the first and last stop.
  points.unshift({ x: points[0].x - 14, y: points[0].y });
  points.push({ x: points[points.length - 1].x + 14, y: points[points.length - 1].y });

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
  const { isLevelComplete, isLevelUnlocked, cityProgress, equippedCosmetics } = useProgress();
  const { done, total } = cityProgress(cityId);
  const [toast, setToast] = useState<string | null>(null);
  // The absolute-positioned map has `overflow: hidden` and node positions
  // tuned for wide, tall screens, so it doesn't just look cramped below that
  // - the fixed-pixel HUD/subtitle/stage offsets stop leaving enough room
  // and destination cards start overlapping the header or spilling off the
  // bottom edge with no way to scroll to them. The narrow-width breakpoint
  // matches WorldScene's own narrow layout; the height one catches the same
  // problem on a short-but-wide window (a laptop with a shallow browser
  // window, not just a phone). Below either, fall back to the plain
  // scrollable list, which has no such fixed-height assumptions.
  const compact = useMediaQuery('(max-width: 900px), (max-height: 820px)');

  /**
   * Where the student currently stands: the first level they have not finished
   * and can actually start. Falls back to the last completed one once a whole
   * city is done, so the character is always somewhere rather than vanishing
   * at the end.
   */
  const currentLevelId = (() => {
    const next = city.levels.find(
      (level) =>
        !isLevelComplete(cityId, level.id) &&
        level.status === 'playable' &&
        isLevelUnlocked(cityId, level.id),
    );
    if (next) return next.id;
    const done = [...city.levels].reverse().find((level) => isLevelComplete(cityId, level.id));
    return done?.id ?? city.levels[0]?.id;
  })();

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
    // A node renders as an icon plus a label rather than one interpolated
    // string, so the icon can be real artwork instead of a glyph in the text.
    const badgeText = complete ? (
      <>
        <Icon name={reward ? reward.icon : 'star'} size={15} />
        Completed
      </>
    ) : playable ? (
      `Level 0${level.index} · Start`
    ) : level.status === 'soon' ? (
      'Coming soon'
    ) : (
      <>
        <Icon name="lock" size={14} />
        Locked
      </>
    );
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

      {compact ? (
        /*
          A trail of islands rather than a list of rows.

          The narrow layout used to abandon the island metaphor entirely and
          become a stack of list items, so the same city looked like a game on a
          laptop and a settings screen on a phone. This keeps one idea at every
          width - the world map already stacks its islands into a vertical trail
          on narrow screens, and this is the same move one level down.

          The student's own character stands on the island they have reached, so
          progress is something you can see at a glance instead of having to
          read a badge on each row.
         */
        <div className="city__trail">
          {(city.chapters ?? [null]).map((chapter) => {
            const levelsInChapter = chapter
              ? city.levels.filter((level) => level.chapterId === chapter.id)
              : city.levels;
            if (levelsInChapter.length === 0) return null;

            return (
              <div className="city__trail-group" key={chapter?.id ?? 'all'}>
                {chapter && <h2 className="city__list-chapter">{chapter.name}</h2>}
                <div className="city__trail-islands">
                  {levelsInChapter.map((level, i) => {
                    const { state, badgeText } = describeLevel(level);
                    const isHere = level.id === currentLevelId;
                    return (
                      <motion.div
                        key={level.id}
                        className={`trail-stop ${i % 2 === 0 ? 'is-left' : 'is-right'}`}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.07 * i + 0.1 }}
                      >
                        <DwellTarget onActivate={() => openLevel(level)} dwellMs={900}>
                          <button
                            className={`trail-island ${state} ${isHere ? 'is-here' : ''}`}
                            onClick={() => openLevel(level)}
                            onMouseEnter={() => sfx.play('hover')}
                          >
                            <span className="trail-island__art">
                              <svg viewBox="0 0 360 300" className="trail-island__base" aria-hidden="true">
                                <IslandBase
                                  id={`trail-${level.id}`}
                                  land={complete0(state) ? '#8ae4a8' : '#6fd88f'}
                                  landShade={complete0(state) ? '#4cc17f' : '#3fb573'}
                                  waterfall={false}
                                />
                              </svg>
                              <span className="trail-island__landmark">
                                <Landmark kind={level.landmark} />
                              </span>
                              {isHere && (
                                <span className="trail-island__avatar" aria-hidden="true">
                                  <PlayerCharacter size={46} equipped={equippedCosmetics} showPet={false} />
                                </span>
                              )}
                            </span>

                            <span className="trail-island__label">
                              <strong>
                                {level.index}. {level.name}
                              </strong>
                              <span className="trail-island__tagline">{level.tagline}</span>
                              <span
                                className={`map-node__badge ${
                                  state === 'is-complete'
                                    ? 'is-done'
                                    : state === 'is-playable'
                                      ? 'is-start'
                                      : 'is-soon'
                                }`}
                              >
                                {badgeText}
                              </span>
                            </span>
                          </button>
                        </DwellTarget>
                      </motion.div>
                    );
                  })}
                </div>
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
            const inChapter = city.levels.filter((level) => level.chapterId === chapter.id);
            if (inChapter.length === 0) return null;
            // A signpost sitting in the clear band the road runs through,
            // centred over that chapter's stretch of the route.
            const midX =
              inChapter.reduce((sum, level) => sum + level.x, 0) / inChapter.length;
            return (
              <div key={chapter.id} className="map-chapter-label" style={{ left: `${midX}%`, top: '50%' }}>
                {chapter.name}
              </div>
            );
          })}

          {city.levels.map((level, i) => {
            const { complete, playable, state, badgeText } = describeLevel(level);

            return (
              <motion.div
                key={level.id}
                className={`map-node ${state} ${isAboveRoad(level) ? 'is-above-road' : 'is-below-road'}`}
                style={{ left: `${level.x}%`, top: `${nodeY(level)}%` }}
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
                        {complete ? '✓' : playable ? '▶' : <Icon name="lock" size={13} />}
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
            <Icon name="lock" size={17} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
