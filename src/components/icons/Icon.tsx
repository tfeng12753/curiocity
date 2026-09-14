/*
  The icon set.

  Everything here used to be an emoji. Emoji are drawn by the operating system,
  so the same lesson showed a flat Google pizza on one machine and a glossy
  Apple one on another, none of them sharing a palette, weight or outline with
  Curio and the city art sitting right next to them - and the project's own
  rule is that all illustration is hand-written SVG, no image assets and no
  icon font.

  So these are drawn in the same language as Curio: one filled shape in a brand
  colour, a slightly darker edge, rounded joins, and a white highlight where it
  helps something read quickly at 16px. They share a 24x24 box so a coin in the
  nav and a trophy on a badge card line up on the same grid.
*/

export type IconName =
  | 'coin'
  | 'star'
  | 'sound-on'
  | 'sound-off'
  | 'map'
  | 'hand'
  | 'mouse'
  | 'lock'
  | 'bulb'
  | 'sparkle'
  | 'check'
  | 'cross'
  | 'hourglass'
  | 'pizza'
  | 'trophy'
  | 'bike'
  | 'car'
  | 'rocket'
  | 'ball';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Gives the icon an accessible name; otherwise it is treated as decorative. */
  title?: string;
}

const SUN = '#ffc24a';
const SUN_EDGE = '#e09a12';
const VIOLET = '#7a5cf0';
const VIOLET_EDGE = '#5b3fe0';
const MINT = '#3fd68f';
const MINT_EDGE = '#24b473';
const CORAL = '#ff6f9c';
const CORAL_EDGE = '#e0507e';
const CYAN = '#5ad8f5';
const CYAN_EDGE = '#12a5d6';
const INK = '#241a56';

