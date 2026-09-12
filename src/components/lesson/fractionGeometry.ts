/*
  The maths behind every fraction activity.

  A shape is a whole plus a list of cuts. Cuts are stored as normalised values so
  the same model works for a pizza (cuts through the centre) and a chocolate bar
  (straight cuts across the bar), and regions - the actual pieces - are derived
  from the cuts every render. "Equal parts" is then simply: do all derived regions
  have the same area?
*/

export type ShapeKind = 'circle' | 'square' | 'rect';
export type CutAxis = 'radial' | 'v' | 'h';

export interface Cut {
  axis: CutAxis;
  /** radial: angle in radians folded into [0, PI). v/h: position in (0, 1). */
  t: number;
}

export interface Region {
  id: string;
  path: string;
  /** Share of the whole shape, 0-1. */
  area: number;
  cx: number;
  cy: number;
  /** Hit-test data: an angular slice for circles, a box for everything else. */
  sector?: { start: number; end: number };
  box?: { left: number; top: number; right: number; bottom: number };
}

export interface ShapeMetrics {
  width: number;
  height: number;
}

export const SHAPE_METRICS: Record<ShapeKind, ShapeMetrics> = {
  circle: { width: 100, height: 100 },
  square: { width: 100, height: 100 },
  rect: { width: 100, height: 62 },
};

const CIRCLE = { cx: 50, cy: 50, r: 44 };
const RECT_INSET = 4;

function foldAngle(angle: number) {
  let a = angle % Math.PI;
  if (a < 0) a += Math.PI;
  return a;
}

const SNAP_ANGLES = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
const SNAP_POSITIONS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75];

