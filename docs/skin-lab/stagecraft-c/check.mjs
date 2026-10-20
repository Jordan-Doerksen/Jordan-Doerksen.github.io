// Headless checks for the nine Stagecraft pages (eight sections + the atlas), adapted from
// method/check.mjs (skin lab D-11, AUTO-06). The shell fetches data/registry.json, so the pages are
// served over `python -m http.server` from the repo root; this script starts and stops that server.
// Run from the repo root:
//   node docs/skin-lab/stagecraft-c/check.mjs                 checks + AFTER shots into shots/
//   node docs/skin-lab/stagecraft-c/check.mjs --shots before  checks + BEFORE shots (run on main's files first)
//   node docs/skin-lab/stagecraft-c/check.mjs --shots none    checks only
//   node docs/skin-lab/stagecraft-c/check.mjs --pages rail,atlas   a subset
//   node docs/skin-lab/stagecraft-c/check.mjs --repo C:/projects/web/jordan-doerksen.github.io --shots none
//                                                             the same checks on another checkout's files (read only)
//   --port 4532   a different port, so two runs can go at once
// The comparison page beside this script is checked too (width at both widths; every shot loaded).
// Exit 0 = every check passed. 1 = at least one issue. 2 = could not look (Playwright or the server missing).
// Exit 2 is NOT a pass. Playwright is loaded from an existing install (the path in
// scripts/front_probe.config.json); this folder gets no package (GATE-03).
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = (name, dflt) => { const i = process.argv.indexOf(name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const REPO = path.resolve(argv('--repo', path.resolve(HERE, '..', '..', '..')));
const SHOTS = path.join(HERE, 'shots');
const cfg = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'front_probe.config.json'), 'utf8'));
const WIDTHS = [390, 1280];
const THEMES = ['dark', 'light'];
const PORT = Number(process.argv[process.argv.indexOf('--port') + 1]) || 4531; // --port <n> to run two instances at once
const GUTTER_PX = 8;
const CONTRAST = { text: 4.5, large: 3.0 };
const MAX_TABS = 120; // the widest real page has about 30 stops; reaching the cap means the walk never ended
// The nine pages. `hover` is the element hovered under reduced motion; `noscript` says what the page
// promises with scripts off: 'content' = the hand-written prose is there; 'notice' = the page says it
// needs a script and the chrome still routes home (the atlas renders from data, by design D-A05).
// `scrollers` names sideways-scroll boxes that exist on main today and are allowed by D-A09's survival
// rule ("the diagram scrolls inside its well and the page never scrolls sideways"); the page itself
// must still not scroll. Anything else that scrolls sideways is a failure (WEB-14).
const ALL_PAGES = [
  { tag: 'rail', url: '/rail/', hover: '.row', noscript: 'content' },
  { tag: 'games', url: '/games/', hover: '.row', noscript: 'content' },
  { tag: 'trading', url: '/trading/', hover: '.row', noscript: 'content' },
  { tag: 'studio', url: '/studio/', hover: '.row', noscript: 'content' },
  { tag: 'signals', url: '/signals/', hover: '.row', noscript: 'content' },
  { tag: 'bots', url: '/bots/', hover: '.row', noscript: 'content' },
  { tag: 'tools', url: '/tools/', hover: '.row', noscript: 'content' },
  { tag: 'navigation', url: '/navigation/', hover: '.row', noscript: 'content' },
  { tag: 'atlas', url: '/atlas/?p=clear-board', hover: '.peer', noscript: 'notice', wait: '#atlas h1', scrollers: ['div.diagram-well'] },
];

const shotMode = argv('--shots', 'after');
const only = argv('--pages', '').split(',').filter(Boolean);
const INDEX_URL = '/docs/skin-lab/stagecraft-c/index.html';
const PAGES = only.length ? ALL_PAGES.filter(p => only.includes(p.tag)) : ALL_PAGES;