/** Shared edge treatment - every icon gets the same weight so they sit together. */
const EDGE = { strokeWidth: 1.1, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const SHAPES: Record<IconName, React.ReactNode> = {
  coin: (
    <>
      <circle cx="12" cy="12" r="9" fill={SUN} stroke={SUN_EDGE} {...EDGE} />
      <circle cx="12" cy="12" r="6" fill="none" stroke={SUN_EDGE} strokeWidth="1.1" opacity="0.75" />
      <path
        d="M12 8.2 l1.05 2.35 2.35 1.05 -2.35 1.05 -1.05 2.35 -1.05 -2.35 -2.35 -1.05 2.35 -1.05 Z"
        fill="#fff"
        opacity="0.92"
      />
    </>
  ),

  star: (
    <path
      d="M12 3.2 l2.6 5.55 6.1 .75 -4.5 4.2 1.18 6.03 -5.38 -2.95 -5.38 2.95 1.18 -6.03 -4.5 -4.2 6.1 -.75 Z"
      fill={SUN}
      stroke={SUN_EDGE}
      {...EDGE}
    />
  ),

  'sound-on': (
    <>
      <path d="M4 9.5 h3.2 L12 5.4 v13.2 L7.2 14.5 H4 Z" fill={VIOLET} stroke={VIOLET_EDGE} {...EDGE} />
      <path d="M15 9.4 a4.2 4.2 0 0 1 0 5.2" fill="none" stroke={VIOLET_EDGE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.6 7.2 a7.6 7.6 0 0 1 0 9.6" fill="none" stroke={VIOLET_EDGE} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
    </>
  ),

  'sound-off': (
    <>
      <path d="M4 9.5 h3.2 L12 5.4 v13.2 L7.2 14.5 H4 Z" fill={VIOLET} stroke={VIOLET_EDGE} {...EDGE} />
      <path d="M15.4 9.6 l4.4 4.8 M19.8 9.6 l-4.4 4.8" stroke={CORAL_EDGE} strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),

  map: (
    <>
      <path d="M3 6.4 l6 -2.2 6 2.2 6 -2.2 v13.4 l-6 2.2 -6 -2.2 -6 2.2 Z" fill={MINT} stroke={MINT_EDGE} {...EDGE} />
      <path d="M9 4.2 v13.4 M15 6.4 v13.4" fill="none" stroke={MINT_EDGE} strokeWidth="1.1" opacity="0.7" />
      <circle cx="12.2" cy="10.6" r="2.5" fill={CORAL} stroke={CORAL_EDGE} strokeWidth="1" />
    </>
  ),

  hand: (
    <>
      {/* open palm - the commit gesture, so it reads as a raised hand */}
      <path
        d="M7.4 13.4 V6.6 a1.4 1.4 0 0 1 2.8 0 V5.2 a1.4 1.4 0 0 1 2.8 0 v .6 a1.4 1.4 0 0 1 2.8 0 v1.2 a1.4 1.4 0 0 1 2.6 .7 v4.9 a6.4 6.4 0 0 1 -6.4 6.4 h-.9 a5.5 5.5 0 0 1 -5.5 -5.5 v-2.4 l-1.5 1.1 a1.3 1.3 0 0 1 -1.6 -2 Z"
        fill={SUN}
        stroke={SUN_EDGE}
        {...EDGE}
      />
      <path d="M10.2 7.2 v5 M13 6 v6.2 M15.8 7.4 v4.8" fill="none" stroke={SUN_EDGE} strokeWidth="0.9" opacity="0.55" />
    </>
  ),

  mouse: (
    <>
      <rect x="6.6" y="3" width="10.8" height="18" rx="5.4" fill={CYAN} stroke={CYAN_EDGE} {...EDGE} />
      <path d="M12 6.6 v3.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.6 12 h10.8" stroke={CYAN_EDGE} strokeWidth="1" opacity="0.6" />
    </>
  ),

  lock: (
    <>
      <path d="M8 10.4 V8 a4 4 0 0 1 8 0 v2.4" fill="none" stroke={VIOLET_EDGE} strokeWidth="2" strokeLinecap="round" />
      <rect x="4.8" y="10.2" width="14.4" height="10.4" rx="3.2" fill={VIOLET} stroke={VIOLET_EDGE} {...EDGE} />
      <circle cx="12" cy="15.4" r="1.9" fill="#fff" opacity="0.92" />
    </>
  ),

  bulb: (
    <>
      <path
        d="M12 2.6 a6.6 6.6 0 0 1 4 11.85 v1.55 a1.6 1.6 0 0 1 -1.6 1.6 h-4.8 a1.6 1.6 0 0 1 -1.6 -1.6 v-1.55 A6.6 6.6 0 0 1 12 2.6 Z"
        fill={SUN}
        stroke={SUN_EDGE}
        {...EDGE}
      />
      <rect x="9.4" y="18.6" width="5.2" height="2.8" rx="1.4" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1" />
      <path d="M10.4 13.6 q1.6 -3.4 3.2 0" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.95" />
    </>
  ),

  sparkle: (
    <>
      <path
        d="M12 2.4 l1.85 5.15 5.15 1.85 -5.15 1.85 -1.85 5.15 -1.85 -5.15 -5.15 -1.85 5.15 -1.85 Z"
        fill={SUN}
        stroke={SUN_EDGE}
        {...EDGE}
      />
      <path d="M18.4 15 l.85 2.15 2.15 .85 -2.15 .85 -.85 2.15 -.85 -2.15 -2.15 -.85 2.15 -.85 Z" fill={CORAL} />
      <path d="M5 14.6 l.6 1.6 1.6 .6 -1.6 .6 -.6 1.6 -.6 -1.6 -1.6 -.6 1.6 -.6 Z" fill={CYAN} />
    </>
  ),

  check: (
    <>
      <circle cx="12" cy="12" r="9" fill={MINT} stroke={MINT_EDGE} {...EDGE} />
      <path d="M7.6 12.4 l3 3 5.8 -6.4" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  cross: (
    <>
      <circle cx="12" cy="12" r="9" fill={CORAL} stroke={CORAL_EDGE} {...EDGE} />
      <path d="M8.8 8.8 l6.4 6.4 M15.2 8.8 l-6.4 6.4" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
    </>
  ),

  hourglass: (
    <>
      <path d="M6.4 3.2 h11.2 M6.4 20.8 h11.2" stroke={VIOLET_EDGE} strokeWidth="2" strokeLinecap="round" />
      <path d="M7.6 3.2 h8.8 v2.6 L12 12 l4.4 6.2 v2.6 H7.6 v-2.6 L12 12 7.6 5.8 Z" fill={CYAN} stroke={CYAN_EDGE} {...EDGE} />
      <path d="M12 12 l2.9 4.1 a5.6 5.6 0 0 1 -5.8 0 Z" fill={SUN} />
    </>
  ),

  pizza: (
    <>
      <path d="M12 3 l8.4 15.2 a18 18 0 0 1 -16.8 0 Z" fill={SUN} stroke={SUN_EDGE} {...EDGE} />
      <path d="M3.6 18.2 a18 18 0 0 0 16.8 0 l-1.5 -2.7 a15 15 0 0 1 -13.8 0 Z" fill="#f0b64a" stroke={SUN_EDGE} strokeWidth="1" />
      <circle cx="10.4" cy="11.2" r="1.5" fill="#e4562f" />
      <circle cx="14.2" cy="14" r="1.5" fill="#e4562f" />
      <circle cx="12" cy="7.4" r="1.15" fill="#e4562f" />
    </>
  ),

  trophy: (
    <>
      <path d="M6.6 4.4 h10.8 v5.2 a5.4 5.4 0 0 1 -10.8 0 Z" fill={SUN} stroke={SUN_EDGE} {...EDGE} />
      <path d="M6.6 5.6 H4.2 a3 3 0 0 0 3 3.4 M17.4 5.6 h2.4 a3 3 0 0 1 -3 3.4" fill="none" stroke={SUN_EDGE} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.6 14.8 h2.8 v3 h-2.8 Z" fill={SUN_EDGE} />
      <rect x="7.4" y="17.4" width="9.2" height="3" rx="1.5" fill={VIOLET} stroke={VIOLET_EDGE} strokeWidth="1" />
      <path d="M9.6 6.6 q2.4 3.4 4.8 0" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  bike: (
    <>
      <circle cx="6" cy="15.6" r="4.6" fill="none" stroke={VIOLET} strokeWidth="1.9" />
      <circle cx="18" cy="15.6" r="4.6" fill="none" stroke={VIOLET} strokeWidth="1.9" />
      <path d="M6 15.6 L10.6 8.6 h4.2 L18 15.6 M10.6 15.6 h5.2" fill="none" stroke={VIOLET_EDGE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 8.6 h2.4" stroke={CORAL_EDGE} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15.6" r="1.2" fill={SUN} stroke={SUN_EDGE} strokeWidth="0.8" />
    </>
  ),

  car: (
    <>
      <path d="M3.4 15.4 v-2.2 l2 -4.2 a2 2 0 0 1 1.8 -1.1 h9.6 a2 2 0 0 1 1.8 1.1 l2 4.2 v2.2 a1.4 1.4 0 0 1 -1.4 1.4 H4.8 a1.4 1.4 0 0 1 -1.4 -1.4 Z" fill={CYAN} stroke={CYAN_EDGE} {...EDGE} />
      <path d="M6.2 12.6 l1.4 -3 h8.8 l1.4 3 Z" fill="#eaf9ff" stroke={CYAN_EDGE} strokeWidth="0.9" />
      <circle cx="7.4" cy="17.4" r="2.3" fill={INK} />
      <circle cx="16.6" cy="17.4" r="2.3" fill={INK} />
      <circle cx="7.4" cy="17.4" r="0.85" fill="#fff" opacity="0.9" />
      <circle cx="16.6" cy="17.4" r="0.85" fill="#fff" opacity="0.9" />
    </>
  ),

  rocket: (
    <>
      <path d="M12 2.4 c3.2 2.8 4.8 6.4 4.8 10.2 l-1.9 3.4 h-5.8 L7.2 12.6 C7.2 8.8 8.8 5.2 12 2.4 Z" fill="#f4f1ff" stroke={VIOLET_EDGE} {...EDGE} />
      <path d="M7.3 11.4 L4.2 14.8 l.5 3.2 2.9 -2.1 Z" fill={CORAL} stroke={CORAL_EDGE} strokeWidth="1" strokeLinejoin="round" />
      <path d="M16.7 11.4 l3.1 3.4 -.5 3.2 -2.9 -2.1 Z" fill={CORAL} stroke={CORAL_EDGE} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="12" cy="9.6" r="2.3" fill={CYAN} stroke={CYAN_EDGE} strokeWidth="1" />
      <path d="M10.4 17.4 q1.6 4.2 3.2 0 Z" fill={SUN} stroke={SUN_EDGE} strokeWidth="0.9" strokeLinejoin="round" />
    </>
  ),

  ball: (
    <>
      <circle cx="12" cy="12" r="9" fill={CORAL} stroke={CORAL_EDGE} {...EDGE} />
      <path d="M12 3 v18 M3 12 h18" stroke={CORAL_EDGE} strokeWidth="1" opacity="0.35" />
      <path d="M5.6 5.6 a9 9 0 0 1 12.8 12.8" fill="none" stroke={CORAL_EDGE} strokeWidth="1" opacity="0.35" />
      <circle cx="8.6" cy="8.6" r="2" fill="#fff" opacity="0.85" />
    </>
  ),
};

/**
 * One icon from the set. Decorative by default - pass `title` only when the
 * icon is the sole carrier of meaning, so screen readers do not announce the
 * ones that merely sit beside a label.
 */
export function Icon({ name, size = 20, className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {title && <title>{title}</title>}
      {SHAPES[name]}
    </svg>
  );
}
