import { useId, type ReactNode } from 'react';
import { COSMETICS, type CosmeticId, type CosmeticSlot } from '../../data/cosmetics';

export type EquippedCosmetics = Partial<Record<CosmeticSlot, CosmeticId>>;

export interface PlayerCharacterProps {
  size?: number;
  equipped: EquippedCosmetics;
  /**
   * Raises one arm so the hand reaches up and to the right, with the
   * fingertip landing on HAND_ANCHOR. Used when the character is acting as
   * the cursor: the hand is what actually touches things, so it - not the
   * middle of the body - is what gets placed on the tracked point.
   */
  pointing?: boolean;
  /** Pets bob and atoms spin; turned off for tiny shop thumbnails. */
  animated?: boolean;
  /** Pets turn to mush below ~60px, so the cursor leaves its buddy at home. */
  showPet?: boolean;
}

/**
 * Where the pointing fingertip sits, as a fraction of the rendered box.
 * The cursor uses this to line the hand up with the tracked point.
 */
export const HAND_ANCHOR = { x: 0.96, y: 0.213 };

const FALLBACK_SKIN = { body: '#7a5cf0', edge: '#5b3fe0' };

/* The body is a rounded blob: rect(14,32 - 86,94) with a 34x31 corner radius,
   so the "head" is the dome above y=63 and the shirt hangs off the bottom. */
const BODY = { x: 14, y: 32, w: 72, h: 62, r: 34 };
const TORSO = { x: 22, y: 82, w: 56, h: 28, r: 12 };

/** Outer silhouette every hair style is built on - it hugs the dome. */
const HAIR_DOME = 'M12 66 C12 38 28 26 50 26 C72 26 88 38 88 66';
const HAIR_CAP = `${HAIR_DOME} C86 52 72 46 50 46 C28 46 14 52 12 66 Z`;

function look(equipped: EquippedCosmetics, slot: CosmeticSlot) {
  const id = equipped[slot];
  return id ? COSMETICS[id] : undefined;
}

/* ------------------------------------------------------------------- hair */

function HairBack({ style, color, shade }: { style: string; color: string; shade: string }) {
  if (style === 'hair-ponytail') {
    return (
      <g>
        <path d="M24 40 C8 22 -8 28 -7 44 C0 33 12 35 27 48 Z" fill={color} />
        <path d="M24 40 C12 30 2 31 -3 38 C6 33 16 36 26 44 Z" fill={shade} opacity="0.4" />
      </g>
    );
  }
  if (style === 'hair-long') {
    return (
      <g>
        <path d="M16 46 C0 60 -2 88 4 104 L22 104 C12 88 12 62 24 50 Z" fill={color} />
        <path d="M84 46 C100 60 102 88 96 104 L78 104 C88 88 88 62 76 50 Z" fill={color} />
        <path d="M16 46 C4 60 2 84 5 98 C4 78 7 60 20 50 Z" fill={shade} opacity="0.35" />
      </g>
    );
  }
  return null;
}

