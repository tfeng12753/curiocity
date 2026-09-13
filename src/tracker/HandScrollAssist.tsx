import { useEffect, useRef, useState } from 'react';
import { tracker } from './trackerStore';
import './tracker.css';

const EDGE_ZONE_PX = 90;
const MAX_SCROLL_PX_PER_FRAME = 16;

/** Walks up from `el` to find the nearest ancestor that actually scrolls. */
function findScrollable(el: Element | null): HTMLElement | null {
  let node: HTMLElement | null = el as HTMLElement | null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const canScrollY = /(auto|scroll)/.test(style.overflowY);
    if (canScrollY && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * A mouse has a wheel; a tracked hand does not. Without this, the overflow
 * fix that makes a too-tall lesson step scrollable on a short window (see
 * .lesson__scene) is invisible and unreachable in hand mode - the content
 * is there, but nothing the student can do with their hand gets to it.
 *
 * Hovering the fingertip near the top or bottom edge of the screen for a
 * moment auto-scrolls whatever is scrollable under it, the same convention
 * drag-and-drop UIs and accessibility switch-scanning use for exactly this
 * problem. A small arrow shows up at the edge so it reads as a control, not
 * a glitch.
 */
export function HandScrollAssist() {
  const [edge, setEdge] = useState<'up' | 'down' | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const directionRef = useRef<-1 | 0 | 1>(0);

  useEffect(() => {
    let raf = 0;
    let point = { x: 0, y: 0 };

    const unsubscribe = tracker.subscribeCursor((sample) => {
      if (sample.source !== 'hand' || !sample.visible) {
        directionRef.current = 0;
        targetRef.current = null;
        setEdge(null);
        return;
      }

      point = { x: sample.x, y: sample.y };
      const height = window.innerHeight;
      const nearTop = sample.y < EDGE_ZONE_PX;
      const nearBottom = sample.y > height - EDGE_ZONE_PX;

      if (!nearTop && !nearBottom) {
        directionRef.current = 0;
        targetRef.current = null;
        setEdge(null);
        return;
      }

      const el = document.elementFromPoint(sample.x, sample.y);
      const scrollable = findScrollable(el);
      if (!scrollable) {
        directionRef.current = 0;
        targetRef.current = null;
        setEdge(null);
        return;
      }

      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((nearTop && atTop) || (nearBottom && atBottom)) {
        directionRef.current = 0;
        targetRef.current = null;
        setEdge(null);
        return;
      }

      targetRef.current = scrollable;
      directionRef.current = nearTop ? -1 : 1;
      setEdge(nearTop ? 'up' : 'down');
    });

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const direction = directionRef.current;
      const target = targetRef.current;
      if (!direction || !target) return;

      // Faster the deeper into the edge zone the fingertip sits, so easing
      // in near the boundary feels controllable rather than all-or-nothing.
      const depth = direction === -1 ? EDGE_ZONE_PX - point.y : point.y - (window.innerHeight - EDGE_ZONE_PX);
      const speed = Math.max(0.25, Math.min(1, depth / EDGE_ZONE_PX));
      target.scrollTop += direction * MAX_SCROLL_PX_PER_FRAME * speed;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, []);

  if (!edge) return null;

  return (
    <div className={`hand-scroll-cue hand-scroll-cue--${edge}`} aria-hidden="true">
      {edge === 'up' ? '▲' : '▼'}
    </div>
  );
}
