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
};

interface ProgressState {
  completed: string[];
  badges: string[];
}

interface ProgressContextValue extends ProgressState {
  completeLevel: (cityId: CityId, levelId: string) => void;
  awardBadge: (badgeId: string) => void;
  isLevelComplete: (cityId: CityId, levelId: string) => boolean;
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
    if (!raw) return { completed: [], badges: [] };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return { completed: [], badges: [] };
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
    setState((prev) =>
      prev.completed.includes(key(cityId, levelId))
        ? prev
        : { ...prev, completed: [...prev.completed, key(cityId, levelId)] },
    );
  }, []);

  const awardBadge = useCallback((badgeId: string) => {
    setState((prev) =>
      prev.badges.includes(badgeId) ? prev : { ...prev, badges: [...prev.badges, badgeId] },
    );
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const isLevelComplete = (cityId: CityId, levelId: string) =>
      state.completed.includes(key(cityId, levelId));

    return {
      ...state,
      completeLevel,
      awardBadge,
      isLevelComplete,
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
      reset: () => setState({ completed: [], badges: [] }),
    };
  }, [state, completeLevel, awardBadge]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
