import { Boat, IslandBase, Tree } from './IslandBase';

/*
  Each city is a single self-contained SVG scene drawn on the shared floating
  island. They are intentionally illustration-only: no interaction logic lives
  here, so the same artwork can be reused at any size (landing world, map header,
  progress panel) without change.
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

export function MathIsland({ animated = true }: { animated?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Math City floating island">
      <IslandBase id="math" land="#7fe0a1" landShade="#3cb977" rock="#9a83f5" rockShade="#5f43cc">
        {/* back towers */}
        <rect x="206" y="88" width="52" height="76" rx="16" fill="#8b6bff" />
        <rect x="206" y="88" width="52" height="18" rx="9" fill="#a98cff" />
        <Windows x={216} y={116} rows={2} cols={2} />

        <rect x="262" y="110" width="40" height="56" rx="14" fill="#ff9dc0" />
        <path d="M262 110 L282 88 L302 110 Z" fill="#ff7bac" />
        <Windows x={272} y={128} rows={2} cols={1} />

        {/* pi tower */}
        <rect x="150" y="52" width="54" height="114" rx="18" fill="#6d4bdc" />
        <rect x="150" y="52" width="54" height="22" rx="11" fill="#8b6bff" />
        <text
          x="177"
          y="118"
          textAnchor="middle"
          fontSize="44"
          fontFamily="'Baloo 2', sans-serif"
          fontWeight="800"
          fill="#ffd678"
        >
          π
        </text>
        <circle cx="177" cy="44" r="7" fill="#ffc24a" />

        {/* fraction pizza sign */}
        <g transform="translate(92 96)">
          <circle cx="0" cy="0" r="30" fill="#ffd678" stroke="#f0a41d" strokeWidth="4" />
          <path d="M0 -30 A30 30 0 0 1 0 30 Z" fill="#ff9d5c" />
          <line x1="0" y1="-30" x2="0" y2="30" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="-13" cy="-8" r="4" fill="#ff6f9c" />
          <circle cx="-9" cy="10" r="4" fill="#ff6f9c" />
          <rect x="-5" y="30" width="10" height="34" rx="5" fill="#c9bdf5" />
        </g>

        {/* front blocks */}
        <rect x="62" y="132" width="46" height="40" rx="14" fill="#5ad8f5" />
        <Windows x={72} y={144} rows={1} cols={2} fill="#eafcff" />

        <rect x="118" y="124" width="34" height="48" rx="12" fill="#ffc24a" />
        <text x="135" y="158" textAnchor="middle" fontSize="24" fontWeight="800" fill="#8a5a00" fontFamily="'Baloo 2', sans-serif">
          7
        </text>

        <rect x="246" y="140" width="40" height="30" rx="12" fill="#5ad8f5" />

        {/* operator bubbles */}
        <g className={animated ? 'float-slow' : undefined}>
          <circle cx="64" cy="64" r="22" fill="#fff" opacity="0.95" />
          <text x="64" y="74" textAnchor="middle" fontSize="26" fontWeight="800" fill="#7a5cf0" fontFamily="'Baloo 2', sans-serif">
            +
          </text>
        </g>
        <g className={animated ? 'float-fast' : undefined}>
          <circle cx="300" cy="58" r="18" fill="#fff" opacity="0.95" />
          <text x="300" y="66" textAnchor="middle" fontSize="22" fontWeight="800" fill="#ff6f9c" fontFamily="'Baloo 2', sans-serif">
            ×
          </text>
        </g>

        {/* bridge + road */}
        <path d="M74 178 C120 196 240 196 292 176" stroke="#fff" strokeOpacity="0.65" strokeWidth="7" fill="none" strokeLinecap="round" />

        <Tree x={44} y={176} scale={0.9} />
        <Tree x={318} y={172} scale={0.8} />
        <Tree x={286} y={184} scale={0.7} tone="#37a05f" />
        <Boat x={44} y={252} sail="#ffd678" />
      </IslandBase>
    </svg>
  );
}

