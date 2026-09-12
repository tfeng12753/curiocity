import { useCallback, useMemo, useState } from 'react';
import { InteractiveSurface, type SurfacePoint } from '../../tracker/InteractiveSurface';
import {
  buildRegions,
  cutFromStroke,
  cutGuideLine,
  isDuplicateCut,
  isInsideShape,
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
  /** Positions cuts should snap onto - see targetFractions. */
  targets?: number[];
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
  targets,
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
  const [strokePath, setStrokePath] = useState<string | null>(null);

  const atMaxCuts = cuts.length >= maxCuts;
  const slicing = mode === 'cut' && !atMaxCuts;

  const insideShape = useCallback(
    (point: SurfacePoint) => isInsideShape(kind, point),
    [kind],
  );

  const handleHover = useCallback(
    (point: SurfacePoint | null) => {
      if (!point) {
        setHotRegion(null);
        return;
      }
      if (mode === 'shade') {
        setHotRegion(regionAt(regions, kind, point)?.id ?? null);
      }
    },
    [mode, kind, regions],
  );

  // The stroke is drawn as it happens, so the child sees the blade following
  // their finger and can tell that the cut lands where they swiped.
  const handleStroke = useCallback(
    (points: SurfacePoint[] | null) => {
      if (!points || points.length < 2) {
        setStrokePath(null);
        setPreview(null);
        return;
      }
      setStrokePath(points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
      // Preview the cut this stroke would produce if it were finished now.
      setPreview(cutFromStroke(kind, points, { allow, targets }));
    },
    [kind, allow, targets],
  );

  const handleSlice = useCallback(
    (points: SurfacePoint[]) => {
      setStrokePath(null);
      setPreview(null);
      if (atMaxCuts) return;
      const cut = cutFromStroke(kind, points, { allow, targets });
      if (!cut || isDuplicateCut(cuts, cut)) return;
      onCut?.(cut);
    },
    [kind, allow, targets, cuts, atMaxCuts, onCut],
  );

  const dwellKey = useCallback(
    (point: SurfacePoint) => (mode === 'shade' ? (regionAt(regions, kind, point)?.id ?? null) : null),
    [mode, kind, regions],
  );

  const handleCommit = useCallback(
    (point: SurfacePoint) => {
      if (mode !== 'shade') return;
      const region = regionAt(regions, kind, point);
      if (region) onToggleRegion?.(region);
    },
    [mode, kind, regions, onToggleRegion],
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
        dwellMs={750}
        sliceMode={slicing}
        isInsideTarget={insideShape}
        onSlice={handleSlice}
        onStroke={handleStroke}
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

            {/* Toppings ride on top of the pieces. They used to be hidden the
                moment the shape exploded, which meant succeeding turned the
                pizza into a plain yellow disc at exactly the moment it should
                look most rewarding - so they stay put now. */}
            {skin === 'pizza' && (
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

          {/* The path the finger has actually travelled, so the slice reads as
              a physical motion rather than an invisible one that only shows up
              as a result. */}
          {strokePath && (
            <path d={strokePath} className="slice-trail" style={{ pointerEvents: 'none' }} />
          )}
        </svg>
      </InteractiveSurface>

      {caption && <p className="fraction-canvas__caption">{caption}</p>}
    </div>
  );
}
