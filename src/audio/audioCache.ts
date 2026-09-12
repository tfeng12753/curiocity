/*
  Narration that survives a reload.

  Curio says the same few dozen lines to every child, every run, forever - and
  each one is a paid ElevenLabs request. The proxy caches in memory, but a free
  Render instance drops that cache every time it spins down, so the first child
  of the afternoon pays for the whole lesson again. This keeps the audio in the
  browser instead, where it costs nothing and outlives both the page and the
  server.

  Every operation is best-effort. IndexedDB can be unavailable (private mode),
  full, or blocked by browser settings; in all of those cases these resolve to
  "no cache" and narration carries on exactly as it did before.
*/

const DB_NAME = 'curio-narration';
const STORE = 'clips';

/**
 * Bumping this wipes every cached clip.
 *
 * Do it when the *voice* changes, not just the schema: the cache key cannot
 * see ELEVENLABS_VOICE_ID, which lives in the server's environment, so a voice
 * swap would otherwise keep serving lines in the old one until they aged out.
 */
const DB_VERSION = 2;

/** Roughly 8MB of MP3 - far more than one lesson, nowhere near a quota. */
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 200;
/** A backstop for clips left behind by a voice change nobody bumped for. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface ClipRecord {
  key: string;
  blob: Blob;
  bytes: number;
  usedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        // Recreated rather than migrated: the contents are a disposable cache
        // of remote audio, so throwing it away on any version change is both
        // correct and how the voice-swap invalidation above works.
        if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('usedAt', 'usedAt');
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function readCachedClip(key: string): Promise<Blob | null> {
  const db = await openDB();
  if (!db) return null;

  return new Promise<Blob | null>((resolve) => {
    try {
      const request = tx(db, 'readonly').get(key);
      request.onsuccess = () => {
        const record = request.result as ClipRecord | undefined;
        if (!record) return resolve(null);
        if (Date.now() - record.usedAt > MAX_AGE_MS) return resolve(null);

        // Freshening the LRU stamp is fire-and-forget, and deliberately not
        // awaited: a cache hit must never wait on a write to hand back audio.
        void touch(record);
        resolve(record.blob);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Rate-limited so a replayed lesson doesn't write once per spoken line. */
async function touch(record: ClipRecord) {
  if (Date.now() - record.usedAt < 60 * 60 * 1000) return;
  const db = await openDB();
  if (!db) return;
  try {
    tx(db, 'readwrite').put({ ...record, usedAt: Date.now() } satisfies ClipRecord);
  } catch {
    /* a missed LRU update only costs this clip its place in the queue */
  }
}

export async function writeCachedClip(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  if (!db) return;

  try {
    tx(db, 'readwrite').put({ key, blob, bytes: blob.size, usedAt: Date.now() } satisfies ClipRecord);
  } catch {
    return;
  }
  void evict();
}

/** Drops the least recently used clips until the store is back under budget. */
async function evict() {
  const db = await openDB();
  if (!db) return;

  try {
    const store = tx(db, 'readwrite');
    const request = store.index('usedAt').openCursor();
    const records: { key: string; bytes: number }[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const record = cursor.value as ClipRecord;
        records.push({ key: record.key, bytes: record.bytes ?? 0 });
        cursor.continue();
        return;
      }

      // Oldest first, so trimming from the front is a plain LRU.
      let total = records.reduce((sum, record) => sum + record.bytes, 0);
      let count = records.length;
      for (const record of records) {
        if (total <= MAX_BYTES && count <= MAX_ENTRIES) break;
        try {
          tx(db, 'readwrite').delete(record.key);
        } catch {
          break;
        }
        total -= record.bytes;
        count -= 1;
      }
    };
  } catch {
    /* over budget is survivable; the browser will evict the origin if it must */
  }
}

/** Clears every cached clip - exposed for a "Curio sounds wrong" escape hatch. */
export async function clearCachedClips(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    tx(db, 'readwrite').clear();
  } catch {
    /* nothing to do - the cache is disposable by definition */
  }
}
