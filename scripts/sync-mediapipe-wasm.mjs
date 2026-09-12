// Copies MediaPipe's wasm runtime out of node_modules into public/ so the app can
// load hand tracking from its own origin. The app falls back to the jsDelivr copy
// at runtime if these files are missing, so a failed copy is not fatal.
import { cp, mkdir, access } from 'node:fs/promises';
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
