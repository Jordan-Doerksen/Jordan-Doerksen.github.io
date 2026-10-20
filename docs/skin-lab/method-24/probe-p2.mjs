// probe-p2.mjs: the headless checks and the screenshots for the one method page (item 24 phase 2, CR-28).
// Adapted from probe.mjs (same helpers, same bars, nothing weakened), pointed at /method/ instead of the three lab pages.
// Playwright loads from the map-reading-trainer package, as scripts/front_probe.mjs does (GATE-03: no new package).
// Usage: node docs/skin-lab/method-24/probe-p2.mjs <check|reduced|nojs|shots|redirect>
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
// scroll chapter id to progress p the way a visitor can: by scrolling
async function scrollChapter(page, id, p) {
  await page.evaluate(([id, p]) => {
    const el = document.getElementById(id), track = el.querySelector('.md-track'), pin = el.querySelector('.md-pin');
    if (!track) { scrollTo(0, el.getBoundingClientRect().top + scrollY - (id === 'md-top' ? 0 : 110) + p * 200); return; }
    const pinTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--md-pin-top')) || 0;
    const vh = innerHeight;
    if (el.classList.contains('md-pinned')) { scrollTo(0, track.getBoundingClientRect().top + scrollY - pinTop + p * (track.offsetHeight - pin.offsetHeight)); }
    else { const h = pin.getBoundingClientRect().height, top0 = pin.getBoundingClientRect().top + scrollY; scrollTo(0, top0 - 0.9 * vh + p * (0.5 * vh + h)); }
  }, [id, p]);
}

