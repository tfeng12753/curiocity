/*
  Auditions Curio's candidate voices so a voice can be chosen by ear instead of
  by reading adjectives on a web page.

  Writes one MP3 per voice, all reading the same line with the exact
  voice_settings the proxy uses, so what you hear is what ships. Only voices
  usable on a free ElevenLabs plan are listed - Voice Library voices (Rachel,
  Aria, Domi, Charlotte, Elli...) are rejected with a 402 over the API, which
  is why picking one by name is a trap.

  Usage:
    node --env-file=server/.env scripts/voice-audition.mjs [outDir] ["line to read"]

  Then set ELEVENLABS_VOICE_ID to the id of whichever one you liked.
*/
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = process.argv[2] ?? '/tmp/curio-voices';
const LINE = process.argv[3] ?? "Hi, I'm Curio! Let's split this pizza into two equal parts.";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY is not set. Run with: node --env-file=server/.env scripts/voice-audition.mjs');
  process.exit(1);
}

// Keep in step with server/index.mjs, or the audition lies to you.
const SETTINGS = {
  stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.42),
  similarity_boost: 0.75,
  style: Number(process.env.ELEVENLABS_STYLE ?? 0.45),
  speed: Number(process.env.ELEVENLABS_SPEED ?? 1.02),
  use_speaker_boost: true,
};

const VOICES = [
  ['jessica', 'cgSgspJ2msm6clMCkdW9', 'young, playful, expressive'],
  ['laura', 'FGY2WhTYpPnrIDTdsKH5', 'upbeat, quirky, young'],
  ['matilda', 'XrExE9yKIg1WjnnlVkGX', 'friendly, warm'],
  ['lily', 'pFZP5JQG7iQjIQuC4Bku', 'warm British'],
  ['alice', 'Xb7hH8MSUJpSbSDYk0k2', 'confident British'],
  ['sarah', 'EXAVITQu4vr4xnSDxMaL', 'soft, professional'],
];

await mkdir(OUT, { recursive: true });
console.log(`Line: "${LINE}"`);
console.log(`Settings: ${JSON.stringify(SETTINGS)}\n`);

for (const [name, id, blurb] of VOICES) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text: LINE, model_id: 'eleven_turbo_v2_5', voice_settings: SETTINGS }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.log(`${name.padEnd(9)} FAILED ${response.status}  ${detail.slice(0, 120)}`);
    continue;
  }

  const file = `${OUT}/${name}.mp3`;
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`${name.padEnd(9)} ${id}  ${blurb.padEnd(28)} -> ${file}`);
}

console.log(`\nCharacters spent: ${LINE.length} x ${VOICES.length} = ${LINE.length * VOICES.length}`);
