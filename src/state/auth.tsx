import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  accountsHealth,
  fetchMe,
  logout as logoutRequest,
  signInWithGoogle,
  type AccountUser,
} from '../api';
import { readGoogleReturn, redirectToGoogle } from '../auth/googleRedirect';

const TOKEN_KEY = 'learnverse.session.v1';

interface AuthContextValue {
  user: AccountUser | null;
  token: string | null;
  ready: boolean;
  serverUp: boolean | null;
  googleReady: boolean;
  authError: string | null;
  startGoogleRedirect: (input: { role: 'student' | 'teacher'; classCode?: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(next: string | null) {
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

interface BootResult {
  token: string | null;
  user: AccountUser | null;
  error: string | null;
}

let bootPromise: Promise<BootResult> | null = null;

function bootSession(): Promise<BootResult> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const returning = readGoogleReturn();
    if (returning) {
      if (returning.error) return { token: null, user: null, error: returning.error };
      if (!returning.pending) {
        return { token: null, user: null, error: 'Choose student or teacher, then try Google again.' };
      }
      try {
        const data = await signInWithGoogle({
          credential: returning.credential,
          role: returning.pending.role,
          classCode: returning.pending.classCode,
        });
        writeToken(data.token);
        return { token: data.token, user: data.user, error: null };
      } catch (caught) {
        writeToken(null);
        return {
          token: null,
          user: null,
          error: caught instanceof Error ? caught.message : 'Could not finish Google sign-in.',
        };
      }
    }

    const existing = readToken();
    if (!existing) return { token: null, user: null, error: null };
    try {
      const data = await fetchMe(existing);
      return { token: existing, user: data.user, error: null };
    } catch {
      writeToken(null);
      return { token: null, user: null, error: null };
    }
  })();

  return bootPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(false);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    accountsHealth()
      .then((data) => {
        if (cancelled) return;
        setServerUp(true);
        setGoogleReady(Boolean(data.google) && Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));
      })
      .catch(() => {
        if (!cancelled) setServerUp(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    bootSession().then((result) => {
      if (cancelled) return;
      setToken(result.token);
      setUser(result.user);
      setAuthError(result.error);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startGoogleRedirect = useCallback((input: { role: 'student' | 'teacher'; classCode?: string }) => {
    setAuthError(null);
    redirectToGoogle(input);
  }, []);

  const logout = useCallback(async () => {
    if (token) await logoutRequest(token).catch(() => undefined);
    writeToken(null);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      ready,
      serverUp,
      googleReady,
      authError,
      startGoogleRedirect,
      logout,
    }),
    [user, token, ready, serverUp, googleReady, authError, startGoogleRedirect, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
