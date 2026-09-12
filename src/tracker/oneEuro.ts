/**
 * One Euro filter: smooths a noisy scalar signal while adapting to its speed, so
 * a fingertip held still stops shaking but a fast swipe does not lag behind.
 */
export function makeOneEuroFilter(minCutoff = 1.4, beta = 0.35, dCutoff = 1) {
  let xPrev: number | null = null;
  let dxPrev = 0;
  let tPrev: number | null = null;

  const alpha = (dt: number, cutoff: number) => {
    const r = 2 * Math.PI * cutoff * dt;
    return r / (r + 1);
  };

  return {
    filter(value: number, t: number) {
      if (tPrev === null || xPrev === null) {
        tPrev = t;
        xPrev = value;
        return value;
      }
      const dt = Math.max(t - tPrev, 1e-6);
      tPrev = t;
      const dx = (value - xPrev) / dt;
      const aD = alpha(dt, dCutoff);
      const dxHat = aD * dx + (1 - aD) * dxPrev;
      const a = alpha(dt, minCutoff + beta * Math.abs(dxHat));
      const xHat = a * value + (1 - a) * xPrev;
      xPrev = xHat;
      dxPrev = dxHat;
      return xHat;
    },
    reset() {
      xPrev = null;
      dxPrev = 0;
      tPrev = null;
    },
  };
}
