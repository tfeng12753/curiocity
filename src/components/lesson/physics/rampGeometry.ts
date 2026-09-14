/*
  The maths behind Motion Ramps: how tall you make the ramp decides how far
  the ball rolls. Deliberately linear and noise-free (no friction variance,
  no randomness) - the whole point is that a student can feel out the
  relationship by trying heights and watching what happens, the same way
  fractionGeometry.ts keeps its own maths simple enough to reason about by
  eye rather than by formula.
*/

/** A 0-100 scene, same convention FractionCanvas's shapes use. */
export const VIEW_W = 100;
export const VIEW_H = 100;

export const GROUND_Y = 80;
export const RAMP_TOP_X = 14;
export const RAMP_BASE_X = 32;
export const MAX_HEIGHT = 52;

/** Where pointing straight up (height = MAX_HEIGHT) and straight down
 *  (height = 0) land on screen - the vertical gauge drawn beside the ramp. */
export const GAUGE_TOP_Y = GROUND_Y - MAX_HEIGHT;
export const GAUGE_BOTTOM_Y = GROUND_Y;

/** How many scene-units the ball rolls per unit of ramp height. */
const DISTANCE_PER_HEIGHT = 1;

export interface RampTarget {
  /** Where the ball needs to land, in scene x-units. */
  x: number;
  /** How close counts as "close enough" - a real hand aiming at a height
   *  gauge is never going to land pixel-perfect, and shouldn't need to. */
  tolerance: number;
}

export function heightToLandingX(height: number): number {
  const clamped = Math.max(0, Math.min(MAX_HEIGHT, height));
  return RAMP_BASE_X + clamped * DISTANCE_PER_HEIGHT;
}

export function heightFromPointerY(y: number): number {
  const fraction = (GAUGE_BOTTOM_Y - y) / (GAUGE_BOTTOM_Y - GAUGE_TOP_Y);
  return Math.max(0, Math.min(MAX_HEIGHT, fraction * MAX_HEIGHT));
}

export function isOnTarget(landingX: number, target: RampTarget): boolean {
  return Math.abs(landingX - target.x) <= target.tolerance;
}

/** The ramp's top-left point for a given height - the ball's starting spot. */
export function rampTop(height: number): { x: number; y: number } {
  return { x: RAMP_TOP_X, y: GROUND_Y - height };
}
