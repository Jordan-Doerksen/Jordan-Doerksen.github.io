// ==========================================================================
// HERO — the dispatcher for the hero centrepiece (the #sigil canvas). Owns the
// canvas lifecycle (resize, pointer perturbation, IntersectionObserver,
// reduced-motion) and delegates drawing to a motif renderer chosen by the
// active skin's --hero-motif. Renderers live in ./hero/*.js. On "skinchange"
// it swaps the motif and replays the entrance (resets t to 0).
// ==========================================================================

import { makeJd } from './hero/jd.js';
import { makeDataEye } from './hero/dataeye.js';
import { makeSunrise } from './hero/sunrise.js';
import { makeTargetLock } from './hero/targetlock.js';
import { makeSeraph } from './hero/seraph.js';
import { makeSigilGate } from './hero/sigilgate.js';
import { makeTreeOfLife } from './hero/treeoflife.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTIFS = { jd: makeJd, dataeye: makeDataEye, sunrise: makeSunrise, targetlock: makeTargetLock, seraph: makeSeraph, sigilgate: makeSigilGate, treeoflife: makeTreeOfLife };

function rgbStr(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
function readHero() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
  return { motif: v('--hero-motif', 'jd'), accent: rgbStr(v('--gold', '#d8ac4e')), data: rgbStr(v('--accent', '#4fe3d0')), light: rgbStr(v('--starlight', '#f2f4fa')) };
}

export function initHero() {
  const canvas = document.getElementById('sigil');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, t = 0, raf = null, last = 0, cursorX = null, cursorY = null, onScreen = true;
  let conf = readHero(), renderer = null;
  const env = () => {
    let mx = -9999, my = -9999;
    if (cursorX != null) { const r = canvas.getBoundingClientRect(); mx = cursorX - r.left; my = cursorY - r.top; }
    return { w, h, t, mx, my, skin: conf };
  };

  function pick() { renderer = (MOTIFS[conf.motif] || MOTIFS.jd)(ctx); renderer.resize(w, h, conf); }
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawStatic() { ctx.clearRect(0, 0, w, h); renderer.static(env()); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    ctx.clearRect(0, 0, w, h); renderer.frame(dt, env());
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduced) { drawStatic(); return; }
    if (!raf && onScreen) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function replay() { conf = readHero(); t = 0; stop(); pick(); start(); }

  resizeCanvas();
  pick();

  addEventListener('resize', () => { resizeCanvas(); renderer.resize(w, h, conf); if (!raf) drawStatic(); });
  window.addEventListener('skinchange', replay);

  if (!reduced) {
    addEventListener('mousemove', (e) => { cursorX = e.clientX; cursorY = e.clientY; }, { passive: true });
  }

  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) start(); else stop();
  }).observe(canvas);

  start();
}
