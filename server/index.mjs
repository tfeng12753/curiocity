/*
  Tiny proxy whose only job is to keep secret API keys out of the browser.
  No framework, no dependencies: a couple of routes that forward to
  ElevenLabs (narration) and IFM (Curio's hint generator), plus a health
  check for Render.
*/
import { createServer } from 'node:http';

const PORT = process.env.PORT ?? 8787;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Curio is a cheerful, friendly female guide for 9-12 year olds.
//
// IMPORTANT, and the reason this list exists: on a free ElevenLabs plan the
// API rejects *Voice Library* voices outright -
//
//   402 "Free users cannot use library voices via the API."
//
// That covers most of the famous ids, Rachel (21m00Tcm4TlvDq8ikWAM), Aria,
// Domi and Charlotte among them, so picking a voice by name off a blog post
// will silently cost you narration. Only the account's own default voices
// work. These six are verified working on a free key:
//
//   Laura    FGY2WhTYpPnrIDTdsKH5  upbeat, quirky, young  <- Curio's default
//   Jessica  cgSgspJ2msm6clMCkdW9  young, playful, expressive
//   Matilda  XrExE9yKIg1WjnnlVkGX  friendly, warm
//   Lily     pFZP5JQG7iQjIQuC4Bku  warm British
//   Alice    Xb7hH8MSUJpSbSDYk0k2  confident British
//   Sarah    EXAVITQu4vr4xnSDxMaL  soft, professional
//
// Set ELEVENLABS_VOICE_ID to override without touching code. If that override
// turns out to be unusable, fetchSpeech falls back rather than going silent.
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'FGY2WhTYpPnrIDTdsKH5';
const FALLBACK_VOICE_ID = 'cgSgspJ2msm6clMCkdW9';
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

async function requestSpeech(text, voiceId) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
}

/**
 * Remembers a voice that the account cannot actually use, so one bad
 * ELEVENLABS_VOICE_ID costs a single failed request rather than one per line.
 */
let blockedVoiceId = null;

