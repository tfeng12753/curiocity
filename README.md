# Curio-City

An explorable learning world for 5th–6th graders. Instead of a course catalogue,
students fly into a world of subject cities, travel a game map, land on a
destination, and **learn by doing** — cutting a pizza into halves with their own
index finger in front of the webcam.

The complete journey is playable:

```
LANDING WORLD → MATH CITY MAP → FRACTION WORKSHOP → INTERACTIVE LESSON → COMPLETION
```

Math City's **Fraction Workshop** is the fully playable level. Physics City and
Chemistry City are built out as real destinations on the world map so the shape
of the product is obvious, with their levels marked *coming soon*.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL in Chrome or Edge. The lesson asks for camera access
when the first hands-on activity starts; declining is fine — everything works
with a mouse or trackpad.

```bash
npm run build     # typecheck + production build
npm run preview   # serve the production build
```

First load of hand tracking fetches MediaPipe's hand-landmark model from Google's
model CDN (a few MB, cached afterwards). The WebAssembly runtime is copied out of
`node_modules` into `public/mediapipe/wasm` on install, so it is served from your
own origin, with the jsDelivr copy as a runtime fallback. Inference always runs
locally on the device — video never leaves the browser, and there is no backend.

## The fraction lesson

The lesson follows one loop over and over: **ask → student acts → feedback →
explain**. There are no lecture paragraphs and no video.

1. **Meet the whole** — is this pizza whole, or in pieces?
2. **Share it** — cut the pizza into 2 equal parts.
3. **1/2** — the same pizza next to the written fraction, with each number labelled.
4. **Build 1/2** — cut a circle, then colour one of the two parts.
5. **Fourths** — three cuts across a chocolate bar for four friends.
6. **1/4** — the notation again, on the bar.
7. **Divide a square** — one cut each way; unequal attempts are handed back, not corrected.
8. **Show 2/4** — colour two of four equal parts.
9. **Spot the fraction** — pick the picture that shows 1/2, then 2/4.
10. **Summary** — whole → equal parts → fraction, and why the parts must be equal.
11. **Final challenge** — make 1/2, then 1/4, then 3/4.
12. **Completion** — recap, ⭐ Fraction Explorer badge, back to Math City (now marked complete).

## How the interaction works

Everything a student touches goes through one component, `InteractiveSurface`,
which accepts either input and behaves the same way:

- **Finger** — MediaPipe's `HandLandmarker` runs on the webcam feed in `VIDEO`
  mode. Landmark 8 (the index fingertip) is mirrored to match the mirrored
  preview and smoothed with a One Euro filter, so a held-still finger stops
  shaking without a fast swipe lagging behind. Holding still over a target for
  ~0.9s commits the action (a pinch works too); the ring around the cursor fills
  to show the hold. Dwell beats pinch detection as the primary gesture at typical
  laptop-webcam distance, especially for smaller hands.
- **Pointer** — mouse, trackpad or touch, with click to commit. This is a first
  class path, not a degraded one: if the camera is missing, blocked or slow, the
  lesson plays identically.

## The fraction geometry

`fractionGeometry.ts` holds the entire model, and every activity is a
configuration of it:

- A shape is a **whole plus a list of cuts**. A cut is either radial (through the
  centre, for the pizza) or a straight line across the shape at a normalised
  position (for bars and squares).
- **Regions** — the actual pieces — are derived from the cuts on every render,
  as circle sectors or grid cells, each with its own path, area and hit box.
- **"Equal parts"** is then just: do all the derived regions have the same area?
  That single rule validates the pizza, the chocolate bar and the square.
- Cuts **snap** to sensible positions (halves, thirds, quarters; 45° steps) when
  the student is close, because children aim rather than measure. A cut that
  lands far off still produces unequal parts, which fails the check — the shape
  gives a gentle wobble, Poly points out that the parts must match, and the cut
  is taken back so they can try again. The answer is never shown for them.
- On shapes needing one cut each way, the second cut is locked to the missing
  axis, so a roughly-centred aim always succeeds.

## Project structure

