import { useEffect, useRef } from 'react';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';
import './tracker.css';

const RING_CIRCUMFERENCE = 2 * Math.PI * 26;

/**
 * The student's pointer, drawn as a friendly fingertip. In hand mode the ring
 * fills while they hold still (dwell = "press"); in pointer mode it is a light
 * halo so the same visual language is used for both inputs.
 */
export function FingerCursor({ active }: { active: boolean }) {
  const { mode, handVisible } = useTrackerState();
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2, visible: false };
    let pokeTimeout: ReturnType<typeof setTimeout> | undefined;

    const unsubscribeCursor = tracker.subscribeCursor((sample) => {
      target = { x: sample.x, y: sample.y, visible: sample.visible };
      if (sample.poking) {
        const root = rootRef.current;
        if (root) {
          root.classList.remove('is-poking');
          // Forces the animation to restart even if a previous poke's timeout
          // hasn't cleared the class yet.
          void root.offsetWidth;
          root.classList.add('is-poking');
        }
        clearTimeout(pokeTimeout);
        pokeTimeout = setTimeout(() => rootRef.current?.classList.remove('is-poking'), 260);
      }
    });

    const unsubscribeDwell = tracker.subscribeDwell((progress) => {
      const ring = ringRef.current;
      if (!ring) return;
      ring.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progress)}`;
      ring.style.opacity = progress > 0.02 ? '1' : '0';
    });

    const render = () => {
      frame = requestAnimationFrame(render);
      const root = rootRef.current;
      if (!root) return;
      root.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      root.style.opacity = target.visible ? '1' : '0';
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(pokeTimeout);
      unsubscribeCursor();
      unsubscribeDwell();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className={`finger-cursor ${mode === 'hand' ? 'is-hand' : 'is-pointer'} ${
        mode === 'hand' && !handVisible ? 'is-searching' : ''
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle className="finger-cursor__halo" cx="32" cy="32" r="18" />
        <circle
          ref={ringRef}
          className="finger-cursor__ring"
          cx="32"
          cy="32"
          r="26"
          style={{
            strokeDasharray: RING_CIRCUMFERENCE,
            strokeDashoffset: RING_CIRCUMFERENCE,
            opacity: 0,
          }}
        />
        <circle className="finger-cursor__dot" cx="32" cy="32" r="7" />
      </svg>
    </div>
  );
}
