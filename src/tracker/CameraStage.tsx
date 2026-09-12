import { useEffect, useRef } from 'react';
import { tracker } from './trackerStore';
import './tracker.css';

/**
 * The full-screen self-view for hand-tracking mode (doc: "camera mode should
 * feel large/full-screen ... make the student feel like they're interacting
 * directly with their own image", not a small webcam popup in the corner).
 *
 * Clones the tracker's hidden landmark-detection <video> into its own
 * element rather than moving it - a MediaStream can back more than one
 * <video> at once, so the tiny detection feed keeps running untouched while
 * this one is free to be styled and laid out however the lesson needs.
 */
export function CameraStage() {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = slotRef.current;
    const source = tracker.getVideo();
    if (!host || !source?.srcObject) return;

    const clone = document.createElement('video');
    clone.autoplay = true;
    clone.muted = true;
    clone.playsInline = true;
    clone.srcObject = source.srcObject;
    clone.className = 'camera-stage__video';
    host.appendChild(clone);
    void clone.play();

    return () => {
      clone.srcObject = null;
      clone.remove();
    };
  }, []);

  return (
    <div className="camera-stage" aria-hidden="true">
      <div className="camera-stage__video-slot" ref={slotRef} />
      <div className="camera-stage__scrim" />
    </div>
  );
}
