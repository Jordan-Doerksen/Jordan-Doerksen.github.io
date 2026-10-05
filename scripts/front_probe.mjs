// Browser checks for the front page (D-A27). Run: node scripts/front_probe.mjs
//
//   --dir <path>      pages to check (default from front_probe.config.json: docs/front-page)
//   --pages a,b       only these pages (paths under --dir)
//   --widths 375,1440 override the width list
//   --themes light    override the theme list
//   --selftest        prove each check fails on its broken fixture in scripts/front_probe_fixtures/
//
// Exit 0 = every check passed. 1 = at least one issue. 2 = could not look (no pages, no browser).
// Exit 2 is NOT a pass. Playwright is resolved from an existing install named in the config
// (playwright_from); this repo gets no package.json and no node_modules.
//
// What it checks, and why each check exists, is in scripts/FRONT-PAGE-CHECKS.md.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { inPage } from './front_probe_checks.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'front_probe.config.json'), 'utf8'));
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };

// ---- logging: the same five keys as scripts/front_log.py (ts, level+severity_number, run_id, event, ctx) ----
const SEV = { debug: 5, info: 9, warn: 13, error: 17, fatal: 21 };
const runId = crypto.randomBytes(16).toString('hex');
const logFile = path.join(HERE, 'logs', 'front-probe-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.jsonl');
fs.mkdirSync(path.dirname(logFile), { recursive: true });
let finished = false;
function log(level, event, ctx = {}) {
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), level: level.toUpperCase(), severity_number: SEV[level], run_id: runId, event, ctx }) + '\n');
}
function finish(outcome) { if (finished) return; finished = true; log('info', 'run_end', { outcome }); }
console.log('log: ' + logFile);
console.log('run: ' + runId);
process.on('uncaughtException', (e) => { log('fatal', 'uncaught_exception', { error: String(e && e.stack || e) }); finish('crashed'); console.error(e); process.exit(2); });
process.on('unhandledRejection', (e) => { log('fatal', 'unhandled_rejection', { error: String(e && e.stack || e) }); finish('crashed'); console.error(e); process.exit(2); });
log('info', 'run_start', { argv, node: process.version });

let chromium;
try {
  chromium = createRequire(cfg.playwright_from)('playwright').chromium;
} catch (e) {
  log('error', 'could_not_look', { why: 'playwright did not load from ' + cfg.playwright_from, error: String(e) });
  console.log('UNKNOWN  Playwright did not load from ' + cfg.playwright_from + ' (set playwright_from in front_probe.config.json)');
  finish('unknown');
  process.exit(2);
}

// ---- one page, one width, one theme ----
const label = (m) => (m.startsWith('control edge') ? 'edge' : 'contrast');

async function probeOne(browser, url, { width, theme, extras }) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const issues = [];
  const add = (check, msgs) => msgs.forEach((msg) => issues.push({ check, msg }));
  const errs = [];
  page.on('pageerror', (e) => errs.push('script error: ' + String(e).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console error: ' + m.text().slice(0, 120)); });
  page.on('requestfailed', (r) => errs.push('request failed: ' + r.url().slice(-70)));
  await page.goto(url);
  await page.waitForTimeout(200);
  add('overflow', await page.evaluate(inPage.overflow));
  add('gutter', await page.evaluate(inPage.gutter, cfg.gutter_px));
  add('chrome', await page.evaluate(inPage.chrome));
  for (const m of await page.evaluate(inPage.contrast, cfg.contrast)) add(label(m), [m]);
  add('markers', await page.evaluate(inPage.markers));
  if (extras) {
    // keyboard: the skip link is first, every stop shows a focus ring and is on screen
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(inPage.focusState);
    if (!first || !(first.href || '').startsWith('#') || !/skip/i.test(first.text)) {
      add('skiplink', ['the first Tab stop is not a skip link: ' + (first ? first.name + ' "' + first.text + '"' : 'nothing took focus')]);
    }
    let stops = 0;
    for (let i = 0; i < cfg.max_tabs; i++) {
      const s = await page.evaluate(inPage.focusState);
      if (!s) break;
      stops++;
      if (!s.ring) add('focus', ['no visible focus ring on ' + s.name + ' "' + s.text + '"']);
      if (!s.inView) add('focus', ['the focused element is off screen: ' + s.name + ' "' + s.text + '"']);
      await page.keyboard.press('Tab');
    }
    if (stops < 3) add('focus', ['only ' + stops + ' Tab stops were reachable']);
    // Escape closes the phone menu and an open filter list
    await page.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur(); });
    const mb = await page.$('#fp-menu-btn');
    if (mb && await mb.isVisible()) {
      await mb.click();
      const open = await page.evaluate(() => { const n = document.querySelector('#fp-nav'); return !!n && !n.hidden; });
      await page.keyboard.press('Escape');
      const shut = await page.evaluate(() => { const n = document.querySelector('#fp-nav'); return !n || n.hidden; });
      if (!open) add('escape', ['the Menu button did not open the navigation']);
      else if (!shut) add('escape', ['Escape did not close the navigation']);
    }
    const fa = await page.$('details.fp-facet > summary');
    if (fa && await fa.isVisible()) {
      await fa.click();
      await page.keyboard.press('Escape');
      if (await page.evaluate(() => !!document.querySelector('details.fp-facet[open]'))) add('escape', ['Escape did not close the open filter list']);
    }
  }
  add('console', errs);
  await ctx.close();
  return issues;
}