async function main() {
  const { srv, base } = await serve();
  const browser = await chromium.launch();
  const out = [];
  const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };
  try {
    if (cmd === 'check') {
      for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(700);
        const res = { w, chapters: [], pinned: await page.evaluate(() => [...document.querySelectorAll('.md-chapter.md-pinned')].map(e => e.id)) };
        for (const id of CH) {
          await scrollChapter(page, id, 0.5); await sleep(500);
          const L = await page.evaluate(LAYOUT), C = await page.evaluate(CONTRAST);
          res.chapters.push({ id, scrollWidth: L.scrollWidth, widest: L.widestRight, leftmost: L.leftmost, gutterL: L.gutterLeft, gutterR: L.gutterRight, contrastMin: C.min.ratio, contrastText: C.min.text });
        }
        await scrollChapter(page, 'adopt', 1); await sleep(500); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await sleep(400);
        const Lend = await page.evaluate(LAYOUT); res.endEdge = { bottomEdge: Lend.bottomEdge, topEdge: Lend.topEdge };
        // keyboard: every control reachable by Tab, each with a visible ring (the chapter menu is closed, so its links are not focusable yet)
        await page.reload({ waitUntil: 'load' }); await sleep(700);
        const want = await page.evaluate(() => [...document.querySelectorAll('a[href], summary, [tabindex="0"]')].filter(e => { const d = e.closest('details:not([open])'); if (d && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden') || e.classList.contains('md-skip'); }).length);
        const seen = [];
        for (let i = 0; i < want; i++) {
          await page.keyboard.press('Tab');
          seen.push(await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { el: e.tagName.toLowerCase() + '.' + (e.className || e.id) + (e.getAttribute('aria-label') ? ' [' + e.getAttribute('aria-label') + ']' : e.textContent ? ' "' + e.textContent.trim().slice(0, 12) + '"' : ''), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 }; }));
        }
        const uniq = new Set(seen.map(s => s.el));
        res.keyboard = { focusable: want, reachedUnique: uniq.size, allRing: seen.every(s => s.ring), firstSix: [...uniq].slice(0, 6) };
        // the chapter menu opens from the keyboard and its links take a ring
        await page.reload({ waitUntil: 'load' }); await sleep(500);
        await page.focus('.md-menu > summary'); await page.keyboard.press('Enter'); await sleep(200);
        const menu = await page.evaluate(() => ({ open: document.querySelector('.md-menu').open, links: [...document.querySelectorAll('.md-menu-list a')].filter(e => e.getBoundingClientRect().width > 0).length, panelRight: Math.round(document.querySelector('.md-menu-list').getBoundingClientRect().right), vw: innerWidth }));
        res.menu = menu;
        res.console = log.length ? log : 'clean';
        P(JSON.stringify(res, null, 1));
        await ctx.close();
      }
    }
    if (cmd === 'reduced') {
      for (const w of [390, 1280]) {
        const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage(); const log = []; watch(page, log);
        await page.addInitScript(counter());
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(500);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y <= H; y += 300) { await page.evaluate(y => scrollTo(0, y), y); await sleep(50); }
        await sleep(1500);
        const r = await page.evaluate(() => {
          const per = {};
          document.querySelectorAll('[data-ch]').forEach(s => { const a = s.querySelectorAll('.md-arr'), m = s.querySelectorAll('.md-mark'); per[s.id] = [a.length, [...a].filter(x => x.classList.contains('md-lit')).length, m.length, [...m].filter(x => x.classList.contains('md-lit')).length]; });
          const adopt = document.querySelectorAll('#adopt .md-dgwrap .md-dp');
          return { animations: document.getAnimations().length, calls: window.__n, reducedMatches: matchMedia('(prefers-reduced-motion: reduce)').matches, perChapter_arrivals_lit_marks_lit: per,
            adoptDiagram: { parts: adopt.length, slots: [...adopt].filter(x => x.classList.contains('md-slot')).length, labelled: [...adopt].filter(x => x.textContent.trim()).length },
            outlineSlots: document.querySelectorAll('#md-top .md-dp.md-slot').length, outlineParts: document.querySelectorAll('#md-top .md-dp').length,
            pinned: document.querySelectorAll('.md-chapter.md-pinned').length, meterScale: getComputedStyle(document.documentElement).getPropertyValue('--md-p') };
        });
        P(w, JSON.stringify(r), log.length ? JSON.stringify(log) : 'console clean');
        await ctx.close();
      }
    }
    if (cmd === 'nojs') {
      const src = fs.readFileSync(path.join(ROOT, 'method', 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
      const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
      // leaf text only: inline tags vanish, block tags break; pre blocks are checked by their first line
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
        const missing = all.filter(t => !text.toLowerCase().includes(t.toLowerCase())); // some labels are uppercased by CSS
        total += all.length; missingAll += missing.length;
        P('JS off', id, 'text pieces', all.length, 'missing', missing.length, missing.length ? JSON.stringify(missing.slice(0, 3)) : '');
      }
      P('JS off, all chapters: text pieces', total, 'missing', missingAll);
      const vis = await page.evaluate(() => [...document.querySelectorAll('.md-arr, .md-mark')].map(g => { const r = g.getBoundingClientRect(); const cs = getComputedStyle(g); const t = cs.translate; return r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && (t === 'none' || /^0(px)?( 0(px)?)?$/.test(t)) && cs.borderTopStyle === 'solid'; }));
      P('JS off: arrivals and marks at rest (visible, solid, no offset):', vis.filter(Boolean).length, 'of', vis.length, '; html.md-js:', await page.evaluate(() => document.documentElement.classList.contains('md-js')));
      await ctx.close();
    }
    if (cmd === 'shots') {
      const dir = path.join(HERE, 'shots'); fs.mkdirSync(dir, { recursive: true });
      for (const w of [1280, 390]) {
        const ctx = await ctxFor(browser, w, { ctx: { reducedMotion: 'reduce' } }); const page = await ctx.newPage();
        await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(700);
        await page.screenshot({ path: path.join(dir, `p2-still-${w}.png`), fullPage: true });
        P('wrote', `p2-still-${w}.png`); await ctx.close();
      }
      const ctx = await ctxFor(browser, 1280, { h: 900 }); const page = await ctx.newPage();
      await page.goto(base + 'method/', { waitUntil: 'load' }); await sleep(900);
      const frames = [];
      for (let n = 0; n < CH.length; n++) {
        await scrollChapter(page, CH[n], n === 0 ? 0 : 0.55); await sleep(1500);
        const f = path.join(dir, `p2-${String(n).padStart(2, '0')}-${CH[n].replace('md-', '')}.png`); await page.screenshot({ path: f }); frames.push(f); P('wrote', path.basename(f));
      }
      await ctx.close();
      const sctx = await browser.newContext({ viewport: { width: 1920, height: 100 } }); const sp = await sctx.newPage();
      const imgs = frames.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:19.8%;display:block">`).join('');
      await sp.setContent(`<body style="margin:0;background:#061527;display:flex;flex-wrap:wrap;gap:0.25%;align-items:flex-start">${imgs}</body>`);
      const h = await sp.evaluate(() => document.body.scrollHeight);
      await sp.setViewportSize({ width: 1920, height: h });
      await sp.screenshot({ path: path.join(dir, 'p2-strip.png') }); P('wrote p2-strip.png'); await sctx.close();
    }
    if (cmd === 'redirect') {
      const ctx = await ctxFor(browser, 1280); const page = await ctx.newPage(); const log = []; watch(page, log);
      await page.goto(base + 'tools/design-first/', { waitUntil: 'load' });
      await page.waitForURL(u => u.pathname === '/method/', { timeout: 8000 }).catch(() => {});
      await sleep(600);
      const u = new URL(page.url());
      P('opened /tools/design-first/ and landed on', u.pathname + u.hash, '; at the adopt chapter:', await page.evaluate(() => Math.abs(document.getElementById('adopt').getBoundingClientRect().top - (document.querySelector('.md-bar').offsetHeight + document.querySelector('.md-rail').offsetHeight)) < 40));
      const stub = fs.readFileSync(path.join(ROOT, 'tools', 'design-first', 'index.html'), 'utf8');
      const g = re => (stub.match(re) || [, null])[1];
      P('stub, read from the file (a scripts-off browser follows the refresh too):', JSON.stringify({ refresh: g(/http-equiv="refresh" content="([^"]+)"/), canonical: g(/rel="canonical" href="([^"]+)"/), plainLink: g(/<a href="[^"]*method[^"]*">([^<]+)<\/a>/), script: /<script/.test(stub) }));
      P('console', log.length ? JSON.stringify(log) : 'clean');
      await ctx.close();
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch(e => { console.error('COULD NOT LOOK:', e); process.exit(2); });
