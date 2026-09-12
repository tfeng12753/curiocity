import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CITIES, CITY_ORDER, type CityId } from '../../data/cities';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useProgress } from '../../state/progress';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { CITY_ILLUSTRATIONS } from './CityIllustrations';
import { Cloud } from './IslandBase';
import './world.css';

interface Placement {
  left: string;
  top: string;
  width: string;
  delay: number;
  /** Opens the hover card downward instead of up - for islands near the top
   *  of the stage, where an upward card would collide with the hero title. */
  cardBelow?: boolean;
}

/** Island placement on the world stage, as percentages of the viewport. */
const WIDE_LAYOUT: Record<CityId, Placement> = {
  chemistry: { left: '36%', top: '24%', width: '26%', delay: 1.2, cardBelow: true },
  math: { left: '7%', top: '41%', width: '31%', delay: 0, cardBelow: true },
  physics: { left: '62%', top: '43%', width: '31%', delay: 0.6 },
};

/** Portrait and narrow screens stack the world into a vertical trail instead. */
const NARROW_LAYOUT: Record<CityId, Placement> = {
  chemistry: { left: '26%', top: '24%', width: '48%', delay: 1.2, cardBelow: true },
  math: { left: '4%', top: '44%', width: '54%', delay: 0, cardBelow: true },
  physics: { left: '42%', top: '66%', width: '54%', delay: 0.6 },
};

const WIDE_ROUTES = ['M25 64 C32 56 40 48 47 46', 'M52 47 C62 50 70 58 76 65', 'M24 70 C40 84 62 84 78 71'];
const NARROW_ROUTES = ['M40 36 C36 42 30 46 24 52', 'M34 60 C44 64 54 68 62 72'];

function CloudLayer() {
  const clouds = [
    { top: '14%', scale: 1.1, duration: 70, delay: 0 },
    { top: '26%', scale: 0.7, duration: 95, delay: -30 },
    { top: '52%', scale: 0.9, duration: 80, delay: -55 },
    { top: '8%', scale: 0.55, duration: 110, delay: -80 },
  ];
  return (
    <>
      {clouds.map((cloud, i) => (
        <div
          key={i}
          className="world__cloud"
          style={{
            top: cloud.top,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <svg viewBox="-46 -26 92 52" width={150 * cloud.scale} height={85 * cloud.scale}>
            <Cloud x={0} y={0} scale={1} opacity={0.92} />
          </svg>
        </div>
      ))}
    </>
  );
}

interface WorldSceneProps {
  onEnterCity: (cityId: CityId) => void;
}

export function WorldScene({ onEnterCity }: WorldSceneProps) {
  const [hovered, setHovered] = useState<CityId | null>(null);
  const { cityProgress } = useProgress();
  const narrow = useMediaQuery('(max-width: 900px)');
  const layout = narrow ? NARROW_LAYOUT : WIDE_LAYOUT;
  const routes = narrow ? NARROW_ROUTES : WIDE_ROUTES;

  const enter = (cityId: CityId) => {
    sfx.play('travel');
    onEnterCity(cityId);
  };

  return (
    <motion.div
      className="world"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="world__sun" />
      <CloudLayer />
      <div className="world__sea" />

      <div className="world__hero">
        <span className="eyebrow">Curio-City</span>
        <h1>Enter your learning world</h1>
      </div>

      <div className="world__stage">
        <svg className="world__routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {/* routes are drawn between the island plateaus, behind the islands */}
          {routes.map((route) => (
            <path key={route} d={route} />
          ))}
        </svg>

        {CITY_ORDER.map((cityId) => {
          const city = CITIES[cityId];
          const Illustration = CITY_ILLUSTRATIONS[cityId];
          const place = layout[cityId];
          const { done, total } = cityProgress(cityId);

          return (
            <DwellTarget
              key={cityId}
              onActivate={() => enter(cityId)}
              dwellMs={950}
              className="city-anchor"
              style={{ left: place.left, top: place.top, width: place.width }}
            >
              <motion.button
                className="city-island"
                data-city={cityId}
                onClick={() => enter(cityId)}
                onMouseEnter={() => {
                  setHovered(cityId);
                  sfx.play('hover');
                }}
                onMouseLeave={() => setHovered((current) => (current === cityId ? null : current))}
                onFocus={() => setHovered(cityId)}
                onBlur={() => setHovered((current) => (current === cityId ? null : current))}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15 + place.delay * 0.2, type: 'spring', stiffness: 160, damping: 18 }}
                aria-label={`${city.name}. ${city.tagline}. ${done} of ${total} explored.`}
              >
                <div
                  className="city-island__float"
                  style={{ animationDelay: `${place.delay}s` }}
                >
                  <Illustration />
                </div>

                <span className="city-island__label">
                  <i />
                  {city.name}
                  <span style={{ color: 'var(--ink-faint)', fontSize: '0.8rem' }}>
                    {done}/{total}
                  </span>
                </span>

                <AnimatePresence>
                  {hovered === cityId && (
                    <motion.div
                      className={`city-card ${place.cardBelow ? 'city-card--below' : ''}`}
                      initial={{ opacity: 0, y: place.cardBelow ? -10 : 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: place.cardBelow ? -8 : 8, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3>{city.name}</h3>
                      <p>{city.tagline}</p>
                      <div className="city-card__cta">
                        <span className="city-card__chip">
                          {city.status === 'playable' ? 'Level 01 ready' : 'Preview'}
                        </span>
                        <span className="btn btn--city btn--sm">{city.cta} →</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </DwellTarget>
          );
        })}
      </div>

      <motion.div
        className="world__footer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <span className="pill">🗺️ Where do you want to explore?</span>
        <span className="pill">✋ Playable with your hand or your mouse</span>
      </motion.div>
    </motion.div>
  );
}
