import type { ReactNode } from 'react';

interface IslandBaseProps {
  id: string;
  /** Grass / land colours. */
  land?: string;
  landShade?: string;
  rock?: string;
  rockShade?: string;
  children?: ReactNode;
  waterfall?: boolean;
}

/**
 * The floating island every city sits on: a rounded green plateau, a chunky
 * rock underside tapering to a point, and an optional waterfall spilling off
 * the edge. City-specific architecture is passed in as children.
 */
export function IslandBase({
  id,
  land = '#6fd88f',
  landShade = '#3fb573',
  rock = '#8f7ce8',
  rockShade = '#6a56c8',
  children,
  waterfall = true,
}: IslandBaseProps) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-rock`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rock} />
          <stop offset="100%" stopColor={rockShade} />
        </linearGradient>
        <linearGradient id={`${id}-land`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={land} />
          <stop offset="100%" stopColor={landShade} />
        </linearGradient>
        <linearGradient id={`${id}-fall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdf0ff" />
          <stop offset="100%" stopColor="#7fd8f7" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* underside rock, tapering to a point like a floating chunk of land */}
      <path
        d="M46 172 C58 220 104 262 180 282 C256 262 302 220 314 172 C286 196 74 196 46 172 Z"
        fill={`url(#${id}-rock)`}
      />
      <path d="M132 198 C142 236 158 262 180 280 C168 246 152 222 146 194 Z" fill="#fff" opacity="0.14" />
      <path d="M214 196 C212 232 202 258 184 280 C206 258 224 230 232 196 Z" fill="#000" opacity="0.07" />

      {/* land plateau with a front cliff band */}
      <ellipse cx="180" cy="178" rx="134" ry="40" fill={landShade} />
      <ellipse cx="180" cy="170" rx="134" ry="40" fill={`url(#${id}-land)`} />
      <ellipse cx="180" cy="170" rx="134" ry="40" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />

      {waterfall && (
        <>
          <path d="M124 192 C120 216 124 238 133 252 C144 238 147 214 144 192 Z" fill={`url(#${id}-fall)`} />
          <ellipse cx="134" cy="252" rx="16" ry="5" fill="#bdf0ff" opacity="0.5" />
        </>
      )}

      {children}
    </g>
  );
}

export function Tree({ x, y, scale = 1, tone = '#2fae6b' }: { x: number; y: number; scale?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="-4" width="6" height="14" rx="3" fill="#a8763f" />
      <circle cx="0" cy="-12" r="13" fill={tone} />
      <circle cx="-7" cy="-5" r="9" fill={tone} />
      <circle cx="7" cy="-5" r="9" fill={tone} />
      <circle cx="-3" cy="-16" r="6" fill="#fff" opacity="0.22" />
    </g>
  );
}

export function Boat({ x, y, sail = '#ffffff' }: { x: number; y: number; sail?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-12 6 L12 6 L8 12 L-8 12 Z" fill="#ffffff" />
      <path d="M0 -14 L10 4 L0 4 Z" fill={sail} />
      <path d="M-2 -12 L-9 4 L-2 4 Z" fill={sail} opacity="0.8" />
    </g>
  );
}

export function Cloud({ x, y, scale = 1, opacity = 0.9 }: { x: number; y: number; scale?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <ellipse cx="0" cy="0" rx="26" ry="14" fill="#fff" />
      <circle cx="-14" cy="-2" r="12" fill="#fff" />
      <circle cx="10" cy="-6" r="15" fill="#fff" />
    </g>
  );
}
