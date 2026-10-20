// probe.mjs: the headless checks and the screenshots for the item 24b ride variants. Adapted from
// docs/skin-lab/method-24/probe.mjs (same helpers, same bars). Playwright loads from the map-reading-trainer package, as
// scripts/front_probe.mjs does (GATE-03: no new package).
// Usage: node docs/skin-lab/method-24b/probe.mjs <check|reduced|nojs|idle|hold|shots> [r1 r2 r3]
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
const vs = process.argv.slice(3).length ? process.argv.slice(3) : ['r1', 'r2', 'r3'];
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mjs': 'text/javascript' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end('no'); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/docs/skin-lab/method-24b/' }));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CONTRAST = `(() => {
  const root = document.documentElement;
  const num = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0]*a + bot[0]*(1-a), top[1]*a + bot[1]*(1-a), top[2]*a + bot[2]*(1-a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  let worst = { ratio: 99, text: '' }, count = 0;
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('.md-skip') || el.closest('svg') || el.tagName === 'SCRIPT' || el.closest('.md-r-all:not(.md-open)')) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    let chain = []; for (let e = el; e; e = e.parentElement) chain.unshift(e);
    let bg = num(getComputedStyle(root).backgroundColor); if (bg[3] < 1) bg = [6,21,39,1];
    chain.forEach(e => { const c = num(getComputedStyle(e).backgroundColor); if (c[3] > 0) bg = over(c, bg); });
    const fg = over(num(cs.color), bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    count++; if (ratio < worst.ratio) worst = { ratio: Math.round(ratio*100)/100, text: (el.textContent.trim().slice(0, 40)), cls: el.className };
  });
  return { texts: count, min: worst };
})()`;

// widest visible element = viewport; gutter on the four edges of what the window shows
const LAYOUT = `(() => {
  const vw = innerWidth, vh = innerHeight, de = document.documentElement;
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  let maxRight = 0, minLeft = 1e9;
  document.querySelectorAll('body *').forEach(e => { if (e.closest('.md-skip') || e.closest('svg') || e.closest('.md-r-orbit') || e.closest('.md-r-all:not(.md-open)') || !vis(e)) return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; maxRight = Math.max(maxRight, r.right); minLeft = Math.min(minLeft, r.left); });
  let cl = 1e9, cr = 0, cb = 0;
  document.querySelectorAll('.md-card, .md-mark, .md-h2, .md-kicker, .md-status, .md-endcard').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; cl = Math.min(cl, r.left); cr = Math.max(cr, r.right); });
  const bar = document.querySelector('.md-r-bar').getBoundingClientRect(), top = document.querySelector('.md-r-top').getBoundingClientRect();
  return { vw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, widestRight: Math.round(maxRight*10)/10, leftmost: Math.round(minLeft*10)/10,
    gutterLeft: Math.round(cl), gutterRight: Math.round(vw - cr), barLeft: Math.round(bar.left), barRightGap: Math.round(vw - bar.right), topBarHeight: Math.round(top.height), barBottomGap: Math.round(vh - bar.bottom) };
})()`;

function counter() { return `(() => {
  window.__n = { setTimeout: 0, setInterval: 0, requestAnimationFrame: 0 };
  for (const k of Object.keys(window.__n)) { const o = window[k].bind(window); window[k] = function () { window.__n[k]++; return o.apply(window, arguments); }; }
})();`; }

async function ctxFor(browser, w, opts = {}) { return browser.newContext({ viewport: { width: w, height: opts.h || (w < 700 ? 844 : 900) }, ...opts.ctx }); }
function watch(page, log) {
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => log.push('pageerror: ' + e.message));
  page.on('requestfailed', r => log.push('requestfailed: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
}
const state = page => page.evaluate(() => document.documentElement.getAttribute('data-ride'));
async function until(page, fn, ms = 20000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await sleep(80); } return false; }
const STEPTXT = () => document.querySelector('.md-status').textContent;

