export type AvatarMood = 'idle' | 'happy' | 'think' | 'cheer';

/**
 * Poly, the Fraction Workshop guide. Small, friendly, and never in the way of
 * the learning object - moods are driven by what the student just did.
 */
export function Avatar({ mood = 'idle', size = 120 }: { mood?: AvatarMood; size?: number }) {
  const armLift = mood === 'cheer' ? -18 : mood === 'happy' ? -8 : 0;

  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={`avatar avatar--${mood}`}
      role="img"
      aria-label="Poly, your fraction guide"
    >
      <ellipse cx="60" cy="121" rx="30" ry="6" fill="#2b1d63" opacity="0.18" />

      {/* arms */}
      <g className="avatar__arm">
        <rect x="10" y={72 + armLift} width="20" height="10" rx="5" fill="#5ecff0" transform={`rotate(${armLift ? -28 : -8} 20 78)`} />
        <rect x="90" y={72 + armLift} width="20" height="10" rx="5" fill="#5ecff0" transform={`rotate(${armLift ? 28 : 8} 100 78)`} />
      </g>

      {/* body */}
      <rect x="26" y="52" width="68" height="62" rx="26" fill="#7a5cf0" />
      <rect x="34" y="74" width="52" height="34" rx="16" fill="#9b82ff" opacity="0.75" />

      {/* head */}
      <rect x="22" y="14" width="76" height="52" rx="24" fill="#8b6bff" />
      <rect x="30" y="22" width="60" height="34" rx="17" fill="#fdfbff" />

      {/* eyes */}
      <g className="avatar__eyes">
        {mood === 'happy' || mood === 'cheer' ? (
          <>
            <path d="M40 40 q6 -8 12 0" stroke="#2b1d63" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <path d="M68 40 q6 -8 12 0" stroke="#2b1d63" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="46" cy="39" r="5.4" fill="#2b1d63" />
            <circle cx="74" cy="39" r="5.4" fill="#2b1d63" />
            <circle cx="48" cy="37" r="1.8" fill="#fff" />
            <circle cx="76" cy="37" r="1.8" fill="#fff" />
          </>
        )}
      </g>

      {/* mouth */}
      {mood === 'think' ? (
        <circle cx="60" cy="50" r="4" fill="#2b1d63" opacity="0.8" />
      ) : (
        <path
          d={mood === 'cheer' ? 'M50 48 q10 14 20 0 q-10 6 -20 0' : 'M52 49 q8 8 16 0'}
          fill={mood === 'cheer' ? '#2b1d63' : 'none'}
          stroke="#2b1d63"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* cheeks */}
      <circle cx="37" cy="47" r="4.5" fill="#ff9dc0" opacity="0.65" />
      <circle cx="83" cy="47" r="4.5" fill="#ff9dc0" opacity="0.65" />

      {/* pi cap */}
      <path d="M24 18 q36 -20 72 0 z" fill="#ffc24a" />
      <rect x="52" y="0" width="16" height="12" rx="5" fill="#ffd678" />
      <text x="60" y="14" textAnchor="middle" fontSize="13" fontWeight="800" fill="#8a5a00" fontFamily="'Baloo 2', sans-serif">
        π
      </text>

      {/* badge */}
      <circle cx="60" cy="92" r="12" fill="#ffd678" />
      <path d="M60 80 A12 12 0 0 1 60 104 Z" fill="#ff9d5c" />
    </svg>
  );
}