let chromium;
try { chromium = createRequire(cfg.playwright_from)('playwright').chromium; }
catch (e) { console.log('UNKNOWN  Playwright did not load from ' + cfg.playwright_from + ': ' + String(e).split('\n')[0]); process.exit(2); }

// ---- the static server: python -m http.server from the repo root ----
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: REPO, stdio: 'ignore' });
const BASE = 'http://127.0.0.1:' + PORT;
let up = false;
for (let i = 0; i < 50 && !up; i++) {
  try { const r = await fetch(BASE + '/rail/'); up = r.ok; } catch { await new Promise(r => setTimeout(r, 100)); }
}
if (!up) { console.log('UNKNOWN  python -m http.server did not answer on port ' + PORT); server.kill(); process.exit(2); }
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

// ---- in-page functions (serialised by Playwright; each is self-contained) ----
const inPage = {
  // The widest element on the page, and whatever scrolls sideways (WEB-14).
  widest(allowed) {
    const d = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    let widest = { name: 'none', right: 0, width: 0 };
    const scrollers = [];
    const inside = (allowed || []).map(a => a.replace(/^[a-z]+\./, '.')).join(',');
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      if (inside && el.parentElement && el.parentElement.closest(inside)) continue; // the inside of an allowed scroll box scrolls by design
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const right = Math.round(r.right + scrollX);
      if (right > widest.right) widest = { name: d(el), right, width: Math.round(r.width) };
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) scrollers.push(d(el));
    }
    return { widest, docScrollWidth: document.documentElement.scrollWidth, innerWidth, scrollers };
  },
  // A margin between on-screen text and all four window edges (WEB-14). Bottom counts when the page fits the window or the element is fixed.
  gutter(px) {
    const issues = [];
    const fits = document.documentElement.scrollHeight <= innerHeight + 1;
    const d = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    let checked = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      if (el.closest('.skip, script, style, svg, .veil')) continue;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      checked++;
      const near = [];
      if (r.left < px) near.push('left ' + Math.round(r.left) + 'px');
      if (innerWidth - r.right < px) near.push('right ' + Math.round(innerWidth - r.right) + 'px');
      if (r.top >= 0 && r.top < px) near.push('top ' + Math.round(r.top) + 'px');
      if ((fits || getComputedStyle(el).position === 'fixed') && r.bottom <= innerHeight && innerHeight - r.bottom < px) near.push('bottom ' + Math.round(innerHeight - r.bottom) + 'px');
      if (near.length) issues.push(d(el) + ' "' + el.textContent.trim().slice(0, 20) + '" is too close to the window edge: ' + near.join(', '));
    }
    return { issues: issues.slice(0, 12), checked };
  },
  // The page gutter as rendered: the first .wrap column's padding, and its width against the window.
  pageGutter() {
    const main = document.querySelector('main .wrap, main.wrap, .wrap');
    const cs = getComputedStyle(main);
    return { left: Math.round(parseFloat(cs.paddingLeft)), right: Math.round(parseFloat(cs.paddingRight)), mainWidth: Math.round(main.getBoundingClientRect().width), innerWidth };
  },
  // WCAG 2.1 text contrast from computed colours, composited through every ancestor's background.
  contrast(opts) {
    const issues = [];
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const rgba = c => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const x = g.getImageData(0, 0, 1, 1).data; return [x[0], x[1], x[2], x[3] / 255]; };
    const over = (f, b) => [f[0] * f[3] + b[0] * (1 - f[3]), f[1] * f[3] + b[1] * (1 - f[3]), f[2] * f[3] + b[2] * (1 - f[3]), 1];
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const ground = el => {
      const layers = []; let unknown = false;
      for (let a = el; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.backgroundImage !== 'none') unknown = true;
        const c = rgba(cs.backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 1) break;
      }
      let base = [255, 255, 255, 1];
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      return { base, unknown };
    };
    const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    let unmeasurable = 0, measured = 0, lowest = { r: 99, name: '' };
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (el.closest('[aria-hidden="true"], script, style, noscript, svg')) continue;
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      if (cs.color === 'rgba(0, 0, 0, 0)' || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue; // outlined numerals carry no fill
      const gr = ground(el);
      if (gr.unknown) { unmeasurable++; continue; }
      const fg = over(rgba(cs.color), gr.base);
      const px = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10) || 400;
      const need = (px >= 24 || (px >= 18.66 && w >= 700)) ? opts.large : opts.text;
      const r = ratio(fg, gr.base);
      measured++;
      if (r < lowest.r) lowest = { r, name: name(el) + ' "' + el.textContent.trim().slice(0, 24) + '"' };
      if (r < need) issues.push('text ' + r.toFixed(2) + ':1, needs ' + need + ': ' + name(el) + ' "' + el.textContent.trim().slice(0, 28) + '"');
    }
    return { issues: issues.slice(0, 14), measured, unmeasurable, lowest: { ratio: lowest.r.toFixed(2), name: lowest.name } };
  },
  // Every running animation or transition right now.
  running() {
    return document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty || 'unnamed') + (a.effect && a.effect.target ? ' on ' + a.effect.target.tagName.toLowerCase() + '.' + String(a.effect.target.className).split(' ')[0] : ''));
  },
  // With no script: what the page promises is there, and nothing that carries text is hidden or displaced.
  contentPresent(mode) {
    const issues = [];
    const nav = document.querySelectorAll('.chrome-nav a, footer a').length;
    if (nav < 3) issues.push('fewer than three navigation links');
    const main = document.querySelector('main') || document.body;
    const text = main.innerText.trim();
    let h1 = document.querySelector('h1');
    if (mode === 'content') {
      if (!h1 || !h1.textContent.trim()) issues.push('no h1 with text');
      if (text.length < 200) issues.push('the page has almost no text without a script');
      const ns = document.querySelector('.index noscript, .index .index-empty');
      if (!ns) issues.push('the list has no no-script notice');
    } else {
      const notice = document.querySelector('#atlas noscript, .atlas-missing');
      if (!notice || !/JavaScript/.test(notice.textContent)) issues.push('no no-script notice in #atlas');
      const home = document.querySelector('.chrome .mark');
      if (!home || !home.getAttribute('href')) issues.push('no route home in the chrome');
    }
    for (const el of document.querySelectorAll('main *')) {
      const cs = getComputedStyle(el);
      if (cs.opacity === '0' && el.textContent.trim() && !el.closest('.veil')) issues.push('hidden without a script: ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
    }
    return { issues, textLength: text.length, h1: h1 ? h1.innerText.trim().replace(/\s+/g, ' ') : '(none)' };
  },
  focusState() {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return {
      name: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
      text: (el.textContent || '').trim().slice(0, 24), href: el.getAttribute('href'),
      // a ring counts only on an element the viewer can see: an outline inside an opacity-0 box is not visible
      ring: ((cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none') && (!el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })),
      inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    };
  },
};

let fails = 0;
const say = (ok, label, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ': ' + detail : '')); if (!ok) fails++; };
// The light flip is the html.light class (there is no toggle in js/shell; the class is set by hand).
// An init script can run before <html> exists, so it waits for it.
const lightInit = () => {
  const apply = () => { if (document.documentElement) { document.documentElement.classList.add('light'); return true; } return false; };
  if (!apply()) new MutationObserver((m, o) => { if (apply()) o.disconnect(); }).observe(document, { childList: true });
};
// html{scroll-behavior:smooth} makes the focus scroll asynchronous: wait until scrollY settles before measuring.
const settle = async page => { let last = -1; for (let i = 0; i < 12; i++) { const y = await page.evaluate(() => scrollY); if (y === last) return; last = y; await page.waitForTimeout(60); } };