function HairTop({ style, color, shade }: { style: string; color: string; shade: string }) {
  if (style === 'hair-none') return null;

  const cap = <path d={HAIR_CAP} fill={color} />;

  if (style === 'hair-curls') {
    return (
      <g>
        {cap}
        {[
          { cx: 19, cy: 56, r: 10 },
          { cx: 30, cy: 39, r: 11 },
          { cx: 45, cy: 30, r: 12 },
          { cx: 60, cy: 31, r: 11.5 },
          { cx: 74, cy: 40, r: 10.5 },
          { cx: 83, cy: 56, r: 9.5 },
        ].map((curl) => (
          <circle key={curl.cx} cx={curl.cx} cy={curl.cy} r={curl.r} fill={color} />
        ))}
        <circle cx="41" cy="28" r="4" fill="#fff" opacity="0.22" />
        <circle cx="60" cy="28" r="3" fill="#fff" opacity="0.18" />
      </g>
    );
  }

  if (style === 'hair-spikes') {
    return (
      <g>
        {cap}
        <path
          d="M11 62 L19 30 L27 48 L36 22 L45 44 L52 20 L61 44 L70 24 L78 46 L86 32 L89 62 Z"
          fill={color}
        />
        <path d="M36 22 L41 36 L45 30 Z" fill={shade} opacity="0.5" />
        <path d="M70 24 L74 38 L78 32 Z" fill={shade} opacity="0.5" />
      </g>
    );
  }

  if (style === 'hair-buns') {
    return (
      <g>
        {cap}
        <circle cx="15" cy="35" r="11" fill={color} />
        <circle cx="85" cy="35" r="11" fill={color} />
        <circle cx="12" cy="31" r="3.6" fill="#fff" opacity="0.28" />
        <circle cx="82" cy="31" r="3.6" fill="#fff" opacity="0.28" />
        <path d="M30 34 C40 27 60 27 70 34" fill="none" stroke={shade} strokeWidth="2.4" opacity="0.45" />
      </g>
    );
  }

  if (style === 'hair-swoop') {
    return (
      <g>
        <path
          d={`${HAIR_DOME} C84 44 66 32 46 42 C33 49 24 57 21 68 Z`}
          fill={color}
        />
        <path d="M50 26 C66 27 78 33 85 44 C76 36 64 32 50 32 Z" fill={shade} opacity="0.35" />
        <circle cx="34" cy="35" r="4" fill="#fff" opacity="0.2" />
      </g>
    );
  }

  if (style === 'hair-ponytail') {
    return (
      <g>
        {cap}
        <path d="M12 64 C16 44 30 34 50 34 C68 34 80 42 86 56 C76 44 62 40 48 42 C32 44 20 52 16 66 Z" fill={color} />
        <circle cx="19" cy="45" r="4.5" fill={shade} />
      </g>
    );
  }

  /* hair-long */
  return (
    <g>
      {cap}
      <path d="M12 66 C14 44 30 30 50 30 C70 30 86 44 88 66 C82 48 68 42 50 42 C32 42 18 48 12 66 Z" fill={color} />
      <path d="M50 30 C50 36 50 40 50 44" stroke={shade} strokeWidth="2.4" opacity="0.5" />
    </g>
  );
}

/* ------------------------------------------------------------------ shirt */

