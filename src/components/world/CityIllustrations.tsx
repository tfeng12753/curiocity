import { Boat, IslandBase, Tree } from './IslandBase';

/*
  Each city is a single self-contained SVG scene drawn on the shared floating
  island. They are intentionally illustration-only: no interaction logic lives
  here, so the same artwork can be reused at any size (landing world, map header,
  progress panel) without change.

  The skylines follow the hand-drawn concept sketches: Math is a drafting table
  (pencil, compass, ruler, a calculator tower with a face), Physics is a bench of
  demonstrations (Newton's cradle, atom tower, telescope, gravity arrows), and
  Chemistry is a lab bench (test tube rack, helix-wrapped block, a big flask).
*/

const VIEW_BOX = '0 0 360 290';

function Windows({ x, y, rows, cols, gap = 14, size = 8, fill = '#fff5c9' }: {
  x: number;
  y: number;
  rows: number;
  cols: number;
  gap?: number;
  size?: number;
  fill?: string;
}) {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * gap}
          y={y + r * gap}
          width={size}
          height={size}
          rx={size / 2.6}
          fill={fill}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

/** The little "ta-da" strokes the sketches put over the tallest thing on the island. */
function Sparkle({ x, y, scale = 1, tone = '#fff' }: { x: number; y: number; scale?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={tone} strokeWidth="3.4" strokeLinecap="round">
      <line x1="0" y1="-14" x2="0" y2="-24" />
      <line x1="-11" y1="-10" x2="-17" y2="-19" />
      <line x1="11" y1="-10" x2="17" y2="-19" />
    </g>
  );
}

