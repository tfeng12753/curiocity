import { COSMETICS, type CosmeticId } from '../../data/cosmetics';

const BODY_COLORS: Record<string, { body: string; edge: string }> = {
  'color-violet': { body: '#7a5cf0', edge: '#5b3fe0' },
  'color-mint': { body: '#3fd68f', edge: '#24b473' },
  'color-coral': { body: '#ff6f9c', edge: '#e0507e' },
};

export interface PlayerCharacterProps {
  size?: number;
  equipped: Partial<Record<'color' | 'hat' | 'accessory', CosmeticId>>;
}

/**
 * The player's own character - one base body with swappable colour/hat/
 * accessory cosmetics. Shares its visual family with the CurioCity logo
 * mark (rounded body, big curious eyes) so it reads as the same world.
 */
export function PlayerCharacter({ size = 96, equipped }: PlayerCharacterProps) {
  const colorId = equipped.color ?? 'color-violet';
  const hatId = equipped.hat ?? 'hat-antenna';
  const accessoryId = equipped.accessory;
  const palette = BODY_COLORS[colorId] ?? BODY_COLORS['color-violet'];

  return (
    <svg
      viewBox="0 -12 100 122"
      width={size}
      height={(size * 122) / 100}
      role="img"
      aria-label="Your character"
    >
      {hatId === 'hat-antenna' && (
        <>
          <path d="M52 34 C58 26 60 20 58 14" fill="none" stroke={palette.edge} strokeWidth="4" strokeLinecap="round" />
          <path
            d="M58 9 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2 Z"
            fill="#ffc24a"
            stroke="#f0a41d"
            strokeWidth="0.6"
          />
        </>
      )}

      {hatId === 'hat-party' && (
        <g>
          <path d="M38 30 L60 -2 L66 30 Z" fill="#ff9d5c" stroke="#e0713a" strokeWidth="2" />
          <circle cx="60" cy="-4" r="5" fill="#ffd678" stroke="#f0a41d" strokeWidth="1.5" />
          <circle cx="45" cy="20" r="2.4" fill="#fff" opacity="0.85" />
          <circle cx="53" cy="10" r="2.4" fill="#fff" opacity="0.85" />
        </g>
      )}

      {/* body */}
      <rect x="14" y="32" width="72" height="62" rx="34" fill={palette.body} stroke={palette.edge} strokeWidth="3" />

      {/* cheeks */}
      <circle cx="27" cy="74" r="5.5" fill="#ff92b6" opacity="0.65" />
      <circle cx="73" cy="74" r="5.5" fill="#ff92b6" opacity="0.65" />

      {/* eyes */}
      <ellipse cx="36" cy="62" rx="9.5" ry="11.5" fill="#fdfbff" />
      <ellipse cx="64" cy="62" rx="9.5" ry="11.5" fill="#fdfbff" />
      <circle cx="38" cy="65" r="5.2" fill="#241a56" />
      <circle cx="66" cy="65" r="5.2" fill="#241a56" />
      <circle cx="40" cy="61.5" r="1.7" fill="#fff" />
      <circle cx="68" cy="61.5" r="1.7" fill="#fff" />

      {/* smile */}
      <path d="M42 80 q8 7 16 0" fill="none" stroke="#241a56" strokeWidth="3" strokeLinecap="round" />

      {accessoryId === 'accessory-bowtie' && (
        <g transform="translate(50 96)">
          <path d="M0 0 L-12 -6 L-12 6 Z" fill="#ff6f9c" stroke="#e0507e" strokeWidth="1.5" />
          <path d="M0 0 L12 -6 L12 6 Z" fill="#ff6f9c" stroke="#e0507e" strokeWidth="1.5" />
          <circle r="3.4" fill="#ffd678" stroke="#f0a41d" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

export function cosmeticLabel(id: CosmeticId) {
  return COSMETICS[id]?.name ?? id;
}
