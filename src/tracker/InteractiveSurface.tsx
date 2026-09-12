import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';

export interface SurfacePoint {
  /** Position inside the surface, expressed in the surface's own view units. */
  x: number;
  y: number;
}

interface InteractiveSurfaceProps {
  children: ReactNode;
  /** Coordinate space handed to callbacks (defaults to a 100x100 box). */
  viewW?: number;
  viewH?: number;
  enabled?: boolean;
  /**
   * Identifies what the finger is currently aiming at. The dwell timer restarts
   * whenever this changes, so quantise it (a region id, a snapped cut position)
   * rather than returning raw coordinates.
   */
  getDwellKey?: (point: SurfacePoint) => string | null;
  onHover?: (point: SurfacePoint | null) => void;
  onCommit?: (point: SurfacePoint) => void;
  dwellMs?: number;
  /** Set false when a child element (e.g. a real button) handles mouse clicks. */
  pointerCommit?: boolean;
  className?: string;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
}

const RECOMMIT_LOCK_MS = 700;

/**
 * One interaction surface that behaves identically whether the student is using
 * a tracked fingertip (hover + hold to commit) or a mouse/trackpad (move + click).
 */
export function InteractiveSurface({
  children,
  viewW = 100,
  viewH = 100,
  enabled = true,
  getDwellKey,
  onHover,
  onCommit,
  dwellMs = 900,
  pointerCommit = true,
  className,
  style,
  role,
  ariaLabel,
}: InteractiveSurfaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { mode } = useTrackerState();

  const dwellKeyRef = useRef<string | null>(null);
  const dwellStartRef = useRef(0);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const lockUntilRef = useRef(0);
  const insideRef = useRef(false);
  const pinchRef = useRef(false);

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const rect = hostRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return null;
      const inside =
        clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      return {
        inside,
        point: {
          x: ((clientX - rect.left) / rect.width) * viewW,
          y: ((clientY - rect.top) / rect.height) * viewH,
        },
      };
    },
    [viewW, viewH],
  );

  const resetDwell = useCallback(() => {
    dwellKeyRef.current = null;
    anchorRef.current = null;
    dwellStartRef.current = 0;
    tracker.setDwell(0);
  }, []);

  // --- hand mode -----------------------------------------------------------
  useEffect(() => {
    if (!enabled || mode !== 'hand') return;

    const unsubscribe = tracker.subscribeCursor((sample) => {
      if (sample.source !== 'hand') return;

      if (!sample.visible) {
        if (insideRef.current) {
          insideRef.current = false;
          onHover?.(null);
        }
        resetDwell();
        return;
      }

      const mapped = toLocal(sample.x, sample.y);
      if (!mapped || !mapped.inside) {
        if (insideRef.current) {
          insideRef.current = false;
          onHover?.(null);
          resetDwell();
        }
        return;
      }

      insideRef.current = true;
      onHover?.(mapped.point);

      const key = getDwellKey ? getDwellKey(mapped.point) : 'surface';
      if (key === null) {
        resetDwell();
        return;
      }

      const now = performance.now();
      const anchor = anchorRef.current;
      const drifted = anchor ? Math.hypot(sample.x - anchor.x, sample.y - anchor.y) > 70 : true;

      if (key !== dwellKeyRef.current || drifted) {
        dwellKeyRef.current = key;
        dwellStartRef.current = now;
        anchorRef.current = { x: sample.x, y: sample.y };
        tracker.setDwell(0);
        return;
      }

      // Pinching index finger to thumb is an optional shortcut past the hold.
      const pinchStarted = sample.pinching && !pinchRef.current;
      pinchRef.current = sample.pinching;

      // A forward poke - jabbing the fingertip toward the camera - is the
      // primary way to commit; sample.poking is already a one-shot rising
      // edge (see trackerStore's detectPoke), so no extra edge-tracking
      // needed here. The dwell hold and pinch both stay as fallbacks for
      // whenever a poke doesn't register cleanly.
      const elapsed = now - dwellStartRef.current;
      const ready = elapsed >= dwellMs || pinchStarted || sample.poking;

      if (!ready) {
        tracker.setDwell(elapsed / dwellMs);
        return;
      }

      if (now < lockUntilRef.current) return;

      lockUntilRef.current = now + RECOMMIT_LOCK_MS;
      dwellStartRef.current = now + RECOMMIT_LOCK_MS;
      tracker.setDwell(0);
      onCommit?.(mapped.point);
    });

    return () => {
      unsubscribe();
      resetDwell();
    };
  }, [enabled, mode, toLocal, getDwellKey, onHover, onCommit, dwellMs, resetDwell]);

  useEffect(() => () => tracker.setDwell(0), []);

  // --- pointer mode --------------------------------------------------------
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const mapped = toLocal(event.clientX, event.clientY);
    if (mapped) onHover?.(mapped.point);
  };

  const handlePointerLeave = () => {
    if (!enabled) return;
    onHover?.(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !pointerCommit) return;
    const mapped = toLocal(event.clientX, event.clientY);
    if (!mapped || !mapped.inside) return;
    if (getDwellKey && getDwellKey(mapped.point) === null) return;
    onCommit?.(mapped.point);
  };

  return (
    <div
      ref={hostRef}
      className={className}
      style={{ touchAction: 'none', ...style }}
      role={role}
      aria-label={ariaLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      {children}
    </div>
  );
}
