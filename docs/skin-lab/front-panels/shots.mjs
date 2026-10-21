// Screenshots of Home and the trading-desk page (item 41): node docs/skin-lab/front-panels/shots.mjs <before|after> [port]
// Headless Chromium from Playwright (the path in scripts/front_probe.config.json); starts and stops its own
// static server on the repo root. 2 pages x 2 widths, full page, the live (repo root) build. Nothing is written
// outside docs/skin-lab/front-panels/shots/.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'front_probe.config.json'), 'utf8'));
const { chromium } = createRequire(cfg.playwright_from)('playwright');
const label = process.argv[2] || 'after';
const port = process.argv[3] || '4552';
const PAGES = { home: '', 'trading-desk': 'work/trading-desk/' };

fs.mkdirSync(path.join(HERE, 'shots'), { recursive: true });
const server = spawn('python', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();
let n = 0;
try {
  for (const [name, rel] of Object.entries(PAGES)) {
    for (const width of [1280, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/${rel}`);
      await page.waitForTimeout(700);
      const out = path.join(HERE, 'shots', `${name}-${width}-${label}.png`);
      await page.screenshot({ path: out, fullPage: true });
      if (label === 'after' && width === 390 && name === 'home') {
        // The phone folds the sidebar behind Menu; one shot with it open shows the icon squares and counts.
        await page.click('#fp-menu-btn');
        await page.screenshot({ path: path.join(HERE, 'shots', `home-390-menu-${label}.png`) });
      }
      n++;
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`wrote ${n} shots (${label})`);
