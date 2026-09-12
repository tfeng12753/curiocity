/*
  Tiny TTS proxy - its only job is to keep ELEVENLABS_API_KEY out of the
  browser. No framework, no dependencies: one route that forwards text to
  ElevenLabs and streams the audio back, plus a health check for Render.
*/
import { createServer } from 'node:http';

const PORT = process.env.PORT ?? 8787;
const API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const MAX_TEXT_LENGTH = 500;
const CACHE_LIMIT = 200;

// Dialogue lines repeat a lot (kids replay lessons), so a small in-memory
// cache turns most requests into a memory read instead of an API call.
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

async function fetchSpeech(text, voiceId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/api/speak') {
    if (!API_KEY) {
      res.writeHead(503, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured' }),
      );
      return;
    }

    try {
      const { text, voiceId } = await readJsonBody(req);
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: `text must be a non-empty string up to ${MAX_TEXT_LENGTH} chars` }),
        );
        return;
      }

      const voice = typeof voiceId === 'string' && voiceId ? voiceId : DEFAULT_VOICE_ID;
      const key = `${voice}::${text}`;
      let audio = cacheGet(key);
      if (!audio) {
        audio = await fetchSpeech(text, voice);
        cacheSet(key, audio);
      }

      res.writeHead(200, {
        'content-type': 'audio/mpeg',
        'content-length': audio.length,
        'cache-control': 'public, max-age=86400',
      });
      res.end(audio);
    } catch (error) {
      console.error('[voice] speak failed:', error.message);
      res.writeHead(502, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'Failed to synthesise speech' }),
      );
    }
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[voice] listening on :${PORT}`);
  if (!API_KEY) console.warn('[voice] ELEVENLABS_API_KEY is not set - /api/speak will return 503');
});