const browser = await chromium.launch({ headless: true });
if (shotMode !== 'none') fs.mkdirSync(SHOTS, { recursive: true });

for (const pd of PAGES) {
  const url = BASE + pd.url;
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const tag = pd.tag + ' @' + width + ' ' + theme;
      // 1. normal: width, gutter, contrast, keyboard, console
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      if (theme === 'light') await ctx.addInitScript(lightInit);
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('script error: ' + String(e).split('\n')[0]));
      page.on('console', m => { if (m.type() === 'error') errs.push('console error: ' + m.text().slice(0, 120)); });
      await page.goto(url, { waitUntil: 'load' });
      if (pd.wait) { try { await page.waitForSelector(pd.wait, { timeout: 8000 }); } catch { errs.push('rendered content did not appear: ' + pd.wait); } }
      await page.waitForTimeout(700);
      // the index rows arrive from the registry; the list must have rendered (or stated it could not)
      const rows = await page.evaluate(() => ({ rows: document.querySelectorAll('.row').length, empty: !!document.querySelector('.index-empty') }));
      if (pd.noscript === 'content' && rows.rows === 0 && !rows.empty) errs.push('the index rendered no rows and no notice');
      const w = await page.evaluate(inPage.widest, pd.scrollers || []);
      const allowed = pd.scrollers || [];
      const badScroll = w.scrollers.filter(s => !allowed.includes(s));
      const okScroll = w.scrollers.filter(s => allowed.includes(s));
      say(w.widest.right <= width && w.docScrollWidth <= width + 1 && badScroll.length === 0, tag + ' width', 'widest element ' + w.widest.name + ' right edge ' + w.widest.right + 'px of ' + width + 'px window; document scrollWidth ' + w.docScrollWidth + 'px; sideways scroll boxes: ' + (badScroll.length ? badScroll.join(', ') : 'none') + (okScroll.length ? ' (allowed, pre-existing on main under D-A09: ' + okScroll.join(', ') + ')' : ''));
      const g = await page.evaluate(inPage.gutter, GUTTER_PX);
      const pg = await page.evaluate(inPage.pageGutter);
      say(g.issues.length === 0 && pg.left >= GUTTER_PX && pg.right >= GUTTER_PX && pg.mainWidth === width, tag + ' gutter', 'main column ' + pg.mainWidth + 'px wide of ' + pg.innerWidth + 'px (full width), page gutter left ' + pg.left + 'px right ' + pg.right + 'px; ' + g.checked + ' on-screen text elements checked against the ' + GUTTER_PX + 'px edge rule' + (g.issues.length ? '; ' + g.issues.join(' | ') : ''));
      const c = await page.evaluate(inPage.contrast, CONTRAST);
      say(c.issues.length === 0, tag + ' contrast', c.measured + ' text elements measured, lowest ' + c.lowest.ratio + ':1 at ' + c.lowest.name + ', ' + c.unmeasurable + ' unmeasurable' + (c.issues.length ? '; ' + c.issues.join(' | ') : ''));
      // keyboard: first stop is the skip link; every stop has a ring and is on screen
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.keyboard.press('Tab'); await settle(page);
      const first = await page.evaluate(inPage.focusState);
      const stops = []; const kb = [];
      if (!first || !(first.href || '').startsWith('#') || !/skip/i.test(first.text)) kb.push('the first Tab stop is not a skip link: ' + (first ? first.name + ' "' + first.text + '"' : 'nothing took focus'));
      let f = first, n = 0;
      while (f && n < MAX_TABS) {
        stops.push(f.name);
        if (!f.ring) kb.push('no visible focus ring on ' + f.name + ' "' + f.text + '"');
        if (!f.inView) kb.push('focus left the screen at ' + f.name + ' "' + f.text + '"');
        await page.keyboard.press('Tab'); n++; await settle(page);
        f = await page.evaluate(inPage.focusState);
        if (f && f.name === stops[0] && n > 1) break;
      }
      const kinds = [...new Set(stops)];
      if (n >= MAX_TABS) kb.push('the walk never ended: ' + MAX_TABS + ' Tabs and focus is still on ' + (f ? f.name : '?') + ' (a focus trap)');
      say(kb.length === 0 && stops.length >= 5, tag + ' keyboard', stops.length + ' tab stops, all with a visible ring and on screen; kinds: ' + kinds.join(' > ') + (kb.length ? '; ' + kb.slice(0, 6).join(' | ') : ''));
      say(errs.length === 0, tag + ' console', errs.length ? errs.join(' | ') : 'no script or console errors');
      if (shotMode !== 'none' && theme === 'dark') {
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(800);
        const out = path.join(SHOTS, pd.tag + '-' + shotMode + '-' + width + '.png');
        await page.screenshot({ path: out, fullPage: true });
        console.log('SHOT ' + path.relative(REPO, out).replace(/\\/g, '/'));
      }
      await ctx.close();
    }

    // 2. reduced motion: nothing animates after scrolling the whole page and hovering a row
    const tagR = pd.tag + ' @' + width;
    const ctxR = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const pageR = await ctxR.newPage();
    await pageR.goto(url, { waitUntil: 'load' });
    if (pd.wait) { try { await pageR.waitForSelector(pd.wait, { timeout: 8000 }); } catch {} }
    await pageR.waitForTimeout(400);
    const flag = await pageR.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    await pageR.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
    const node = await pageR.$(pd.hover);
    if (node) { try { await node.hover({ timeout: 2000 }); } catch {} }
    await pageR.waitForTimeout(150);
    const runningR = await pageR.evaluate(inPage.running);
    const total = await pageR.evaluate(() => document.getAnimations().length);
    say(flag && runningR.length === 0, tagR + ' reduced motion', 'prefers-reduced-motion: reduce emulated = ' + flag + '; after a full scroll and a hover on ' + pd.hover + ', document.getAnimations() = ' + total + ', running = ' + runningR.length + (runningR.length ? ' (' + runningR.slice(0, 5).join(', ') + ')' : ''));
    await ctxR.close();

    // 3. no script: what the page promises without a script is there, and nothing is hidden
    const ctxN = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', javaScriptEnabled: false });
    const pageN = await ctxN.newPage();
    await pageN.goto(url, { waitUntil: 'load' });
    const cp = await pageN.evaluate(inPage.contentPresent, pd.noscript);
    say(cp.issues.length === 0, tagR + ' no script', 'h1 "' + cp.h1 + '", ' + cp.textLength + ' characters of main text, ' + (pd.noscript === 'content' ? 'the prose and the list notice present' : 'the atlas no-script notice and the route home present') + ', nothing hidden' + (cp.issues.length ? '; ' + cp.issues.join(' | ') : ''));
    await ctxN.close();
  }
}
// the comparison page: no sideways scroll at either width, and all 36 shots are real files that loaded
if (!only.length && fs.existsSync(path.join(REPO, 'docs', 'skin-lab', 'stagecraft-c', 'index.html'))) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + INDEX_URL, { waitUntil: 'load' });
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 60000 }).catch(() => {});
    const w = await page.evaluate(inPage.widest, []);
    say(w.widest.right <= width && w.docScrollWidth <= width + 1 && w.scrollers.length === 0, 'index @' + width + ' width', 'widest element ' + w.widest.name + ' right edge ' + w.widest.right + 'px of ' + width + 'px; document scrollWidth ' + w.docScrollWidth + 'px; sideways scroll boxes: ' + (w.scrollers.length ? w.scrollers.join(', ') : 'none'));
    const im = await page.evaluate(() => { const all = [...document.images]; const bad = all.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src')); return { total: all.length, bad, pairs: document.querySelectorAll('.lab-page').length }; });
    say(im.bad.length === 0 && im.total === 36 && im.pairs === 9, 'index @' + width + ' shots', im.pairs + ' pages, ' + im.total + ' shots, ' + (im.total - im.bad.length) + ' loaded' + (im.bad.length ? '; missing: ' + im.bad.join(', ') : ''));
    await ctx.close();
  }
}
await browser.close();
stop();
console.log(fails === 0 ? 'ALL PASS' : fails + ' FAIL');
process.exit(fails === 0 ? 0 : 1);
