// Headless checks for the live /method/ page (skin lab D-11, AUTO-06), a copy of
// docs/skin-lab/method/check.mjs pointed at this folder so /method/ stands alone. Run from the repo root:
//   node method/check.mjs            the page at 390 and 1280, with screenshots into docs/skin-lab/method/shots/
//   node method/check.mjs --no-shots  checks only
// Exit 0 = every check passed. 1 = at least one issue. 2 = could not look (Playwright missing).
// Exit 2 is NOT a pass. Playwright is loaded from an existing install (the path in
// scripts/front_probe.config.json); this folder gets no package (GATE-03).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SHOTS = path.join(REPO, 'docs', 'skin-lab', 'method', 'shots');
const cfg = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'front_probe.config.json'), 'utf8'));
const WIDTHS = [390, 1280];
const PAGES = [{ tag: 'method', file: path.join(HERE, 'index.html') }];
const GUTTER_PX = 8;
const CONTRAST = { text: 4.5, large: 3.0 };
const shots = !process.argv.includes('--no-shots');

let chromium;
try { chromium = createRequire(cfg.playwright_from)('playwright').chromium; }
catch (e) { console.log('UNKNOWN  Playwright did not load from ' + cfg.playwright_from + ': ' + String(e).split('\n')[0]); process.exit(2); }

// ---- in-page functions (serialised by Playwright; each is self-contained) ----
const inPage = {
  // The widest element on the page, and whether anything scrolls sideways (WEB-14).
  widest() {
    const d = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    let widest = { name: 'none', right: 0, width: 0 };
    const scrollers = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
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
      if (el.closest('.md-skip, script, style, svg')) continue;
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
  // The page gutter as rendered: the left edge of the main column and the right edge of its content, at the top of the page.
  pageGutter() {
    const main = document.querySelector('.md-main');
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
      if (el.closest('[aria-hidden="true"], script, style, noscript, .md-skip')) continue;
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
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
  // With no script: the content is there and nothing that carries text is hidden or displaced.
  contentPresent() {
    const issues = [];
    const h1 = document.querySelector('h1');
    if (!h1 || !h1.textContent.trim()) issues.push('no h1 with text');
    if (document.querySelectorAll('nav a').length < 3) issues.push('fewer than three navigation links');
    const main = document.querySelector('main') || document.body;
    if (main.innerText.trim().length < 200) issues.push('the page has almost no text without a script');
    let displaced = 0;
    for (const el of document.querySelectorAll('.md-rv')) { const cs = getComputedStyle(el); if (cs.translate !== 'none' && cs.translate !== '0px' && cs.translate !== '0px 0px') displaced++; if (cs.opacity === '0') issues.push('hidden without a script: ' + el.className); }
    if (displaced) issues.push(displaced + ' reveal blocks are displaced without a script');
    return { issues, textLength: main.innerText.trim().length, h1: h1 ? h1.innerText.trim().replace(/\s+/g, ' ') : '' };
  },
  focusState() {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return {
      name: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
      text: (el.textContent || '').trim().slice(0, 24), href: el.getAttribute('href'),
      ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
      inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    };
  },
};

let fails = 0;
const say = (ok, label, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ': ' + detail : '')); if (!ok) fails++; };

