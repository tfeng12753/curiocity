const PENDING_KEY = 'learnverse.google.pending';

export interface GooglePending {
  role: 'student' | 'teacher';
  classCode?: string;
}

export type GoogleReturn = {
  credential: string;
  pending: GooglePending | null;
  error: string | null;
};

let cachedReturn: GoogleReturn | null | undefined;

function parsePending(raw: string | null): GooglePending | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GooglePending>;
    if (parsed.role === 'student' || parsed.role === 'teacher') {
      return { role: parsed.role, classCode: parsed.classCode };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function redirectToGoogle(pending: GooglePending) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Add VITE_GOOGLE_CLIENT_ID to your .env file.');

  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: crypto.randomUUID(),
    prompt: 'select_account',
    state: JSON.stringify(pending),
  });

  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

/** Read the Google return at most once so React Strict Mode cannot wipe the token. */
export function readGoogleReturn(): GoogleReturn | null {
  if (cachedReturn !== undefined) return cachedReturn;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get('error') || query.get('error');
  const credential = hash.get('id_token');
  const pending =
    parsePending(sessionStorage.getItem(PENDING_KEY)) ?? parsePending(hash.get('state') || query.get('state'));

  if (!credential && !error) {
    cachedReturn = null;
    return null;
  }

  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  history.replaceState(null, '', window.location.pathname);

  if (error) {
    cachedReturn = { credential: '', pending, error: `Google sign-in was cancelled (${error}).` };
  } else if (!credential) {
    cachedReturn = { credential: '', pending, error: 'Google did not send a sign-in token.' };
  } else {
    cachedReturn = { credential, pending, error: null };
  }
  return cachedReturn;
}
