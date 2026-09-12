import type { LandmarkKind } from '../../data/cities';

/*
  Small illustrated destinations that sit on the city map. Each one is drawn in a
  100x100 box so the map can place them purely by position and scale.
*/

function Plinth({ top = '#8ae0a6', side = '#7a5cf0' }: { top?: string; side?: string }) {
  return (
    <g>
      <ellipse cx="50" cy="86" rx="40" ry="13" fill={side} opacity="0.9" />
      <path d="M10 86 C14 100 32 108 50 110 C68 108 86 100 90 86 C78 94 22 94 10 86 Z" fill={side} />
      <ellipse cx="50" cy="82" rx="40" ry="13" fill={top} />
    </g>
  );
}

export function Landmark({ kind }: { kind: LandmarkKind }) {
  switch (kind) {
    case 'fraction-workshop':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth />
          <rect x="28" y="46" width="44" height="36" rx="12" fill="#ff9d5c" />
          <path d="M26 46 L50 26 L74 46 Z" fill="#ff6f9c" />
          <rect x="42" y="62" width="16" height="20" rx="6" fill="#fff3d6" />
          <g transform="translate(50 34)">
            <circle r="14" fill="#ffd678" stroke="#f0a41d" strokeWidth="2.5" />
            <path d="M0 -14 A14 14 0 0 1 0 14 Z" fill="#ff9d5c" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke="#fff" strokeWidth="2.5" />
          </g>
          <circle cx="22" cy="60" r="7" fill="#5ad8f5" />
          <circle cx="78" cy="58" r="6" fill="#8b6bff" />
        </svg>
      );
    case 'geometry-park':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth />
          <path d="M50 24 L72 66 L28 66 Z" fill="#5ad8f5" />
          <rect x="24" y="60" width="26" height="22" rx="6" fill="#ffc24a" />
          <circle cx="68" cy="70" r="12" fill="#ff6f9c" />
          <rect x="44" y="46" width="14" height="14" rx="4" fill="#fff" opacity="0.7" transform="rotate(18 51 53)" />
        </svg>
      );
    case 'multiplication-market':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth />
          <rect x="24" y="50" width="52" height="32" rx="10" fill="#8b6bff" />
          <path d="M20 50 H80 L74 36 H26 Z" fill="#ff6f9c" />
          <path d="M26 36 H74" stroke="#fff" strokeWidth="3" opacity="0.6" />
          <g fill="#ffd678">
            <circle cx="36" cy="64" r="5" />
            <circle cx="50" cy="64" r="5" />
            <circle cx="64" cy="64" r="5" />
            <circle cx="36" cy="76" r="5" />
            <circle cx="50" cy="76" r="5" />
            <circle cx="64" cy="76" r="5" />
          </g>
        </svg>
      );
    case 'puzzle-station':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth />
          <rect x="28" y="40" width="44" height="42" rx="12" fill="#5b3fe0" />
          <path
            d="M44 40 h12 v6 a6 6 0 0 0 6 6 h6 v12 h-6 a6 6 0 0 0 -6 6 v12 h-12 v-12 a6 6 0 0 0 -6 -6 h-6 v-12 h6 a6 6 0 0 0 6 -6 z"
            fill="#ffd678"
          />
          <circle cx="50" cy="30" r="7" fill="#ff6f9c" />
        </svg>
      );
    case 'number-kingdom':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth />
          <rect x="30" y="42" width="40" height="40" rx="10" fill="#7a5cf0" />
          <rect x="20" y="54" width="18" height="28" rx="8" fill="#9b82ff" />
          <rect x="62" y="54" width="18" height="28" rx="8" fill="#9b82ff" />
          <path d="M30 42 L50 24 L70 42 Z" fill="#ffc24a" />
          <text x="50" y="70" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="'Baloo 2', sans-serif">
            12
          </text>
        </svg>
      );
    case 'motion-ramp':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#8ce3c6" side="#2fc2ec" />
          <path d="M24 80 L72 44 L72 80 Z" fill="#ffc24a" />
          <circle cx="40" cy="70" r="9" fill="#ff6f9c" stroke="#fff" strokeWidth="3" />
          <path d="M62 34 l8 8 -8 8" stroke="#5b3fe0" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'energy-plant':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#8ce3c6" side="#2fc2ec" />
          <rect x="30" y="42" width="40" height="40" rx="12" fill="#5b3fe0" />
          <path d="M54 48 L40 68 L50 68 L44 82 L62 60 L52 60 Z" fill="#ffd678" />
          <rect x="22" y="58" width="12" height="24" rx="6" fill="#9b82ff" />
        </svg>
      );
    case 'light-lab':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#8ce3c6" side="#2fc2ec" />
          <path d="M50 34 L74 78 H26 Z" fill="#b3ecfa" opacity="0.9" />
          <path d="M50 34 L74 78 H26 Z" fill="none" stroke="#fff" strokeWidth="3" />
          <path d="M20 56 H40" stroke="#ffd678" strokeWidth="4" strokeLinecap="round" />
          <path d="M62 60 h18 M62 68 h18 M62 52 h18" stroke="#ff6f9c" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'space-dome':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#8ce3c6" side="#2fc2ec" />
          <path d="M24 80 A26 26 0 0 1 76 80 Z" fill="#5b3fe0" />
          <circle cx="50" cy="42" r="12" fill="#ff9d5c" />
          <ellipse cx="50" cy="42" rx="22" ry="7" fill="none" stroke="#ffd678" strokeWidth="3" transform="rotate(-20 50 42)" />
        </svg>
      );
    case 'atom-tower':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#ffe3a1" side="#f0a41d" />
          <rect x="36" y="48" width="28" height="34" rx="10" fill="#7a5cf0" />
          <g transform="translate(50 40)">
            <ellipse rx="20" ry="8" fill="none" stroke="#5ad8f5" strokeWidth="3" />
            <ellipse rx="20" ry="8" fill="none" stroke="#ff6f9c" strokeWidth="3" transform="rotate(60)" />
            <ellipse rx="20" ry="8" fill="none" stroke="#ffd678" strokeWidth="3" transform="rotate(-60)" />
            <circle r="6" fill="#fff" />
          </g>
        </svg>
      );
    case 'reaction-lab':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#ffe3a1" side="#f0a41d" />
          <path d="M42 40 h16 v18 l12 24 H30 l12 -24 Z" fill="#b3ecfa" stroke="#5ad8f5" strokeWidth="3" />
          <path d="M34 70 h32 l4 12 H30 Z" fill="#3fd68f" />
          <circle cx="46" cy="66" r="3" fill="#fff" />
          <circle cx="56" cy="60" r="2.5" fill="#fff" />
        </svg>
      );
    case 'acid-harbor':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#ffe3a1" side="#f0a41d" />
          <rect x="30" y="46" width="18" height="36" rx="8" fill="#ff6f9c" />
          <rect x="52" y="54" width="18" height="28" rx="8" fill="#5ad8f5" />
          <rect x="30" y="66" width="18" height="16" rx="6" fill="#ffd678" />
          <circle cx="61" cy="46" r="6" fill="#fff" opacity="0.85" />
        </svg>
      );
    case 'matter-dome':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#ffe3a1" side="#f0a41d" />
          <path d="M26 80 A24 24 0 0 1 74 80 Z" fill="#bff2d9" />
          <path d="M50 56 v24 M34 70 v10 M66 70 v10" stroke="#3fd68f" strokeWidth="3" />
          <circle cx="50" cy="50" r="8" fill="#7a5cf0" />
        </svg>
      );
    case 'alien-outpost':
      return (
        <svg viewBox="0 0 100 115" className="landmark">
          <Plinth top="#b3ecfa" side="#12a5d6" />
          {/* saucer */}
          <ellipse cx="50" cy="56" rx="34" ry="10" fill="#3fd68f" />
          <ellipse cx="50" cy="50" rx="20" ry="16" fill="#bff2d9" stroke="#24b473" strokeWidth="2" />
          <circle cx="50" cy="46" r="4" fill="#5b3fe0" opacity="0.7" />
          {/* antenna */}
          <path d="M50 34 v-10" stroke="#24b473" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="22" r="4" fill="#ffc24a" />
          {/* a curious little alien peeking out */}
          <circle cx="50" cy="66" r="9" fill="#7a5cf0" />
          <circle cx="46" cy="64" r="2.4" fill="#fff" />
          <circle cx="54" cy="64" r="2.4" fill="#fff" />
        </svg>
      );
    default:
      return null;
  }
}