const browser = await chromium.launch({ headless: true });
for (const pd of PAGES) {
  const url = pathToFileURL(pd.file).href;
  // the Home back-link resolves to a file on disk at this depth (the page opens from file:// too)
  const home = fs.readFileSync(pd.file, 'utf8').match(/class="md-home" href="([^"]+)"/);
  const homePath = home ? path.resolve(path.dirname(pd.file), home[1]) : '';
  say(!!home && fs.existsSync(homePath), pd.tag + ' home link', home ? 'href="' + home[1] + '" resolves to ' + path.relative(REPO, homePath).replace(/\\/g, '/') + (fs.existsSync(homePath) ? ' (exists)' : ' (MISSING)') : 'no Home link found');
  for (const width of WIDTHS) {
    const tag = pd.tag + ' @' + width;
    // 1. normal: width, gutter, contrast, keyboard
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('script error: ' + String(e).split('\n')[0]));
    page.on('console', m => { if (m.type() === 'error') errs.push('console error: ' + m.text().slice(0, 120)); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    const w = await page.evaluate(inPage.widest);
    say(w.widest.right <= width && w.docScrollWidth <= width + 1 && w.scrollers.length === 0, tag + ' width', 'widest element ' + w.widest.name + ' right edge ' + w.widest.right + 'px of ' + width + 'px window; document scrollWidth ' + w.docScrollWidth + 'px; sideways scroll boxes: ' + (w.scrollers.length ? w.scrollers.join(', ') : 'none'));
    const g = await page.evaluate(inPage.gutter, GUTTER_PX);
    const pg = await page.evaluate(inPage.pageGutter);
    say(g.issues.length === 0 && pg.left >= GUTTER_PX && pg.right >= GUTTER_PX && pg.mainWidth === width, tag + ' gutter', 'main column ' + pg.mainWidth + 'px wide of ' + pg.innerWidth + 'px (full width), page gutter left ' + pg.left + 'px right ' + pg.right + 'px; ' + g.checked + ' on-screen text elements checked against the ' + GUTTER_PX + 'px edge rule' + (g.issues.length ? '; ' + g.issues.join(' | ') : ''));
    const c = await page.evaluate(inPage.contrast, CONTRAST);
    say(c.issues.length === 0, tag + ' contrast', c.measured + ' text elements measured, lowest ' + c.lowest.ratio + ':1 at ' + c.lowest.name + ', ' + c.unmeasurable + ' unmeasurable' + (c.issues.length ? '; ' + c.issues.join(' | ') : ''));
    // keyboard: first stop is the skip link; every stop has a ring and is on screen
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press('Tab');
    const first = await page.evaluate(inPage.focusState);
    const stops = []; const kb = [];
    if (!first || !(first.href || '').startsWith('#') || !/skip/i.test(first.text)) kb.push('the first Tab stop is not a skip link: ' + (first ? first.name + ' "' + first.text + '"' : 'nothing took focus'));
    let f = first, n = 0;
    while (f && n < 40) {
      stops.push(f.name);
      if (!f.ring) kb.push('no visible focus ring on ' + f.name + ' "' + f.text + '"');
      if (!f.inView) kb.push('focus left the screen at ' + f.name + ' "' + f.text + '"');
      await page.keyboard.press('Tab'); n++;
      f = await page.evaluate(inPage.focusState);
      if (f && f.name === stops[0] && n > 1) break;
    }
    say(kb.length === 0, tag + ' keyboard', stops.length + ' tab stops, all with a visible ring and on screen: ' + stops.join(' > ') + (kb.length ? '; ' + kb.join(' | ') : ''));
    say(errs.length === 0, tag + ' console', errs.length ? errs.join(' | ') : 'no script or console errors');
    if (shots) {
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(700);
      const out = path.join(SHOTS, pd.tag + '-' + width + '.png');
      await page.screenshot({ path: out, fullPage: true });
      console.log('SHOT ' + path.relative(REPO, out).replace(/\\/g, '/'));
    }
    await ctx.close();

    // 2. reduced motion: nothing animates after scrolling the whole page and hovering a panel
    const ctxR = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    const pageR = await ctxR.newPage();
    await pageR.goto(url, { waitUntil: 'load' });
    await pageR.waitForTimeout(300);
    const flag = await pageR.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    await pageR.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
    const node = await pageR.$('.md-node');
    if (node) { await node.hover(); }
    await pageR.waitForTimeout(100);
    const runningR = await pageR.evaluate(inPage.running);
    const total = await pageR.evaluate(() => document.getAnimations().length);
    say(flag && runningR.length === 0, tag + ' reduced motion', 'prefers-reduced-motion: reduce emulated = ' + flag + '; after a full scroll and a hover, document.getAnimations() = ' + total + ', running = ' + runningR.length + (runningR.length ? ' (' + runningR.join(', ') + ')' : ''));
    await ctxR.close();

    // 3. no script: the content is complete and at rest
    const ctxN = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark', javaScriptEnabled: false });
    const pageN = await ctxN.newPage();
    await pageN.goto(url, { waitUntil: 'load' });
    const cp = await pageN.evaluate(inPage.contentPresent);
    say(cp.issues.length === 0, tag + ' no script', 'h1 "' + cp.h1 + '", ' + cp.textLength + ' characters of main text, nothing hidden or displaced' + (cp.issues.length ? '; ' + cp.issues.join(' | ') : ''));
    await ctxN.close();
  }
}
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : fails + ' FAIL');
process.exit(fails === 0 ? 0 : 1);
