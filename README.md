# Curio City

A single-file, browser-native learning app: a kid stands in front of their
webcam and uses just their hand to interact with lessons composited into
their own camera view - no mouse required, no backend, no build step.
Everything (hand tracking, drawing, all interaction logic) runs fully
client-side using MediaPipe's in-browser HandLandmarker.

## Running it

This is a single static HTML file - no `npm install`, no build step.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` in Chrome or Edge and allow
camera access when prompted. (Opening the file directly via `file://` also
mostly works, but some browsers restrict camera access on `file://` origins,
so a local server is the more reliable option.)

First load downloads MediaPipe's hand-tracking model from Google's model CDN
(a few MB, cached afterward) - this needs an internet connection once, but
all inference runs locally on your device from then on, not on a server.

## What's inside

Three lessons, each demonstrating a different hand-driven interaction style:

- **Geometry & Right Angles** - freehand annotate directly on top of your
  live camera feed by pointing; tap the floating object to inspect it.
- **Fractions & Pizza Slices** - point near the edge of a circle and press
  "Add Cut" to slice all the way through the center, like cutting a real
  pizza. Tracks how many equal pieces you've made and whether they're
  evenly spaced.
- **Curio City** - a little museum of five floating curiosities (an
  octopus, Saturn, a volcano, a T-Rex, a magnet). Point at one and hold
  your finger steady for about 800ms to reveal a fact about it - dwell-based
  selection rather than a pinch/tap, since precise pinch detection is
  unreliable at typical laptop-webcam distances, especially for smaller
  kid hands.

Also included: a rewards screen, a "real-world project" prompt, and a
community hub (leaderboard + snapshot gallery) - all backed by
`localStorage`, no server involved.

## How it works

- **Hand tracking**: MediaPipe's `HandLandmarker` (`tasks-vision`, loaded
  from `cdn.jsdelivr.net`) runs in `VIDEO` mode against the webcam feed.
  Landmark 8 (the index fingertip) drives every interaction; a small
  One Euro filter smooths it frame-to-frame so tracking jitter doesn't
  show up as shaky drawing or a shaky selection ring.
- **Drawing** maps the fingertip 1:1 to canvas pixels (mirrored to match
  the mirrored video display) and paints a continuous stroke while a hand
  is visible - lifting the "pen" the moment the hand leaves frame, so
  strokes don't jump across gaps.
- **Fraction slicing** tracks the angle from the circle's center to the
  fingertip, previews it live as a dashed line, and commits a full
  diameter cut on "Add Cut" - so each cut mirrors a real pizza slice
  (N cuts → 2N pieces), and evenness is just comparing the angular gaps
  between committed cuts.
- **Curio City's dwell-to-select** hit-tests the fingertip position
  against each floating curiosity's on-screen bounding box every frame,
  and requires ~800ms of *continuous* hovering over the same one before it
  reveals - moving away resets the timer, and holding past the reveal
  doesn't re-trigger it repeatedly.

## A note on the code structure

This started as a single generated HTML file and stayed one on purpose -
it's meant to be simple to open, read top-to-bottom, and modify. The
`<script>` tag is a JS module (needed for MediaPipe's ES module import), so
every function referenced by an inline `onclick=""` in the HTML has to be
explicitly exposed via `Object.assign(window, {...})` at the bottom of the
script - classic scripts leak top-level functions onto `window`
automatically, modules don't. If you add a new button with an `onclick`,
add its handler to that list too.

## Requirements

- A recent Chromium-based browser (WebGL2 + WASM + `getUserMedia`).
- A webcam.
- An internet connection on first load (to fetch the hand-tracking model).

## Known limitations

- One hand only; no mobile/touch fallback if a webcam or WebGL2 isn't
  available (falls back to an "Interactive Avatar Mode" placeholder).
- Points, badges, and gallery snapshots are stored in `localStorage` only -
  they're per-browser and not synced anywhere.
- No accounts, no multiplayer, no server - by design, for this prototype.