function Shirt({
  style,
  base,
  accent,
  clipId,
}: {
  style: string;
  base: string;
  accent: string;
  clipId: string;
}) {
  const torso = (
    <rect x={TORSO.x} y={TORSO.y} width={TORSO.w} height={TORSO.h} rx={TORSO.r} fill={base} />
  );

  return (
    <g>
      {style === 'shirt-hoodie' && (
        /* hood collar, bunched behind the shoulders */
        <path d="M20 88 C20 72 34 66 50 66 C66 66 80 72 80 88 Z" fill={accent} opacity="0.9" />
      )}
      {torso}
      <g clipPath={`url(#${clipId})`}>
        {style === 'shirt-stripes' && (
          <>
            <rect x="20" y="86" width="60" height="5" fill={accent} />
            <rect x="20" y="95" width="60" height="5" fill={accent} />
            <rect x="20" y="104" width="60" height="5" fill={accent} />
          </>
        )}

        {style === 'shirt-stars' && (
          <>
            {[
              { x: 34, y: 92, s: 1 },
              { x: 62, y: 89, s: 0.8 },
              { x: 48, y: 102, s: 0.9 },
              { x: 70, y: 103, s: 0.7 },
            ].map((star) => (
              <path
                key={`${star.x}-${star.y}`}
                transform={`translate(${star.x} ${star.y}) scale(${star.s})`}
                d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z"
                fill={accent}
              />
            ))}
          </>
        )}

        {style === 'shirt-labcoat' && (
          <>
            <path d="M50 82 L38 110 L22 110 L22 82 Z" fill="#e7ecff" />
            <path d="M50 82 L42 96 L34 82 Z" fill={accent} />
            <path d="M50 82 L58 96 L66 82 Z" fill={accent} />
            <rect x="58" y="94" width="14" height="11" rx="3" fill="#dfe6ff" />
            <circle cx="50" cy="98" r="2.2" fill="#c3ccef" />
            <circle cx="50" cy="106" r="2.2" fill="#c3ccef" />
          </>
        )}

        {style === 'shirt-hoodie' && (
          <>
            <path d="M40 82 C44 92 56 92 60 82" fill={accent} opacity="0.55" />
            <rect x="28" y="98" width="44" height="12" rx="6" fill={accent} opacity="0.35" />
          </>
        )}

        {style === 'shirt-varsity' && (
          <>
            <rect x="22" y="82" width="10" height="28" fill={accent} />
            <rect x="68" y="82" width="10" height="28" fill={accent} />
            <rect x="22" y="104" width="56" height="6" fill={accent} />
            <text
              x="50"
              y="101"
              textAnchor="middle"
              fontSize="16"
              fontWeight="800"
              fontFamily="'Baloo 2', sans-serif"
              fill={accent}
            >
              C
            </text>
          </>
        )}

        {style === 'shirt-spacesuit' && (
          <>
            <rect x="22" y="82" width="56" height="7" fill={accent} />
            <rect x="34" y="92" width="32" height="14" rx="5" fill="#cfd8f5" />
            <circle cx="42" cy="99" r="2.6" fill="#3fd68f" />
            <circle cx="50" cy="99" r="2.6" fill={accent} />
            <circle cx="58" cy="99" r="2.6" fill="#5ad8f5" />
            <rect x="22" y="106" width="56" height="4" fill={accent} opacity="0.6" />
          </>
        )}
      </g>

      {style === 'shirt-hoodie' && (
        <g stroke={accent} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M44 86 L43 96" />
          <path d="M56 86 L57 96" />
          <circle cx="43" cy="97.6" r="1.8" fill={accent} stroke="none" />
          <circle cx="57" cy="97.6" r="1.8" fill={accent} stroke="none" />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------- hats */

function Hat({ style, base, accent, edge, animated }: {
  style: string;
  base: string;
  accent: string;
  edge: string;
  animated: boolean;
}) {
  if (style === 'hat-antenna') {
    return (
      <g>
        <path d="M52 34 C58 26 60 20 58 14" fill="none" stroke={edge} strokeWidth="4" strokeLinecap="round" />
        <path
          d="M58 9 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2 Z"
          fill={base}
          stroke="#f0a41d"
          strokeWidth="0.6"
        />
      </g>
    );
  }

  if (style === 'hat-party') {
    return (
      <g>
        <path d="M38 30 L60 -2 L66 30 Z" fill={base} stroke="#e0713a" strokeWidth="2" />
        <circle cx="60" cy="-4" r="5" fill={accent} stroke="#f0a41d" strokeWidth="1.5" />
        <circle cx="45" cy="20" r="2.4" fill="#fff" opacity="0.85" />
        <circle cx="53" cy="10" r="2.4" fill="#fff" opacity="0.85" />
      </g>
    );
  }

  if (style === 'hat-beanie') {
    return (
      <g>
        <path d="M14 50 C14 26 30 16 50 16 C70 16 86 26 86 50 Z" fill={base} />
        <path d="M50 16 C42 26 38 38 38 50 L50 50 Z" fill="#000" opacity="0.07" />
        <rect x="11" y="40" width="78" height="12" rx="6" fill={accent} />
        <circle cx="50" cy="13" r="7.5" fill={accent} />
      </g>
    );
  }

  if (style === 'hat-propeller') {
    return (
      <g>
        <path d="M22 48 C22 30 34 22 50 22 C66 22 78 30 78 48 Z" fill={base} />
        <path d="M50 22 C44 28 41 38 41 48 L59 48 C59 38 56 28 50 22 Z" fill={accent} opacity="0.8" />
        <rect x="19" y="43" width="62" height="8" rx="4" fill={accent} />
        <g
          className={animated ? 'spin-slow' : undefined}
          style={{ transformOrigin: '50px 17px' }}
        >
          <ellipse cx="33" cy="17" rx="15" ry="3.8" fill="#fff" stroke={accent} strokeWidth="1.4" />
          <ellipse cx="67" cy="17" rx="15" ry="3.8" fill="#fff" stroke={accent} strokeWidth="1.4" />
        </g>
        <circle cx="50" cy="17" r="3.4" fill={accent} />
      </g>
    );
  }

  if (style === 'hat-crown') {
    return (
      <g>
        <path d="M18 52 L26 26 L37 42 L50 18 L63 42 L74 26 L82 52 Z" fill={base} stroke="#f0a41d" strokeWidth="2" strokeLinejoin="round" />
        <rect x="17" y="48" width="66" height="10" rx="5" fill="#f0a41d" />
        <circle cx="50" cy="53" r="3.4" fill={accent} />
        <circle cx="30" cy="53" r="2.6" fill="#5ad8f5" />
        <circle cx="70" cy="53" r="2.6" fill="#5ad8f5" />
      </g>
    );
  }

  /* hat-wizard */
  return (
    <g>
      <path d="M52 -10 C58 8 66 30 74 46 L26 46 C34 30 44 10 52 -10 Z" fill={base} />
      <path d="M52 -10 C50 12 46 32 40 46 L26 46 C34 30 44 10 52 -10 Z" fill="#fff" opacity="0.1" />
      <ellipse cx="50" cy="46" rx="36" ry="9" fill={base} />
      <ellipse cx="50" cy="44" rx="36" ry="9" fill="#7a5cf0" />
      <path d="M58 6 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6 Z" fill={accent} />
      <path d="M44 26 l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3 Z" fill={accent} />
    </g>
  );
}

/* ------------------------------------------------------------- accessories */

function AccessoryBack({ style, base, accent }: { style: string; base: string; accent: string }) {
  if (style !== 'accessory-cape') return null;
  return (
    <g>
      <path d="M28 54 C6 74 2 98 6 110 L94 110 C98 98 94 74 72 54 Z" fill={base} />
      <path d="M50 58 C44 76 42 96 44 110 L56 110 C58 96 56 76 50 58 Z" fill={accent} opacity="0.35" />
    </g>
  );
}

function AccessoryFront({ style, base, accent }: { style: string; base: string; accent: string }) {
  if (style === 'accessory-bowtie') {
    return (
      <g transform="translate(50 90)">
        <path d="M0 0 L-13 -7 L-13 7 Z" fill={base} stroke="#e0507e" strokeWidth="1.5" />
        <path d="M0 0 L13 -7 L13 7 Z" fill={base} stroke="#e0507e" strokeWidth="1.5" />
        <circle r="3.6" fill="#ffd678" stroke="#f0a41d" strokeWidth="1" />
      </g>
    );
  }

  if (style === 'accessory-glasses') {
    return (
      <g fill="none" stroke={base} strokeWidth="3.2" strokeLinecap="round">
        <circle cx="36" cy="62" r="12.5" fill="#eaf4ff" fillOpacity="0.35" />
        <circle cx="64" cy="62" r="12.5" fill="#eaf4ff" fillOpacity="0.35" />
        <path d="M48.5 60 C50 58.6 50 58.6 51.5 60" />
        <path d="M23.5 60 L15 57" />
        <path d="M76.5 60 L85 57" />
      </g>
    );
  }

  if (style === 'accessory-medal') {
    return (
      <g>
        <path d="M42 84 L50 99" stroke={accent} strokeWidth="4.6" strokeLinecap="round" />
        <path d="M58 84 L50 99" stroke="#ff6f9c" strokeWidth="4.6" strokeLinecap="round" />
        <circle cx="50" cy="103" r="7.4" fill={base} stroke="#f0a41d" strokeWidth="2" />
        <path d="M50 99 l1.4 3.2 3.4 0.4 -2.6 2.4 0.7 3.4 -2.9 -1.7 -2.9 1.7 0.7 -3.4 -2.6 -2.4 3.4 -0.4 Z" fill="#fff8e0" />
      </g>
    );
  }

  if (style === 'accessory-scarf') {
    return (
      <g>
        <path d="M22 84 C34 96 66 96 78 84 L80 93 C66 105 34 105 20 93 Z" fill={base} />
        <path d="M70 95 C78 100 80 106 76 110 L66 110 C70 105 69 100 64 97 Z" fill={accent} />
        <path d="M30 90 C42 98 58 98 70 90" stroke="#fff" strokeWidth="2" opacity="0.35" fill="none" />
      </g>
    );
  }

  if (style === 'accessory-cape') {
    return (
      <g>
        <circle cx="21" cy="56" r="4.2" fill={accent} stroke={base} strokeWidth="1.6" />
        <circle cx="79" cy="56" r="4.2" fill={accent} stroke={base} strokeWidth="1.6" />
      </g>
    );
  }

  return null;
}

/* -------------------------------------------------------------------- pets */

/** Each pet is drawn inside a 40x40 box so it can be dropped in at any scale. */
export const PET_ART: Record<string, (p: { base: string; accent: string; animated: boolean }) => ReactNode> = {
  'pet-sprout': ({ base, accent }) => (
    <g>
      <path d="M20 22 C20 14 15 10 10 9 C11 16 15 21 20 22 Z" fill={base} />
      <path d="M20 22 C20 13 25 9 31 8 C30 15 26 21 20 22 Z" fill={base} opacity="0.85" />
      <path d="M20 24 L20 16" stroke="#2f9e68" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 23 L31 23 L28 36 L12 36 Z" fill={accent} />
      <rect x="7" y="20" width="26" height="6" rx="3" fill="#ffbe8c" />
      <circle cx="16" cy="30" r="1.8" fill="#5a3218" />
      <circle cx="24" cy="30" r="1.8" fill="#5a3218" />
      <path d="M17.5 33 q2.5 2.2 5 0" stroke="#5a3218" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  ),
  'pet-bot': ({ base, accent, animated }) => (
    <g>
      <ellipse cx="20" cy="36" rx="11" ry="2.8" fill="#5ad8f5" opacity="0.3" />
      <g className={animated ? 'float-fast' : undefined}>
        <path d="M20 8 L20 13" stroke="#9aa7d6" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20" cy="7" r="2.6" fill={accent} />
        <rect x="7" y="13" width="26" height="20" rx="9" fill={base} stroke="#2fa8d0" strokeWidth="1.6" />
        <rect x="11" y="18" width="18" height="9" rx="4.5" fill="#1d2a52" />
        <circle cx="16.5" cy="22.5" r="2" fill="#8ef2ff" />
        <circle cx="24" cy="22.5" r="2" fill="#8ef2ff" />
        <rect x="3" y="19" width="4" height="8" rx="2" fill={accent} />
        <rect x="33" y="19" width="4" height="8" rx="2" fill={accent} />
      </g>
    </g>
  ),
  'pet-cat': ({ base, accent }) => (
    <g>
      <path d="M31 30 C37 29 38 22 33 20 C36 25 34 28 30 27 Z" fill={base} />
      <ellipse cx="19" cy="28" rx="13" ry="9" fill={base} />
      <circle cx="15" cy="18" r="10" fill={base} />
      <path d="M7 12 L6 4 L13 9 Z" fill={base} />
      <path d="M23 12 L25 4 L17 8 Z" fill={base} />
      <path d="M8.6 10.4 L8 6 L11.6 8.8 Z" fill="#ff9dc0" />
      <circle cx="11" cy="18" r="1.9" fill="#241a56" />
      <circle cx="19" cy="18" r="1.9" fill="#241a56" />
      <path d="M13.4 22 q1.6 1.8 3.2 0" stroke="#241a56" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M24 27 l1.1 2.6 2.8 0.3 -2.1 1.9 0.6 2.8 -2.4 -1.4 -2.4 1.4 0.6 -2.8 -2.1 -1.9 2.8 -0.3 Z" fill={accent} />
    </g>
  ),
  'pet-atom': ({ base, accent, animated }) => (
    <g>
      <g className={animated ? 'spin-slow' : undefined} style={{ transformOrigin: '20px 20px' }}>
        <ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke={accent} strokeWidth="2.4" />
        <ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke={accent} strokeWidth="2.4" transform="rotate(60 20 20)" />
        <ellipse cx="20" cy="20" rx="17" ry="7" fill="none" stroke={accent} strokeWidth="2.4" transform="rotate(120 20 20)" />
        <circle cx="37" cy="20" r="2.6" fill="#ffd678" />
      </g>
      <circle cx="20" cy="20" r="8" fill={base} />
      <circle cx="17" cy="19" r="1.7" fill="#fff" />
      <circle cx="23" cy="19" r="1.7" fill="#fff" />
      <circle cx="17.4" cy="19.4" r="0.9" fill="#241a56" />
      <circle cx="23.4" cy="19.4" r="0.9" fill="#241a56" />
      <path d="M17.5 23.5 q2.5 2.2 5 0" stroke="#241a56" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  ),
  'pet-dragon': ({ base, accent }) => (
    <g>
      <path d="M32 30 C38 28 39 20 34 17 C36 23 34 27 30 27 Z" fill={base} />
      <ellipse cx="19" cy="24" rx="14" ry="12" fill={base} />
      <path d="M20 13 C26 8 33 10 34 16 C29 13 24 14 21 18 Z" fill={accent} />
      <path d="M8 14 L11 8 L14 14 Z" fill={accent} />
      <path d="M15 11 L18 6 L21 12 Z" fill={accent} />
      <ellipse cx="10" cy="27" rx="6" ry="5" fill="#ffd8b8" />
      <circle cx="9" cy="24" r="1" fill="#8a4a20" />
      <circle cx="13" cy="20" r="2" fill="#241a56" />
      <circle cx="21" cy="20" r="2" fill="#241a56" />
      <circle cx="13.6" cy="19.3" r="0.8" fill="#fff" />
      <path d="M6 30 q4 3 8 1" stroke="#c96a2c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  ),
};

export function PetGlyph({
  id,
  size = 44,
  animated = true,
}: {
  id: CosmeticId | undefined;
  size?: number;
  animated?: boolean;
}) {
  const art = id ? PET_ART[id] : undefined;
  const item = id ? COSMETICS[id] : undefined;
  if (!art) return null;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} role="img" aria-label={item?.name ?? 'Pet'}>
      {art({ base: item?.swatch ?? '#7a5cf0', accent: item?.accent ?? '#ffd678', animated })}
    </svg>
  );
}

/* --------------------------------------------------------------- character */

/**
 * The player's own character - one base body with a swappable wardrobe.
 * Shares its visual family with the Curio-City logo mark (rounded body, big
 * curious eyes) so it reads as the same world.
 */
export function PlayerCharacter({
  size = 96,
  equipped,
  pointing = false,
  animated = true,
  showPet = true,
}: PlayerCharacterProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `${uid}-torso`;

  const skin = look(equipped, 'skin')?.palette ?? FALLBACK_SKIN;
  const eyes = look(equipped, 'eyes');
  const iris = eyes?.swatch ?? '#3a2a86';
  const pupil = eyes?.accent ?? '#241a56';

  const hairStyle = equipped.hair ?? 'hair-none';
  const hairTone = look(equipped, 'hairColor');
  const hairColor = hairTone?.swatch ?? '#2e2455';
  const hairShade = hairTone?.accent ?? '#1b1436';

  const shirt = look(equipped, 'shirt');
  const shirtStyle = shirt && shirt.id !== 'shirt-none' ? shirt.id : null;

  const hat = look(equipped, 'hat');
  const accessory = look(equipped, 'accessory');
  const accessoryStyle = accessory && accessory.id !== 'accessory-none' ? accessory.id : null;

  const petId = showPet && equipped.pet && equipped.pet !== 'pet-none' ? equipped.pet : undefined;

  return (
    <svg
      viewBox="0 -12 100 122"
      width={size}
      height={(size * 122) / 100}
      role="img"
      aria-label="Your character"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={TORSO.x} y={TORSO.y} width={TORSO.w} height={TORSO.h} rx={TORSO.r} />
        </clipPath>
      </defs>

      {accessoryStyle && (
        <AccessoryBack
          style={accessoryStyle}
          base={accessory?.swatch ?? '#e0507e'}
          accent={accessory?.accent ?? '#ffd678'}
        />
      )}

      <HairBack style={hairStyle} color={hairColor} shade={hairShade} />

      {shirtStyle && (
        <Shirt
          style={shirtStyle}
          base={shirt?.swatch ?? '#5ad8f5'}
          accent={shirt?.accent ?? '#ffffff'}
          clipId={clipId}
        />
      )}

      {/* left arm - always relaxed at the side */}
      <path
        d="M24 48 C14 52 9 60 10 72"
        fill="none"
        stroke={skin.edge}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="10" cy="74" r="6.4" fill={skin.body} stroke={skin.edge} strokeWidth="2.4" />

      {pointing ? (
        /* right arm - reaches up and to the right, fingertip at HAND_ANCHOR (96, ~14) */
        <g>
          <path
            d="M76 46 C86 40 92 30 94 18"
            fill="none"
            stroke={skin.edge}
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* pointing hand: a small fist with the index finger extended toward the anchor */}
          <circle cx="94" cy="20" r="6.6" fill={skin.body} stroke={skin.edge} strokeWidth="2.4" />
          <path d="M95 20 L96.5 13.5" fill="none" stroke={skin.body} strokeWidth="4.4" strokeLinecap="round" />
          <circle cx="96.5" cy="13" r="2.6" fill={skin.body} stroke={skin.edge} strokeWidth="2" />
        </g>
      ) : (
        /* right arm - relaxed at the side, mirroring the left */
        <g>
          <path
            d="M76 48 C86 52 91 60 90 72"
            fill="none"
            stroke={skin.edge}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <circle cx="90" cy="74" r="6.4" fill={skin.body} stroke={skin.edge} strokeWidth="2.4" />
        </g>
      )}

      {/* body */}
      <rect
        x={BODY.x}
        y={BODY.y}
        width={BODY.w}
        height={BODY.h}
        rx={BODY.r}
        fill={skin.body}
        stroke={skin.edge}
        strokeWidth="3"
      />

      <HairTop style={hairStyle} color={hairColor} shade={hairShade} />

      {/* cheeks */}
      <circle cx="27" cy="74" r="5.5" fill="#ff92b6" opacity="0.65" />
      <circle cx="73" cy="74" r="5.5" fill="#ff92b6" opacity="0.65" />

      {/* eyes */}
      <ellipse cx="36" cy="62" rx="9.5" ry="11.5" fill="#fdfbff" />
      <ellipse cx="64" cy="62" rx="9.5" ry="11.5" fill="#fdfbff" />
      <circle cx="38" cy="65" r="5.2" fill={iris} />
      <circle cx="66" cy="65" r="5.2" fill={iris} />
      <circle cx="38" cy="65" r="2.8" fill={pupil} />
      <circle cx="66" cy="65" r="2.8" fill={pupil} />
      <circle cx="40" cy="61.5" r="1.7" fill="#fff" />
      <circle cx="68" cy="61.5" r="1.7" fill="#fff" />

      {/* smile */}
      <path d="M42 80 q8 7 16 0" fill="none" stroke="#241a56" strokeWidth="3" strokeLinecap="round" />

      {hat && (
        <Hat
          style={hat.id}
          base={hat.swatch ?? '#ffc24a'}
          accent={hat.accent ?? '#ffd678'}
          edge={skin.edge}
          animated={animated}
        />
      )}

      {accessoryStyle && (
        <AccessoryFront
          style={accessoryStyle}
          base={accessory?.swatch ?? '#ff6f9c'}
          accent={accessory?.accent ?? '#ffd678'}
        />
      )}

      {petId && (
        <g transform="translate(0 82) scale(0.58)">
          {PET_ART[petId]?.({
            base: COSMETICS[petId].swatch ?? '#7a5cf0',
            accent: COSMETICS[petId].accent ?? '#ffd678',
            animated,
          })}
        </g>
      )}
    </svg>
  );
}

export function cosmeticLabel(id: CosmeticId) {
  return COSMETICS[id]?.name ?? id;
}
