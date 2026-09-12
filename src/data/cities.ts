export type CityId = 'math' | 'physics' | 'chemistry';

export type LevelStatus = 'playable' | 'soon';

export interface LevelDefinition {
  id: string;
  index: number;
  name: string;
  tagline: string;
  /** Position on the city map, in percentages of the map stage. */
  x: number;
  y: number;
  status: LevelStatus;
  /** Illustration key rendered inside the map for this destination. */
  landmark: LandmarkKind;
}

export type LandmarkKind =
  | 'fraction-workshop'
  | 'geometry-park'
  | 'multiplication-market'
  | 'puzzle-station'
  | 'number-kingdom'
  | 'motion-ramp'
  | 'energy-plant'
  | 'light-lab'
  | 'space-dome'
  | 'atom-tower'
  | 'reaction-lab'
  | 'acid-harbor'
  | 'matter-dome';

export interface CityDefinition {
  id: CityId;
  name: string;
  shortName: string;
  tagline: string;
  blurb: string;
  cta: string;
  status: LevelStatus;
  levels: LevelDefinition[];
}

export const CITIES: Record<CityId, CityDefinition> = {
  math: {
    id: 'math',
    name: 'Math City',
    shortName: 'Math',
    tagline: 'Numbers, shapes, patterns & problem solving',
    blurb: 'A city built from numbers, patterns, shapes, and puzzles.',
    cta: 'Enter City',
    status: 'playable',
    levels: [
      {
        id: 'fractions',
        index: 1,
        name: 'Fraction Workshop',
        tagline: 'Split wholes. Build parts. Discover fractions.',
        x: 16,
        y: 62,
        status: 'playable',
        landmark: 'fraction-workshop',
      },
      {
        id: 'geometry',
        index: 2,
        name: 'Geometry Park',
        tagline: 'Explore shapes, space, and form.',
        x: 34,
        y: 30,
        status: 'soon',
        landmark: 'geometry-park',
      },
      {
        id: 'multiplication',
        index: 3,
        name: 'Multiplication Market',
        tagline: 'Discover patterns through numbers.',
        x: 54,
        y: 64,
        status: 'soon',
        landmark: 'multiplication-market',
      },
      {
        id: 'puzzles',
        index: 4,
        name: 'Puzzle Station',
        tagline: 'Use what you know to solve new problems.',
        x: 72,
        y: 30,
        status: 'soon',
        landmark: 'puzzle-station',
      },
      {
        id: 'numbers',
        index: 5,
        name: 'Number Kingdom',
        tagline: 'Where every number has a home.',
        x: 88,
        y: 62,
        status: 'soon',
        landmark: 'number-kingdom',
      },
    ],
  },
  physics: {
    id: 'physics',
    name: 'Physics City',
    shortName: 'Physics',
    tagline: 'Motion, forces, energy & matter',
    blurb: 'Discover how things move. See the world in action.',
    cta: 'Explore',
    status: 'soon',
    levels: [
      {
        id: 'motion',
        index: 1,
        name: 'Motion Ramps',
        tagline: 'Push, roll, race, repeat.',
        x: 15,
        y: 60,
        status: 'soon',
        landmark: 'motion-ramp',
      },
      {
        id: 'energy',
        index: 2,
        name: 'Energy Plant',
        tagline: 'Store it, move it, use it.',
        x: 34,
        y: 28,
        status: 'soon',
        landmark: 'energy-plant',
      },
      {
        id: 'light',
        index: 3,
        name: 'Light & Vision Lab',
        tagline: 'Bounce beams and bend colour.',
        x: 54,
        y: 62,
        status: 'soon',
        landmark: 'light-lab',
      },
      {
        id: 'forces',
        index: 4,
        name: 'Force Field',
        tagline: 'Pull, push, and balance.',
        x: 72,
        y: 30,
        status: 'soon',
        landmark: 'motion-ramp',
      },
      {
        id: 'space',
        index: 5,
        name: 'Space & Universe',
        tagline: 'Gravity on the grandest scale.',
        x: 88,
        y: 62,
        status: 'soon',
        landmark: 'space-dome',
      },
    ],
  },
  chemistry: {
    id: 'chemistry',
    name: 'Chemistry City',
    shortName: 'Chemistry',
    tagline: 'Atoms, elements, reactions & materials',
    blurb: 'Mix, react, discover. The building blocks of our world.',
    cta: 'Explore',
    status: 'soon',
    levels: [
      {
        id: 'atoms',
        index: 1,
        name: 'Atoms & Elements',
        tagline: 'Meet the tiniest builders.',
        x: 14,
        y: 32,
        status: 'soon',
        landmark: 'atom-tower',
      },
      {
        id: 'reactions',
        index: 2,
        name: 'Chemical Reactions',
        tagline: 'Mix two things, make a new one.',
        x: 33,
        y: 64,
        status: 'soon',
        landmark: 'reaction-lab',
      },
      {
        id: 'acids',
        index: 3,
        name: 'Acids & Bases',
        tagline: 'Sour, slippery, and colourful.',
        x: 53,
        y: 30,
        status: 'soon',
        landmark: 'acid-harbor',
      },
      {
        id: 'matter',
        index: 4,
        name: 'Matter & Changes',
        tagline: 'Solid, liquid, gas, repeat.',
        x: 72,
        y: 64,
        status: 'soon',
        landmark: 'matter-dome',
      },
      {
        id: 'real-world',
        index: 5,
        name: 'Real World Chemistry',
        tagline: 'Kitchen science, everywhere.',
        x: 88,
        y: 32,
        status: 'soon',
        landmark: 'reaction-lab',
      },
    ],
  },
};

export const CITY_ORDER: CityId[] = ['math', 'physics', 'chemistry'];

export const TOTAL_LEVELS = CITY_ORDER.reduce(
  (total, id) => total + CITIES[id].levels.length,
  0,
);
