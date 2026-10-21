// Item 43 C3 (CR-32): one screenshot per large project that runs as a page on the site.
//
//   node scripts/capture_shots.mjs            capture every project in shots.config.json -> assets/shots/<slug>.png
//   node scripts/capture_shots.mjs --check    re-capture into a scratch folder and compare with assets/shots/
//   node scripts/capture_shots.mjs --only a,b limit to these slugs
//
// Exit codes: 0 all good, 1 a shot refused (page errors) or, with --check, a difference,
//             2 could not look (config, Playwright, browser or a page did not load).
//
// Rules held here: the only host is 127.0.0.1 (a static server on a free port, closed on exit);
// a fresh browser context per page, no saved profile; 0 page errors or the shot is refused.
// Every number comes from scripts/shots.config.json (DES-04).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : args.includes('--only') ? (args[args.indexOf('--only') + 1] || '').split(',') : null;

const EXIT_OK = 0, EXIT_FAIL = 1, EXIT_UNKNOWN = 2;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.map': 'application/json',
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}
function dig(obj, keys) {
  return keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}

// A static server rooted at the worktree. 127.0.0.1 only; a directory serves its index.html.
function serve() {
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.normalize(path.join(ROOT, rel));
    // A bare startsWith(ROOT) let a sibling folder sharing the prefix (jd-site-wt-shots2) through; compare with the separator.
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const data = fs.readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function largeProjects(cfg) {
  const src = cfg.source;
  const sizes = readJson(src.sizes).projects;
  const front = readJson(src.tiers_config);
  const tiers = dig(front, src.tiers_path) || {};
  const overrides = dig(front, src.overrides_path) || {};
  const out = [];
  for (const [slug, row] of Object.entries(sizes)) {
    const ov = overrides[slug];
    const large = ov ? ov.tier === 'large' : !row.could_not_look && row.commits != null && row.commits >= tiers.large_from;
    if (large) out.push({ slug, commits: row.commits });
  }
  out.sort((a, b) => (b.commits ?? 0) - (a.commits ?? 0));
  return out;
}

async function main() {
  let cfg;
  try { cfg = readJson('scripts/shots.config.json'); } catch (e) { console.error(`could not look: shots.config.json: ${e.message}`); return EXIT_UNKNOWN; }

  let chromium;
  try {
    const require = createRequire(cfg.playwright_from);
    ({ chromium } = require('playwright'));
  } catch (e) { console.error(`could not look: Playwright not found from ${cfg.playwright_from}: ${e.message}`); return EXIT_UNKNOWN; }

  let large;
  try { large = largeProjects(cfg); } catch (e) { console.error(`could not look: tiers: ${e.message}`); return EXIT_UNKNOWN; }

  const outDir = CHECK ? fs.mkdtempSync(path.join(os.tmpdir(), 'jd-shots-')) : path.join(ROOT, cfg.out_dir);
  fs.mkdirSync(outDir, { recursive: true });

  const slugs = Object.keys(cfg.capture).filter((s) => !ONLY || ONLY.includes(s));
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let worst = EXIT_OK;
  const results = {};
  try {
    browser = await chromium.launch({ headless: true });
    for (const slug of slugs) {
      const spec = cfg.capture[slug];
      const errors = [];
      // Fresh context per page: no profile, no cache, no service worker carried over.
      const ctx = await browser.newContext({
        viewport: cfg.viewport,
        deviceScaleFactor: cfg.device_scale_factor,
        reducedMotion: cfg.reduced_motion,
        serviceWorkers: cfg.service_workers,
      });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
      const url = `${base}/${spec.path}`;
      const file = path.join(outDir, `${slug}.png`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: cfg.navigation_timeout_ms });
        await page.waitForTimeout(spec.settle_ms ?? cfg.settle_ms);
        if (errors.length) {
          results[slug] = { path: spec.path, ok: false, errors };
          worst = Math.max(worst, EXIT_FAIL);
        } else {
          await page.screenshot({ path: file, animations: 'disabled' });
          results[slug] = { path: spec.path, ok: true, errors, ...pngSize(file) };
        }
      } catch (e) {
        results[slug] = { path: spec.path, ok: false, errors: [`did not load: ${e.message.split('\n')[0]}`], unknown: true };
        worst = Math.max(worst, EXIT_UNKNOWN);
      }
      await ctx.close();
    }
  } catch (e) {
    console.error(`could not look: browser: ${e.message.split('\n')[0]}`);
    worst = EXIT_UNKNOWN;
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }

  for (const [slug, r] of Object.entries(results)) {
    if (r.ok) console.log(`${CHECK ? 'checked ' : 'wrote   '} ${slug}  ${r.path}  ${r.width}x${r.height}  ${r.bytes} bytes  ${r.errors.length} errors`);
    else console.log(`REFUSED  ${slug}  ${r.path}  ${r.errors.length} errors${r.unknown ? ' (could not look)' : ''}`);
    if (!r.ok) for (const e of r.errors.slice(0, 5)) console.log(`           ${e}`);
  }

  if (CHECK) {
    // Compare with the committed shots: same dimensions and the same page-error count (0). Pixels may differ.
    for (const slug of slugs) {
      const r = results[slug];
      if (!r || !r.ok) continue;
      const have = path.join(ROOT, cfg.out_dir, `${slug}.png`);
      const mine = fs.existsSync(have) ? pngSize(have) : null;
      if (!mine) { console.log(`DIFF     ${slug}  no committed shot at ${cfg.out_dir}/${slug}.png`); worst = Math.max(worst, EXIT_FAIL); continue; }
      if (mine.width !== r.width || mine.height !== r.height) {
        console.log(`DIFF     ${slug}  committed ${mine.width}x${mine.height}, fresh ${r.width}x${r.height}`);
        worst = Math.max(worst, EXIT_FAIL);
      } else console.log(`same     ${slug}  ${mine.width}x${mine.height}, 0 errors both (bytes ${mine.bytes} vs ${r.bytes}; pixels may differ)`);
    }
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // Every large project, with its shot or the reason it has none (the stage falls back to the medium display).
  console.log(`\nlarge projects (${large.length}):`);
  for (const { slug, commits } of large) {
    const shotFile = path.join(ROOT, cfg.out_dir, `${slug}.png`);
    if (cfg.capture[slug]) {
      const r = results[slug];
      const s = fs.existsSync(shotFile) ? pngSize(shotFile) : null;
      const state = r && !r.ok ? 'REFUSED' : s ? `shot ${cfg.out_dir}/${slug}.png (${s.width}x${s.height}, ${s.bytes} bytes)` : 'NO SHOT YET';
      console.log(`  ${slug} (${commits} commits): ${state}`);
    } else {
      console.log(`  ${slug} (${commits} commits): no shot - ${cfg.not_captured[slug] || 'NOT LISTED in shots.config.json (add it to capture or not_captured)'}`);
      if (!cfg.not_captured[slug]) worst = Math.max(worst, EXIT_UNKNOWN);
    }
  }
  const stray = Object.keys(cfg.capture).filter((s) => !large.some((l) => l.slug === s));
  if (stray.length) console.log(`  note: captured but not large by the current tiers: ${stray.join(', ')}`);

  console.log(`exit ${worst}`);
  return worst;
}

process.exitCode = await main();
