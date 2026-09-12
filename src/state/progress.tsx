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
import type { IconName } from '../components/icons/Icon';
import type { VehicleId } from '../data/vehicles';
import {
  COSMETICS,
  DEFAULT_COSMETICS,
  defaultEquipped,
  migrateCosmeticId,
  migrateCosmeticSlot,
  type CosmeticId,
  type CosmeticSlot,
} from '../data/cosmetics';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  /** Drawn from the shared icon set - see components/icons/Icon.tsx. */
  icon: IconName;
}

export const BADGES: Record<string, BadgeDefinition> = {
  'fraction-explorer': {
    id: 'fraction-explorer',
    name: 'Fraction Explorer',
    description: 'Finished the Fraction Workshop adventure.',
    icon: 'star',
  },
  'equal-parts-expert': {
    id: 'equal-parts-expert',
    name: 'Equal Parts Expert',
    description: 'Split wholes into perfectly equal parts.',
    icon: 'pizza',
  },
  'whole-to-part-master': {
    id: 'whole-to-part-master',
    name: 'Whole-to-Part Master',
    description: 'Built 1/2, 1/4 and 3/4 in the final challenge.',
    icon: 'trophy',
  },
  'thirds-and-sixths-explorer': {
    id: 'thirds-and-sixths-explorer',
    name: 'Thirds & Sixths Explorer',
    description: 'Split wholes into thirds and sixths, and spotted an equivalent fraction.',
    icon: 'car',
  },
  'fraction-master': {
    id: 'fraction-master',
    name: 'Fraction Master',
    description: 'Aced the fraction challenge and compared fractions like a pro.',
    icon: 'rocket',
  },
};

interface ProgressState {
  completed: string[];
  badges: string[];
  coins: number;
  unlockedVehicles: VehicleId[];
  unlockedCosmetics: CosmeticId[];
  equippedCosmetics: Partial<Record<CosmeticSlot, CosmeticId>>;
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
  /** Spends coins to unlock a cosmetic; no-ops if already owned or unaffordable. */
  unlockCosmetic: (id: CosmeticId) => void;
  /** Equips an already-unlocked cosmetic into its slot. */
  equipCosmetic: (id: CosmeticId) => void;
  reset: () => void;
}

const STORAGE_KEY = 'learnverse.progress.v1';
const ProgressContext = createContext<ProgressContextValue | null>(null);

function freshState(): ProgressState {
  return {
    completed: [],
    badges: [],
    coins: 0,
    unlockedVehicles: [],
    unlockedCosmetics: DEFAULT_COSMETICS,
    equippedCosmetics: defaultEquipped(),
  };
}

/**
 * Wardrobe entries are rewritten rather than trusted: the catalogue grows
 * between releases, so a save can hold ids that have been renamed (the old
 * `color-*` skins) or removed entirely. Anything that no longer resolves is
 * dropped, and every free item is re-granted so new free content shows up
 * for students who already have a save.
 */
function sanitizeUnlocked(stored: unknown): CosmeticId[] {
  const owned = new Set<CosmeticId>(DEFAULT_COSMETICS);
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      const id = migrateCosmeticId(entry);
      if (id) owned.add(id);
    }
  }
  return [...owned];
}

function sanitizeEquipped(
  stored: unknown,
  owned: CosmeticId[],
): Partial<Record<CosmeticSlot, CosmeticId>> {
  const equipped = defaultEquipped();
  if (stored && typeof stored === 'object') {
    for (const [slotKey, value] of Object.entries(stored as Record<string, unknown>)) {
      const slot = migrateCosmeticSlot(slotKey);
      const id = migrateCosmeticId(value);
      // An item can only stay equipped while it is still owned - otherwise a
      // stale save could wear something it never paid for.
      if (slot && id && COSMETICS[id].slot === slot && owned.includes(id)) equipped[slot] = id;
    }
  }
  return equipped;
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const unlockedCosmetics = sanitizeUnlocked(parsed.unlockedCosmetics);
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      // All new to this version of the schema - older saved progress simply
      // won't have them yet, so they default in rather than wiping anything.
      coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
      unlockedVehicles: Array.isArray(parsed.unlockedVehicles) ? parsed.unlockedVehicles : [],
      unlockedCosmetics,
      equippedCosmetics: sanitizeEquipped(parsed.equippedCosmetics, unlockedCosmetics),
    };
  } catch {
    return freshState();
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

  const unlockCosmetic = useCallback((id: CosmeticId) => {
    setState((prev) => {
      if (prev.unlockedCosmetics.includes(id)) return prev;
      const item = COSMETICS[id];
      if (!item || prev.coins < item.coinCost) return prev;
      return {
        ...prev,
        coins: prev.coins - item.coinCost,
        unlockedCosmetics: [...prev.unlockedCosmetics, id],
      };
    });
  }, []);

  const equipCosmetic = useCallback((id: CosmeticId) => {
    setState((prev) => {
      const item = COSMETICS[id];
      if (!item || !prev.unlockedCosmetics.includes(id)) return prev;
      return { ...prev, equippedCosmetics: { ...prev.equippedCosmetics, [item.slot]: id } };
    });
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
      unlockCosmetic,
      equipCosmetic,
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
      reset: () => setState(freshState()),
    };
  }, [state, completeLevel, awardBadge, unlockCosmetic, equipCosmetic]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
