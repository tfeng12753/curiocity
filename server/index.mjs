/*
  Tiny proxy whose only job is to keep secret API keys out of the browser.
  No framework, no dependencies: a couple of routes that forward to
  ElevenLabs (narration) and IFM (Curio's hint generator), plus a health
  check for Render.
*/
import { createServer } from 'node:http';
import { handleAccountRequest } from './accounts.mjs';

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
//   Jessica  cgSgspJ2msm6clMCkdW9  young, playful, expressive  <- Curio's default
//   Laura    FGY2WhTYpPnrIDTdsKH5  upbeat, quirky, young
//   Matilda  XrExE9yKIg1WjnnlVkGX  friendly, warm
//   Lily     pFZP5JQG7iQjIQuC4Bku  warm British
//   Alice    Xb7hH8MSUJpSbSDYk0k2  confident British
//   Sarah    EXAVITQu4vr4xnSDxMaL  soft, professional
//
// Set ELEVENLABS_VOICE_ID to override without touching code. If that override
// turns out to be unusable, fetchSpeech falls back rather than going silent.
//
// Choose by ear, not by adjective: `node --env-file=server/.env
// scripts/voice-audition.mjs` reads the same line in all six with the settings
// below, so what you hear is what ships.
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'cgSgspJ2msm6clMCkdW9';
const FALLBACK_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5';
/** 0-1. Lower is more expressive and variable; higher is flatter and safer. */
const VOICE_STABILITY = clamp01(process.env.ELEVENLABS_STABILITY, 0.42);
/** 0-1. Exaggerates the voice's own character. Above ~0.5 gets unstable. */
const VOICE_STYLE = clamp01(process.env.ELEVENLABS_STYLE, 0.45);
/*
  0.7-1.2. Natural pace, very slightly forward - she is keen, not hurried, and
  a lesson read too fast is a lesson a child cannot follow.
*/
const VOICE_SPEED = clampRange(process.env.ELEVENLABS_SPEED, 1.02, 0.7, 1.2);

function clamp01(raw, fallback) {
  return clampRange(raw, fallback, 0, 1);
}

