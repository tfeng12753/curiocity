import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CITIES, CITY_ORDER, TOTAL_LEVELS, type CityId } from '../data/cities';
import type { VehicleId } from '../data/vehicles';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: Record<string, BadgeDefinition> = {
  'fraction-explorer': {
    id: 'fraction-explorer',
    name: 'Fraction Explorer',
    description: 'Finished the Fraction Workshop adventure.',
    icon: '⭐',
  },
  'equal-parts-expert': {
    id: 'equal-parts-expert',
    name: 'Equal Parts Expert',
    description: 'Split wholes into perfectly equal parts.',
    icon: '🍕',
  },
  'whole-to-part-master': {
    id: 'whole-to-part-master',
    name: 'Whole-to-Part Master',
    description: 'Built 1/2, 1/4 and 3/4 in the final challenge.',
    icon: '🏆',
  },
  'thirds-and-sixths-explorer': {
    id: 'thirds-and-sixths-explorer',
    name: 'Thirds & Sixths Explorer',
    description: 'Split wholes into thirds and sixths, and spotted an equivalent fraction.',
    icon: '🚗',
  },
  'fraction-master': {
    id: 'fraction-master',
    name: 'Fraction Master',
    description: 'Aced the fraction challenge and compared fractions like a pro.',
    icon: '🚀',
  },
};

interface ProgressState {
  completed: string[];
  badges: string[];
  coins: number;
  unlockedVehicles: VehicleId[];
}

interface ProgressContextValue extends ProgressState {
  completeLevel: (cityId: CityId, levelId: string) => void;
  awardBadge: (badgeId: string) => void;
  isLevelComplete: (cityId: CityId, levelId: string) => boolean;
  /** False only when this level names a `requiresLevelId` that isn't complete yet. */
  isLevelUnlocked: (cityId: CityId, levelId: string) => boolean;
  cityProgress: (cityId: CityId) => { done: number; total: number };
  totalComplete: number;
  totalLevels: number;
  reset: () => void;
}

const STORAGE_KEY = 'learnverse.progress.v1';
const ProgressContext = createContext<ProgressContextValue | null>(null);

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: [], badges: [], coins: 0, unlockedVehicles: [] };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      // Both new to this version of the schema - older saved progress simply
      // won't have them yet, so they default in rather than wiping anything.
      coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
      unlockedVehicles: Array.isArray(parsed.unlockedVehicles) ? parsed.unlockedVehicles : [],
    };
  } catch {
    return { completed: [], badges: [], coins: 0, unlockedVehicles: [] };
  }
}

const key = (cityId: CityId, levelId: string) => `${cityId}/${levelId}`;

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* progress is session-nice-to-have, not critical */
    }
  }, [state]);

  const completeLevel = useCallback((cityId: CityId, levelId: string) => {
    setState((prev) => {
      if (prev.completed.includes(key(cityId, levelId))) return prev;
      const level = CITIES[cityId].levels.find((entry) => entry.id === levelId);
      const unlockedVehicles =
        level?.rewardVehicleId && !prev.unlockedVehicles.includes(level.rewardVehicleId)
          ? [...prev.unlockedVehicles, level.rewardVehicleId]
          : prev.unlockedVehicles;
      return {
        ...prev,
        completed: [...prev.completed, key(cityId, levelId)],
        coins: prev.coins + (level?.coinReward ?? 0),
        unlockedVehicles,
      };
    });
  }, []);

  const awardBadge = useCallback((badgeId: string) => {
    setState((prev) =>
      prev.badges.includes(badgeId) ? prev : { ...prev, badges: [...prev.badges, badgeId] },
    );
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const isLevelComplete = (cityId: CityId, levelId: string) =>
      state.completed.includes(key(cityId, levelId));

    const isLevelUnlocked = (cityId: CityId, levelId: string) => {
      const level = CITIES[cityId].levels.find((entry) => entry.id === levelId);
      return !level?.requiresLevelId || isLevelComplete(cityId, level.requiresLevelId);
    };

    return {
      ...state,
      completeLevel,
      awardBadge,
      isLevelComplete,
      isLevelUnlocked,
      cityProgress: (cityId: CityId) => ({
        done: CITIES[cityId].levels.filter((level) => isLevelComplete(cityId, level.id)).length,
        total: CITIES[cityId].levels.length,
      }),
      totalComplete: CITY_ORDER.reduce(
        (sum, cityId) =>
          sum + CITIES[cityId].levels.filter((level) => isLevelComplete(cityId, level.id)).length,
        0,
      ),
      totalLevels: TOTAL_LEVELS,
      reset: () => setState({ completed: [], badges: [], coins: 0, unlockedVehicles: [] }),
    };
  }, [state, completeLevel, awardBadge]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
