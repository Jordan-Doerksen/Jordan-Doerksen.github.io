// probe-r2.mjs: the headless checks for the one method page as the R2 ride (item 24b, CR-29).
// Adapted from probe-p2.mjs (same helpers, same bars, nothing weakened), with the ride, hold, controls and stepped-page runs added.
// Playwright loads from the map-reading-trainer package, as scripts/front_probe.mjs does (GATE-03: no new package).
// Usage: node docs/skin-lab/method-24/probe-p2.mjs <check|idle|hold|ride|controls|reduced|nojs|redirect|shots>
// SITE_ROOT=<dir> serves another site root (a scratch copy stamped from a test kit); the default is this checkout.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : path.resolve(HERE, '..', '..', '..');
const PW = 'C:/projects/map-reading-trainer/package.json';
const { chromium } = createRequire(PW)('playwright');
const cmd = process.argv[2] || 'check';
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mjs': 'text/javascript' };
const CH = ['md-top', 'md-words', 'md-interview', 'md-gates', 'md-loops', 'md-harness', 'md-control', 'md-rules', 'md-limits', 'adopt'];

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end('no'); return; }
      r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
    }).listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/' }));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- in-page helpers (strings, run with page.evaluate)
const CONTRAST = `(() => {
  const CLOSED = e => { const d = e.closest('details:not([open])'); return !!d && !(e.tagName === 'SUMMARY' && e.parentElement === d); };
  const root = document.documentElement;
  const num = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0]*a + bot[0]*(1-a), top[1]*a + bot[1]*(1-a), top[2]*a + bot[2]*(1-a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  let worst = { ratio: 99, text: '' }, count = 0;
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('.md-skip') || el.closest('svg') || el.tagName === 'SCRIPT') return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    if (CLOSED(el)) return; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
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

// widest element = viewport, no sideways scroll, gutter on the four edges of the content
const LAYOUT = `(() => {
  const CLOSED = e => { const d = e.closest('details:not([open])'); return !!d && !(e.tagName === 'SUMMARY' && e.parentElement === d); };
  const vw = innerWidth, de = document.documentElement;
  const vis = e => { if (CLOSED(e)) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  let maxRight = 0, minLeft = 1e9;
  document.querySelectorAll('body *').forEach(e => { if (e.closest('.md-skip') || e.closest('svg') || e.closest('.md-term') || !vis(e)) return; const r = e.getBoundingClientRect(); maxRight = Math.max(maxRight, r.right); minLeft = Math.min(minLeft, r.left); });
  let cl = 1e9, cr = 0;
  document.querySelectorAll('.md-h2, .md-kicker, .md-arr, .md-mark, .md-title, .md-lede').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); cl = Math.min(cl, r.left); cr = Math.max(cr, r.right); });
  const first = document.querySelector('.md-hero').getBoundingClientRect(), last = document.querySelector('.md-ref').getBoundingClientRect();
  return { vw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, widestRight: Math.round(maxRight*10)/10, leftmost: Math.round(minLeft*10)/10,
    gutterLeft: Math.round(cl), gutterRight: Math.round(vw - cr), topEdge: Math.round(first.top + scrollY), bottomEdge: Math.round(document.documentElement.scrollHeight - (last.bottom + scrollY)) };
})()`;

function counter() { return `(() => {
  window.__n = { setTimeout: 0, setInterval: 0, requestAnimationFrame: 0, fetch: 0 };
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

// a real mouse click at the button's centre: page.click() scrolls the page itself, which the ride rightly reads as a visitor scroll
async function press(page, act) {
  const r = await page.evaluate(a => { const b = document.querySelector('.md-btn[data-act="' + a + '"]'); const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, act);
  await page.mouse.click(r[0], r[1]);
}
const STICKY = `(document.querySelector('.md-bar').offsetHeight + document.querySelector('.md-rail').offsetHeight)`;
async function toChapter(page, id, frac = 0.3) {
  await page.evaluate(`(() => { const el = document.getElementById(${JSON.stringify(id)}); scrollTo({ top: el.getBoundingClientRect().top + scrollY - ${STICKY} - 8 + ${frac} * 200, behavior: 'instant' }); })()`);
}
const FOCUSABLE = `[...document.querySelectorAll('a[href], summary, button, [tabindex="0"]')].filter(e => { const d = e.closest('details:not([open])'); if (d && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false; if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; }).length`;
const stateOf = () => `(() => ({ y: Math.round(scrollY), anims: document.getAnimations().length, riding: document.documentElement.classList.contains('md-riding'), lit: document.querySelectorAll('.md-arr.md-lit').length }))()`;

async function main() {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const P = (...a) => console.log(a.join(' '));
  try {
    if (cmd === 'check') {
      for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(700);
        const res = { w, chapters: [] };
        for (const id of CH) {
          await toChapter(page, id); await sleep(300);
          const L = await page.evaluate(LAYOUT), C = await page.evaluate(CONTRAST);
          res.chapters.push({ id, scrollWidth: L.scrollWidth, widest: L.widestRight, leftmost: L.leftmost, gutterL: L.gutterLeft, gutterR: L.gutterRight, contrastMin: C.min.ratio, contrastText: C.min.text });
        }
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(300);
        const Lend = await page.evaluate(LAYOUT); res.endEdge = { bottomEdge: Lend.bottomEdge, topEdge: Lend.topEdge };
        // the same two measures with a ride running (dashed slots, the car, the bar)
        await page.evaluate(() => scrollTo(0, 0)); await press(page, 'a'); await sleep(1800);
        const LR = await page.evaluate(LAYOUT), CR = await page.evaluate(CONTRAST);
        res.riding = { scrollWidth: LR.scrollWidth, widest: LR.widestRight, gutterL: LR.gutterLeft, gutterR: LR.gutterRight, contrastMin: CR.min.ratio, contrastText: CR.min.text };
        // keyboard: every control reachable by Tab, each with a visible ring
        await page.reload({ waitUntil: 'load' }); await sleep(700);
        const want = await page.evaluate(FOCUSABLE);
        const seen = [];
        for (let i = 0; i < want; i++) {
          await page.keyboard.press('Tab');
          seen.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + '.' + (e.className || e.id) + (e.getAttribute('aria-label') ? ' [' + e.getAttribute('aria-label') + ']' : e.textContent ? ' "' + e.textContent.trim().slice(0, 14) + '"' : ''), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 }; }));
        }
        const uniq = new Set(seen.map(s => s.el));
        res.keyboard = { focusable: want, reachedUnique: uniq.size, allRing: seen.every(s => s.ring), buttons: [...uniq].filter(x => x.startsWith('button')) };
        res.console = log.length ? log : 'clean';
        P(JSON.stringify(res, null, 1));
        await ctx.close();
      }
    }
    if (cmd === 'idle') {
      // no ride motion before "Start the ride": scroll position and getAnimations() unchanged for 5 s
      for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(1200);
        const a = await page.evaluate(stateOf()); const rect0 = await page.evaluate(() => { const r = document.querySelector('.md-title').getBoundingClientRect(); return [r.top, r.left]; });
        await sleep(5000);
        const b = await page.evaluate(stateOf()); const rect1 = await page.evaluate(() => { const r = document.querySelector('.md-title').getBoundingClientRect(); return [r.top, r.left]; });
        const ctlShown = await page.evaluate(() => !document.querySelector('.md-ctl').hidden);
        P(w, 'before:', JSON.stringify(a), 'after 5 s:', JSON.stringify(b), 'title moved:', JSON.stringify(rect0) !== JSON.stringify(rect1), 'controls shown:', ctlShown, 'console', log.length ? JSON.stringify(log) : 'clean');
        await ctx.close();
      }
    }
    if (cmd === 'hold') {
      // a card's bounding box does not move while the pointer rests inside it during the ride
      for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + 'method/?ridetest=2400', { waitUntil: 'load' }); await sleep(600);
        await press(page, 'a');
        // wait until the car has lit the second gate card, then rest the pointer in a card on screen
        await page.waitForFunction(() => document.querySelectorAll('#md-gates .md-arr.md-lit').length >= 1, null, { timeout: 120000 });
        await sleep(700);
        const target = await page.evaluate(() => { const c = [...document.querySelectorAll('#md-gates .md-arr.md-lit')].pop(); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.max(r.top, 170) + 40, idx: [...document.querySelectorAll('.md-arr')].indexOf(c) }; });
        await page.mouse.move(target.x, target.y);
        await sleep(400);
        const held = await page.evaluate(() => document.documentElement.classList.contains('md-paused'));
        const grab = () => page.evaluate(() => { const c = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return null; });
        const box = async () => page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); const c = el && el.closest('.md-arr, .md-mark'); if (!c) return null; const r = c.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10, Math.round(scrollY)]; }, [target.x, target.y]);
        const b0 = await box(); await sleep(3000); const b1 = await box();
        const msg = await page.evaluate(() => document.querySelector('.md-rail-t').textContent);
        P(w, 'ride held by the pointer:', held, '| card box at rest start', JSON.stringify(b0), 'after 3 s', JSON.stringify(b1), '| identical:', JSON.stringify(b0) === JSON.stringify(b1), '| rail says:', msg);
        // moving out lets the ride go on
        const y0 = await page.evaluate(() => scrollY); await page.mouse.move(2, 400); await sleep(2500);
        const y1 = await page.evaluate(() => scrollY);
        P(w, 'pointer out: ride resumed:', !(await page.evaluate(() => document.documentElement.classList.contains('md-paused'))), '| scroll', y0, '->', y1, '| console', log.length ? JSON.stringify(log) : 'clean');
        await ctx.close();
      }
    }
    if (cmd === 'ride') {
      // the ride reaches the Adopt chapter and ends on the complete diagram (dwell overridden to 300 ms by ?ridetest=300)
      for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + 'method/?ridetest=300', { waitUntil: 'load' }); await sleep(600);
        const t0 = Date.now();
        await press(page, 'a');
        const seen = new Set();
        let end = null;
        for (let i = 0; i < 400; i++) {
          await sleep(500);
          const s = await page.evaluate(() => ({ ch: [...document.querySelectorAll('[data-ch]')].filter(e => e.querySelector('.md-lit') || e.classList.contains('md-hit')).map(e => e.id).pop(), msg: document.querySelector('.md-rail-t').textContent, p: getComputedStyle(document.documentElement).getPropertyValue('--md-p') }));
          seen.add(s.ch);
          if (/^Ride complete/.test(s.msg)) { end = s; break; }
        }
        await sleep(2500);
        const fin = await page.evaluate(() => {
          const adopt = document.getElementById('adopt'), dg = adopt.querySelector('.md-dgwrap').getBoundingClientRect();
          const arrs = [...document.querySelectorAll('.md-arr')];
          return { elapsedNote: null, arrsLit: arrs.filter(a => a.classList.contains('md-lit')).length, arrs: arrs.length, marksLit: [...document.querySelectorAll('.md-mark')].filter(a => a.classList.contains('md-lit')).length, marks: document.querySelectorAll('.md-mark').length,
            newParts: document.querySelectorAll('.md-dp.md-new').length, newLit: document.querySelectorAll('.md-dp.md-new.md-lit').length,
            slotsInAdoptDiagram: adopt.querySelectorAll('.md-dgwrap .md-slot').length, adoptDiagramVisible: dg.top < innerHeight && dg.bottom > 0, rail: document.querySelector('.md-rail-t').textContent, rail_n: document.querySelector('.md-rail-n').textContent,
            statuses: [...document.querySelectorAll('.md-status')].map(s => s.textContent.slice(0, 18)), p: getComputedStyle(document.documentElement).getPropertyValue('--md-p'), car: !document.querySelector('.md-ride-layer').hidden };
        });
        P(w, 'chapters seen lit in order:', JSON.stringify([...seen].filter(Boolean)), '| seconds', Math.round((Date.now() - t0) / 1000), '|', JSON.stringify(fin), '| ended', JSON.stringify(end), '| console', log.length ? JSON.stringify(log) : 'clean');
        await ctx.close();
      }
    }
    if (cmd === 'controls') {
      // pause, resume, wheel, arrow keys, See all chapters
      const ctx = await ctxFor(browser, 1280); const page = await ctx.newPage(); const log = []; watch(page, log);
      await page.goto(base + 'method/?ridetest=300', { waitUntil: 'load' }); await sleep(500);
      const rail = () => page.evaluate(() => document.querySelector('.md-rail-n').textContent + ' | ' + document.querySelector('.md-rail-t').textContent);
      const btn = () => page.evaluate(() => [...document.querySelectorAll('.md-btn')].map(b => b.textContent + (b.getAttribute('aria-disabled') === 'true' ? '(off)' : '')).join(' / '));
      const ctlBox = () => page.evaluate(() => JSON.stringify([...document.querySelectorAll('.md-btn')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })));
      let box0 = null;
      P('before start:', await btn(), '|', await rail());
      await press(page, 'b'); P('Pause before start says:', await rail());
      await press(page, 'a'); await sleep(6000); box0 = await ctlBox(); P('riding:', await btn(), '|', await rail());
      await press(page, 'b'); const y0 = await page.evaluate(() => scrollY); await sleep(1500); const y1 = await page.evaluate(() => scrollY);
      P('paused:', await btn(), '|', await rail(), '| scroll', y0, y1, 'still:', y0 === y1);
      await press(page, 'b'); await sleep(2000); P('resumed:', await btn(), '|', await rail(), '| scroll', y1, '->', await page.evaluate(() => scrollY));
      await page.mouse.move(640, 500); await page.mouse.wheel(0, 900); await sleep(600); P('after wheel:', await btn(), '|', await rail());
      const lit0 = await page.evaluate(() => document.querySelectorAll('.md-arr.md-lit').length);
      await press(page, 'b'); await sleep(3000); const lit1 = await page.evaluate(() => document.querySelectorAll('.md-arr.md-lit').length);
      P('resume after wheel continues from the nearest stop: lit before', lit0, 'after', lit1, '|', await rail());
      await page.mouse.move(2, 300);
      await page.keyboard.press('ArrowDown'); await sleep(300); const a = await rail();
      await page.keyboard.press('ArrowDown'); await sleep(300); const b = await rail();
      await page.keyboard.press('ArrowUp'); await sleep(300); const c = await rail();
      P('arrow keys step station to station:', JSON.stringify([a, b, c]), '| paused:', await btn());
      P('control boxes (left, top, width, height of each button) identical from riding through pause, resume, wheel, arrow keys:', box0 === await ctlBox(), box0);
      await press(page, 'all'); await sleep(500);
      const st = await page.evaluate(() => ({ riding: document.documentElement.classList.contains('md-riding'), unlit: document.querySelectorAll('.md-arr:not(.md-lit)').length, dashed: [...document.querySelectorAll('.md-arr')].filter(a => getComputedStyle(a).borderTopStyle === 'dashed').length, car: !document.querySelector('.md-ride-layer').hidden, anims: document.getAnimations().length }));
      const y2 = await page.evaluate(() => scrollY); await sleep(2500);
      P('See all chapters:', JSON.stringify(st), '|', await rail(), '| scroll still', y2 === await page.evaluate(() => scrollY));
      P('console', log.length ? JSON.stringify(log) : 'clean');
      await ctx.close();
    }
    if (cmd === 'reduced') {
      for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.addInitScript(counter());
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(800);
        const n0 = await page.evaluate(() => ({ anims: document.getAnimations().length, calls: window.__n, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, stepped: document.documentElement.classList.contains('md-stepped') }));
        P(w, 'after load:', JSON.stringify(n0));
        const seq = [];
        const snap = () => page.evaluate(() => { const on = [...document.querySelectorAll('[data-ch]')].filter(e => getComputedStyle(e).display !== 'none'); const c = on[0]; return { shown: on.map(e => e.id).join(','), arrsLit: c ? [...c.querySelectorAll('.md-arr')].filter(a => a.classList.contains('md-lit')).length + '/' + c.querySelectorAll('.md-arr').length : '-', newLit: c ? [...c.querySelectorAll('.md-dgwrap .md-dp.md-new')].filter(a => a.classList.contains('md-lit')).length + '/' + c.querySelectorAll('.md-dgwrap .md-dp.md-new').length : '-', slots: c ? c.querySelectorAll('.md-dgwrap .md-slot').length : 0, rail: document.querySelector('.md-rail-n').textContent + ' | ' + document.querySelector('.md-rail-t').textContent.slice(0, 30), nextOff: document.querySelector('.md-btn[data-act="b"]').getAttribute('aria-disabled') }; });
        seq.push(await snap());
        for (let i = 0; i < 9; i++) { await press(page, 'b'); seq.push(await snap()); }
        P(w, 'Next through every chapter:'); seq.forEach(s => P('  ', JSON.stringify(s)));
        const back = []; for (let i = 0; i < 3; i++) { await press(page, 'a'); back.push((await snap()).shown); }
        P(w, 'Back x3 shows:', JSON.stringify(back));
        const cnt = await page.evaluate(() => ({ anims: document.getAnimations().length, calls: window.__n }));
        P(w, 'after all presses: getAnimations()', cnt.anims, 'calls', JSON.stringify(cnt.calls));
        await press(page, 'all'); const allShown = await page.evaluate(() => [...document.querySelectorAll('[data-ch]')].filter(e => getComputedStyle(e).display !== 'none').length);
        P(w, 'See all chapters shows', allShown, 'of 10; console', log.length ? JSON.stringify(log) : 'clean');
        await ctx.close();
      }
    }
    if (cmd === 'nojs') {
      const src = fs.readFileSync(path.join(ROOT, 'method', 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
      const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
      const leaf = h => dec(h.replace(/<\/?(code|b|i|a|em|span)(\s[^>]*)?>/g, '').replace(/\s+/g, ' ').trim());
      const secs = [...src.matchAll(/<(section|header) id="([\w-]+)"[^>]*data-ch=[\s\S]*?<\/(?:section|header)>/g)];
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false }); const page = await ctx.newPage();
      await page.goto(base + 'method/', { waitUntil: 'load' });
      const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
      let total = 0, missingAll = 0;
      for (const m of secs) {
        const whole = m[0], id = m[2];
        const pieces = [...whole.matchAll(/<(h1|h2|h3|h4|p|dd|dt)(?:\s[^>]*)?>([^<]*(?:<(?:code|b|i|a|em|span)[^>]*>[^<]*<\/(?:code|b|i|a|em|span)>[^<]*)*)<\/(?:h1|h2|h3|h4|p|dd|dt)>/g)].map(x => leaf(x[2])).filter(t => t.length > 3);
        const lis = [...whole.matchAll(/<li>([^<]*(?:<(?:code|b|span)[^>]*>[^<]*<\/(?:code|b|span)>[^<]*)*)<\/li>/g)].map(x => leaf(x[1])).filter(t => t.length > 3);
        const all = pieces.concat(lis);
        const missing = all.filter(t => !text.toLowerCase().includes(t.toLowerCase()));
        total += all.length; missingAll += missing.length;
        P('JS off', id, 'text pieces', all.length, 'missing', missing.length, missing.length ? JSON.stringify(missing.slice(0, 3)) : '');
      }
      P('JS off, all chapters: text pieces', total, 'missing', missingAll);
      const st = await page.evaluate(() => ({ htmlClassJs: document.documentElement.classList.contains('md-js'), controlsShown: getComputedStyle(document.querySelector('.md-ctl')).display !== 'none', barShown: getComputedStyle(document.querySelector('.md-ride-bar')).display !== 'none', chaptersShown: [...document.querySelectorAll('[data-ch]')].filter(e => getComputedStyle(e).display !== 'none').length, dashed: [...document.querySelectorAll('.md-arr')].filter(a => getComputedStyle(a).borderTopStyle === 'dashed').length, displaced: [...document.querySelectorAll('.md-arr, .md-mark')].filter(a => { const t = getComputedStyle(a).translate; return !(t === 'none' || /^0(px)?( 0(px)?)?$/.test(t)); }).length }));
      P('JS off: state', JSON.stringify(st));
      await ctx.close();
    }
    if (cmd === 'redirect') {
      const ctx = await ctxFor(browser, 1280); const page = await ctx.newPage(); const log = []; watch(page, log);
      await page.goto(base + 'tools/design-first/', { waitUntil: 'load' });
      await page.waitForURL(u => u.pathname === '/method/', { timeout: 8000 }).catch(() => {});
      await sleep(800);
      const u = new URL(page.url());
      P('opened /tools/design-first/ and landed on', u.pathname + u.hash, '; adopt chapter top (px below the sticky bars, 0 = flush):', await page.evaluate(`Math.round(document.getElementById('adopt').getBoundingClientRect().top - ${STICKY})`), '; console', log.length ? JSON.stringify(log) : 'clean');
      await ctx.close();
    }
    if (cmd === 'shots') {
      const dir = path.join(HERE, 'shots'); fs.mkdirSync(dir, { recursive: true });
      for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage();
        await page.goto(base + 'method/?ridetest=2400', { waitUntil: 'load' }); await sleep(700);
        await page.screenshot({ path: path.join(dir, `r2-before-${w}.png`) });
        await press(page, 'a');
        for (const [i, s] of [2500, 5000, 5000].entries()) { await sleep(s); await page.screenshot({ path: path.join(dir, `r2-ride-${w}-${i}.png`) }); }
        P('wrote r2 frames at', w); await ctx.close();
      }
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch(e => { console.error('COULD NOT LOOK:', e); process.exit(2); });
