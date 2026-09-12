import { useMemo } from 'react';

const COLORS = ['#ffc24a', '#ff6f9c', '#5ad8f5', '#7a5cf0', '#3fd68f'];

/** Short, tasteful celebration burst - no library, no canvas. */
export function Confetti({ count = 26, seed = 0 }: { count?: number; seed?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + seed;
        const distance = 90 + ((i * 37 + seed * 13) % 120);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: (i * 53) % 360,
          delay: (i % 6) * 0.035,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
        };
      }),
    [count, seed],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="confetti__bit"
          style={
            {
              background: piece.color,
              borderRadius: piece.round ? '50%' : '2px',
              animationDelay: `${piece.delay}s`,
              '--cx': `${piece.x}px`,
              '--cy': `${piece.y}px`,
              '--cr': `${piece.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
