/**
 * Curio, the brand mark - a small round character with big curious eyes and
 * a sparkle-tipped antenna. Reused everywhere "LEARNVERSE" used to appear:
 * the top nav, the favicon, and the world hero.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Curio-City">
      {/* floating sparkles */}
      <g fill="#ffc24a">
        <path d="M20 20 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 Z" opacity="0.9" />
        <path d="M82 30 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8 -4.4 -4.4 -1.8 4.4 -1.8 Z" opacity="0.75" />
      </g>

      {/* antenna */}
      <path d="M52 28 C58 20 60 14 58 8" fill="none" stroke="#5b3fe0" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M58 3 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2 Z"
        fill="#ffc24a"
        stroke="#f0a41d"
        strokeWidth="0.6"
      />

      {/* body */}
      <rect x="14" y="26" width="72" height="62" rx="34" fill="#7a5cf0" stroke="#5b3fe0" strokeWidth="3" />

      {/* cheeks */}
      <circle cx="27" cy="68" r="5.5" fill="#ff92b6" opacity="0.65" />
      <circle cx="73" cy="68" r="5.5" fill="#ff92b6" opacity="0.65" />

      {/* eyes */}
      <g>
        <ellipse cx="36" cy="56" rx="9.5" ry="11.5" fill="#fdfbff" />
        <ellipse cx="64" cy="56" rx="9.5" ry="11.5" fill="#fdfbff" />
        <circle cx="38" cy="59" r="5.2" fill="#241a56" />
        <circle cx="66" cy="59" r="5.2" fill="#241a56" />
        <circle cx="40" cy="55.5" r="1.7" fill="#fff" />
        <circle cx="68" cy="55.5" r="1.7" fill="#fff" />
      </g>

      {/* smile */}
      <path d="M42 74 q8 7 16 0" fill="none" stroke="#241a56" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  /** "horizontal" for a single-row nav bar; "stacked" for a favicon-style square lockup. */
  orientation?: 'horizontal' | 'stacked';
  size?: number;
}

/** The full lockup: mark plus the two-tone "Curio-City" wordmark. */
export function Logo({ orientation = 'horizontal', size = 32 }: LogoProps) {
  if (orientation === 'stacked') {
    return (
      <span className="logo logo--stacked">
        <LogoMark size={size} />
        <span className="logo__word logo__word--stacked">
          <span className="logo__curio">CURIO</span>
          <span className="logo__city">CITY</span>
        </span>
      </span>
    );
  }

  return (
    <span className="logo logo--horizontal">
      <LogoMark size={size} />
      <span className="logo__word">
        <span className="logo__curio">Curio-</span>
        <span className="logo__city">City</span>
      </span>
    </span>
  );
}
