const ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(`${ENDPOINT}${path}`, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: unknown } & T;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : 'Request failed',
    );
  }
  return data;
}

export function accountsHealth() {
  return request<{ ok: boolean; google?: boolean }>('/accounts/health');
}

export function signInWithGoogle(body: {
  credential: string;
  role: 'student' | 'teacher';
  classCode?: string;
}) {
  return request<{ token: string; user: AccountUser }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchMe(token: string) {
  return request<{ user: AccountUser }>('/auth/me', {}, token);
}

export function logout(token: string) {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token);
}

export function fetchRemoteProgress(token: string) {
  return request<{ progress: unknown }>('/progress', {}, token);
}

export function saveRemoteProgress(token: string, progress: unknown) {
  return request<{ progress: unknown }>(
    '/progress',
    { method: 'PUT', body: JSON.stringify({ progress }) },
    token,
  );
}

export function fetchClass(token: string) {
  return request<{ class: { id: string; code: string }; students: ClassStudent[] }>('/class', {}, token);
}

export function resetClassStudent(token: string, studentId: string) {
  return request<{ progress: unknown }>(
    '/class/reset',
    { method: 'POST', body: JSON.stringify({ studentId }) },
    token,
  );
}

export interface AccountUser {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  classId: string | null;
  classCode: string | null;
}

export interface ClassStudent {
  id: string;
  name: string;
  progress: unknown;
}
