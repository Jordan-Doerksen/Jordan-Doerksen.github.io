// Screenshots of the five front pages: node docs/skin-lab/front-c/shots.mjs <before|after> [port]
// Headless Chromium from Playwright (the path in scripts/front_probe.config.json); starts and stops
// its own static server on the repo root. 5 pages x 2 widths x 2 themes. The theme is set the way a
// visitor sets it, by the stored choice (fp-theme), and the colour scheme is emulated to match.
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
const port = process.argv[3] || '4541';
const PAGES = { home: '', 'trading-desk': 'work/trading-desk/', 'rail-software': 'work/rail-software/', games: 'work/games/', desk: 'desk/' };

const server = spawn('python', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();
let n = 0;
try {
  for (const [name, rel] of Object.entries(PAGES)) {
    for (const width of [1280, 390]) {
      for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
        await ctx.addInitScript((t) => { try { localStorage.setItem('fp-theme', t); } catch (e) {} }, theme);
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}/${rel}`);
        await page.waitForTimeout(500);
        const out = path.join(HERE, 'shots', `${label}-${name}-${width}-${theme}.png`);
        await page.screenshot({ path: out, fullPage: true });
        n++;
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`wrote ${n} shots (${label})`);
