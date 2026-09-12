// Dev-only screenshot helper: node scripts/shot.mjs <out.png> [steps...]
// Steps are "click:<selector>", "text:<text>", "wait:<ms>".
import { chromium } from 'playwright';

const [out, ...steps] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

for (const step of steps) {
  const [kind, ...rest] = step.split(':');
  const value = rest.join(':');
  if (kind === 'click') await page.click(value);
  else if (kind === 'text') await page.getByText(value, { exact: false }).first().click();
  else if (kind === 'wait') await page.waitForTimeout(Number(value));
  else if (kind === 'shot') await page.screenshot({ path: value });
  else if (kind === 'at') {
    const [x, y] = value.split(',').map(Number);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.up();
  }
  else if (kind === 'move') {
    const [x, y] = value.split(',').map(Number);
    await page.mouse.move(x, y);
  }
}

await page.waitForTimeout(500);
await page.screenshot({ path: out });
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
