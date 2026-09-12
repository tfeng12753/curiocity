import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { sfx } from '../audio/sound';
import { Curio } from '../components/curio/Curio';
import { CameraDiagnostics } from './CameraDiagnostics';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';
import './tracker.css';

type Phase = 'ask' | 'starting' | 'ready' | 'failed';

/**
 * A hand pointing with the index finger. The finger is set apart from the
 * folded ones and to one side, deliberately asymmetric, so it can never be
 * mistaken for a single raised digit.
 */
function HandIllustration() {
  return (
    <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
      {/* palm */}
      <rect x="34" y="58" width="48" height="46" rx="19" fill="#ffd6b8" stroke="#e8a878" strokeWidth="2" />

      {/* three folded fingers, stacked along the knuckle line */}
      <g stroke="#e8a878" strokeWidth="2" strokeLinejoin="round">
        <rect x="54" y="40" width="30" height="15" rx="7.5" fill="#ffc9a4" />
        <rect x="54" y="53" width="32" height="15" rx="7.5" fill="#ffc9a4" />
        <rect x="54" y="66" width="29" height="15" rx="7.5" fill="#ffc9a4" />
      </g>

      {/* the pointing index finger, offset to the left of the folded stack */}
      <rect x="28" y="14" width="19" height="50" rx="9.5" fill="#ffd6b8" stroke="#e8a878" strokeWidth="2" />

      {/* thumb, tucked across the front of the fist */}
      <rect
        x="20"
        y="70"
        width="26"
        height="15"
        rx="7.5"
        fill="#ffc9a4"
        stroke="#e8a878"
        strokeWidth="2"
        transform="rotate(-25 33 77)"
      />

      {/* a little sparkle at the fingertip to read as "tap here" */}
      <g stroke="var(--sun-500)" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M37 10 L37 2" />
        <path d="M24 16 L18 10" />
        <path d="M50 14 L54 6" />
      </g>
    </svg>
  );
}

/**
 * An open hand, all five fingers spread - the "select" gesture. Drawn
 * distinctly from HandIllustration's pointing fist (only one finger raised)
 * so the two are never confused: this one is unmistakably "open".
 */
function OpenPalmIllustration() {
  return (
    <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
      <g stroke="#e8a878" strokeWidth="2" strokeLinejoin="round">
        {/* palm */}
        <rect x="34" y="56" width="46" height="48" rx="19" fill="#ffd6b8" />
        {/* thumb, splayed out to the side */}
        <rect x="14" y="52" width="16" height="34" rx="8" fill="#ffc9a4" transform="rotate(-40 22 69)" />
        {/* four fingers, fanned out from the knuckle line */}
        <rect x="30" y="18" width="15" height="44" rx="7.5" fill="#ffd6b8" transform="rotate(-14 37 40)" />
        <rect x="48" y="10" width="15" height="52" rx="7.5" fill="#ffd6b8" />
        <rect x="65" y="14" width="14" height="46" rx="7" fill="#ffd6b8" transform="rotate(10 72 37)" />
        <rect x="80" y="24" width="13" height="36" rx="6.5" fill="#ffd6b8" transform="rotate(22 86 42)" />
      </g>

      {/* a little sparkle burst to read as "go" / "select" */}
      <g stroke="var(--sun-500)" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M55 8 L55 1" />
        <path d="M40 10 L35 3" />
        <path d="M70 10 L75 3" />
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
      const id = setTimeout(() => {
        tracker.markOnboarded();
        onDone();
      }, 700);
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
    // Safe even if the camera never started or already stopped on error -
    // this just guarantees a running hand-tracking loop never keeps firing
    // cursor samples after the student has switched back to their mouse.
    tracker.stopCamera();
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
        <div className="camera-gate__hero">
          <Curio mood={phase === 'ready' ? 'cheer' : 'wave'} size={104} />
          <div className="camera-gate__hand">
            {phase === 'ready' ? <OpenPalmIllustration /> : <HandIllustration />}
          </div>
        </div>

        {phase === 'ask' && (
          <>
            <span className="eyebrow">Curio-City</span>
            <h2>Hi! I'm Curio 👋</h2>
            <p>
              I am so glad you're here - welcome to Curio-City! I'll be right beside you the whole
              way. This whole world can be played with your <strong>index finger</strong> - point to
              move around, then open your whole hand, like a high five, to select things. It works
              everywhere here, not just in lessons. Turn on your camera, or use your mouse instead -
              both work brilliantly, and you'll only see this once.
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
            <CameraDiagnostics />
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
            <h2>Wave hello!</h2>
            <p>
              Hold your hand up to the camera. Point with your <strong>index finger</strong> to move
              around, then open your whole hand, like a high five, to select things.
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
            <CameraDiagnostics />
          </>
        )}
      </motion.div>
    </div>
  );
}