```
src/
  data/cities.ts            cities, destinations, map positions
  state/progress.tsx        completion + badges, persisted to localStorage
  audio/sound.ts            synthesised cues (no audio files), with a mute toggle
  tracker/                  hand tracking, cursor, dwell, camera onboarding
    trackerStore.ts         MediaPipe + pointer fused into one cursor stream
    InteractiveSurface.tsx  hover/commit surface shared by every activity
    DwellTarget.tsx         any button, also activatable by holding the finger
  components/
    world/                  landing world + illustrated city islands
    city/                   city maps, destination nodes, landmark art
    level/                  level entrance
    lesson/                 fraction workshop, geometry, scenes
scripts/
  playthrough.mjs           clicks through the entire lesson and asserts it completes
  camera-check.mjs          boots hand tracking against a synthetic camera
  sync-mediapipe-wasm.mjs   copies the wasm runtime into public/ (runs on install)
server/
  index.mjs                 optional TTS proxy - see "Voice" below
```

All the illustration is hand-written SVG and CSS — no image assets, no icon font.

## Checking it works

With `npm run dev` running:

```bash
node scripts/playthrough.mjs   # full mouse playthrough, screenshots to /tmp/shots/play
node scripts/camera-check.mjs  # verifies hand tracking initialises end to end
```

## Voice and AI hints (both optional)

Poly can read her dialogue lines aloud with ElevenLabs, and can generate a
fresh, contextual hint (via IFM) when a student is stuck instead of the same
static retry line every time. Both are entirely optional and independent —
with no key configured, `/api/speak` or `/api/hint` returns a clear error,
the frontend swallows it, and the lesson runs exactly as before.

Both APIs need a secret key that can't live in client-side code, so this is
the one deliberate exception to "no server" below: `server/` is a small,
dependency-free Node proxy whose only job is to hold those keys and forward
requests. Dialogue lines and hint contexts repeat a lot as kids replay
lessons, so both are cached in memory.

To run it locally:

```bash
cp server/.env.example server/.env   # fill in ELEVENLABS_API_KEY and/or IFM_API_KEY
npm run dev:server                   # starts the proxy on :8787
npm run dev                          # the Vite dev server proxies /api to it
```

In production the two halves are separate Render services (see
`render.yaml`): the static site gets a build-time `VITE_API_ENDPOINT`
pointing at the proxy's URL, and the proxy gets `ELEVENLABS_API_KEY`,
`IFM_API_KEY` (and optionally `ELEVENLABS_VOICE_ID` / `IFM_MODEL`) set as
secrets in the Render dashboard.

**Important:** `render.yaml`'s `headers`, `envVars`, and the second service
only take effect if Render deployed this repo via **New → Blueprint**. If the
static site was instead created by hand (**New → Static Site**), Render still
auto-deploys on every push but silently ignores everything else in
`render.yaml` — in that case set `VITE_API_ENDPOINT` and the
`Permissions-Policy` header directly in that service's dashboard, and create
the proxy as its own **New → Web Service** pointed at the `server/` directory
(root directory `server`, build command `npm ci`, start command `npm start`),
copying `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` / `IFM_API_KEY` /
`ALLOWED_ORIGIN` into its Environment tab.

## Deploying

This is a static build, so any static host works. `render.yaml` at the repo root
is a Render blueprint — deploy it via **New → Blueprint** (not **New → Static
Site**) and Render picks every setting below up automatically, including the
optional voice proxy above. To configure a static site by hand instead:

| Setting           | Value                    |
| ----------------- | ------------------------ |
| Build command     | `npm ci && npm run build` |
| Publish directory | `dist`                   |
| Rewrite rule      | `/*` → `/index.html`     |

A hand-configured site also needs its `Permissions-Policy: camera=(self)`
header (Settings → Headers) added manually — `render.yaml` won't set it for you.

The app keeps every scene on a single page, so the rewrite is a safety net rather
than a requirement today — it keeps unknown paths landing on the app instead of a
404. The camera only works over HTTPS, which Render terminates for you.

## Notes and limitations

- Optimised for desktop and laptop, where the camera interaction makes sense; the
  layout adapts down to tablets and narrow screens, keeping the learning object
  and the controls visible.
- One hand, one fingertip. No multi-hand or gesture vocabulary.
- Progress and badges live in `localStorage` — per browser, not synced.
- No accounts, no build-time backend, by design for this prototype — the one
  exception is the optional voice proxy in `server/`, which exists solely to
  keep the ElevenLabs API key out of the browser (see "Voice" above).

The previous single-file prototype is preserved at
`legacy/curio-city-prototype.html`.
