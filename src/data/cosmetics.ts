/*
  The avatar wardrobe.

  Two halves, on purpose:
  - "Who you are" (skin tone, eye colour, hair style, hair colour) is always
    free. A student should be able to build a character that looks like them
    before they have earned a single coin.
  - "What you wear" (shirt, hat, accessory, pet) is the coin sink. Shirts and
    pets are the expensive end of the shop; small accessories stay cheap so
    every paid slot has something reachable early.
*/

export type CosmeticSlot =
  | 'skin'
  | 'eyes'
  | 'hair'
  | 'hairColor'
  | 'shirt'
  | 'hat'
  | 'accessory'
  | 'pet';

export interface BodyPalette {
  body: string;
  edge: string;
}

interface CosmeticBase {
  slot: CosmeticSlot;
  name: string;
  /** Equipped on a brand new save. Everything free is *owned* from the start. */
  isDefault?: boolean;
  coinCost: number;
  /** Main colour - drives the swatch on colour cards and the renderer. */
  swatch?: string;
  /** Second colour for two-tone items (shirt trim, hair shading, pet accents). */
  accent?: string;
  /** Body + outline pair, skin tones only. */
  palette?: BodyPalette;
  /** One-line flavour shown on shop cards. */
  blurb?: string;
}

const CATALOG = {
  /* ---------------------------------------------------------------- skin */
  'skin-violet': {
    slot: 'skin', name: 'Violet', isDefault: true, coinCost: 0,
    swatch: '#7a5cf0', palette: { body: '#7a5cf0', edge: '#5b3fe0' },
  },
  'skin-mint': {
    slot: 'skin', name: 'Mint', coinCost: 0,
    swatch: '#3fd68f', palette: { body: '#3fd68f', edge: '#24b473' },
  },
  'skin-coral': {
    slot: 'skin', name: 'Coral', coinCost: 0,
    swatch: '#ff6f9c', palette: { body: '#ff6f9c', edge: '#e0507e' },
  },
  'skin-sky': {
    slot: 'skin', name: 'Sky', coinCost: 0,
    swatch: '#5ad8f5', palette: { body: '#5ad8f5', edge: '#2fc2ec' },
  },
  'skin-sun': {
    slot: 'skin', name: 'Sunshine', coinCost: 0,
    swatch: '#ffc24a', palette: { body: '#ffc24a', edge: '#f0a41d' },
  },
  'skin-peach': {
    slot: 'skin', name: 'Peach', coinCost: 0,
    swatch: '#ffd3ac', palette: { body: '#ffd3ac', edge: '#e8a879' },
  },
  'skin-tan': {
    slot: 'skin', name: 'Tan', coinCost: 0,
    swatch: '#cb8d5c', palette: { body: '#cb8d5c', edge: '#a2683c' },
  },
  'skin-cocoa': {
    slot: 'skin', name: 'Cocoa', coinCost: 0,
    swatch: '#8a5a3b', palette: { body: '#8a5a3b', edge: '#5f3a24' },
  },

  /* ---------------------------------------------------------------- eyes */
  'eye-ink': { slot: 'eyes', name: 'Ink', isDefault: true, coinCost: 0, swatch: '#3a2a86', accent: '#241a56' },
  'eye-hazel': { slot: 'eyes', name: 'Hazel', coinCost: 0, swatch: '#a9701f', accent: '#5c3a0c' },
  'eye-sky': { slot: 'eyes', name: 'Sky', coinCost: 0, swatch: '#2fa8e0', accent: '#14577f' },
  'eye-leaf': { slot: 'eyes', name: 'Leaf', coinCost: 0, swatch: '#35a96c', accent: '#175c39' },
  'eye-berry': { slot: 'eyes', name: 'Berry', coinCost: 0, swatch: '#d0479a', accent: '#79185a' },
  'eye-violet': { slot: 'eyes', name: 'Violet', coinCost: 0, swatch: '#8b6bff', accent: '#3c2a9c' },

  /* ---------------------------------------------------------------- hair */
  'hair-none': { slot: 'hair', name: 'None', isDefault: true, coinCost: 0, blurb: 'Just the shine.' },
  'hair-swoop': { slot: 'hair', name: 'Swoop', coinCost: 0 },
  'hair-curls': { slot: 'hair', name: 'Curls', coinCost: 0 },
  'hair-buns': { slot: 'hair', name: 'Space Buns', coinCost: 0 },
  'hair-ponytail': { slot: 'hair', name: 'Ponytail', coinCost: 0 },
  'hair-spikes': { slot: 'hair', name: 'Spikes', coinCost: 0 },
  'hair-long': { slot: 'hair', name: 'Long', coinCost: 0 },

  /* ---------------------------------------------------------- hair colour */
  'haircolor-ink': { slot: 'hairColor', name: 'Black', isDefault: true, coinCost: 0, swatch: '#2e2455', accent: '#1b1436' },
  'haircolor-brown': { slot: 'hairColor', name: 'Brown', coinCost: 0, swatch: '#7a4a2b', accent: '#54301a' },
  'haircolor-chestnut': { slot: 'hairColor', name: 'Chestnut', coinCost: 0, swatch: '#b0603a', accent: '#7d3f22' },
  'haircolor-blonde': { slot: 'hairColor', name: 'Blonde', coinCost: 0, swatch: '#ffce6a', accent: '#e0a52f' },
  'haircolor-ginger': { slot: 'hairColor', name: 'Ginger', coinCost: 0, swatch: '#ff8a3d', accent: '#d1601c' },
  'haircolor-snow': { slot: 'hairColor', name: 'Snow', coinCost: 0, swatch: '#f2eefc', accent: '#cbc2e6' },
  'haircolor-candy': { slot: 'hairColor', name: 'Candy', coinCost: 0, swatch: '#ff6f9c', accent: '#d94478' },
  'haircolor-aqua': { slot: 'hairColor', name: 'Aqua', coinCost: 0, swatch: '#3fd0f0', accent: '#1a9ec0' },

  /* --------------------------------------------------------------- shirts */
  'shirt-none': { slot: 'shirt', name: 'No Shirt', isDefault: true, coinCost: 0 },
  'shirt-stripes': {
    slot: 'shirt', name: 'Stripey Tee', coinCost: 45,
    swatch: '#5ad8f5', accent: '#ffffff', blurb: 'Classic explorer stripes.',
  },
  'shirt-stars': {
    slot: 'shirt', name: 'Star Jersey', coinCost: 60,
    swatch: '#3c2a9c', accent: '#ffd678', blurb: 'A night sky you can wear.',
  },
  'shirt-labcoat': {
    slot: 'shirt', name: 'Lab Coat', coinCost: 75,
    swatch: '#f4f6ff', accent: '#2fc2ec', blurb: 'Official Curio-City science issue.',
  },
  'shirt-hoodie': {
    slot: 'shirt', name: 'Hoodie', coinCost: 90,
    swatch: '#ff8a4a', accent: '#ffd678', blurb: 'Cosy, with real drawstrings.',
  },
  'shirt-varsity': {
    slot: 'shirt', name: 'Varsity Jacket', coinCost: 115,
    swatch: '#e0507e', accent: '#fff3d6', blurb: 'C is for Curio-City.',
  },
  'shirt-spacesuit': {
    slot: 'shirt', name: 'Space Suit', coinCost: 150,
    swatch: '#eef2ff', accent: '#ff8f4a', blurb: 'Rated for the Alien Outpost.',
  },

  /* ----------------------------------------------------------------- hats */
  'hat-antenna': { slot: 'hat', name: 'Antenna', isDefault: true, coinCost: 0, swatch: '#ffc24a' },
  'hat-party': { slot: 'hat', name: 'Party Hat', coinCost: 30, swatch: '#ff9d5c', accent: '#ffd678' },
  'hat-beanie': { slot: 'hat', name: 'Beanie', coinCost: 40, swatch: '#3fd68f', accent: '#ffffff' },
  'hat-propeller': { slot: 'hat', name: 'Propeller Cap', coinCost: 60, swatch: '#2fc2ec', accent: '#ff6f9c' },
  'hat-crown': { slot: 'hat', name: 'Crown', coinCost: 85, swatch: '#ffc24a', accent: '#ff6f9c' },
  'hat-wizard': { slot: 'hat', name: 'Wizard Hat', coinCost: 110, swatch: '#5b3fe0', accent: '#ffd678' },

  /* ---------------------------------------------------------- accessories */
  'accessory-none': { slot: 'accessory', name: 'None', isDefault: true, coinCost: 0 },
  'accessory-bowtie': { slot: 'accessory', name: 'Bow Tie', coinCost: 25, swatch: '#ff6f9c' },
  'accessory-glasses': { slot: 'accessory', name: 'Round Glasses', coinCost: 35, swatch: '#3c2a9c' },
  'accessory-medal': { slot: 'accessory', name: 'Gold Medal', coinCost: 45, swatch: '#ffc24a', accent: '#2fc2ec' },
  'accessory-scarf': { slot: 'accessory', name: 'Scarf', coinCost: 55, swatch: '#ff8a4a', accent: '#ffd678' },
  'accessory-cape': { slot: 'accessory', name: 'Hero Cape', coinCost: 95, swatch: '#e0507e', accent: '#ffd678' },

  /* ----------------------------------------------------------------- pets */
  'pet-none': { slot: 'pet', name: 'No Pet', isDefault: true, coinCost: 0 },
  'pet-sprout': {
    slot: 'pet', name: 'Sprout', coinCost: 60,
    swatch: '#3fd68f', accent: '#ff9d5c', blurb: 'A pot plant that hums when you get one right.',
  },
  'pet-bot': {
    slot: 'pet', name: 'Beep Bot', coinCost: 95,
    swatch: '#5ad8f5', accent: '#ffc24a', blurb: 'Hovers along beside you. Very loyal.',
  },
  'pet-cat': {
    slot: 'pet', name: 'Comet Cat', coinCost: 120,
    swatch: '#8b6bff', accent: '#ffd678', blurb: 'Naps on the maths, wakes for the rockets.',
  },
  'pet-atom': {
    slot: 'pet', name: 'Buzzy Atom', coinCost: 140,
    swatch: '#ff6f9c', accent: '#2fc2ec', blurb: 'Never stops orbiting. Ever.',
  },
  'pet-dragon': {
    slot: 'pet', name: 'Bean Dragon', coinCost: 180,
    swatch: '#ff8a4a', accent: '#ffd678', blurb: 'Small, round, slightly fireproof.',
  },
} satisfies Record<string, CosmeticBase>;

