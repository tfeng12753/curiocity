import { sfx } from '../audio/sound';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';
import { Icon } from '../components/icons/Icon';
import { DwellTarget } from './DwellTarget';

interface TrackerModeControlProps {
  /** Lets a host (e.g. the lesson HUD) lay this out inline instead of as a
   *  standalone floating badge. */
  className?: string;
}

/**
 * The one place that shows which input mode is active and lets the student
 * switch it. Camera onboarding (CameraGate) only teaches the gesture once,
 * ever - after that, turning the camera on or back off again is just this
 * plain toggle, available everywhere in the app rather than re-explaining
 * itself on every screen.
 */
export function TrackerModeControl({ className }: TrackerModeControlProps) {
  const { mode, status, error } = useTrackerState();
  const active = mode === 'hand' && status === 'ready';

  const backToPointer = () => {
    tracker.stopCamera();
    tracker.usePointer();
    sfx.play('tap');
  };

  const useCamera = () => {
    sfx.play('tap');
    void tracker.startCamera();
  };

  return (
    <div className={`tracker-mode ${className ?? ''}`}>
      <div className="tracker-mode__row">
        <span className="pill">
          <Icon name={active ? 'hand' : status === 'starting' ? 'hourglass' : 'mouse'} size={17} />
          {active ? 'Finger' : status === 'starting' ? 'Starting' : 'Pointer'} mode
        </span>
        {active ? (
          <DwellTarget onActivate={backToPointer}>
            <button className="btn btn--ghost btn--sm" onClick={backToPointer}>
              Use pointer
            </button>
          </DwellTarget>
        ) : (
          <DwellTarget onActivate={useCamera} disabled={status === 'starting'}>
            <button className="btn btn--ghost btn--sm" onClick={useCamera} disabled={status === 'starting'}>
              Use camera
            </button>
          </DwellTarget>
        )}
      </div>
      {status === 'error' && error && <span className="tracker-mode__error">{error}</span>}
    </div>
  );
}
