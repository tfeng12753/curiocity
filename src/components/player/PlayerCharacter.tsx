import { COSMETICS, type CosmeticId } from '../../data/cosmetics';

const BODY_COLORS: Record<string, { body: string; edge: string }> = {
  'color-violet': { body: '#7a5cf0', edge: '#5b3fe0' },
  'color-mint': { body: '#3fd68f', edge: '#24b473' },
  'color-coral': { body: '#ff6f9c', edge: '#e0507e' },
};

export interface PlayerCharacterProps {
  size?: number;
  equipped: Partial<Record<'color' | 'hat' | 'accessory', CosmeticId>>;
  /**
   * Raises one arm so the hand reaches up and to the right, with the
   * fingertip landing on HAND_ANCHOR. Used when the character is acting as
   * the cursor: the hand is what actually touches things, so it - not the
   * middle of the body - is what gets placed on the tracked point.
   */
  pointing?: boolean;
}

/**
 * Where the pointing fingertip sits, as a fraction of the rendered box.
 * The cursor uses this to line the hand up with the tracked point.
 */
export const HAND_ANCHOR = { x: 0.96, y: 0.213 };

/**
 * The player's own character - one base body with swappable colour/hat/
 * accessory cosmetics. Shares its visual family with the Curio-City logo
 * mark (rounded body, big curious eyes) so it reads as the same world.
 */
export function PlayerCharacter({ size = 96, equipped, pointing = false }: PlayerCharacterProps) {
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

      {/* left arm - always relaxed at the side */}
      <path
        d="M24 48 C14 52 9 60 10 72"
        fill="none"
        stroke={palette.edge}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="10" cy="74" r="6.4" fill={palette.body} stroke={palette.edge} strokeWidth="2.4" />

      {pointing ? (
        /* right arm - reaches up and to the right, fingertip at HAND_ANCHOR (96, ~14) */
        <g>
          <path
            d="M76 46 C86 40 92 30 94 18"
            fill="none"
            stroke={palette.edge}
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* pointing hand: a small fist with the index finger extended toward the anchor */}
          <circle cx="94" cy="20" r="6.6" fill={palette.body} stroke={palette.edge} strokeWidth="2.4" />
          <path
            d="M95 20 L96.5 13.5"
            fill="none"
            stroke={palette.body}
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <path
            d="M95 20 L96.5 13.5"
            fill="none"
            stroke={palette.edge}
            strokeWidth="4.4"
            strokeLinecap="round"
            opacity="0.001"
          />
          <circle cx="96.5" cy="13" r="2.6" fill={palette.body} stroke={palette.edge} strokeWidth="2" />
        </g>
      ) : (
        /* right arm - relaxed at the side, mirroring the left */
        <g>
          <path
            d="M76 48 C86 52 91 60 90 72"
            fill="none"
            stroke={palette.edge}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="90" cy="74" r="6.4" fill={palette.body} stroke={palette.edge} strokeWidth="2.4" />
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