function clampRange(raw, fallback, min, max) {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
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
        speed: VOICE_SPEED,
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
Never state the answer, the exact numbers, or where to cut. Wonder out loud alongside them instead.
If earlier nudges for this same task are listed, say something meaningfully different from all of them - never repeat or lightly reword one.`,
    build: ({ objective, instruction, mistakeCount, priorHints }) =>
      [
        `Task: ${objective}`,
        `Instruction: ${instruction}`,
        `The child has missed this ${mistakeCount} time${mistakeCount === 1 ? '' : 's'} in a row.`,
        priorHints?.length
          ? `Nudges already given for this task - do not repeat or reword these: ${priorHints
              .map((hint) => `"${hint}"`)
              .join('; ')}`
          : '',
        mistakeCount >= 3
          ? 'They are getting frustrated - be extra warm, and make the nudge a little bigger.'
          : 'Keep it light - a small nudge is plenty.',
      ]
        .filter(Boolean)
        .join('\n'),
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

  // Teacher-facing, not Curio-in-character: a class roster read by an adult
  // deciding what to do with the next lesson, not a line spoken to a child.
  classInsight: {
    system: `You are a concise teaching assistant for Curio-City, a fractions-learning app. A teacher is looking at their class's progress and wants a quick read on it.
Write 2-3 short sentences, plain and professional - no character voice, no emoji, no markdown, no greeting.
Call out concrete, actionable patterns: who looks stuck and on what, who is ready for something harder, anything worth a quick group review. Use names only if the data names specific students.
If the data is too thin to support a real pattern (a brand-new class, everyone just starting), say something modest and encouraging instead of inventing a trend.`,
    build: ({ detail }) => `Class progress data:\n${detail}`,
  },

  // Also teacher-facing. Deliberately a distinct intent from classInsight
  // rather than one prompt doing both jobs - "what's the pattern" and "what
  // do I do about it" read very differently when a model tries to answer
  // both in the same breath, and asking for them separately keeps each one
  // sharp instead of a paragraph trying to do everything.
  practiceIdeas: {
    system: `You are a teaching assistant for Curio-City, a fractions-learning app. A teacher wants 2-3 short, concrete practice ideas based on their class's progress data below.
Each idea is one sentence: name the student(s) if the data names specific ones, name the concept they need, and suggest one simple hands-on activity a teacher could actually do in a few minutes (real objects - a chocolate bar, paper strips, counters - not a worksheet or app screen).
Plain text. No markdown, no numbered list, no emoji, no greeting.
If nobody in the data looks stuck, say so briefly and suggest one way to stretch the students who are furthest ahead instead - do not invent a struggle that is not in the data.`,
    build: ({ detail }) => `Class progress data:\n${detail}`,
  },

  // A warm, parent-facing note about ONE child - a different audience again
  // from classInsight (a teacher deciding what to do next) and from Curio's
  // own voice (talking directly to the child mid-lesson).
  parentUpdate: {
    system: `You write short home-to-school updates for Curio-City, a fractions-learning app. You are given one child's progress data and you write a warm, plain-English note a teacher could send home to that child's parent or carer.
2-3 sentences. Specific and genuine - name what the child actually did, not a generic "doing great!". No character voice, no emoji, no markdown, no "Dear parent" greeting or sign-off, just the note itself.
If the data shows very little progress yet, be encouraging and factual rather than inventing an achievement.`,
    build: ({ objective, detail }) => `Child: ${objective}\nProgress data:\n${detail}`,
  },

  // The child speaks a request; this turns it into a menu choice rather
  // than a free-form action, so a misheard word can at worst pick the
  // wrong (still valid, still reviewed by the caller) numbered destination
  // instead of the model inventing somewhere to go that does not exist.
  navigate: {
    system: `You turn a child's spoken request into a menu choice for a learning app called Curio-City. You are given a numbered list of valid destinations and what the child said.
Reply with ONLY the number of the single best-matching destination, or the word NONE if nothing reasonably matches. No other words, no punctuation, no explanation.`,
    build: ({ detail, question }) => `Destinations:\n${detail}\n\nThe child said: "${question}"`,
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 80_000) req.destroy(new Error('Body too large'));
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

  try {
    if (await handleAccountRequest(req, res, readJsonBody)) return;
  } catch (error) {
    console.error('[accounts] failed:', error.message);
    res.writeHead(400, { 'content-type': 'application/json' }).end(
      JSON.stringify({ error: error.message || 'Account request failed' }),
    );
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
        // classInsight/practiceIdeas send a whole class's per-level
        // completion counts, navigate sends a destination menu - neither
        // is one lesson's result, and the other intents just won't use the
        // extra room.
        detail: text(body.detail, 1200),
        question: text(body.question, 300),
        // Only hint uses this - a short list of nudges already given for
        // the current task, so a repeat miss doesn't get the same nudge
        // twice. Capped hard: this rides along on every hint request.
        priorHints: Array.isArray(body.priorHints)
          ? body.priorHints
              .filter((hint) => typeof hint === 'string' && hint.trim())
              .slice(-3)
              .map((hint) => hint.trim().slice(0, 200))
          : [],
        mistakeCount: Number.isInteger(body.mistakeCount)
          ? Math.min(Math.max(body.mistakeCount, 0), 10)
          : 1,
      };

      if ((intent === 'ask' || intent === 'navigate') && !context.question) {
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
      const key = `${intent}::${context.objective}::${context.instruction}::${context.question}::${context.detail}::${context.mistakeCount}::${context.priorHints.join('|')}`;
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
  console.log('[server] accounts stored in server/data/accounts.json');
  if (!ELEVENLABS_API_KEY) console.warn('[server] ELEVENLABS_API_KEY is not set - /api/speak will return 503');
  if (!IFM_API_KEY) console.warn('[server] IFM_API_KEY is not set - /api/hint will return 503');
});
