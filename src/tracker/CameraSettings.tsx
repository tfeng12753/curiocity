import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sound';
import { CameraDiagnostics } from './CameraDiagnostics';
import { tracker } from './trackerStore';
import { useTrackerState } from './useTracker';
import './tracker.css';

/**
 * A live self-view. Nothing else proves a camera is working: a green "ready"
 * label is true of a lens pointing at a closed laptop lid, of the wrong camera
 * entirely, and of a stream that stalled thirty seconds ago.
 *
 * Clones the tracker's hidden detection video the way CameraStage does - one
 * MediaStream can back several <video> elements, so this costs nothing and
 * cannot disturb tracking.
 */
function CameraPreview({ streamKey }: { streamKey: number }) {
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
    clone.className = 'camera-settings__video';
    host.appendChild(clone);
    void clone.play();

    return () => {
      clone.srcObject = null;
      clone.remove();
    };
  }, [streamKey]);

  return <div className="camera-settings__preview" ref={slotRef} />;
}

export function CameraSettings() {
  const { mode, status, handVisible, error } = useTrackerState();
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>([]);
  const [selected, setSelected] = useState(() => tracker.preferredCamera() ?? '');
  const [busy, setBusy] = useState(false);
  // Forces the preview to re-attach whenever the underlying stream is replaced.
  const [streamKey, setStreamKey] = useState(0);

  const live = mode === 'hand' && status === 'ready';

  const refreshCameras = () => {
    void tracker.listCameras().then(setCameras);
  };

  useEffect(refreshCameras, [live]);

  const start = async (deviceId?: string) => {
    setBusy(true);
    sfx.play('tap');
    await tracker.restartCamera(deviceId ?? selected ?? undefined);
    setStreamKey((key) => key + 1);
    refreshCameras();
    setBusy(false);
  };

  const stop = () => {
    tracker.stopCamera();
    tracker.usePointer();
    sfx.play('tap');
    setStreamKey((key) => key + 1);
  };

  return (
    <>
      <div className="drawer__city-head">
        <strong>Camera</strong>
        <span className={`camera-settings__status camera-settings__status--${live ? 'on' : status}`}>
          {status === 'starting'
            ? 'Starting...'
            : live
              ? handVisible
                ? 'Hand detected'
                : 'On - show your hand'
              : status === 'error'
                ? 'Problem'
                : 'Off (using the mouse)'}
        </span>
      </div>

      {live ? (
        <CameraPreview streamKey={streamKey} />
      ) : (
        <p className="camera-settings__empty">
          Turn the camera on to see yourself here. If you can see yourself, hand tracking
          can see you too.
        </p>
      )}

      {error && <p className="camera-settings__error">{error}</p>}

      {cameras.length > 1 && (
        <label className="camera-settings__picker">
          <span>Which camera?</span>
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              void start(event.target.value);
            }}
            disabled={busy}
          >
            <option value="">Let the browser choose</option>
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="camera-settings__actions">
        <button className="btn btn--sm" onClick={() => void start()} disabled={busy}>
          {busy ? 'Starting...' : live ? 'Restart camera' : 'Turn on camera'}
        </button>
        {live && (
          <button className="btn btn--ghost btn--sm" onClick={stop}>
            Use the mouse instead
          </button>
        )}
      </div>

      <CameraDiagnostics />
    </>
  );
}
