export type CosmeticSlot = 'color' | 'hat' | 'accessory';
export type CosmeticId = 'color-violet' | 'color-mint' | 'color-coral' | 'hat-antenna' | 'hat-party' | 'accessory-bowtie';

export interface CosmeticDefinition {
  id: CosmeticId;
  slot: CosmeticSlot;
  name: string;
  /** Free and pre-equipped from the start. */
  isDefault?: boolean;
  coinCost: number;
}

/** Kept small on purpose - one base player character, a handful of swaps. */
export const COSMETICS: Record<CosmeticId, CosmeticDefinition> = {
  'color-violet': { id: 'color-violet', slot: 'color', name: 'Violet', isDefault: true, coinCost: 0 },
  'color-mint': { id: 'color-mint', slot: 'color', name: 'Mint', coinCost: 20 },
  'color-coral': { id: 'color-coral', slot: 'color', name: 'Coral', coinCost: 20 },
  'hat-antenna': { id: 'hat-antenna', slot: 'hat', name: 'Antenna', isDefault: true, coinCost: 0 },
  'hat-party': { id: 'hat-party', slot: 'hat', name: 'Party Hat', coinCost: 30 },
  'accessory-bowtie': { id: 'accessory-bowtie', slot: 'accessory', name: 'Bow Tie', coinCost: 25 },
};

export const COSMETIC_SLOTS: CosmeticSlot[] = ['color', 'hat', 'accessory'];

export const DEFAULT_COSMETICS: CosmeticId[] = Object.values(COSMETICS)
  .filter((item) => item.isDefault)
  .map((item) => item.id);

export function defaultEquipped(): Partial<Record<CosmeticSlot, CosmeticId>> {
  const equipped: Partial<Record<CosmeticSlot, CosmeticId>> = {};
  for (const item of Object.values(COSMETICS)) {
    if (item.isDefault) equipped[item.slot] = item.id;
  }
  return equipped;
}