export function PhysicsIsland({ animated = true }: { animated?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Physics City floating island">
      <IslandBase id="physics" land="#7ce6b6" landShade="#33b391" rock="#59c7ea" rockShade="#2a86c9">
        {/* observatory dome */}
        <g transform="translate(178 96)">
          <rect x="-56" y="24" width="112" height="46" rx="16" fill="#5a54d6" />
          <path d="M-56 26 A56 50 0 0 1 56 26 Z" fill="#7a72f0" />
          <path d="M-30 8 A32 30 0 0 1 30 8 Z" fill="#a9a2ff" opacity="0.55" />
          <Windows x={-40} y={40} rows={1} cols={5} gap={18} size={10} fill="#d9f6ff" />
          <rect x="-6" y="-52" width="12" height="26" rx="6" fill="#ffc24a" />
          <circle cx="0" cy="-58" r="9" fill="#ffd678" />
        </g>

        {/* planet with ring */}
        <g className={animated ? 'float-slow' : undefined} transform="translate(230 70)">
          <circle cx="0" cy="0" r="26" fill="#ff9d5c" />
          <circle cx="-8" cy="-8" r="7" fill="#ffc79c" opacity="0.7" />
          <ellipse cx="0" cy="2" rx="42" ry="12" fill="none" stroke="#ffd678" strokeWidth="6" opacity="0.9" transform="rotate(-18)" />
        </g>

        {/* lightning tower */}
        <rect x="74" y="82" width="40" height="86" rx="14" fill="#6d4bdc" />
        <rect x="74" y="82" width="40" height="16" rx="8" fill="#8b6bff" />
        <path d="M100 104 L86 130 L96 130 L88 152 L108 122 L97 122 Z" fill="#ffd678" />

        {/* windmill */}
        <g transform="translate(300 108)">
          <rect x="-5" y="0" width="10" height="62" rx="5" fill="#eef3ff" />
          <g className={animated ? 'spin-slow' : undefined} style={{ transformOrigin: '0px 0px' }}>
            <rect x="-3" y="-34" width="6" height="34" rx="3" fill="#fff" />
            <rect x="-3" y="-34" width="6" height="34" rx="3" fill="#fff" transform="rotate(120)" />
            <rect x="-3" y="-34" width="6" height="34" rx="3" fill="#fff" transform="rotate(240)" />
          </g>
          <circle cx="0" cy="0" r="5" fill="#2fc2ec" />
        </g>

        {/* ramp + rolling ball */}
        <path d="M92 170 L156 142 L156 170 Z" fill="#ffc24a" />
        <circle cx="118" cy="158" r="9" fill="#ff6f9c" className={animated ? 'roll' : undefined} />

        {/* pendulum */}
        <g transform="translate(258 132)">
          <rect x="-2" y="0" width="4" height="24" fill="#fff" opacity="0.8" />
          <circle cx="0" cy="30" r="9" fill="#5ad8f5" stroke="#fff" strokeWidth="3" />
        </g>

        <path d="M70 180 C130 198 240 196 296 176" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Tree x={52} y={176} scale={0.85} tone="#2aa87f" />
        <Tree x={330} y={176} scale={0.7} tone="#2aa87f" />
        <Boat x={306} y={250} sail="#b3ecfa" />
      </IslandBase>
    </svg>
  );
}

export function ChemistryIsland({ animated = true }: { animated?: boolean }) {
  return (
    <svg viewBox={VIEW_BOX} className="island-svg" role="img" aria-label="Chemistry City floating island">
      <IslandBase id="chem" land="#8ae4a8" landShade="#3cb977" rock="#6fd2e8" rockShade="#2e9ecb">
        {/* flask tower */}
        <g transform="translate(178 92)">
          <rect x="-30" y="-10" width="60" height="82" rx="22" fill="#ff9d5c" />
          <path d="M-30 34 H30 V58 A30 22 0 0 1 -30 58 Z" fill="#ffd678" />
          <rect x="-12" y="-30" width="24" height="26" rx="10" fill="#ffb37a" />
          <circle cx="0" cy="-38" r="10" fill="#fff" opacity="0.9" />
          <Windows x={-18} y={0} rows={1} cols={3} gap={16} size={9} fill="#fff3d6" />
        </g>

        {/* beaker buildings */}
        <g transform="translate(96 112)">
          <rect x="-26" y="-6" width="52" height="66" rx="18" fill="#8b6bff" />
          <path d="M-26 24 H26 V46 A26 18 0 0 1 -26 46 Z" fill="#5ad8f5" opacity="0.9" />
          <rect x="-10" y="-24" width="20" height="20" rx="8" fill="#a98cff" />
          <circle cx="-8" cy="34" r="4" fill="#fff" opacity="0.8" />
          <circle cx="8" cy="40" r="3" fill="#fff" opacity="0.8" />
        </g>

        <g transform="translate(268 118)">
          <rect x="-24" y="-4" width="48" height="60" rx="16" fill="#ff6f9c" />
          <rect x="-24" y="-4" width="48" height="14" rx="7" fill="#ff92b6" />
          <Windows x={-14} y={16} rows={2} cols={2} gap={16} fill="#fff0f6" />
        </g>

        {/* smoke stacks */}
        <g opacity="0.85" className={animated ? 'float-slow' : undefined}>
          <circle cx="248" cy="86" r="9" fill="#fff" />
          <circle cx="262" cy="70" r="7" fill="#fff" opacity="0.8" />
          <circle cx="276" cy="58" r="5" fill="#fff" opacity="0.6" />
        </g>

        {/* molecule */}
        <g className={animated ? 'float-fast' : undefined} transform="translate(84 58)">
          <line x1="0" y1="0" x2="26" y2="-14" stroke="#7a5cf0" strokeWidth="5" strokeLinecap="round" />
          <line x1="0" y1="0" x2="-22" y2="-16" stroke="#7a5cf0" strokeWidth="5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="12" fill="#7a5cf0" />
          <circle cx="26" cy="-14" r="8" fill="#5ad8f5" />
          <circle cx="-22" cy="-16" r="8" fill="#ffc24a" />
        </g>

        {/* greenhouse dome */}
        <g transform="translate(214 152)">
          <path d="M-28 14 A28 26 0 0 1 28 14 Z" fill="#bff2d9" opacity="0.9" />
          <path d="M0 -12 V14 M-16 4 V14 M16 4 V14" stroke="#3fd68f" strokeWidth="3" />
          <rect x="-28" y="12" width="56" height="8" rx="4" fill="#fff" opacity="0.8" />
        </g>

        <path d="M70 178 C130 198 240 196 300 174" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" fill="none" strokeLinecap="round" />
        <Tree x={48} y={174} scale={0.85} />
        <Tree x={330} y={170} scale={0.75} />
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
