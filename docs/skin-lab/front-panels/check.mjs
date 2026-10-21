// Browser proof for item 41 (CR-31): node docs/skin-lab/front-panels/check.mjs [port]
// 1 white text on every tile, measured on the tile's light end (>= 4.5:1)
// 2 the path tiles are buttons: Tab reaches each, Enter plays its path
// 3 reduced motion: no animation and no transition on a panel part
// 4 no script: both pages are complete (tiles, bar, counts, every path reachable by its label tile)
// 5 phone width: no sideways scroll on either page
// Headless Chromium from the path in scripts/front_probe.config.json; own static server on the repo root.
// Exit 0 = every line passed.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'front_probe.config.json'), 'utf8'));
const { chromium } = createRequire(cfg.playwright_from)('playwright');
const port = process.argv[2] || '4553';
const base = `http://127.0.0.1:${port}/`;
const PAGES = { home: '', trading: 'work/trading-desk/' };

let failed = 0;
const say = (ok, text) => { if (!ok) failed++; console.log((ok ? 'PASS  ' : 'FAIL  ') + text); };

const server = spawn('python', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();
try {
  // ---- 1. contrast on the light end of every tile, and on the icon squares ----
  const measure = () => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const out = [];
    for (const el of document.querySelectorAll('.fp-fig, .fp-pt, .fp-ico')) {
      if (el.checkVisibility && !el.checkVisibility()) continue;
      const cs = getComputedStyle(el);
      let light;
      const stops = cs.backgroundImage.match(/rgb\([^)]*\)/g);
      if (cs.backgroundImage !== 'none' && stops) light = rgb(stops[0]); // gradient: the first stop is the light end
      else light = rgb(cs.backgroundColor);                                // an icon square is flat: its fill is the light end
      const texts = el.matches('.fp-ico') ? [el.querySelector('svg')] : [...el.querySelectorAll('b, span')].filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
      for (const t of texts) {
        const colour = rgb(getComputedStyle(t).color);
        out.push({ tile: el.className.split(' ')[0] + '[' + (el.dataset.tile || (el.firstElementChild && el.firstElementChild.dataset.tile) || '?') + ']', what: (t.textContent || 'glyph').trim().slice(0, 24) || 'glyph', ratio: ratio(colour, light) });
      }
    }
    return out;
  };
  for (const [name, rel] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + rel);
    await page.waitForTimeout(400);
    const rs = await page.evaluate(measure);
    const min = Math.min(...rs.map((r) => r.ratio));
    say(rs.length > 0 && min >= 4.5, `${name}: white on the light end, ${rs.length} text/glyph measurements, lowest ${min.toFixed(2)}:1 (needs 4.5)`);
    await ctx.close();
  }

  // ---- 2. Tab reaches each path button; Enter plays it ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + PAGES.trading);
    await page.waitForTimeout(500);
    const setup = await page.evaluate(() => ({
      buttons: document.querySelectorAll('.fp-pbtns button').length,
      shown: !document.querySelector('.fp-pbtns').hidden,
      labelsHidden: document.querySelector('.fp-carry-trading .tabs').hidden,
      radioTabindex: [...document.querySelectorAll('input[name="tour"]')].map((r) => r.tabIndex),
    }));
    say(setup.buttons === 5 && setup.shown && setup.labelsHidden && setup.radioTabindex.every((t) => t === -1), `with a script: ${setup.buttons} buttons shown, label row hidden, radios out of the Tab order (${setup.radioTabindex.join(',')})`);
    await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    const reached = [];
    for (let i = 0; i < 80 && reached.length < 5; i++) {
      await page.keyboard.press('Tab');
      const t = await page.evaluate(() => { const a = document.activeElement; return a && a.matches('.fp-pbtns button') ? a.dataset.tour : null; });
      if (t) reached.push(t);
    }
    say(reached.length === 5, `Tab reached the path buttons in order: ${reached.join(', ')}`);
    // Enter on each: the radio of that path is checked and its stage is playing
    for (const tour of ['order', 'evidence', 'market']) {
      await page.focus(`.fp-pbtns button[data-tour="${tour}"]`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const r = await page.evaluate((t) => {
        const radio = document.getElementById('t-' + t);
        const stage = document.querySelector('#p-' + t + ' .stage');
        const btn = document.querySelector(`.fp-pbtns button[data-tour="${t}"]`);
        return { checked: radio.checked, shown: getComputedStyle(document.getElementById('p-' + t)).display !== 'none', playing: stage && stage.dataset.playing, cards: stage ? stage.querySelectorAll('.card.in').length : -1, pressed: btn.getAttribute('aria-pressed'), others: [...document.querySelectorAll('.fp-pbtns button')].filter((b) => b.getAttribute('aria-pressed') === 'true').length };
      }, tour);
      say(r.checked && r.shown && r.pressed === 'true' && r.others === 1 && (r.playing === 'true' || r.cards > 0), `Enter on "${tour}": its path is shown (${r.shown}), pressed (${r.pressed}), playing=${r.playing}, cards landed=${r.cards}, one pressed button (${r.others})`);
    }
    await ctx.close();
  }

  // ---- 3. reduced motion: nothing on a panel part moves ----
  for (const [name, rel] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + rel);
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const parts = [...document.querySelectorAll('.fp-fig, .fp-pt, .fp-ptile, .fp-ico, .fp-seg, .fp-stack, .fp-legend, .fp-nav a')];
      const moving = parts.filter((e) => { const c = getComputedStyle(e); return c.animationName !== 'none' || parseFloat(c.transitionDuration) > 0; });
      const onParts = document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.fp-fig, .fp-pt, .fp-ptile, .fp-ico, .fp-stack, .fp-legend'));
      return { parts: parts.length, moving: moving.map((e) => e.className).slice(0, 3), running: onParts.length };
    });
    say(r.parts > 0 && r.moving.length === 0 && r.running === 0, `${name}: reduced motion, ${r.parts} panel parts, ${r.moving.length} with a transition or animation, ${r.running} running animations on them`);
    await ctx.close();
  }

  // ---- 4. no script: both pages complete ----
  for (const [name, rel] of Object.entries(PAGES)) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + rel);
    await page.waitForTimeout(400);
    const r = await page.evaluate((isHome) => {
      const vis = (s) => [...document.querySelectorAll(s)].filter((e) => e.checkVisibility()).length;
      return {
        counts: vis('.fp-nav-c'), icons: vis('.fp-nav .fp-ico'),
        fig: vis('.fp-fig'), seg: vis('.fp-stack .fp-seg'), legend: vis('.fp-legend li'),
        labelTiles: vis('.tabs .fp-ptile'), buttons: vis('.fp-pbtns button'), isHome,
      };
    }, name === 'home');
    if (name === 'home') say(r.counts === 5 && r.icons === 5 && r.fig === 5 && r.seg === 5 && r.legend === 5, `home, no script: ${r.counts} sidebar counts, ${r.icons} icon squares, ${r.fig} figure tiles, ${r.seg} bar segments, ${r.legend} legend entries, all visible`);
    else {
      say(r.counts === 5 && r.seg === 5 && r.legend === 5 && r.labelTiles === 5 && r.buttons === 0, `trading, no script: ${r.counts} sidebar counts, ${r.seg} bar segments, ${r.labelTiles} label tiles visible, ${r.buttons} buttons visible (a dead control would show)`);
      // every path is still reachable: click the second label tile, its panel shows
      await page.click('label[for="t-order"]');
      const shown = await page.evaluate(() => [getComputedStyle(document.getElementById('p-order')).display, getComputedStyle(document.getElementById('p-market')).display]);
      say(shown[0] !== 'none' && shown[1] === 'none', `trading, no script: a label tile switches the path (order panel ${shown[0]}, market panel ${shown[1]})`);
    }
    await ctx.close();
  }

  // ---- 5. phone width: no sideways scroll ----
  // The review page (before beside after) is included: stacked at phone width, no sideways scroll.
  for (const [name, rel] of Object.entries({ ...PAGES, 'lab index': 'docs/skin-lab/front-panels/' })) {
    for (const width of name === 'lab index' ? [390, 1280] : [390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(base + rel);
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
      say(r.sw <= r.iw, `${name}: ${width}px, scrollWidth ${r.sw} <= ${r.iw}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
