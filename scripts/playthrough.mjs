// Dev-only end-to-end walkthrough of the whole prototype with a mouse pointer.
// Usage: node scripts/playthrough.mjs [outputDir]
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const outDir = process.argv[2] ?? '/tmp/shots/play';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('console', (msg) => msg.type() === 'error' && problems.push(msg.text()));
page.on('pageerror', (error) => problems.push(String(error)));

const shot = (name) => page.screenshot({ path: `${outDir}/${name}.png` });
const click = async (text) => {
  await page.getByText(text, { exact: false }).first().click();
  await page.waitForTimeout(650);
};

const shapeBox = () => page.locator('.fraction-canvas__surface').first().boundingBox();

/**
 * Drags all the way through the shape, which is how cutting works now - a cut
 * commits when the stroke crosses back out the far side. The path starts and
 * ends inside the canvas but off the food itself, so it enters and exits.
 */
async function slice(path) {
  const box = await shapeBox();
  const at = ([fx, fy]) => [box.x + box.width * fx, box.y + box.height * fy];
  const [sx, sy] = at(path[0]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (const point of path.slice(1)) {
    const [x, y] = at(point);
    await page.mouse.move(x, y, { steps: 8 });
  }
  await page.mouse.up();
  await page.waitForTimeout(750);
}

/** Sweeping down the shape leaves a vertical cut at this x. */
const sliceV = (fx) => slice([[fx, 0.01], [fx, 0.4], [fx, 0.7], [fx, 0.99]]);

/** Sweeping across the shape leaves a horizontal cut at this y. */
const sliceH = (fy) => slice([[0.01, fy], [0.4, fy], [0.7, fy], [0.99, fy]]);

/** Colouring a piece is still a plain click. */
async function tapShape(fx, fy) {
  const box = await shapeBox();
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy, { steps: 4 });
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
}

async function expect(label, condition) {
  if (!condition) problems.push(`ASSERTION FAILED: ${label}`);
}

await page.goto(process.env.BASE ?? 'http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await shot('01-world');

await click('Math City');
await page.waitForTimeout(1200);
await shot('02-city');

await click('Fraction Workshop');
await page.waitForTimeout(1000);
await shot('03-entrance');

await click('Start level');
await page.waitForTimeout(1400);
await click("Let's go");
await click("It's one whole");
await shot('04-whole');
await click('Next');

await page.waitForTimeout(900);
await click('Continue with pointer');
await shot('05-gate-dismissed');

// Scene: split the pizza in two
await sliceV(0.5);
await shot('06-halves');
await click('Next');

// Scene: 1/2 notation
await shot('07-notation-half');
await click('Got it');

// Scene: build 1/2 (cut, then shade one half)
await sliceV(0.5);
await tapShape(0.25, 0.5);
await shot('08-build-half');
await click('Next');

// Scene: chocolate bar into fourths
await sliceV(0.25);
await sliceV(0.5);
await sliceV(0.75);
await shot('09-fourths');
await click('Next');

// Scene: 1/4 notation
await click('Got it');

// Scene: square into four equal parts (one cut each way)
await sliceV(0.5);
await sliceH(0.5);
await shot('10-square-fourths');
await click('Next');

// Scene: shade 2/4
await tapShape(0.25, 0.25);
await tapShape(0.75, 0.25);
await shot('11-two-fourths');
await click('Next');

// Scene: recognition game
await page.locator('.option').nth(0).click();
await page.waitForTimeout(700);
await shot('12-find-half');
await click('Next question');
await page.locator('.option').nth(1).click();
await page.waitForTimeout(700);
await click('Next');

// Scene: summary
await shot('13-summary');
await click('Start the challenge');

// Challenge 1: 1/2
await sliceV(0.5);
await tapShape(0.25, 0.5);
await shot('14-challenge-1');
await click('Challenge 2');

// Challenge 2: 1/4
await sliceV(0.5);
await sliceH(0.5);
await tapShape(0.25, 0.25);
await shot('15-challenge-2');
await click('Challenge 3');

// Challenge 3: 3/4
await sliceV(0.25);
await sliceV(0.5);
await sliceV(0.75);
await tapShape(0.12, 0.5);
await tapShape(0.38, 0.5);
await tapShape(0.62, 0.5);
await shot('16-challenge-3');
await click('Finish');

await page.waitForTimeout(1400);
await shot('17-complete');
await expect(
  'completion screen reached',
  await page.getByText('Fraction Adventure Complete').isVisible(),
);

await click('Return to Math City');
await page.waitForTimeout(1400);
await shot('18-city-completed');
await expect('level marked complete', await page.getByText('⭐ Completed').first().isVisible());

console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'Playthrough clean.');
await browser.close();