export type CosmeticId = keyof typeof CATALOG;

export interface CosmeticDefinition extends CosmeticBase {
  id: CosmeticId;
}

export const COSMETICS = Object.fromEntries(
  Object.entries(CATALOG).map(([id, item]) => [id, { ...item, id }]),
) as Record<CosmeticId, CosmeticDefinition>;

export const ALL_COSMETICS: CosmeticDefinition[] = Object.values(COSMETICS);

export interface SlotMeta {
  id: CosmeticSlot;
  label: string;
  hint: string;
  /** Colour slots render as swatches; item slots render a try-it-on preview. */
  kind: 'colour' | 'item';
  /** Free slots are the "make it look like you" half of the wardrobe. */
  free: boolean;
}

export const SLOT_META: SlotMeta[] = [
  { id: 'skin', label: 'Skin', hint: 'Pick your colour', kind: 'colour', free: true },
  { id: 'eyes', label: 'Eyes', hint: 'Iris colour', kind: 'colour', free: true },
  { id: 'hair', label: 'Hair', hint: 'Style', kind: 'item', free: true },
  { id: 'hairColor', label: 'Hair Colour', hint: 'Shade', kind: 'colour', free: true },
  { id: 'shirt', label: 'Shirt', hint: 'The big-ticket look', kind: 'item', free: false },
  { id: 'hat', label: 'Hat', hint: 'Top it off', kind: 'item', free: false },
  { id: 'accessory', label: 'Accessory', hint: 'Finishing touch', kind: 'item', free: false },
  { id: 'pet', label: 'Pet', hint: 'A buddy who tags along', kind: 'item', free: false },
];

