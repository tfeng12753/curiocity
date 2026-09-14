import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { InteractiveSurface, type SurfacePoint } from '../../../tracker/InteractiveSurface';
import {
  GAUGE_BOTTOM_Y,
  GAUGE_TOP_Y,
  GROUND_Y,
  MAX_HEIGHT,
  RAMP_BASE_X,
  RAMP_TOP_X,
  VIEW_H,
  VIEW_W,
  heightFromPointerY,
  heightToLandingX,
  rampTop,
  type RampTarget,
} from './rampGeometry';

interface RampCanvasProps {
  target: RampTarget;
  onLand: (landingX: number) => void;
  disabled?: boolean;
}

const GAUGE_X = 6;

/**
 * Point up or down a vertical gauge to set the ramp's height, then commit
 * (open hand, pinch, click, or just hold still) to let the ball go - the
 * same point-then-commit shape as cutting a shape in the Fraction Workshop,
 * just driving a height instead of a cut line.
 *
 * RampTask remounts this whole component (key={attempt}) for each new try,
 * so there's no "reset between attempts" logic to write here - a fresh
 * mount already starts with a clean ball.
 */
export function RampCanvas({ target, onLand, disabled = false }: RampCanvasProps) {
  const [previewHeight, setPreviewHeight] = useState(MAX_HEIGHT * 0.4);
  const [released, setReleased] = useState(false);
  const [landingX, setLandingX] = useState<number | null>(null);

  const handleHover = useCallback(
    (point: SurfacePoint | null) => {
      if (released || disabled || !point) return;
      setPreviewHeight(heightFromPointerY(point.y));
    },
    [released, disabled],
  );

  const dwellKey = useCallback(
    (point: SurfacePoint) => {
      if (released || disabled) return null;
      return `h:${Math.round(heightFromPointerY(point.y))}`;
    },
    [released, disabled],
  );

  // Uses the committed point's own y, not the last-hovered previewHeight -
  // a click can fire without a preceding hover at that exact spot (this bit
  // a scripted test click outright: pointerdown with no pointermove first
  // left previewHeight stuck at its old value), so the release height has
  // to come from wherever InteractiveSurface says the commit actually
  // landed, not from separately-tracked hover state that might be stale.
  const release = useCallback(
    (point: SurfacePoint) => {
      if (released || disabled) return;
      const height = heightFromPointerY(point.y);
      setPreviewHeight(height);
      setReleased(true);
      setLandingX(heightToLandingX(height));
    },
    [released, disabled],
  );

  const top = rampTop(previewHeight);
  const finalX = landingX ?? heightToLandingX(previewHeight);

  return (
    <div className="ramp-canvas">
      <InteractiveSurface
        viewW={VIEW_W}
        viewH={VIEW_H}
        enabled={!disabled && !released}
        getDwellKey={dwellKey}
        onHover={handleHover}
        onCommit={release}
        dwellMs={800}
        className="ramp-canvas__surface"
        role="application"
        ariaLabel="Ramp height control"
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="ramp-canvas__svg">
          {/* sky + ground */}
          <rect x="0" y="0" width={VIEW_W} height={GROUND_Y} fill="none" />
          <rect x="0" y={GROUND_Y} width={VIEW_W} height={VIEW_H - GROUND_Y} fill="#c9a877" />
          <rect x="0" y={GROUND_Y} width={VIEW_W} height="2.4" fill="#a9834f" />

          {/* height gauge */}
          <line x1={GAUGE_X} y1={GAUGE_TOP_Y} x2={GAUGE_X} y2={GAUGE_BOTTOM_Y} stroke="#d8cdfa" strokeWidth="2.4" strokeLinecap="round" />
          <circle
            cx={GAUGE_X}
            cy={GROUND_Y - previewHeight}
            r="2.6"
            fill={released ? '#b9a7ff' : '#5b3fe0'}
            stroke="#fff"
            strokeWidth="0.8"
          />

          {/* target flag */}
          <g transform={`translate(${target.x} ${GROUND_Y})`}>
            <rect x="-0.6" y="-18" width="1.2" height="18" fill="#8a7350" />
            <path d="M0.6 -18 L9 -14.5 L0.6 -11 Z" fill={landingX !== null && Math.abs(landingX - target.x) <= target.tolerance ? '#3fd68f' : '#ff9351'} />
          </g>
          <rect
            x={target.x - target.tolerance}
            y={GROUND_Y - 1.2}
            width={target.tolerance * 2}
            height="1.2"
            fill="#3fd68f"
            opacity="0.35"
          />

          {/* ramp */}
          <polygon
            points={`${RAMP_TOP_X},${top.y} ${RAMP_BASE_X},${GROUND_Y} ${RAMP_TOP_X},${GROUND_Y}`}
            fill="#9a83f5"
            stroke="#5f43cc"
            strokeWidth="1"
          />

          {/* ball - RampTask remounts this whole canvas (key={attempt}) between
              tries, so there's no stale released/landingX state to reset here. */}
          <motion.circle
            r="3.4"
            fill="#ff9351"
            stroke="#c95a1c"
            strokeWidth="0.8"
            initial={{ cx: RAMP_TOP_X, cy: top.y }}
            animate={
              released
                ? { cx: [RAMP_TOP_X, RAMP_BASE_X, finalX], cy: [top.y, GROUND_Y - 3.4, GROUND_Y - 3.4] }
                : { cx: RAMP_TOP_X, cy: top.y }
            }
            transition={
              released
                ? { duration: 1.1, times: [0, 0.32, 1], ease: ['easeIn', 'easeOut'] }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              if (released && landingX !== null) onLand(landingX);
            }}
          />
        </svg>
      </InteractiveSurface>
    </div>
  );
}