/** A ruler, used as both a skyline ridge and a ramp. */
function Ruler({ x, y, width, rotate = 0, fill = '#ffd678', edge = '#f0a41d' }: {
  x: number;
  y: number;
  width: number;
  rotate?: number;
  fill?: string;
  edge?: string;
}) {
  const ticks = [];
  for (let i = 1; i * 14 < width; i += 1) {
    ticks.push(
      <line
        key={i}
        x1={i * 14}
        y1={0}
        x2={i * 14}
        y2={i % 2 === 0 ? 10 : 6}
        stroke={edge}
        strokeWidth="2.4"
        strokeLinecap="round"
      />,
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect width={width} height="18" rx="5" fill={fill} />
      {ticks}
    </g>
  );
}

export function MathIsland({ animated = true }: { animated?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Math City floating island">
      <IslandBase id="math" land="#7fe0a1" landShade="#3cb977" rock="#9a83f5" rockShade="#5f43cc">
        <defs>
          <clipPath id="math-plateau">
            <ellipse cx="180" cy="170" rx="134" ry="40" />
          </clipPath>
        </defs>

        {/* the plateau is squared paper - the sketch's drafting grid */}
        <g clipPath="url(#math-plateau)" stroke="#fff" strokeOpacity="0.38" strokeWidth="1.6">
          {[-108, -72, -36, 0, 36, 72, 108].map((dx) => (
            <line key={dx} x1={180 + dx} y1={128} x2={180 + dx * 1.35} y2={214} />
          ))}
          {[-26, -13, 0, 13, 26].map((dy) => (
            <line key={dy} x1={44} y1={170 + dy} x2={316} y2={170 + dy} />
          ))}
        </g>

        {/* ruler ridge behind the skyline */}
        <Ruler x={52} y={172} width={104} rotate={-31} />

        {/* pencil tower */}
        <g>
          <rect x="74" y="96" width="30" height="74" rx="6" fill="#ffc24a" />
          <rect x="82" y="96" width="6" height="74" fill="#f0a41d" opacity="0.55" />
          <path d="M74 96 L89 66 L104 96 Z" fill="#ffe2b5" />
          <path d="M82 80 L89 66 L96 80 Z" fill="#3c2a9c" />
          <rect x="72" y="150" width="34" height="9" rx="3" fill="#b3ecfa" />
          <rect x="74" y="159" width="30" height="13" rx="4" fill="#ff92b6" />
        </g>

        {/* drafting compass */}
        <g>
          <path d="M133 108 L119 166" stroke="#8b6bff" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M139 108 L153 162" stroke="#7a5cf0" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M115 160 L119 174 L123 162 Z" fill="#3c2a9c" />
          <rect x="147" y="158" width="12" height="16" rx="3" fill="#ffc24a" transform="rotate(14 153 166)" />
          <rect x="132" y="84" width="8" height="20" rx="4" fill="#5b3fe0" />
          <circle cx="136" cy="106" r="9" fill="#b3ecfa" stroke="#5b3fe0" strokeWidth="3" />
        </g>

        {/* calculator tower, with the sketch's little face in the display */}
        <g>
          <rect x="168" y="54" width="62" height="118" rx="14" fill="#6d4bdc" />
          <rect x="168" y="54" width="62" height="20" rx="10" fill="#8b6bff" />
          <rect x="176" y="66" width="46" height="24" rx="8" fill="#d9f6ff" />
          <rect x="186" y="72" width="6" height="12" rx="3" fill="#241a56" />
          <rect x="206" y="72" width="6" height="12" rx="3" fill="#241a56" />
          <Windows x={177} y={100} rows={3} cols={3} gap={17} size={11} fill="#c9bdf5" />
          <path d="M199 54 L199 34" stroke="#5b3fe0" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="199" cy="30" r="6" fill="#ffc24a" />
        </g>
        <g className={animated ? 'float-fast' : undefined}>
          <Sparkle x={199} y={26} scale={0.8} tone="#ffd678" />
        </g>

        {/* operator block - the four-panel building from the sketch */}
        <g>
          <rect x="244" y="104" width="62" height="68" rx="12" fill="#ff9dc0" />
          <rect x="250" y="110" width="24" height="26" rx="6" fill="#fff3f8" />
          <rect x="276" y="110" width="24" height="26" rx="6" fill="#fff3f8" />
          <rect x="250" y="140" width="24" height="26" rx="6" fill="#fff3f8" />
          <rect x="276" y="140" width="24" height="26" rx="6" fill="#fff3f8" />
          <g fill="#e0507e" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="20" textAnchor="middle">
            <text x="262" y="131">+</text>
            <text x="288" y="131">÷</text>
            <text x="262" y="161">−</text>
            <text x="288" y="161">×</text>
          </g>
        </g>

        {/* small block keeping the front edge busy */}
        <rect x="222" y="142" width="26" height="30" rx="8" fill="#5ad8f5" />
        <Windows x={229} y={150} rows={1} cols={1} fill="#eafcff" />

        {/* floating operator bubbles */}
        <g className={animated ? 'float-slow' : undefined}>
          <circle cx="62" cy="64" r="22" fill="#fff" opacity="0.95" />
          <text x="62" y="74" textAnchor="middle" fontSize="24" fontWeight="800" fill="#7a5cf0" fontFamily="'Baloo 2', sans-serif">
            %
          </text>
        </g>
        <g className={animated ? 'float-fast' : undefined}>
          <circle cx="310" cy="62" r="18" fill="#fff" opacity="0.95" />
          <text x="310" y="70" textAnchor="middle" fontSize="22" fontWeight="800" fill="#ff6f9c" fontFamily="'Baloo 2', sans-serif">
            ×
          </text>
        </g>
        <g className={animated ? 'float-slow' : undefined}>
          <circle cx="42" cy="126" r="14" fill="#fff" opacity="0.9" />
          <text x="42" y="133" textAnchor="middle" fontSize="18" fontWeight="800" fill="#12a5d6" fontFamily="'Baloo 2', sans-serif">
            =
          </text>
        </g>

        <Tree x={44} y={178} scale={0.85} />
        <Tree x={324} y={176} scale={0.8} />
        <Boat x={44} y={252} sail="#ffd678" />
      </IslandBase>
    </svg>
  );
}

export function PhysicsIsland({ animated = true }: { animated?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Physics City floating island">
      <IslandBase id="physics" land="#7ce6b6" landShade="#33b391" rock="#59c7ea" rockShade="#2a86c9">
        {/* Newton's cradle hall */}
        <g>
          <rect x="76" y="98" width="80" height="74" rx="10" fill="#5a54d6" />
          <rect x="76" y="98" width="80" height="12" rx="6" fill="#7a72f0" />
          <g stroke="#d9f6ff" strokeWidth="2.6" strokeLinecap="round">
            <line x1="96" y1="112" x2="96" y2="140" />
            <line x1="116" y1="112" x2="116" y2="140" />
            <line x1="136" y1="112" x2="136" y2="140" />
          </g>
          <circle cx="96" cy="146" r="8" fill="#b3ecfa" />
          <circle cx="116" cy="146" r="8" fill="#b3ecfa" />
          <circle cx="136" cy="146" r="8" fill="#b3ecfa" />
          <g stroke="#ffd678" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
            <line x1="84" y1="142" x2="76" y2="138" />
            <line x1="84" y1="150" x2="75" y2="150" />
          </g>
          <rect x="76" y="160" width="80" height="12" rx="4" fill="#4740b8" />
        </g>

        {/* lightbulb idea, glowing off the left edge */}
        <g className={animated ? 'float-slow' : undefined}>
          <g transform="translate(76 64)">
          <g stroke="#ffd678" strokeWidth="3.2" strokeLinecap="round" opacity="0.9">
            <line x1="0" y1="-26" x2="0" y2="-34" />
            <line x1="-19" y1="-19" x2="-25" y2="-25" />
            <line x1="19" y1="-19" x2="25" y2="-25" />
            <line x1="-26" y1="0" x2="-34" y2="0" />
            <line x1="26" y1="0" x2="34" y2="0" />
          </g>
          <circle cx="0" cy="0" r="18" fill="#ffe9a8" stroke="#ffc24a" strokeWidth="3" />
          <path d="M-6 12 h12 v6 a6 6 0 0 1 -12 0 Z" fill="#c9bdf5" />
          <path d="M-6 -2 L0 8 L6 -6" fill="none" stroke="#f0a41d" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>

        {/* apple, still falling toward the ramp */}
        <g transform="translate(58 156)">
          <circle cx="0" cy="0" r="11" fill="#ff6f9c" />
          <circle cx="-4" cy="-4" r="3.4" fill="#fff" opacity="0.45" />
          <path d="M0 -10 C2 -16 8 -18 10 -16 C8 -11 4 -9 0 -10 Z" fill="#3fd68f" />
        </g>

        {/* atom tower */}
        <g>
          <rect x="170" y="62" width="58" height="110" rx="14" fill="#6d4bdc" />
          <rect x="170" y="62" width="58" height="18" rx="9" fill="#8b6bff" />
          <Windows x={180} y={90} rows={3} cols={3} gap={16} size={10} fill="#e6dcff" />
        </g>
        <g
          className={animated ? 'spin-slow' : undefined}
          style={{ transformOrigin: '199px 40px' }}
        >
          <ellipse cx="199" cy="40" rx="28" ry="11" fill="none" stroke="#fff" strokeWidth="4" opacity="0.95" />
          <ellipse cx="199" cy="40" rx="28" ry="11" fill="none" stroke="#fff" strokeWidth="4" opacity="0.95" transform="rotate(60 199 40)" />
          <ellipse cx="199" cy="40" rx="28" ry="11" fill="none" stroke="#fff" strokeWidth="4" opacity="0.95" transform="rotate(120 199 40)" />
          <circle cx="227" cy="40" r="5" fill="#ffd678" />
        </g>
        <circle cx="199" cy="40" r="10" fill="#ff6f9c" stroke="#fff" strokeWidth="3" />

        {/* telescope on its ramp */}
        <g>
          <path d="M238 172 L302 138 L302 172 Z" fill="#ffc24a" />
          <path d="M238 172 L302 138 L302 146 L252 172 Z" fill="#ffd678" />
          <g transform="translate(286 126) rotate(-34)">
            <rect x="-26" y="-9" width="52" height="18" rx="9" fill="#eef3ff" />
            <rect x="20" y="-12" width="16" height="24" rx="7" fill="#5ad8f5" />
            <rect x="-30" y="-7" width="10" height="14" rx="5" fill="#2fc2ec" />
          </g>
          <Sparkle x={318} y={112} scale={0.7} tone="#ffd678" />
          <rect x="272" y="150" width="24" height="22" rx="6" fill="#2fc2ec" />
        </g>

        {/* energy arcing off the right edge */}
        <g className={animated ? 'float-fast' : undefined}>
          <path d="M330 96 L318 114 L328 114 L320 132 L340 106 L329 106 Z" fill="#ffd678" stroke="#f0a41d" strokeWidth="2" strokeLinejoin="round" />
        </g>

        {/* gravity: the sketch stood the whole island on down arrows */}
        <g stroke="#ffffff" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M46 206 L46 236" />
          <path d="M37 227 L46 240 L55 227" />
          <path d="M314 202 L314 232" />
          <path d="M305 223 L314 236 L323 223" />
        </g>

        <path d="M70 182 C130 200 240 198 296 178" stroke="#fff" strokeOpacity="0.55" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Tree x={166} y={180} scale={0.7} tone="#2aa87f" />
        <Tree x={318} y={180} scale={0.62} tone="#2aa87f" />
        <Boat x={306} y={250} sail="#b3ecfa" />
      </IslandBase>
    </svg>
  );
}

/** One of the sketch's loose doodle curls. */
function Curl({ x, y, scale = 1, tone = '#ffffff' }: { x: number; y: number; scale?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 -10 C9 -10 13 -2 8 4 C3 10 -6 8 -8 1 C-11 -9 -2 -18 8 -16"
        fill="none"
        stroke={tone}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
  );
}

export function ChemistryIsland({ animated = true }: { animated?: boolean }) {
  /* the striped band that spirals around the left block */
  const helixRungs = Array.from({ length: 9 }, (_, i) => {
    const t = (i / 8) * Math.PI - Math.PI / 2;
    return { x: Math.cos(t) * 42, y: Math.sin(t) * 15 };
  });

  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Chemistry City floating island">
      <IslandBase id="chem" land="#8ae4a8" landShade="#3cb977" rock="#6fd2e8" rockShade="#2e9ecb">
        {/* helix band, back half */}
        <g transform="translate(106 136) rotate(-14)">
          <ellipse rx="42" ry="15" fill="none" stroke="#ffd678" strokeWidth="11" />
        </g>

        {/* tilted window block */}
        <g transform="rotate(-7 106 132)">
          <rect x="74" y="92" width="64" height="80" rx="10" fill="#8b6bff" />
          <rect x="74" y="92" width="64" height="14" rx="7" fill="#a98cff" />
          <Windows x={84} y={114} rows={2} cols={2} gap={22} size={13} fill="#f3eeff" />
        </g>

        {/* helix band, front half - drawn after the block so it wraps around it */}
        <g transform="translate(106 136) rotate(-14)">
          <path d="M-42 0 A42 15 0 0 0 42 0" fill="none" stroke="#ffc24a" strokeWidth="11" />
          {/* Keyed by position, not by rung.x: the band sweeps -90deg to +90deg
              and cos is symmetric about 0, so rungs 0/8, 1/7, 2/6 and 3/5 each
              share an x to the last decimal place - four duplicate keys per
              render, and React is free to drop or duplicate the elements. */}
          {helixRungs.map((rung, i) => (
            <line
              key={i}
              x1={rung.x * 0.86}
              y1={rung.y * 0.86 + 3}
              x2={rung.x * 1.14}
              y2={rung.y * 1.14 + 3}
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.8"
            />
          ))}
        </g>

        {/* test tube rack on its stand */}
        <g>
          <rect x="162" y="62" width="9" height="110" rx="4" fill="#eef3ff" />
          <rect x="156" y="84" width="21" height="9" rx="4" fill="#c9bdf5" />
          <rect x="182" y="66" width="22" height="62" rx="11" fill="#d9f6ff" stroke="#a9dcee" strokeWidth="2" />
          <path d="M182 104 v13 a11 11 0 0 0 22 0 v-13 Z" fill="#ff6f9c" />
          <rect x="216" y="76" width="20" height="54" rx="10" fill="#d9f6ff" stroke="#a9dcee" strokeWidth="2" />
          <path d="M216 108 v12 a10 10 0 0 0 20 0 v-12 Z" fill="#3fd68f" />
          {/* the rack shelf sits in front, so it visibly carries the tubes */}
          <rect x="166" y="86" width="84" height="11" rx="5" fill="#eef3ff" />
          <rect x="166" y="86" width="84" height="4" rx="2" fill="#fff" />
          <rect x="180" y="62" width="26" height="8" rx="4" fill="#b3ecfa" />
          <rect x="214" y="72" width="24" height="8" rx="4" fill="#b3ecfa" />
          <g className={animated ? 'float-fast' : undefined}>
            <Sparkle x={193} y={56} scale={0.85} tone="#ffd678" />
          </g>
        </g>

        {/* second block */}
        <g>
          <rect x="196" y="112" width="60" height="60" rx="10" fill="#ff9dc0" />
          <rect x="196" y="112" width="60" height="12" rx="6" fill="#ffb8d2" />
          <Windows x={206} y={132} rows={2} cols={3} gap={16} size={10} fill="#fff3f8" />
        </g>

        {/* the big flask */}
        <g>
          <path
            d="M274 116 h22 v11 c0 5 24 19 24 36 c0 10 -9 16 -18 16 h-34 c-9 0 -18 -6 -18 -16 c0 -17 24 -31 24 -36 Z"
            fill="#ffc24a"
          />
          <path
            d="M264 149 c-6 6 -10 11 -10 14 c0 10 9 16 18 16 h34 c9 0 18 -6 18 -16 c0 -3 -4 -8 -10 -14 Z"
            fill="#ff9d5c"
          />
          <rect x="270" y="109" width="30" height="11" rx="4" fill="#eef3ff" />
          <circle cx="272" cy="165" r="3.6" fill="#fff" opacity="0.75" />
          <circle cx="288" cy="171" r="2.6" fill="#fff" opacity="0.6" />
          <Sparkle x={285} y={100} scale={0.72} tone="#ffd678" />
        </g>

        {/* loose doodle curls from the sketch */}
        <g className={animated ? 'float-slow' : undefined}>
          <Curl x={66} y={66} scale={1.1} />
        </g>
        <g className={animated ? 'float-fast' : undefined}>
          <Curl x={236} y={52} scale={0.9} />
        </g>
        <Curl x={40} y={122} scale={0.8} />

        {/* bubbles */}
        <g fill="#fff" opacity="0.55">
          <circle cx="150" cy="70" r="4" />
          <circle cx="136" cy="52" r="3" />
          <circle cx="326" cy="86" r="4.5" />
          <circle cx="312" cy="66" r="3" />
        </g>

        <path d="M70 182 C130 200 240 198 300 178" stroke="#fff" strokeOpacity="0.55" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Tree x={48} y={178} scale={0.85} />
        <Tree x={334} y={172} scale={0.7} />
        <Boat x={60} y={250} sail="#ffd678" />
      </IslandBase>
    </svg>
  );
}

export const CITY_ILLUSTRATIONS = {
  math: MathIsland,
  physics: PhysicsIsland,
  chemistry: ChemistryIsland,
} as const;