async function main() {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const P = (...a) => console.log(a.join(' '));
  try {
    if (cmd === 'check') {
      for (const v of vs) for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(900);
        const res = { v, w, states: [] };
        res.states.push({ at: 'idle', layout: await page.evaluate(LAYOUT), contrast: await page.evaluate(CONTRAST) });
        await page.click('[data-act=go]');
        for (const t of [3500, 5000]) { await sleep(t); res.states.push({ at: 'riding +' + t, ride: await state(page), layout: await page.evaluate(LAYOUT), contrast: await page.evaluate(CONTRAST) }); }
        await page.click('[data-act=go]');
        await page.click('[data-act=all]'); await sleep(300);
        res.states.push({ at: 'see all open', layout: await page.evaluate(LAYOUT), contrast: await page.evaluate(CONTRAST) });
        await page.click('[data-act=close]');
        // keyboard: every enabled control reachable by Tab, each with a visible ring
        await ctx.close();
        const kctx = await ctxFor(browser, w); const kpage = await kctx.newPage(); watch(kpage, log);   // a fresh page: a reload would restore the scroll position
        await kpage.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(900);
        const want = await kpage.evaluate(() => [...document.querySelectorAll('a[href], button')].filter(e => !e.disabled && (e.getBoundingClientRect().width > 0 || e.classList.contains('md-skip'))).length);
        const seen = [];
        for (let i = 0; i < want; i++) {
          await kpage.keyboard.press('Tab');
          seen.push(await kpage.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + '.' + (e.className || e.id) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 14) + '"' : ''), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 }; }));
        }
        const uniq = new Set(seen.map(s => s.el));
        res.keyboard = { focusable: want, reachedUnique: uniq.size, allRing: seen.every(s => s.ring), order: [...uniq] };
        res.console = log.length ? log : 'clean';
        const summ = res.states.map(s => ({ at: s.at, sw: s.layout.scrollWidth, widest: s.layout.widestRight, left: s.layout.leftmost, gutL: s.layout.gutterLeft, gutR: s.layout.gutterRight, barL: s.layout.barLeft, barR: s.layout.barRightGap, barB: s.layout.barBottomGap, contrast: s.contrast.min.ratio, ctext: s.contrast.min.text, ride: s.ride }));
        P(JSON.stringify({ v, w, states: summ, keyboard: res.keyboard, console: res.console }, null, 1));
        await kctx.close();
      }
    }
    if (cmd === 'reduced') {
      for (const v of vs) for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.addInitScript(counter());
        await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(600);
        const before = await page.evaluate(() => ({ n: { ...window.__n }, anim: document.getAnimations().length, scrollY }));
        const status = [];
        for (let i = 0; i < 5; i++) { await page.click("[data-act=next]"); status.push((await page.evaluate(STEPTXT)).slice(0, 28)); }
        await page.click('[data-act=back]');
        await page.click('[data-act=next]');
        await sleep(1500);
        const r = await page.evaluate(() => ({ animations: document.getAnimations().length, calls: window.__n, reducedMatches: matchMedia('(prefers-reduced-motion: reduce)').matches, goVisible: !document.querySelector('[data-act=go]').hidden, litCards: document.querySelectorAll('.md-card.md-lit').length, litMarks: document.querySelectorAll('.md-mark.md-lit').length, scrollW: document.documentElement.scrollWidth, ride: document.documentElement.getAttribute('data-ride'), liveClass: document.documentElement.classList.contains('md-r-live') }));
        P(v, w, 'after load', JSON.stringify(before), '| after a full step through, Back and Next:', JSON.stringify(r), '| statuses', JSON.stringify(status), log.length ? JSON.stringify(log) : 'console clean');
        await ctx.close();
      }
    }
    if (cmd === 'nojs') {
      const want = ['The interview', 'The decisions manifest', 'The change request', 'The reviewer',
        'Before anything is built, I am asked what I want.', 'Every answer goes into one file, with the reason and the date.', 'When a decision must change, it is not changed in place.', 'The work is checked by a reviewer that did not write it and cannot edit it.',
        'Building before the choice is mine.', 'Code with no decision behind it.', 'Drift: a change nobody agreed to.', 'A builder grading its own work.',
        'My answers, one per question.', 'A file named DECISIONS, in the project.', 'The request, the verdict, the log line.', 'The verdict, with the evidence beside it.'];
      for (const v of vs) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false }); const page = await ctx.newPage();
        await page.goto(base + v + '/index.html', { waitUntil: 'load' });
        const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').toLowerCase();
        const missing = want.filter(t => !text.includes(t.toLowerCase()));
        const cards = await page.evaluate(() => [...document.querySelectorAll('.md-card')].map(g => { const r = g.getBoundingClientRect(); const cs = getComputedStyle(g); const t = cs.translate; return r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && (t === 'none' || /^0(px)?( 0(px)?)?$/.test(t)) && cs.borderTopStyle === 'solid'; }));
        P(v, 'JS off: text pieces', want.length, 'missing', missing.length, JSON.stringify(missing), '| cards at rest (visible, solid, no offset):', cards.filter(Boolean).length, 'of', cards.length, '| controls hidden:', await page.evaluate(() => document.querySelector('[data-ctls]').hidden), '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth));
        await ctx.close();
      }
    }
    if (cmd === 'idle') {
      for (const v of vs) {
        const ctx = await ctxFor(browser, 1280); const page = await ctx.newPage();
        await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(900);
        const snap = () => page.evaluate(() => { const c = document.querySelector('#gate-1').getBoundingClientRect(); const b = document.querySelector('.md-belt'); return { y: scrollY, c1: [Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10], belt: b ? getComputedStyle(b).transform : 'n/a', running: document.getAnimations().filter(a => a.playState === 'running').length, ride: document.documentElement.getAttribute('data-ride'), p: getComputedStyle(document.documentElement).getPropertyValue('--md-r-p') }; });
        const a = await snap(); await sleep(2500); const b = await snap();
        const same = JSON.stringify(a) === JSON.stringify(b);
        await page.click('[data-act=go]'); await sleep(3500); const c = await snap();
        const moved = JSON.stringify(c) !== JSON.stringify(a);
        P(v, 'before Start: t0', JSON.stringify(a), 'after 2.5 s', JSON.stringify(b), 'identical:', same, '| 3.5 s after Start:', JSON.stringify(c), 'moved:', moved);
        await ctx.close();
      }
    }
    if (cmd === 'hold') {
      for (const v of vs) for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage();
        await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(900);
        await page.click('[data-act=go]');
        const got = await until(page, () => document.documentElement.getAttribute('data-ride') === 'dwell' && /Gate 1 of/.test(document.querySelector('.md-status').textContent));
        await sleep(1300);   // the arrival feedback (settle, ring) is done
        const box = await page.evaluate(() => { const r = document.querySelector('#gate-1').getBoundingClientRect(); return { x: r.x + r.width / 2, y: Math.min(Math.max(r.y + r.height / 2, 130), innerHeight - 80) }; });
        await page.mouse.move(box.x, box.y); await sleep(250);
        const st = await state(page);
        const grab = () => page.evaluate(() => { const r = document.querySelector('#gate-1').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
        const first = await grab(); let maxd = 0, n = 0;
        const t0 = Date.now();
        while (Date.now() - t0 < 4200) { const g = await grab(); n++; g.forEach((vv, j) => { maxd = Math.max(maxd, Math.abs(vv - first[j])); }); await sleep(100); }
        const still = await state(page);
        await page.mouse.move(5, 5); await sleep(700);
        const after = await state(page);
        P(v, w, 'reached card 1 dwell:', got, '| state with pointer inside:', st, '(after 4.2 s:', still + ')', '| card box sampled', n, 'times over 4.2 s (longer than the dwell), max change in x, y, width or height (px):', Math.round(maxd * 100) / 100, '| pointer away -> state', after);
        await ctx.close();
      }
    }
    if (cmd === 'shots') {
      const dir = path.join(HERE, 'shots'); fs.mkdirSync(dir, { recursive: true });
      for (const v of vs) {
        for (const w of [1280, 390]) {
          const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage();
          await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(700);
          await page.screenshot({ path: path.join(dir, `${v}-still-${w}.png`), fullPage: true }); P('wrote', `${v}-still-${w}.png`); await ctx.close();
        }
        const ctx = await ctxFor(browser, 1280, { h: 900 }); const page = await ctx.newPage();
        await page.goto(base + v + '/index.html', { waitUntil: 'load' }); await sleep(900);
        const frames = [];
        const snap = async (n, ms) => { await sleep(ms); const f = path.join(dir, `${v}-f${n}.png`); await page.screenshot({ path: f }); frames.push(f); P('wrote', path.basename(f)); };
        await snap(1, 200);                                                   // idle, nothing has moved
        await page.click('[data-act=next]'); await snap(2, 1100);             // gate 1
        await page.click('[data-act=next]'); await snap(3, 1100);             // gate 2
        await page.click('[data-act=go]');                                    // ride from gate 2: the reading pause, then the ride on
        await until(page, () => document.documentElement.getAttribute('data-ride') === 'riding'); await snap(4, 900);   // between gates, riding
        await until(page, () => /Gate 3 of/.test(document.querySelector('.md-status').textContent) && document.documentElement.getAttribute('data-ride') === 'dwell'); await snap(5, 700);   // gate 3, feedback running
        await page.click('[data-act=go]'); await page.click('[data-act=next]'); await page.click('[data-act=next]'); await snap(6, 1100);   // the record
        await ctx.close();
        const sctx = await browser.newContext({ viewport: { width: 1920, height: 100 } }); const sp = await sctx.newPage();
        const imgs = frames.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:16.5%;display:block">`).join('');
        await sp.setContent(`<body style="margin:0;background:#061527;display:flex;gap:0.2%;align-items:flex-start">${imgs}</body>`);
        const h = await sp.evaluate(() => document.body.scrollHeight); await sp.setViewportSize({ width: 1920, height: h });
        await sp.screenshot({ path: path.join(dir, `${v}-strip.png`) }); P('wrote', `${v}-strip.png`); await sctx.close();
      }
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch(e => { console.error('COULD NOT LOOK:', e); process.exit(2); });
