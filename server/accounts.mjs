/*
  Demo account store. Users, class codes, sessions and progress live in
  server/data/accounts.json so the static frontend has somewhere official
  to keep each account. No extra dependencies: Node crypto + a JSON file.
*/
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(SERVER_DIR, 'data', 'accounts.json');

function loadRootEnv() {
  try {
    const text = readFileSync(join(SERVER_DIR, '..', '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const cut = trimmed.indexOf('=');
      if (cut < 1) continue;
      const key = trimmed.slice(0, cut).trim();
      const value = trimmed.slice(cut + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* .env is optional until someone adds a Google client id */
  }
}

loadRootEnv();

function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
}
const SESSION_MS = 1000 * 60 * 60 * 24 * 14;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function emptyStore() {
  return { users: {}, classes: {}, progress: {}, sessions: {} };
}

function loadStore() {
  try {
    const parsed = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    return {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      classes: parsed.classes && typeof parsed.classes === 'object' ? parsed.classes : {},
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store) {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

function id(prefix) {
  return `${prefix}-${randomBytes(6).toString('hex')}`;
}

function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .slice(0, 32);
}

async function verifyGoogleCredential(credential) {
  const clientId = googleClientId();
  if (!clientId) throw new Error('Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  if (typeof credential !== 'string' || !credential) throw new Error('Missing Google sign-in token.');

  const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: credential }),
  });
  if (!response.ok) throw new Error('Google could not verify that sign-in.');
  const payload = await response.json();
  if (payload.aud !== clientId) throw new Error('This Google sign-in is for a different app.');
  if (payload.email_verified === 'false' || payload.email_verified === false) {
    throw new Error('That Google email is not verified yet.');
  }
  if (!payload.sub) throw new Error('Google did not return a user id.');
  return {
    googleSub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : '',
    name: normalizeName(payload.name || payload.email || 'Player') || 'Player',
  };
}

function makeClassCode(store) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += CODE_CHARS[randomBytes(1)[0] % CODE_CHARS.length];
    const taken = Object.values(store.classes).some((entry) => entry.code === code);
    if (!taken) return code;
  }
  return randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
}

function findClassByCode(store, code) {
  const needle = String(code ?? '')
    .trim()
    .toUpperCase();
  return Object.values(store.classes).find((entry) => entry.code === needle) ?? null;
}

function publicUser(store, user) {
  const classroom = user.classId ? store.classes[user.classId] : null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    classId: user.classId ?? null,
    classCode: classroom?.code ?? null,
  };
}

function emptyProgress() {
  return {
    completed: [],
    badges: [],
    coins: 0,
    unlockedVehicles: [],
    unlockedCosmetics: [],
    equippedCosmetics: {},
  };
}

function createSession(store, userId) {
  const token = randomBytes(24).toString('hex');
  store.sessions[token] = { userId, exp: Date.now() + SESSION_MS };
  return token;
}

function userFromToken(store, token) {
  if (!token) return null;
  const session = store.sessions[token];
  if (!session || session.exp < Date.now()) {
    if (session) delete store.sessions[token];
    return null;
  }
  return store.users[session.userId] ?? null;
}

