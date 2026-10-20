// probe.mjs: the headless checks and the screenshots for the method-24 lab (CR-27).
// Playwright loads from the map-reading-trainer package, as scripts/front_probe.mjs does (GATE-03: no new package).
// Usage: node docs/skin-lab/method-24/probe.mjs <check|reduced|nojs|moves|shots> [t1 t2 t3]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const PW = 'C:/projects/map-reading-trainer/package.json';
const { chromium } = createRequire(PW)('playwright');
const cmd = process.argv[2] || 'check';
const ts = process.argv.slice(3).length ? process.argv.slice(3) : ['t1', 't2', 't3'];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mjs': 'text/javascript' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end('no'); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/docs/skin-lab/method-24/' }));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- in-page helpers (strings, run with page.evaluate)
const CONTRAST = `(() => {
  const root = document.documentElement;
  const num = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0]*a + bot[0]*(1-a), top[1]*a + bot[1]*(1-a), top[2]*a + bot[2]*(1-a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const glowTok = getComputedStyle(root).getPropertyValue('--md-glow');
  const glow = (glowTok.match(/rgba\\([^)]+\\)/) || [''])[0];
  let worst = { ratio: 99, text: '' }, count = 0;
  const els = document.querySelectorAll('body *');
  els.forEach(el => {
    if (el.closest('.md-skip') || el.closest('svg') || el.tagName === 'SCRIPT') return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    let chain = []; for (let e = el; e; e = e.parentElement) chain.unshift(e);
    let bg = num(getComputedStyle(root).backgroundColor); if (bg[3] < 1) bg = [6,21,39,1];
    chain.forEach(e => { if (e.classList && e.classList.contains('md-bleed') && glow) bg = over(num(glow), bg); const c = num(getComputedStyle(e).backgroundColor); if (c[3] > 0) bg = over(c, bg); });
    const fg = over(num(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    count++; if (ratio < worst.ratio) worst = { ratio: Math.round(ratio*100)/100, text: (el.textContent.trim().slice(0, 40)), cls: el.className };
  });
  return { texts: count, min: worst };
})()`;

const LAYOUT = `(() => {
  const vw = innerWidth, de = document.documentElement;
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  let maxRight = 0, minLeft = 1e9;
  document.querySelectorAll('body *').forEach(e => { if (e.closest('.md-skip, .md-ground') || e.closest('svg') || !vis(e)) return; const r = e.getBoundingClientRect(); maxRight = Math.max(maxRight, r.right); minLeft = Math.min(minLeft, r.left); });
  const main = document.querySelector('main'); const box = (document.querySelector('.md-pin') || document.querySelector('.md-chapter')).getBoundingClientRect();
  let cl = 1e9, cr = 0, ct = 1e9, cb = 0;
  main.querySelectorAll('.md-gate, .md-mark, .md-btn, .md-scrub-r, .md-h2, .md-kicker, .md-status').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); cl = Math.min(cl, r.left); cr = Math.max(cr, r.right); ct = Math.min(ct, r.top); cb = Math.max(cb, r.bottom); });
  return { vw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, widestRight: Math.round(maxRight*10)/10, leftmost: Math.round(minLeft*10)/10,
    gutterLeft: Math.round(cl), gutterRight: Math.round(vw - cr), gutterTop: Math.round(ct - box.top), gutterBottom: Math.round(box.bottom - cb) };
})()`;

function counter() { return `(() => {
  window.__n = { setTimeout: 0, setInterval: 0, requestAnimationFrame: 0 };
  for (const k of Object.keys(window.__n)) { const o = window[k].bind(window); window[k] = function () { window.__n[k]++; return o.apply(window, arguments); }; }
})();`; }

