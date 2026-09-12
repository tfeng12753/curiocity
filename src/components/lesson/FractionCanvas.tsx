import { useCallback, useMemo, useRef, useState } from 'react';
import { InteractiveSurface, type SurfacePoint } from '../../tracker/InteractiveSurface';
import {
  buildRegions,
  cutFromPoint,
  cutGuideLine,
  isDuplicateCut,
  regionAt,
  SHAPE_METRICS,
  type Cut,
  type CutAxis,
  type Region,
  type ShapeKind,
} from './fractionGeometry';

export type Skin = 'pizza' | 'chocolate' | 'plain';

const SKINS: Record<Skin, { base: string; shaded: string; edge: string; crust?: string }> = {
  pizza: { base: '#ffd98a', shaded: '#ff9351', edge: '#e08a12', crust: '#f0b64a' },
  chocolate: { base: '#9b6142', shaded: '#5d3721', edge: '#4a2c1a' },
  plain: { base: '#ded6ff', shaded: '#7a5cf0', edge: '#5b3fe0' },
};

interface FractionCanvasProps {
  kind: ShapeKind;
  skin?: Skin;
  mode: 'view' | 'cut' | 'shade';
  cuts: Cut[];
  shaded?: string[];
  allow?: CutAxis[];
  maxCuts?: number;
  exploded?: boolean;
  nudge?: boolean;
  size?: number;
  onCut?: (cut: Cut) => void;
  onToggleRegion?: (region: Region) => void;
  caption?: string;
}

