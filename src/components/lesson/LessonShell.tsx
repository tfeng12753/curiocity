import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../audio/sound';
import { CameraGate, CameraPip } from '../../tracker/CameraGate';
import { tracker } from '../../tracker/trackerStore';
import { useTrackerState } from '../../tracker/useTracker';
import { WorkshopBackdrop } from './WorkshopBackdrop';
import './lesson.css';

export interface LessonScene {
  id: string;
  title: string;
  challenge?: number;
  render: (next: () => void) => ReactNode;
}

interface LessonShellProps {
  /** Shown in the crumb trail, e.g. "Math City / Thirds & Sixths / Level 02". */
  pathLabel: string;
  scenes: LessonScene[];
  onExit: () => void;
}

/**
 * The chrome every lesson shares (HUD, camera gate, backdrop, step dots),
 * factored out so new lessons don't duplicate it - and so the original,
 * already-tested FractionLesson.tsx can stay exactly as it is rather than
 * being refactored to use this.
 */
export function LessonShell({ pathLabel, scenes, onExit }: LessonShellProps) {
  const [index, setIndex] = useState(0);
  const [gateOpen, setGateOpen] = useState(true);
  const { mode, status } = useTrackerState();

  const scene = scenes[index];
  const isChallenge = Boolean(scene.challenge);
  const isComplete = scene.id === 'complete';
  const showGate = gateOpen && index >= 1 && !isComplete;

  useEffect(() => {
    return () => tracker.setDwell(0);
  }, []);

  const next = () => {
    sfx.play('tap');
    setIndex((current) => Math.min(current + 1, scenes.length - 1));
  };

  return (
    <motion.div
      className={`lesson ${isChallenge ? 'lesson--challenge' : ''}`}
      data-city="math"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <WorkshopBackdrop challenge={isChallenge} />

      {!isComplete && (
        <header className="lesson__hud">
          <button className="city__back" onClick={onExit}>
            ← Math City
          </button>

          <div className="lesson__crumbs">
            <span className="lesson__path">{pathLabel}</span>
            <strong>{scene.title}</strong>
            <div className="lesson__steps" aria-label={`Step ${index + 1} of ${scenes.length - 1}`}>
              {scenes.slice(0, -1).map((item, i) => (
                <span key={item.id} className={i <= index ? 'is-done' : ''} />
              ))}
            </div>
          </div>

          <div className="lesson__tools">
            <CameraPip />
            <div className="lesson__tool-buttons">
              <span className="pill">
                {mode === 'hand' && status === 'ready' ? '✋ Finger' : '🖱️ Pointer'} mode
              </span>
              {mode !== 'hand' && (
                <button className="btn btn--ghost btn--sm" onClick={() => setGateOpen(true)}>
                  Use camera
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="lesson__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            className="lesson__scene"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene.render(next)}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showGate && <CameraGate key="gate" onDone={() => setGateOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
