import { useEffect, useState } from 'react';
import './tracker.css';

/*
  What the browser will actually tell you about the camera, in plain language.

  Lives on its own because it is needed in two places that are nowhere near
  each other: the first-run gate, and Settings - where it matters more, since
  that is where somebody goes once the camera has already let them down.
*/
interface Diagnostics {
  secureContext: boolean;
  hasMediaDevices: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unsupported';
  videoInputs: number | null;
}

export async function checkCamera(): Promise<Diagnostics> {
  const secureContext = window.isSecureContext;
  const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;

  let permission: Diagnostics['permission'] = 'unsupported';
  try {
    const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    if (status) permission = status.state as Diagnostics['permission'];
  } catch {
    /* some browsers don't know the "camera" permission name at all - fine, just unknown */
  }

  let videoInputs: number | null = null;
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.();
    videoInputs = devices?.filter((d) => d.kind === 'videoinput').length ?? null;
  } catch {
    /* enumerateDevices can throw before permission is granted on some browsers */
  }

  return { secureContext, hasMediaDevices, permission, videoInputs };
}

const PERMISSION_HINT: Record<Diagnostics['permission'], string> = {
  granted: 'Allowed for this site.',
  denied: "Blocked for this site - click the camera icon in your browser's address bar, choose Allow, then reload.",
  prompt: "Not asked yet - click \"Turn on camera\" below to get the permission popup.",
  unsupported: "This browser won't report permission state ahead of time - try turning the camera on directly.",
};

/** Lets a student (or you) see *why* the camera isn't working, without guessing. */
export function CameraDiagnostics() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [open, setOpen] = useState(false);

  const run = () => {
    void checkCamera().then(setDiag);
  };

  useEffect(() => {
    if (open && !diag) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="camera-gate__diagnostics">
      <button type="button" className="camera-gate__diagnostics-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide camera check' : 'Camera not working? Check what your browser sees'}
      </button>
      {open && diag && (
        <ul className="camera-gate__diagnostics-list">
          <li>{diag.secureContext ? '✅' : '❌'} Secure page (https or localhost)</li>
          <li>{diag.hasMediaDevices ? '✅' : '❌'} Browser supports camera access</li>
          <li>
            {diag.permission === 'granted' ? '✅' : diag.permission === 'denied' ? '❌' : '⚠️'} Permission:{' '}
            {diag.permission} - {PERMISSION_HINT[diag.permission]}
          </li>
          <li>
            {diag.videoInputs === null ? '⚠️' : diag.videoInputs > 0 ? '✅' : '❌'} Cameras detected:{' '}
            {diag.videoInputs ?? 'unknown'}
            {diag.videoInputs === 0 &&
              ' - check it is plugged in / enabled in your OS settings and not already in use by another app.'}
          </li>
        </ul>
      )}
      {open && diag && (
        <button type="button" className="camera-gate__diagnostics-recheck" onClick={run}>
          Recheck
        </button>
      )}
    </div>
  );
}