export function FractionCanvas({
  kind,
  skin = 'plain',
  mode,
  cuts,
  shaded = [],
  allow = kind === 'circle' ? ['radial'] : ['v'],
  maxCuts = 3,
  exploded = false,
  nudge = false,
  size = 340,
  onCut,
  onToggleRegion,
  caption,
}: FractionCanvasProps) {
  const { width, height } = SHAPE_METRICS[kind];
  const palette = SKINS[skin];
  const regions = useMemo(() => buildRegions(kind, cuts), [kind, cuts]);

  const [preview, setPreview] = useState<Cut | null>(null);
  const [hotRegion, setHotRegion] = useState<string | null>(null);
  const trailRef = useRef<{ x: number; y: number; t: number }[]>([]);

  const atMaxCuts = cuts.length >= maxCuts;

  const dominantAxis = (): 'x' | 'y' => {
    const now = performance.now();
    const trail = trailRef.current.filter((sample) => now - sample.t < 320);
    if (trail.length < 2) return 'y';
    const dx = Math.abs(trail[trail.length - 1].x - trail[0].x);
    const dy = Math.abs(trail[trail.length - 1].y - trail[0].y);
    return dx > dy * 1.25 ? 'x' : 'y';
  };

  const handleHover = useCallback(
    (point: SurfacePoint | null) => {
      if (!point) {
        setPreview(null);
        setHotRegion(null);
        return;
      }

      if (mode === 'cut') {
        trailRef.current.push({ x: point.x, y: point.y, t: performance.now() });
        if (trailRef.current.length > 40) trailRef.current.shift();
        if (atMaxCuts) {
          setPreview(null);
          return;
        }
        setPreview(cutFromPoint(kind, point, { allow, moveAxis: dominantAxis() }));
        return;
      }

      if (mode === 'shade') {
        setHotRegion(regionAt(regions, kind, point)?.id ?? null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, kind, allow, atMaxCuts, regions],
  );

  const dwellKey = useCallback(
    (point: SurfacePoint) => {
      if (mode === 'cut') {
        if (atMaxCuts) return null;
        const cut = cutFromPoint(kind, point, { allow, moveAxis: dominantAxis() });
        if (!cut || isDuplicateCut(cuts, cut)) return null;
        return `${cut.axis}:${Math.round(cut.t * 40)}`;
      }
      if (mode === 'shade') {
        return regionAt(regions, kind, point)?.id ?? null;
      }
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, kind, allow, cuts, regions, atMaxCuts],
  );

  const handleCommit = useCallback(
    (point: SurfacePoint) => {
      if (mode === 'cut') {
        if (atMaxCuts) return;
        const cut = cutFromPoint(kind, point, { allow, moveAxis: dominantAxis() });
        if (!cut || isDuplicateCut(cuts, cut)) return;
        onCut?.(cut);
        setPreview(null);
        return;
      }
      if (mode === 'shade') {
        const region = regionAt(regions, kind, point);
        if (region) onToggleRegion?.(region);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, kind, allow, cuts, regions, atMaxCuts, onCut, onToggleRegion],
  );

  const guide = preview ? cutGuideLine(kind, preview) : null;
  const clipId = `clip-${kind}-${skin}`;

  return (
    <div className={`fraction-canvas ${nudge ? 'is-nudge' : ''}`} style={{ width: size }}>
      <InteractiveSurface
        viewW={width}
        viewH={height}
        enabled={mode !== 'view'}
        getDwellKey={dwellKey}
        onHover={handleHover}
        onCommit={handleCommit}
        dwellMs={mode === 'cut' ? 950 : 750}
        className="fraction-canvas__surface"
        role="application"
        ariaLabel={caption ?? 'Interactive fraction shape'}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="fraction-canvas__svg">
          <defs>
            <clipPath id={clipId}>
              {kind === 'circle' ? (
                <circle cx="50" cy="50" r="44" />
              ) : (
                <rect x="4" y="4" width={width - 8} height={height - 8} rx="10" />
              )}
            </clipPath>
            <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2.4" stdDeviation="2" floodColor="#2b1d63" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* plate / board under the food */}
          {kind === 'circle' ? (
            <circle cx="50" cy="50" r="48" fill="#ffffff" opacity="0.5" />
          ) : (
            <rect x="0" y="0" width={width} height={height} rx="14" fill="#ffffff" opacity="0.45" />
          )}

          <g clipPath={exploded ? undefined : `url(#${clipId})`}>
            {regions.map((region) => {
              const isShaded = shaded.includes(region.id);
              const isHot = hotRegion === region.id && mode === 'shade';
              const offsetX = exploded ? (region.cx - width / 2) * 0.1 : 0;
              const offsetY = exploded ? (region.cy - height / 2) * 0.1 : 0;

              return (
                <g
                  key={region.id}
                  transform={`translate(${offsetX} ${offsetY})`}
                  className="fraction-piece"
                  filter={exploded ? 'url(#piece-shadow)' : undefined}
                >
                  <path
                    d={region.path}
                    fill={isShaded ? palette.shaded : palette.base}
                    stroke={palette.edge}
                    strokeWidth={kind === 'circle' ? 1.6 : 1.2}
                    strokeLinejoin="round"
                  />
                  {isShaded && (
                    <path d={region.path} fill="#ffffff" opacity="0.14" className="fraction-piece__sheen" />
                  )}
                  {isHot && !isShaded && (
                    <path d={region.path} fill="#ffffff" opacity="0.38" />
                  )}
                  {isShaded && (
                    <text
                      x={region.cx}
                      y={region.cy + 2}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#fff"
                      opacity="0.9"
                      style={{ pointerEvents: 'none' }}
                    >
                      ✓
                    </text>
                  )}
                </g>
              );
            })}

            {/* skin decoration sits on top of the pieces, but only while whole */}
            {!exploded && skin === 'pizza' && (
              <g opacity="0.85" style={{ pointerEvents: 'none' }}>
                {[
                  [34, 32],
                  [64, 30],
                  [72, 58],
                  [30, 64],
                  [50, 72],
                  [50, 46],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4.6" fill="#e4562f" stroke="#c23d1c" strokeWidth="0.8" />
                ))}
              </g>
            )}

            {!exploded && skin === 'chocolate' && (
              <g stroke="#6f452d" strokeWidth="1" opacity="0.5" style={{ pointerEvents: 'none' }}>
                <path d={`M 4 ${height / 2} H ${width - 4}`} />
                <path d={`M ${width / 4} 4 V ${height - 4}`} />
                <path d={`M ${width / 2} 4 V ${height - 4}`} />
                <path d={`M ${(width * 3) / 4} 4 V ${height - 4}`} />
              </g>
            )}
          </g>

          {/* crust ring keeps the pizza reading as a pizza after it is cut */}
          {kind === 'circle' && skin === 'pizza' && !exploded && (
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={palette.crust}
              strokeWidth="6"
              opacity="0.95"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {guide && (
            <g className="cut-guide" style={{ pointerEvents: 'none' }}>
              <line x1={guide.x1} y1={guide.y1} x2={guide.x2} y2={guide.y2} className="cut-guide__glow" />
              <line x1={guide.x1} y1={guide.y1} x2={guide.x2} y2={guide.y2} className="cut-guide__line" />
            </g>
          )}
        </svg>
      </InteractiveSurface>

      {caption && <p className="fraction-canvas__caption">{caption}</p>}
    </div>
  );
}
