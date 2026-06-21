// ==========================================================================
// SKY — the dispatcher behind every page. Owns the canvas lifecycle (resize,
// the rAF loop, visibility pause, reduced-motion) and delegates drawing to a
// background renderer chosen by the active skin's --sky-mode. Renderers live
// in ./sky/*.js and expose make(ctx) -> { resize(w,h,skin), frame(dt,env), static(env) }.
// Re-dispatches on "skinchange".
// ==========================================================================

import { makeNightSky } from './sky/nightsky.js';
import { makeDataRain } from './sky/datarain.js';
import { makeDaylight } from './sky/daylight.js?v=4';
import { makeHudField } from './sky/hudfield.js?v=3';
import { makeAurora } from './sky/aurora.js?v=2';
import { makeSigils } from './sky/sigils.js';
import { makePlain } from './sky/plain.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RENDERERS = { nightsky: makeNightSky, datarain: makeDataRain, daylight: makeDaylight, hudfield: makeHudField, aurora: makeAurora, sigils: makeSigils, plain: makePlain };

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readSkyVars() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
  return {
    mode: v('--sky-mode', 'nightsky'),
    nebula: hexToRgb(v('--sky-nebula', '#d8ac4e')),
    deep: v('--sky-deep', '59,74,143').split(',').map((x) => parseInt(x, 10)),
    star: v('--sky-star', '233, 237, 246'),
    warm: v('--sky-warm', '232, 200, 140'),
    meteor: v('--sky-meteor', '240, 240, 250'),
    starAlpha: parseFloat(v('--sky-star-alpha', '1')) || 1,
    follow: (parseFloat(v('--sky-follow-sections', '1')) || 0) > 0,
  };
}

export function initSky() {
  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, t = 0, raf = null, last = 0;
  let mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;
  let skin = readSkyVars();
  let renderer = null;

  const env = () => ({ w, h, t, scrollY: window.scrollY, smx, smy, skin });

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function pick() {
    const make = RENDERERS[skin.mode] || RENDERERS.plain;
    renderer = make(ctx);
    renderer.resize(w, h, skin);
  }
  function drawStatic() { ctx.clearRect(0, 0, w, h); renderer.static(env()); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;
    ctx.clearRect(0, 0, w, h);
    renderer.frame(dt, env());
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduced || renderer.still) { drawStatic(); return; }
    if (!raf && document.visibilityState === 'visible') { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function applySkin() { skin = readSkyVars(); stop(); pick(); start(); }

  resizeCanvas();
  pick();

  addEventListener('resize', () => { resizeCanvas(); renderer.resize(w, h, skin); if (!raf) drawStatic(); });
  addEventListener('scroll', () => { if (!raf) drawStatic(); }, { passive: true });
  addEventListener('mousemove', (e) => { mx = e.clientX / w; my = e.clientY / h; }, { passive: true });
  window.addEventListener('skinchange', applySkin);
  window.addEventListener('sky-redraw', () => { if (!raf) drawStatic(); });   // a renderer (e.g. hudfield camo) finished loading an asset
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  });

  start();
}