async function fetchSpeech(text, requestedVoice) {
  const voice = requestedVoice === blockedVoiceId ? FALLBACK_VOICE_ID : requestedVoice;
  let response = await requestSpeech(text, voice);

  // 401/402/404 here mean "this account may not use this voice" (a Voice
  // Library voice on a free plan, a deleted id, a key without access) rather
  // than "synthesis failed". Retrying the same voice would fail identically,
  // so switch to one that is known to work and keep Curio talking.
  if ([401, 402, 404].includes(response.status) && voice !== FALLBACK_VOICE_ID) {
    const detail = await response.text().catch(() => '');
    console.warn(
      `[voice] voice ${voice} unusable (${response.status}: ${detail.slice(0, 160)}). ` +
        `Falling back to ${FALLBACK_VOICE_ID} for the rest of this process.`,
    );
    blockedVoiceId = voice;
    response = await requestSpeech(text, FALLBACK_VOICE_ID);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/*
  Every AI surface in the product speaks as the same character, so the persona
  is written once and each intent only adds its own job on top. Keeping them
  in one place is what stops Curio from being warm in a hint and robotic in a
  celebration.
*/
const CURIO_PERSONA = `You are Curio: a small, round, sparkly creature who lives in Curio-City and is this child's learning buddy. You are 9-12 year olds' favourite kind of grown-up-ish friend - the one who gets excited about things.
You genuinely believe maths is the most delightful thing in the universe and you cannot believe your luck that someone turned up to do it with you.

How you talk:
- Warm, playful, a little bit silly. Delighted by everything. Never sarcastic, never at the child's expense, never condescending.
- SHORT. You are speaking out loud to one child who wants to get back to playing.
- Reach for pictures they can see: pizza, chocolate bars, sharing sweets with a friend, cutting a cake, a dragon's hoard, puddles, pancakes.
- You may be playfully dramatic ("Ooooh!", "Wait, wait -", "This is my favourite bit"), and you may be a bit whimsical about the world of Curio-City itself.
- Never use emoji, markdown, lists or headings. Plain spoken sentences only.
- Write fractions in words the way you would say them out loud ("one half", "two sixths"), never as "1/2", because your words are read aloud.`;

const INTENTS = {
  hint: {
    system: `${CURIO_PERSONA}
The child is stuck. Give ONE short, warm nudge - at most two sentences - that gets them thinking without handing over the answer.
Never state the answer, the exact numbers, or where to cut. Wonder out loud alongside them instead.`,
    build: ({ objective, instruction, mistakeCount }) =>
      [
        `Task: ${objective}`,
        `Instruction: ${instruction}`,
        `The child has missed this ${mistakeCount} time${mistakeCount === 1 ? '' : 's'} in a row.`,
        mistakeCount >= 3
          ? 'They are getting frustrated - be extra warm, and make the nudge a little bigger.'
          : 'Keep it light - a small nudge is plenty.',
      ].join('\n'),
  },

  praise: {
    system: `${CURIO_PERSONA}
The child just got something RIGHT. Celebrate like it made your whole day - one sentence, two at the very most.
Name the specific thing they did so it feels seen rather than generic. Do not ask a question and do not introduce the next task.`,
    build: ({ objective, detail }) =>
      [`They just completed: ${objective}`, detail ? `How it went: ${detail}` : ''].filter(Boolean).join('\n'),
  },

  recap: {
    system: `${CURIO_PERSONA}
The child just finished a whole lesson. In at most two short sentences, tell them what THEY worked out, and sound thoroughly proud of them.
Do not list the steps back at them, and do not mention being an AI.`,
    build: ({ objective, detail }) =>
      [`Lesson finished: ${objective}`, detail ? `What they did: ${detail}` : ''].filter(Boolean).join('\n'),
  },

  ask: {
    system: `${CURIO_PERSONA}
The child has asked YOU something. Answer in at most three short sentences, with a picture they can imagine rather than a definition.
If it is not about maths or about what they are doing here, be cheerfully honest that maths is your speciality, and wander back to the lesson with them.
Never ask for, repeat, or store anything personal about them. If something sounds upsetting or unsafe, gently suggest they talk to their teacher or a grown-up they trust.`,
    build: ({ question, objective }) =>
      [objective ? `They are currently working on: ${objective}` : '', `Their question: ${question}`]
        .filter(Boolean)
        .join('\n'),
  },
};

async function callIFM(intent, context) {
  const spec = INTENTS[intent];
  const response = await fetch('https://api.ifm.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${IFM_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: IFM_MODEL,
      messages: [
        { role: 'system', content: spec.system },
        { role: 'user', content: spec.build(context) },
      ],
      // This model reasons before answering (message.reasoning /
      // reasoning_content, separate from the actual message.content) - a
      // small max_tokens cuts it off mid-thought before it ever reaches the
      // real answer, so this needs real headroom even though the reply
      // itself is one or two short sentences.
      max_tokens: 600,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`IFM ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('IFM response had no content');
  return text;
}

function fetchHint(context) {
  return callIFM('hint', context);
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

  // One route for every AI surface. Intents share a persona, a cache and a
  // failure mode, so adding a new place for Curio to speak is a prompt here
  // plus a call site - not another endpoint, another key check and another
  // set of CORS rules to get subtly wrong.
  if (req.method === 'POST' && req.url === '/api/curio') {
    if (!IFM_API_KEY) {
      res.writeHead(503, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'IFM_API_KEY is not configured' }),
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const intent = typeof body.intent === 'string' ? body.intent : '';
      if (!Object.hasOwn(INTENTS, intent)) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: `intent must be one of: ${Object.keys(INTENTS).join(', ')}` }),
        );
        return;
      }

      const text = (value, limit) =>
        typeof value === 'string' ? value.trim().slice(0, limit) : '';

      const context = {
        objective: text(body.objective, 200),
        instruction: text(body.instruction, 300),
        detail: text(body.detail, 300),
        question: text(body.question, 300),
        mistakeCount: Number.isInteger(body.mistakeCount)
          ? Math.min(Math.max(body.mistakeCount, 0), 10)
          : 1,
      };

      if (intent === 'ask' && !context.question) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: 'question must be a non-empty string up to 300 chars' }),
        );
        return;
      }
      if (intent !== 'ask' && !context.objective) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(
          JSON.stringify({ error: 'objective must be a non-empty string up to 200 chars' }),
        );
        return;
      }

      // Praise is deliberately uncached: hearing the same celebration twice
      // is exactly what makes a canned line feel canned, and it is the one
      // intent whose whole value is sounding spontaneous.
      const key = `${intent}::${context.objective}::${context.instruction}::${context.question}::${context.detail}::${context.mistakeCount}`;
      let reply = intent === 'praise' ? null : cacheGet(key);
      if (!reply) {
        reply = await callIFM(intent, context);
        if (intent !== 'praise') cacheSet(key, reply);
      }

      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ text: reply }));
    } catch (error) {
      console.error('[curio] failed:', error.message);
      res.writeHead(502, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'Curio could not answer right now' }),
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