async function ctxFor(browser, w, opts = {}) {
  return browser.newContext({ viewport: { width: w, height: opts.h || (w < 700 ? 844 : 900) }, ...opts.ctx });
}
function watch(page, log) {
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => log.push('pageerror: ' + e.message));
  page.on('requestfailed', r => log.push('requestfailed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
}
// move a treatment to state n (0..5) the way a visitor can: buttons for T1, the scrubber for T3, scroll for T2
async function toState(page, t, n) {
  if (t === 't1') { await page.click('[data-act=reset]'); for (let i = 0; i < n; i++) await page.click('[data-act=step]'); }
  else if (t === 't3') { await page.evaluate(v => { const r = document.querySelector('.md-scrub-r'); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }, n); }
  else { const P = [0.02, 0.12, 0.3, 0.5, 0.7, 0.99][n]; await scrollP(page, P); }
}
async function scrollP(page, p) {
  await page.evaluate(p => {
    const track = document.querySelector('.md-track'), pin = document.querySelector('.md-pin');
    const pinned = document.documentElement.classList.contains('md-pinned');
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--md-pin-top')) || 0;
    const vh = innerHeight;
    if (pinned) { const y = track.getBoundingClientRect().top + scrollY - pinTop + p * (track.offsetHeight - pin.offsetHeight); scrollTo(0, y); }
    else { const h = pin.getBoundingClientRect().height, top0 = pin.getBoundingClientRect().top + scrollY; /* p = (0.9vh - top)/(0.5vh + h) with top = top0 - scrollY */ scrollTo(0, top0 - 0.9 * vh + p * (0.5 * vh + h)); }
  }, p);
}

async function main() {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const out = [];
  const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };
  try {
    if (cmd === 'check') {
      for (const t of ts) for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + t + '/index.html', { waitUntil: 'load' }); await sleep(600);
        const res = { t, w, states: [] };
        const stateList = [0, 2, 5];
        for (const n of stateList) {
          await toState(page, t, n); await sleep(2200);
          res.states.push({ state: n, layout: await page.evaluate(LAYOUT), contrast: await page.evaluate(CONTRAST) });
        }
        // keyboard: every control reachable by Tab, each with a visible ring
        await page.reload({ waitUntil: 'load' }); await sleep(600);
        const want = await page.evaluate(() => [...document.querySelectorAll('a[href], button, input')].filter(e => e.getBoundingClientRect().width > 0 || e.classList.contains('md-skip')).length);
        const seen = [];
        for (let i = 0; i < want; i++) {
          await page.keyboard.press('Tab');
          seen.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + '.' + (e.className || e.id) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 12) + '"' : ''), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 }; }));
        }
        const uniq = new Set(seen.map(s => s.el));
        res.keyboard = { focusable: want, reached: uniq.size, allRing: seen.every(s => s.ring), tabOrder: [...uniq] };
        res.console = log.length ? log : 'clean';
        P(JSON.stringify(res, null, 1));
        await ctx.close();
      }
    }
    if (cmd === 'reduced') {
      for (const t of ts) for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.addInitScript(counter());
        await page.goto(base + t + '/index.html', { waitUntil: 'load' }); await sleep(500);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y <= H; y += 300) { await page.evaluate(y => scrollTo(0, y), y); await sleep(60); }
        const press = (await page.$('[data-act=play]')) ? 'Play pressed' : 'no Play control (scroll only)';
        if (await page.$('[data-act=play]')) await page.click('[data-act=play]');
        await sleep(3000);
        const r = await page.evaluate(() => ({ animations: document.getAnimations().length, calls: window.__n, lit: document.querySelectorAll('.md-gate.md-lit').length, marks: document.querySelectorAll('.md-mark.md-lit').length, reducedMatches: matchMedia('(prefers-reduced-motion: reduce)').matches }));
        P(t, w, press, JSON.stringify(r), log.length ? JSON.stringify(log) : 'console clean');
        await ctx.close();
      }
    }
    if (cmd === 'nojs') {
      const srcHtml = fs.readFileSync(path.join(ROOT, 'method', 'index.html'), 'utf8');
      const sec = srcHtml.match(/<section id="md-gates"[\s\S]*?<\/section>/)[0];
      const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const want = [...sec.matchAll(/<li class="md-node md-rv">([\s\S]*?)<\/li>/g)].map(m => m[1]);
      const pieces = want.flatMap(n => [...n.matchAll(/<(?:h3|p)[^>]*>([^<]+)<\/(?:h3|p)>/g)].map(m => m[1]).concat([...n.matchAll(/<dd>([^<]+)<\/dd>/g)].map(m => m[1])));
      for (const t of ts) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false }); const page = await ctx.newPage();
        await page.goto(base + t + '/index.html', { waitUntil: 'load' });
        const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
        const missing = pieces.filter(p => !text.includes(p));
        const vis = await page.evaluate(() => [...document.querySelectorAll('.md-gate')].map(g => { const r = g.getBoundingClientRect(); const cs = getComputedStyle(g); return r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.translate === 'none' && cs.borderTopStyle === 'solid'; }));
        P(t, 'JS off: gate text pieces', pieces.length, 'missing', missing.length, JSON.stringify(missing), 'gates at rest (visible, solid, no offset):', JSON.stringify(vis), 'html.md-js:', await page.evaluate(() => document.documentElement.classList.contains('md-js')));
        await ctx.close();
      }
    }
    if (cmd === 'moves') {
      for (const t of ['t1', 't3']) for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage();
        await page.goto(base + t + '/index.html', { waitUntil: 'load' }); await sleep(400);
        await toState(page, t, 0); await sleep(300);
        const grab = () => page.evaluate(() => [...document.querySelectorAll('.md-btn, .md-scrub-r, .md-status')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round((r.y + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }));
        const first = await grab(); let maxd = 0, n = 0; let states = new Set();
        await page.click('[data-act=play]');
        const t0 = Date.now();
        while (Date.now() - t0 < 16000) {
          const g = await grab(); n++;
          g.forEach((b, i) => b.forEach((v, j) => { maxd = Math.max(maxd, Math.abs(v - first[i][j])); }));
          states.add(await page.evaluate(() => document.querySelectorAll('.md-gate.md-lit').length + (document.querySelectorAll('.md-mark.md-lit').length ? 1 : 0)));
          await sleep(120);
        }
        P(t, w, 'control boxes sampled', n, 'times over 16 s, states seen', JSON.stringify([...states].sort()), 'max change in x, y, width or height (px):', maxd, 'boxes:', JSON.stringify(first));
        await ctx.close();
      }
    }
    if (cmd === 'shots') {
      const dir = path.join(HERE, 'shots'); fs.mkdirSync(dir, { recursive: true });
      for (const t of ts) {
        // stills: reduced motion, complete
        for (const w of [1280, 390]) {
          const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage();
          await page.goto(base + t + '/index.html', { waitUntil: 'load' }); await sleep(600);
          await page.screenshot({ path: path.join(dir, `${t}-still-${w}.png`), fullPage: true });
          P('wrote', `${t}-still-${w}.png`); await ctx.close();
        }
        // frames: six states across the sequence at 1280
        const ctx = await ctxFor(browser, 1280, { h: 900 }); const page = await ctx.newPage();
        await page.goto(base + t + '/index.html', { waitUntil: 'load' }); await sleep(800);
        const frames = [];
        for (let n = 0; n < 6; n++) {
          await toState(page, t, n); await sleep(t === 't3' ? 2200 : 1600);
          const f = path.join(dir, `${t}-f${n + 1}.png`); await page.screenshot({ path: f }); frames.push(f); P('wrote', path.basename(f));
        }
        await ctx.close();
        // strip: six frames in one row
        const sctx = await browser.newContext({ viewport: { width: 1920, height: 100 } }); const sp = await sctx.newPage();
        const imgs = frames.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:16.5%;display:block">`).join('');
        await sp.setContent(`<body style="margin:0;background:#061527;display:flex;gap:0.2%;align-items:flex-start">${imgs}</body>`);
        const h = await sp.evaluate(() => document.body.scrollHeight);
        await sp.setViewportSize({ width: 1920, height: h });
        await sp.screenshot({ path: path.join(dir, `${t}-strip.png`) }); P('wrote', `${t}-strip.png`); await sctx.close();
      }
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch(e => { console.error('COULD NOT LOOK:', e); process.exit(2); });
