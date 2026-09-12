import type { VehicleId } from './vehicles';

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
  /** Groups this level under a chapter heading on the map (optional - only Math City uses this so far). */
  chapterId?: string;
  /** Another level's id that must be completed first - the map shows this one locked until then. */
  requiresLevelId?: string;
  /** What finishing this level earns the player. */
  rewardVehicleId?: VehicleId;
  coinReward?: number;
  /** Shown on the level entrance screen; falls back to a generic default when omitted. */
  learningPoints?: string[];
}

export interface ChapterDefinition {
  id: string;
  index: number;
  name: string;
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
  | 'matter-dome'
  | 'alien-outpost';

export interface CityDefinition {
  id: CityId;
  name: string;
  shortName: string;
  tagline: string;
  blurb: string;
  cta: string;
  status: LevelStatus;
  /** Flat, authoritative level list - always present, used for progress counting and rendering. */
  levels: LevelDefinition[];
  /** Optional grouping metadata for cities whose levels carry a chapterId (Math City only, for now). */
  chapters?: ChapterDefinition[];
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
    chapters: [
      { id: 'chapter-1', index: 1, name: 'Chapter 1 · Fractions' },
      { id: 'chapter-2', index: 2, name: 'Chapter 2 · Alien Outpost' },
    ],
    levels: [
      {
        id: 'fractions',
        index: 1,
        name: 'Fraction Workshop',
        tagline: 'Split wholes. Build parts. Discover fractions.',
        x: 12,
        y: 64,
        status: 'playable',
        landmark: 'fraction-workshop',
        chapterId: 'chapter-1',
        rewardVehicleId: 'bike',
        coinReward: 20,
        learningPoints: [
          'Meet a whole and split it into equal parts',
          'Discover halves, fourths and what 3/4 means',
          'Build and colour fractions with your own finger',
        ],
      },
      {
        id: 'fractions-2',
        index: 2,
        name: 'Thirds & Sixths',
        tagline: 'Trickier splits - and your first equivalent fractions.',
        x: 28,
        y: 30,
        status: 'playable',
        landmark: 'fraction-workshop',
        chapterId: 'chapter-1',
        requiresLevelId: 'fractions',
        rewardVehicleId: 'car',
        coinReward: 30,
        learningPoints: [
          'Split wholes into thirds and sixths',
          'See why 2/6 is the same amount as 1/3',
          'Cut a shape twice to make it twice as fine',
        ],
      },
      {
        id: 'fractions-3',
        index: 3,
        name: 'Fraction Challenge',
        tagline: 'Mixed practice, then prove you can compare fractions.',
        x: 44,
        y: 64,
        status: 'playable',
        landmark: 'fraction-workshop',
        chapterId: 'chapter-1',
        requiresLevelId: 'fractions-2',
        rewardVehicleId: 'spaceship',
        coinReward: 40,
        learningPoints: [
          'Practice halves, fourths, thirds and sixths in one run',
          'Decide which of two fractions is bigger',
          'Unlock the spaceship and Chapter 2',
        ],
      },
      {
        id: 'alien-1',
        index: 4,
        name: 'Alien Landing Site',
        tagline: 'Coming soon - the crew has a lot more slicing to do.',
        x: 62,
        y: 30,
        status: 'soon',
        landmark: 'alien-outpost',
        chapterId: 'chapter-2',
        requiresLevelId: 'fractions-3',
      },
      {
        id: 'alien-2',
        index: 5,
        name: 'Alien Outpost',
        tagline: 'Coming soon.',
        x: 78,
        y: 64,
        status: 'soon',
        landmark: 'alien-outpost',
        chapterId: 'chapter-2',
        requiresLevelId: 'alien-1',
      },
      {
        id: 'alien-3',
        index: 6,
        name: 'Mothership',
        tagline: 'Coming soon.',
        x: 92,
        y: 30,
        status: 'soon',
        landmark: 'alien-outpost',
        chapterId: 'chapter-2',
        requiresLevelId: 'alien-2',
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
        x: 16,
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
        x: 85,
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
        x: 16,
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
        x: 85,
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