/** Nudges a nearly-right cut onto the exact line - kids aim, they don't measure. */
function snap(value: number, candidates: number[], tolerance: number) {
  let best = value;
  let bestDelta = tolerance;
  for (const candidate of candidates) {
    const delta = Math.abs(candidate - value);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

export interface CutFromPointOptions {
  allow: CutAxis[];
  /** Dominant direction of recent movement, used to choose cut orientation. */
  moveAxis?: 'x' | 'y';
  snapping?: boolean;
}

export function cutFromPoint(
  kind: ShapeKind,
  point: { x: number; y: number },
  { allow, moveAxis = 'y', snapping = true }: CutFromPointOptions,
): Cut | null {
  const { width, height } = SHAPE_METRICS[kind];

  if (allow.includes('radial')) {
    const angle = foldAngle(Math.atan2(point.y - CIRCLE.cy, point.x - CIRCLE.cx));
    return { axis: 'radial', t: snapping ? snap(angle, SNAP_ANGLES, 0.3) : angle };
  }

  const canV = allow.includes('v');
  const canH = allow.includes('h');
  if (!canV && !canH) return null;

  // Swiping sideways draws a horizontal line; swiping up/down draws a vertical one.
  const axis: CutAxis = canV && canH ? (moveAxis === 'x' ? 'h' : 'v') : canV ? 'v' : 'h';
  const raw = axis === 'v' ? point.x / width : point.y / height;
  const clamped = Math.min(0.94, Math.max(0.06, raw));
  return { axis, t: snapping ? snap(clamped, SNAP_POSITIONS, 0.08) : clamped };
}

export function isDuplicateCut(cuts: Cut[], candidate: Cut) {
  return cuts.some((cut) => {
    if (cut.axis !== candidate.axis) return false;
    if (cut.axis === 'radial') {
      const delta = Math.abs(cut.t - candidate.t);
      return Math.min(delta, Math.PI - delta) < 0.16;
    }
    return Math.abs(cut.t - candidate.t) < 0.06;
  });
}

function polar(angle: number) {
  return {
    x: CIRCLE.cx + CIRCLE.r * Math.cos(angle),
    y: CIRCLE.cy + CIRCLE.r * Math.sin(angle),
  };
}

function circleRegions(cuts: Cut[]): Region[] {
  const radial = cuts.filter((cut) => cut.axis === 'radial');
  if (radial.length === 0) {
    const left = polar(Math.PI);
    const right = polar(0);
    return [
      {
        id: 'whole',
        path: `M ${left.x} ${left.y} A ${CIRCLE.r} ${CIRCLE.r} 0 1 1 ${right.x} ${right.y} A ${CIRCLE.r} ${CIRCLE.r} 0 1 1 ${left.x} ${left.y} Z`,
        area: 1,
        cx: CIRCLE.cx,
        cy: CIRCLE.cy,
        sector: { start: 0, end: 2 * Math.PI },
      },
    ];
  }

  const bounds = radial
    .flatMap((cut) => [foldAngle(cut.t), foldAngle(cut.t) + Math.PI])
    .sort((a, b) => a - b);

  return bounds.map((start, index) => {
    const end = index === bounds.length - 1 ? bounds[0] + 2 * Math.PI : bounds[index + 1];
    const sweep = end - start;
    const from = polar(start);
    const to = polar(end);
    const mid = start + sweep / 2;
    return {
      id: `s${index}`,
      path: `M ${CIRCLE.cx} ${CIRCLE.cy} L ${from.x} ${from.y} A ${CIRCLE.r} ${CIRCLE.r} 0 ${
        sweep > Math.PI ? 1 : 0
      } 1 ${to.x} ${to.y} Z`,
      area: sweep / (2 * Math.PI),
      cx: CIRCLE.cx + Math.cos(mid) * CIRCLE.r * 0.55,
      cy: CIRCLE.cy + Math.sin(mid) * CIRCLE.r * 0.55,
      sector: { start, end },
    };
  });
}

function boxRegions(kind: ShapeKind, cuts: Cut[]): Region[] {
  const { width, height } = SHAPE_METRICS[kind];
  const x0 = RECT_INSET;
  const y0 = RECT_INSET;
  const x1 = width - RECT_INSET;
  const y1 = height - RECT_INSET;

  const xs = [
    x0,
    ...cuts
      .filter((cut) => cut.axis === 'v')
      .map((cut) => x0 + cut.t * (x1 - x0))
      .sort((a, b) => a - b),
    x1,
  ];
  const ys = [
    y0,
    ...cuts
      .filter((cut) => cut.axis === 'h')
      .map((cut) => y0 + cut.t * (y1 - y0))
      .sort((a, b) => a - b),
    y1,
  ];

  const total = (x1 - x0) * (y1 - y0);
  const regions: Region[] = [];
  for (let row = 0; row < ys.length - 1; row += 1) {
    for (let col = 0; col < xs.length - 1; col += 1) {
      const left = xs[col];
      const right = xs[col + 1];
      const top = ys[row];
      const bottom = ys[row + 1];
      regions.push({
        id: `r${row}c${col}`,
        path: `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`,
        area: ((right - left) * (bottom - top)) / total,
        cx: (left + right) / 2,
        cy: (top + bottom) / 2,
        box: { left, top, right, bottom },
      });
    }
  }
  return regions;
}

export function buildRegions(kind: ShapeKind, cuts: Cut[]): Region[] {
  return kind === 'circle' ? circleRegions(cuts) : boxRegions(kind, cuts);
}

/** True when every piece is the same size (within a child-friendly tolerance). */
export function areEqualParts(regions: Region[], tolerance = 0.07) {
  if (regions.length < 2) return true;
  const areas = regions.map((region) => region.area);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  return (max - min) / max <= tolerance;
}

export function regionAt(regions: Region[], kind: ShapeKind, point: { x: number; y: number }) {
  if (kind === 'circle') {
    const dx = point.x - CIRCLE.cx;
    const dy = point.y - CIRCLE.cy;
    if (Math.hypot(dx, dy) > CIRCLE.r) return null;

    const raw = Math.atan2(dy, dx);
    const angle = raw < 0 ? raw + 2 * Math.PI : raw;
    return (
      regions.find((region) => {
        if (!region.sector) return false;
        const { start, end } = region.sector;
        return (angle >= start && angle < end) || (angle + 2 * Math.PI >= start && angle + 2 * Math.PI < end);
      }) ?? null
    );
  }

  return (
    regions.find(
      (region) =>
        region.box &&
        point.x >= region.box.left &&
        point.x <= region.box.right &&
        point.y >= region.box.top &&
        point.y <= region.box.bottom,
    ) ?? null
  );
}

/** Preview geometry for the dashed guide line that follows the finger. */
export function cutGuideLine(kind: ShapeKind, cut: Cut) {
  const { width, height } = SHAPE_METRICS[kind];
  if (cut.axis === 'radial') {
    const a = polar(cut.t);
    const b = polar(cut.t + Math.PI);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }
  if (cut.axis === 'v') {
    const x = RECT_INSET + cut.t * (width - RECT_INSET * 2);
    return { x1: x, y1: RECT_INSET, x2: x, y2: height - RECT_INSET };
  }
  const y = RECT_INSET + cut.t * (height - RECT_INSET * 2);
  return { x1: RECT_INSET, y1: y, x2: width - RECT_INSET, y2: y };
}
