// Puts everything hand tracking needs on our own origin: MediaPipe's wasm runtime
// (copied out of node_modules) and the hand model (downloaded once).
//
// The model matters most. It is 7.8MB, and fetching it from Google's CDN on the
// student's first camera start is the likeliest cause of "the camera light is on
// but nothing happens" - slow connections outlast the start timeout, and school
// and office networks frequently block storage.googleapis.com outright. Served
// from our own origin it is fast, cached by the browser, and cannot be blocked
// without blocking the whole site.
//
// Both have runtime fallbacks, so a failed copy or download is never fatal.
import { cp, mkdir, access, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const target = resolve(root, 'public/mediapipe/wasm');

try {
  await access(source);
} catch {
  console.warn('[sync-mediapipe-wasm] @mediapipe/tasks-vision not installed yet - skipping.');
  process.exit(0);
}

await mkdir(dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
console.log('[sync-mediapipe-wasm] copied wasm runtime to public/mediapipe/wasm');

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const modelDir = resolve(root, 'public/mediapipe/models');
const modelFile = resolve(modelDir, 'hand_landmarker.task');

try {
  const existing = await stat(modelFile).catch(() => null);
  if (existing && existing.size > 1_000_000) {
    console.log('[sync-mediapipe-wasm] hand model already present - skipping download');
  } else {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1_000_000) throw new Error(`suspiciously small (${bytes.length} bytes)`);
    await mkdir(modelDir, { recursive: true });
    await writeFile(modelFile, bytes);
    console.log(`[sync-mediapipe-wasm] downloaded hand model (${(bytes.length / 1e6).toFixed(1)}MB)`);
  }
} catch (error) {
  // Not fatal: the app falls back to fetching the model from Google at runtime,
  // which is exactly the slow path this is meant to avoid, but still works.
  console.warn(`[sync-mediapipe-wasm] could not vendor the hand model (${error.message}) - the app will fetch it at runtime.`);
}
