/*
  Tiny proxy whose only job is to keep secret API keys out of the browser.
  No framework, no dependencies: a couple of routes that forward to
  ElevenLabs (narration) and IFM (Curio's hint generator), plus a health
  check for Render.
*/
import { createServer } from 'node:http';

const PORT = process.env.PORT ?? 8787;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Curio is a cheerful, friendly female guide for 9-12 year olds. The previous
// default was Rachel (21m00Tcm4TlvDq8ikWAM), a calm, measured narrator voice -
// accurate and clear, but it read as a documentary rather than a playmate.
// Elli is a brighter, younger, more animated female voice.
//
// Voice IDs are specific to what is in your ElevenLabs Voice Library, so treat
// this as a starting point: pick a voice there, copy its ID, and set
// ELEVENLABS_VOICE_ID to override without touching code.
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'MF3mGyEYCl7XYWbV9V6O';
/** 0-1. Lower is more expressive and variable; higher is flatter and safer. */
const VOICE_STABILITY = clamp01(process.env.ELEVENLABS_STABILITY, 0.35);
/** 0-1. Exaggerates the voice's own character. Above ~0.5 gets unstable. */
const VOICE_STYLE = clamp01(process.env.ELEVENLABS_STYLE, 0.35);

function clamp01(raw, fallback) {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

const IFM_API_KEY = process.env.IFM_API_KEY;
const IFM_MODEL = process.env.IFM_MODEL ?? 'IFM/K2-Horizon-375B-A23B';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';
const MAX_TEXT_LENGTH = 500;
const CACHE_LIMIT = 200;

// Dialogue lines (and hint contexts) repeat a lot as kids replay lessons, so
// a small in-memory cache turns most requests into a memory read instead of
// an API call. Both /api/speak and /api/hint share this - separate key
// prefixes keep them from colliding.
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
      'xi-api-key': ELEVENLABS_API_KEY,
      'content-type': 'application/json',
      accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      // Tuned for warmth and energy rather than neutral narration. Lower
      // stability lets the delivery vary line to line (a fixed 0.5 read every
      // sentence with the same measured cadence, which is what made Curio sound
      // like a voiceover instead of a friend); style adds expressiveness.
      //
      // Both are env-tunable because getting a voice to feel right is
      // iterative, and changing a Render env var is far quicker than shipping
      // a code change to try one number.
      voice_settings: {
        stability: VOICE_STABILITY,
        similarity_boost: 0.75,
        style: VOICE_STYLE,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

const HINT_SYSTEM_PROMPT = `You are Curio, the student's warm, endlessly encouraging learning buddy in a fractions game for 5th-6th graders.
A student is stuck on a task. Write ONE short, warm, encouraging hint (max 2 short sentences).
Never give away the exact answer or the exact numbers/positions to use. Guide their thinking instead.
Keep vocabulary simple and age-appropriate. No emoji, no markdown, plain text only.`;

async function fetchHint({ objective, instruction, mistakeCount }) {
  const user = [
    `Task: ${objective}`,
    `Instruction: ${instruction}`,
    `The student has missed this ${mistakeCount} time${mistakeCount === 1 ? '' : 's'} in a row.`,
    mistakeCount >= 3
      ? 'They are getting frustrated - be extra encouraging and give a slightly bigger nudge.'
      : 'Keep it light - a small nudge is enough.',
  ].join('\n');

  const response = await fetch('https://api.ifm.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${IFM_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: IFM_MODEL,
      messages: [
        { role: 'system', content: HINT_SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      // This model reasons before answering (message.reasoning /
      // reasoning_content, separate from the actual message.content) - a
      // small max_tokens cuts it off mid-thought before it ever reaches the
      // real answer, so this needs real headroom even though the final hint
      // itself is one short sentence.
      max_tokens: 600,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`IFM ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const hint = data.choices?.[0]?.message?.content?.trim();
  if (!hint) throw new Error('IFM response had no hint content');
  return hint;
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
    if (!ELEVENLABS_API_KEY) {
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

  if (req.method === 'POST' && req.url === '/api/hint') {
    if (!IFM_API_KEY) {
      res.writeHead(503, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'IFM_API_KEY is not configured' }),
      );
      return;
    }

    try {
      const { objective, instruction, mistakeCount } = await readJsonBody(req);
      if (typeof objective !== 'string' || !objective.trim() || objective.length > 200) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: 'objective must be a non-empty string up to 200 chars' }),
        );
        return;
      }
      if (typeof instruction !== 'string' || instruction.length > 300) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: 'instruction must be a string up to 300 chars' }),
        );
        return;
      }
      const misses = Number.isInteger(mistakeCount) ? Math.min(Math.max(mistakeCount, 0), 10) : 1;

      const key = `hint::${objective}::${instruction}::${misses}`;
      let hint = cacheGet(key);
      if (!hint) {
        hint = await fetchHint({ objective, instruction, mistakeCount: misses });
        cacheSet(key, hint);
      }

      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ hint }));
    } catch (error) {
      console.error('[hint] failed:', error.message);
      res.writeHead(502, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'Failed to generate a hint' }),
      );
    }
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  if (!ELEVENLABS_API_KEY) console.warn('[server] ELEVENLABS_API_KEY is not set - /api/speak will return 503');
  if (!IFM_API_KEY) console.warn('[server] IFM_API_KEY is not set - /api/hint will return 503');
});
