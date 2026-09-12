// Dev-only check that the hand-tracking pipeline boots: launches Chrome with a
// synthetic camera, accepts the permission prompt, and reports the state the
// lesson lands in (a fake camera has no hand, so "Show your hand" is success).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['camera'],
});
const page = await context.newPage();
const problems = [];
page.on('console', (msg) => msg.type() === 'error' && problems.push(msg.text()));
page.on('pageerror', (error) => problems.push(String(error)));

const click = async (text) => {
  await page.getByText(text, { exact: false }).first().click();
  await page.waitForTimeout(700);
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await click('Math City');
await click('Fraction Workshop');
await click('Start level');
await click("Let's go");
await click("It's one whole");
await click('Next');
await page.waitForTimeout(800);

await click('Turn on camera');
await page.waitForTimeout(9000);
await page.screenshot({ path: '/tmp/shots/camera-ready.png' });

const gateText = await page.locator('.camera-gate__card').innerText().catch(() => '(gate closed)');
console.log('--- camera gate state ---\n' + gateText);

await page.getByText("I'm ready", { exact: false }).first().click().catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/shots/camera-lesson.png' });

const pip = await page.locator('.camera-pip__label').innerText().catch(() => '(no pip)');
console.log('--- pip state ---\n' + pip);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'No page errors.');

await browser.close();