// With reduced motion, and with no script. Each gets its own context.
async function probeModes(browser, url) {
  const issues = [];
  const add = (check, msgs) => msgs.forEach((msg) => issues.push({ check, msg }));
  let ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await page.goto(url);
  await page.waitForTimeout(900);
  add('motion', await page.evaluate(inPage.runningLoops));
  await ctx.close();
  ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } });
  page = await ctx.newPage();
  await page.goto(url);
  add('deadcontrol', await page.evaluate(inPage.deadControls, cfg.script_only));
  for (const m of await page.evaluate(inPage.contentPresent)) add(m.startsWith('text is invisible') ? 'hiddentext' : 'nocontent', [m]);
  await ctx.close();
  return issues;
}

// ---- the selftest: every check is shown to fail on its fixture ----
async function selftest(browser) {
  const dir = path.join(HERE, 'front_probe_fixtures');
  const fixtures = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  let missed = 0;
  for (const f of fixtures) {
    const url = pathToFileURL(path.join(dir, f)).href;
    const want = f.replace('.html', '');
    const found = [...await probeOne(browser, url, { width: 375, theme: 'light', extras: true }), ...await probeModes(browser, url)];
    const kinds = [...new Set(found.map((i) => i.check))];
    const ok = want === 'clean' ? found.length === 0 : kinds.includes(want);
    if (!ok) missed++;
    console.log((ok ? 'PASS    ' : 'MISSED  ') + want.padEnd(12) + (want === 'clean' ? (found.length ? 'the clean fixture has issues: ' + JSON.stringify(found.slice(0, 3)) : 'no issues, as it should be') : (ok ? 'caught' : 'NOT caught; got ' + JSON.stringify(kinds))));
    log(ok ? 'info' : 'error', 'fixture', { fixture: f, expected: want, found: kinds });
  }
  console.log('\n' + (fixtures.length - missed) + ' of ' + fixtures.length + ' fixtures behaved');
  return missed ? 1 : 0;
}

// ---- a throwaway static server for --serve: the repo root, directory URLs answered by index.html ----
let server = null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain' };
async function startServer() {
  const http = await import('http');
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.resolve(REPO, '.' + rel);
    if (!file.startsWith(REPO)) { res.writeHead(403); return res.end(); }          // never serve outside the repo
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  return srv;
}

// ---- main ----
const browser = await chromium.launch();
let code = 0;
if (argv.includes('--selftest')) {
  code = await selftest(browser);
} else {
  const dir = path.join(REPO, arg('dir') || cfg.dir);
  // --url <base> or --serve checks the pages over HTTP and asks for clean URLs ("/work/games/"), which is
  // what GitHub Pages serves. A promoted build links folders that way, and a file:// origin answers
  // them with the browser's own directory listing, whose script errors are not the site's. --serve
  // starts a throwaway server on 127.0.0.1 for the length of this run and closes it at the end.
  let baseUrl = arg('url');
  if (argv.includes('--serve')) {
    server = await startServer();
    baseUrl = 'http://127.0.0.1:' + server.address().port + '/';
    log('info', 'serve_start', { base: baseUrl, root: REPO });
  }
  const urlOf = (p) => (baseUrl ? new URL(p.replace(/index\.html$/, ''), baseUrl).href : pathToFileURL(path.join(dir, p)).href);
  const want = arg('pages') ? arg('pages').split(',') : cfg.pages;
  const widths = arg('widths') ? arg('widths').split(',').map(Number) : cfg.widths;
  const themes = arg('themes') ? arg('themes').split(',') : cfg.themes;
  const pages = want.filter((p) => { const ok = baseUrl || fs.existsSync(path.join(dir, p)); if (!ok) log('warn', 'page_missing', { page: p }); return ok; });
  if (!pages.length) {
    log('error', 'could_not_look', { why: 'no pages under ' + dir });
    console.log('UNKNOWN  no pages found under ' + dir);
    finish('unknown');
    await browser.close();
    process.exit(2);
  }
  const all = [];
  for (const theme of themes) {
    for (const p of pages) {
      for (const w of widths) {
        const url = urlOf(p);
        const extras = theme === 'light' && cfg.keyboard_widths.includes(w);
        for (const i of await probeOne(browser, url, { width: w, theme, extras })) all.push({ ...i, page: p, width: w, theme });
      }
    }
  }
  for (const p of pages) for (const i of await probeModes(browser, urlOf(p))) all.push({ ...i, page: p, width: 'mode', theme: '-' });
  const skipped = want.filter((p) => !pages.includes(p));
  const kinds = [...new Set(all.map((i) => i.check))];
  console.log('checked ' + pages.length + ' pages x ' + widths.length + ' widths x ' + themes.length + ' themes' + (skipped.length ? '  (not built: ' + skipped.join(', ') + ')' : ''));
  for (const k of ['overflow', 'gutter', 'chrome', 'contrast', 'edge', 'markers', 'skiplink', 'focus', 'escape', 'console', 'motion', 'deadcontrol', 'nocontent', 'hiddentext']) {
    const hits = all.filter((i) => i.check === k);
    console.log((hits.length ? 'FAIL    ' : 'PASS    ') + k.padEnd(12) + (hits.length ? hits.length + ' issue(s); first: ' + hits[0].page + ' @' + hits[0].width + ' ' + hits[0].theme + ': ' + hits[0].msg : ''));
    hits.slice(0, 40).forEach((h) => log('error', 'issue', h));
  }
  code = kinds.length ? 1 : 0;
}
await browser.close();
if (server) { await new Promise((ok) => server.close(ok)); log('info', 'serve_stop', {}); }
finish(code === 0 ? 'pass' : 'fail');
process.exit(code);
