/*
  The (very simplified) idea behind Atom Builder: an atom is a nucleus of
  protons and neutrons with electrons around it, and the number of protons
  alone decides which element it is. Kept to the three particles and three
  elements a first lesson needs - real isotopes, ions and orbitals are for
  a much later lesson, not this one.
*/

export interface ElementTarget {
  name: string;
  protons: number;
  neutrons: number;
  electrons: number;
  /** A kid-friendly one-liner about what makes this element worth knowing. */
  funFact: string;
}

export const ELEMENTS: ElementTarget[] = [
  {
    name: 'Hydrogen',
    protons: 1,
    neutrons: 0,
    electrons: 1,
    funFact: 'The simplest atom there is - just one proton and one electron, no neutrons at all.',
  },
  {
    name: 'Helium',
    protons: 2,
    neutrons: 2,
    electrons: 2,
    funFact: "It's what makes balloons float - two of every particle.",
  },
  {
    name: 'Carbon',
    protons: 6,
    neutrons: 6,
    electrons: 6,
    funFact: 'Six of everything - and the building block of every living thing, including you!',
  },
];

/**
 * Organic-looking packing for however many particles sit in the nucleus,
 * via the classic sunflower-seed spiral (each particle a little farther out
 * and rotated by the golden angle from the last) - handles any count
 * cleanly without a hand-placed layout per element.
 */
export function nucleusOffsets(count: number, spacing = 3.4): { x: number; y: number }[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const offsets: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const radius = spacing * Math.sqrt(i + 0.5);
    const angle = i * goldenAngle;
    offsets.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return offsets;
}

/** Evenly spaced points around the electron ring. */
export function electronPositions(count: number, radius: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return positions;
}
