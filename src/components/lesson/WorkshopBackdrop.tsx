const DEFAULT_SYMBOLS = ['1/2', '1/4', '3/4', '2/4', '1/3'];

interface WorkshopBackdropProps {
  challenge?: boolean;
  /** What floats past in the background - fraction notation by default, but
   *  a non-maths lesson (Motion Ramps, say) can pass its own small set
   *  instead of drifting fraction symbols behind a physics scene. */
  symbols?: string[];
}

/** The Fraction Workshop itself: shelves, a work table, and floating symbols. */
export function WorkshopBackdrop({ challenge = false, symbols = DEFAULT_SYMBOLS }: WorkshopBackdropProps) {
  return (
    <div className={`workshop ${challenge ? 'workshop--challenge' : ''}`} aria-hidden="true">
      <div className="workshop__spot" />

      <svg className="workshop__scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
        {/* back wall shelves */}
        <g opacity="0.9">
          <rect x="90" y="210" width="300" height="14" rx="7" fill="#ffffff" opacity="0.35" />
          <rect x="1050" y="260" width="300" height="14" rx="7" fill="#ffffff" opacity="0.35" />

          <g>
            <circle cx="150" cy="186" r="24" fill="#ffd678" />
            <path d="M150 162 A24 24 0 0 1 150 210 Z" fill="#ff9d5c" />
          </g>
          <rect x="205" y="160" width="44" height="50" rx="12" fill="#9b82ff" />
          <rect x="215" y="172" width="24" height="26" rx="8" fill="#ffffff" opacity="0.6" />
          <rect x="278" y="172" width="70" height="38" rx="10" fill="#5ad8f5" />
          <path d="M296 172 v38 M313 172 v38 M330 172 v38" stroke="#ffffff" strokeWidth="3" opacity="0.6" />

          <rect x="1090" y="212" width="66" height="48" rx="12" fill="#ff9dc0" />
          <path d="M1123 212 v48" stroke="#fff" strokeWidth="3" opacity="0.6" />
          <circle cx="1210" cy="236" r="24" fill="#bff2d9" />
          <path d="M1210 212 A24 24 0 0 1 1210 260 Z" fill="#3fd68f" />
          <rect x="1264" y="206" width="52" height="54" rx="14" fill="#ffc24a" />
        </g>

        {/* work table */}
        <path d="M0 720 H1440 V900 H0 Z" fill="#6c4bd8" opacity="0.22" />
        <rect x="0" y="700" width="1440" height="34" rx="17" fill="#ffffff" opacity="0.4" />
      </svg>

      <div className="workshop__symbols">
        {symbols.map((symbol, i) => (
          <span key={symbol} style={{ animationDelay: `${i * 1.3}s` }}>
            {symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
