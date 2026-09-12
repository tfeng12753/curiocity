import { useEffect, useRef } from 'react';
import { tracker } from './trackerStore';
import './tracker.css';

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

const TRAIL_MS = 650;

/**
 * The "air drawing" feedback doc §3.1 asks for: a soft, fading stroke that
 * follows the tracked fingertip across the full-screen camera self-view, so
 * moving a hand in the air reads as drawing rather than just moving a dot.
 * Pulls from the same cursor stream FingerCursor already uses - no new
 * tracking, just a second, purely visual consumer of it.
 */
export function AirTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<TrailPoint[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const unsubscribeCursor = tracker.subscribeCursor((sample) => {
      if (!sample.visible || sample.source !== 'hand') return;
      pointsRef.current.push({ x: sample.x, y: sample.y, t: performance.now() });
    });

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const now = performance.now();
      const points = pointsRef.current.filter((p) => now - p.t < TRAIL_MS);
      pointsRef.current = points;

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (points.length < 2) return;

      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const age = (now - b.t) / TRAIL_MS;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(255, 194, 74, ${Math.max(0, 1 - age) * 0.8})`;
        ctx.lineWidth = Math.max(2, 10 * (1 - age));
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      unsubscribeCursor();
    };
  }, []);

  return <canvas ref={canvasRef} className="air-trail" aria-hidden="true" />;
}
