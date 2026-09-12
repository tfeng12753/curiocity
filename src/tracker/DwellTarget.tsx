import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
import { InteractiveSurface } from './InteractiveSurface';

interface DwellTargetProps {
  children: ReactNode;
  onActivate: () => void;
  disabled?: boolean;
  dwellMs?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps any clickable control so it can also be triggered by holding the
 * fingertip over it. Mouse clicks stay on the child element itself.
 */
export function DwellTarget({
  children,
  onActivate,
  disabled = false,
  dwellMs = 850,
  className,
  style,
}: DwellTargetProps) {
  const [hot, setHot] = useState(false);

  const handleHover = useCallback((point: { x: number; y: number } | null) => {
    setHot(point !== null);
  }, []);

  return (
    <InteractiveSurface
      enabled={!disabled}
      dwellMs={dwellMs}
      pointerCommit={false}
      getDwellKey={() => 'target'}
      onHover={handleHover}
      onCommit={onActivate}
      className={`dwell-target ${hot ? 'is-hot' : ''} ${className ?? ''}`}
      style={style}
    >
      {children}
    </InteractiveSurface>
  );
}
