import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../audio/sound';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';
import './tracker.css';

type Phase = 'ask' | 'starting' | 'ready' | 'failed';

function HandIllustration() {
  return (
    <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
      <g>
        <rect x="50" y="18" width="20" height="54" rx="10" fill="#ffd6b8" />
        <rect x="50" y="18" width="20" height="54" rx="10" fill="none" stroke="#e8a878" strokeWidth="2" />
        <rect x="32" y="44" width="18" height="46" rx="9" fill="#ffc9a4" stroke="#e8a878" strokeWidth="2" />
        <rect x="68" y="44" width="18" height="46" rx="9" fill="#ffc9a4" stroke="#e8a878" strokeWidth="2" />
        <rect x="42" y="60" width="38" height="42" rx="18" fill="#ffd6b8" stroke="#e8a878" strokeWidth="2" />
        <circle cx="60" cy="16" r="8" fill="var(--sun-500)" opacity="0.85" />
      </g>
    </svg>
  );
}

export function CameraGate({ onDone }: { onDone: () => void }) {
  const { handVisible, error } = useTrackerState();
  const [phase, setPhase] = useState<Phase>('ask');

  useEffect(() => {
    if (phase === 'ready' && handVisible) {
      sfx.play('success');
      const id = setTimeout(onDone, 700);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [phase, handVisible, onDone]);

  const startCamera = async () => {
    setPhase('starting');
    const ok = await tracker.startCamera();
    setPhase(ok ? 'ready' : 'failed');
  };

  const usePointer = () => {
    tracker.usePointer();
    tracker.markOnboarded();
    sfx.play('tap');
    onDone();
  };

  return (
    <div className="camera-gate">
      <motion.div
        className="camera-gate__card"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="camera-gate__hand">
          <HandIllustration />
        </div>

        {phase === 'ask' && (
          <>
            <span className="eyebrow">Fraction Workshop</span>
            <h2>Ready to interact?</h2>
            <p>
              This lesson lets you use your <strong>index finger</strong> to cut and colour things
              on screen. Turn on your camera, or use your mouse instead - both work.
            </p>
            <div className="camera-gate__actions">
              <button className="btn btn--lg" onClick={startCamera}>
                Turn on camera
              </button>
              <button className="btn btn--ghost" onClick={usePointer}>
                Continue with pointer
              </button>
            </div>
            <p className="camera-gate__note">
              Video never leaves your computer - hand tracking runs right here in the browser.
            </p>
          </>
        )}

        {phase === 'starting' && (
          <>
            <span className="eyebrow">One moment</span>
            <h2>Warming up the camera</h2>
            <p>Getting hand tracking ready...</p>
            <div className="camera-gate__actions">
              <button className="btn btn--ghost btn--sm" onClick={usePointer}>
                Skip - use pointer
              </button>
            </div>
          </>
        )}

        {phase === 'ready' && (
          <>
            <span className="eyebrow">Camera ready</span>
            <h2>Show your hand</h2>
            <p>
              Hold your hand up to the camera and move your <strong>index finger</strong> to begin.
            </p>
            <div className="camera-gate__actions">
              <button className="btn btn--city" onClick={() => { tracker.markOnboarded(); onDone(); }}>
                I'm ready
              </button>
              <button className="btn btn--ghost btn--sm" onClick={usePointer}>
                Use pointer instead
              </button>
            </div>
          </>
        )}

        {phase === 'failed' && (
          <>
            <span className="eyebrow">No problem</span>
            <h2>Camera interaction isn't available</h2>
            <p>Use your mouse or trackpad instead - the whole lesson works exactly the same.</p>
            {error && <div className="camera-gate__error">{error}</div>}
            <div className="camera-gate__actions">
              <button className="btn btn--lg" onClick={usePointer}>
                Continue with pointer
              </button>
              <button className="btn btn--ghost btn--sm" onClick={startCamera}>
                Try camera again
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export function CameraPip() {
  const { mode, handVisible, status } = useTrackerState();
  const [videoEl] = useState(() => tracker.getVideo());

  useEffect(() => {
    const host = document.getElementById('camera-pip-slot');
    const source = tracker.getVideo();
    if (!host || !source) return;
    const clone = document.createElement('video');
    clone.autoplay = true;
    clone.muted = true;
    clone.playsInline = true;
    clone.srcObject = source.srcObject;
    host.appendChild(clone);
    void clone.play();
    return () => {
      clone.srcObject = null;
      clone.remove();
    };
  }, [videoEl, status]);

  if (mode !== 'hand' || status !== 'ready') return null;

  return (
    <div className="camera-pip">
      <div id="camera-pip-slot" />
      <span className="camera-pip__label">
        <i className={`camera-pip__dot ${handVisible ? '' : 'is-waiting'}`} />
        {handVisible ? 'Finger tracking' : 'Show your hand'}
      </span>
    </div>
  );
}