function bearer(req) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function handleAccountRequest(req, res, readJsonBody) {
  const url = req.url?.split('?')[0] ?? '';

  if (req.method === 'GET' && url === '/api/accounts/health') {
    json(res, 200, { ok: true, google: Boolean(googleClientId()) });
    return true;
  }

  if (req.method === 'POST' && url === '/api/auth/google') {
    const body = await readJsonBody(req);
    let identity;
    try {
      identity = await verifyGoogleCredential(body.credential);
    } catch (error) {
      console.error('[accounts] google verify failed:', error.message);
      json(res, 401, { error: error.message || 'Google sign-in failed.' });
      return true;
    }

    const store = loadStore();
    let user = Object.values(store.users).find((entry) => entry.googleSub === identity.googleSub);

    if (!user) {
      const role = body.role === 'teacher' ? 'teacher' : body.role === 'student' ? 'student' : null;
      if (!role) {
        json(res, 400, { error: 'Choose student or teacher first.' });
        return true;
      }

      let classId = null;
      if (role === 'teacher') {
        classId = id('class');
        store.classes[classId] = { id: classId, teacherId: null, code: makeClassCode(store) };
      } else {
        const classroom = findClassByCode(store, body.classCode);
        if (!classroom) {
          json(res, 400, { error: 'Ask your teacher for a class code.' });
          return true;
        }
        classId = classroom.id;
      }

      user = {
        id: id('user'),
        googleSub: identity.googleSub,
        email: identity.email,
        name: identity.name,
        role,
        classId,
      };
      store.users[user.id] = user;
      if (role === 'teacher') store.classes[classId].teacherId = user.id;
      if (!store.progress[user.id]) store.progress[user.id] = emptyProgress();
    } else {
      user.email = identity.email || user.email;
      user.name = identity.name || user.name;
      store.users[user.id] = user;
    }

    const token = createSession(store, user.id);
    saveStore(store);
    json(res, 200, { token, user: publicUser(store, user) });
    return true;
  }

  if (req.method === 'POST' && url === '/api/auth/logout') {
    const store = loadStore();
    const token = bearer(req);
    if (token) delete store.sessions[token];
    saveStore(store);
    json(res, 200, { ok: true });
    return true;
  }

  if (req.method === 'GET' && url === '/api/auth/me') {
    const store = loadStore();
    const user = userFromToken(store, bearer(req));
    if (!user) {
      json(res, 401, { error: 'Sign in again.' });
      return true;
    }
    json(res, 200, { user: publicUser(store, user) });
    return true;
  }

  if (req.method === 'GET' && url === '/api/progress') {
    const store = loadStore();
    const user = userFromToken(store, bearer(req));
    if (!user) {
      json(res, 401, { error: 'Sign in again.' });
      return true;
    }
    json(res, 200, { progress: store.progress[user.id] ?? emptyProgress() });
    return true;
  }

  if (req.method === 'PUT' && url === '/api/progress') {
    const store = loadStore();
    const user = userFromToken(store, bearer(req));
    if (!user) {
      json(res, 401, { error: 'Sign in again.' });
      return true;
    }
    if (user.role !== 'student') {
      json(res, 403, { error: 'Only student accounts save lesson progress.' });
      return true;
    }
    const body = await readJsonBody(req);
    const progress = body.progress && typeof body.progress === 'object' ? body.progress : body;
    store.progress[user.id] = {
      completed: Array.isArray(progress.completed) ? progress.completed : [],
      badges: Array.isArray(progress.badges) ? progress.badges : [],
      coins: typeof progress.coins === 'number' ? progress.coins : 0,
      unlockedVehicles: Array.isArray(progress.unlockedVehicles) ? progress.unlockedVehicles : [],
      unlockedCosmetics: Array.isArray(progress.unlockedCosmetics) ? progress.unlockedCosmetics : [],
      equippedCosmetics:
        progress.equippedCosmetics && typeof progress.equippedCosmetics === 'object'
          ? progress.equippedCosmetics
          : {},
    };
    saveStore(store);
    json(res, 200, { progress: store.progress[user.id] });
    return true;
  }

  if (req.method === 'GET' && url === '/api/class') {
    const store = loadStore();
    const user = userFromToken(store, bearer(req));
    if (!user) {
      json(res, 401, { error: 'Sign in again.' });
      return true;
    }
    const classroom = user.classId ? store.classes[user.classId] : null;
    if (!classroom) {
      json(res, 404, { error: 'No class on this account.' });
      return true;
    }
    const students = Object.values(store.users)
      .filter((entry) => entry.role === 'student' && entry.classId === classroom.id)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        progress: store.progress[entry.id] ?? emptyProgress(),
      }));
    json(res, 200, {
      class: { id: classroom.id, code: classroom.code },
      students,
    });
    return true;
  }

  if (req.method === 'POST' && url === '/api/class/reset') {
    const store = loadStore();
    const user = userFromToken(store, bearer(req));
    if (!user || user.role !== 'teacher') {
      json(res, 403, { error: 'Only the teacher can reset a student.' });
      return true;
    }
    const body = await readJsonBody(req);
    const student = store.users[body.studentId];
    if (!student || student.classId !== user.classId || student.role !== 'student') {
      json(res, 404, { error: 'That student is not in your class.' });
      return true;
    }
    store.progress[student.id] = emptyProgress();
    saveStore(store);
    json(res, 200, { progress: store.progress[student.id] });
    return true;
  }

  return false;
}
