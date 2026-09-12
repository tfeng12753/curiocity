import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: 'popup' | 'redirect';
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: string },
          ) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGis() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function GoogleButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

  useEffect(() => {
    if (!clientId || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !window.google || !host) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential);
          },
        });
        host.innerHTML = '';
        window.google.accounts.id.renderButton(host, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: '320',
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="mode-gate__warn">
        Add <code>VITE_GOOGLE_CLIENT_ID</code> to a <code>.env</code> file, then restart Vite.
      </p>
    );
  }

  return <div ref={hostRef} className={`mode-gate__google ${disabled ? 'is-disabled' : ''}`} />;
}