export const COSMETIC_SLOTS: CosmeticSlot[] = SLOT_META.map((slot) => slot.id);

/** Everything that costs nothing is owned from the very first visit. */
export const DEFAULT_COSMETICS: CosmeticId[] = ALL_COSMETICS.filter(
  (item) => item.coinCost === 0,
).map((item) => item.id);

export function defaultEquipped(): Partial<Record<CosmeticSlot, CosmeticId>> {
  const equipped: Partial<Record<CosmeticSlot, CosmeticId>> = {};
  for (const item of ALL_COSMETICS) {
    if (item.isDefault) equipped[item.slot] = item.id;
  }
  return equipped;
}

export function isCosmeticId(value: unknown): value is CosmeticId {
  return typeof value === 'string' && value in COSMETICS;
}

/**
 * Saves written before the wardrobe grew used `color-*` ids and a `color`
 * slot. Map those forward so a returning student keeps the look they picked.
 */
const LEGACY_IDS: Record<string, CosmeticId> = {
  'color-violet': 'skin-violet',
  'color-mint': 'skin-mint',
  'color-coral': 'skin-coral',
};

const LEGACY_SLOTS: Record<string, CosmeticSlot> = { color: 'skin' };

export function migrateCosmeticId(value: unknown): CosmeticId | null {
  if (typeof value !== 'string') return null;
  const mapped = LEGACY_IDS[value] ?? value;
  return isCosmeticId(mapped) ? mapped : null;
}

export function migrateCosmeticSlot(value: string): CosmeticSlot | null {
  const mapped = LEGACY_SLOTS[value] ?? value;
  return COSMETIC_SLOTS.includes(mapped as CosmeticSlot) ? (mapped as CosmeticSlot) : null;
}
