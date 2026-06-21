// ==========================================================================
// NATURE PROPS — scene toys that appear ONLY under the Nature skin:
//   · critters (fox / rabbit / deer) trotting across the footer;
//   · butterflies wandering above the About portrait;
//   · a hawk gliding past the Contact card now and then.
// Mounts on skinchange when data-skin="nature", unmounts otherwise.
// Reduced-motion draws a single still frame. Parallels the other props modules.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgba(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
function rgbaStr(s, a) { return `rgba(${s}, ${a})`; }
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return { ever: v('--gold', '#2c5d52'), cyan: v('--accent', '#2f86a0'), forge: v('--forge', '#b3651f'), ink: v('--starlight', '#2c3a3a') };
}

function attach(host, css, draw) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:2;' + css;
  const prevPos = host.style.position;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, t = 0, raf = null, last = 0, onScreen = true, pal = readPalette();
  function size() { const dpr = Math.min(window.devicePixelRatio || 1, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function still() { ctx.clearRect(0, 0, w, h); draw(ctx, 0, 0, w, h, pal); }
  function loop(ts) { const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt; ctx.clearRect(0, 0, w, h); draw(ctx, dt, t, w, h, pal); raf = requestAnimationFrame(loop); }
  function start() { if (reduced) { still(); return; } if (!raf && onScreen && document.visibilityState === 'visible') { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  const onResize = () => { size(); if (!raf) still(); };
  const onVis = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
  addEventListener('resize', onResize); document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop(); });
  io.observe(canvas);
  requestAnimationFrame(() => { size(); start(); });
  return { destroy() { stop(); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); io.disconnect(); canvas.remove(); host.style.position = prevPos; } };
}

// ---------- critters trotting across the footer ----------
function legs(ctx, xs, gy, col, t, ph, len) {
  const a = Math.sin(t * 8 + ph), b = Math.sin(t * 8 + ph + 1.6);
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(xs[0], gy); ctx.lineTo(xs[0] + a * 3, gy + len); ctx.moveTo(xs[1], gy); ctx.lineTo(xs[1] - a * 3, gy + len);
  ctx.moveTo(xs[2], gy); ctx.lineTo(xs[2] + b * 3, gy + len); ctx.moveTo(xs[3], gy); ctx.lineTo(xs[3] - b * 3, gy + len); ctx.stroke();
}
function fox(ctx, t, ph, pal) {
  const col = rgba(pal.forge, 0.92);
  legs(ctx, [-6, -4, 5, 7], -6, rgba(pal.forge, 0.9), t, ph, 6);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(-16, -10, -13, -3); ctx.quadraticCurveTo(-11, -6, -8, -6); ctx.closePath(); ctx.fill();   // bushy tail
  ctx.beginPath(); ctx.ellipse(0, -8, 8, 3.4, 0, 0, 6.2832); ctx.fill();                                                                            // body
  ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(14, -8); ctx.lineTo(11, -12); ctx.closePath(); ctx.fill();                                          // snout
  ctx.beginPath(); ctx.moveTo(8, -11); ctx.lineTo(7, -15); ctx.lineTo(10, -12); ctx.closePath(); ctx.moveTo(10, -11); ctx.lineTo(10, -15); ctx.lineTo(12, -12); ctx.closePath(); ctx.fill();  // ears
  ctx.fillStyle = rgba(pal.ink, 0.9); ctx.beginPath(); ctx.arc(10, -10, 0.8, 0, 6.2832); ctx.fill();
}
function rabbit(ctx, t, ph, pal) {
  const grey = '150, 146, 140', hop = Math.abs(Math.sin(t * 7 + ph)) * 3;
  ctx.translate(0, -hop);
  legs(ctx, [-4, -2, 3, 5], -4, rgbaStr(grey, 0.9), t, ph, 4);
  ctx.fillStyle = rgbaStr(grey, 0.92);
  ctx.beginPath(); ctx.ellipse(0, -6, 5.5, 4, 0, 0, 6.2832); ctx.fill();                                                                            // body
  ctx.beginPath(); ctx.arc(6, -9, 2.6, 0, 6.2832); ctx.fill();                                                                                      // head
  ctx.beginPath(); ctx.ellipse(6, -14, 1.1, 3.4, -0.2, 0, 6.2832); ctx.ellipse(8, -14, 1.1, 3.4, 0.1, 0, 6.2832); ctx.fill();                       // ears
  ctx.beginPath(); ctx.arc(-6, -6, 1.8, 0, 6.2832); ctx.fill();                                                                                     // tail
  ctx.fillStyle = rgba(pal.ink, 0.9); ctx.beginPath(); ctx.arc(7, -9, 0.7, 0, 6.2832); ctx.fill();
}
function deer(ctx, t, ph, pal) {
  const brown = '138, 102, 66';
  legs(ctx, [-6, -4, 5, 7], -9, rgbaStr(brown, 0.9), t, ph, 9);
  ctx.fillStyle = rgbaStr(brown, 0.92);
  ctx.beginPath(); ctx.ellipse(0, -12, 8, 3.6, 0, 0, 6.2832); ctx.fill();                                                                           // body
  ctx.beginPath(); ctx.moveTo(7, -13); ctx.lineTo(11, -20); ctx.lineTo(13, -20); ctx.lineTo(9, -12); ctx.closePath(); ctx.fill();                   // neck
  ctx.beginPath(); ctx.ellipse(12.5, -21, 2.6, 1.8, -0.3, 0, 6.2832); ctx.fill();                                                                   // head
  ctx.strokeStyle = rgbaStr(brown, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, -23); ctx.lineTo(11, -27); ctx.moveTo(11, -25); ctx.lineTo(9, -27); ctx.moveTo(13, -23); ctx.lineTo(14, -27); ctx.moveTo(14, -25); ctx.lineTo(16, -27); ctx.stroke();  // antlers
  ctx.fillStyle = rgba(pal.ink, 0.9); ctx.beginPath(); ctx.arc(13.5, -21, 0.7, 0, 6.2832); ctx.fill();
}
const CRITTERS = { fox, rabbit, deer };
function spawnCritter(x) {
  const r = Math.random(), type = r < 0.4 ? 'fox' : r < 0.72 ? 'rabbit' : 'deer';
  const base = type === 'rabbit' ? 60 : type === 'deer' ? 46 : 54;
  return { x, type, ph: Math.random() * 6.28, sp: base * (0.75 + Math.random() * 0.6), s: type === 'deer' ? 1.05 : 0.95 };
}
export function drawCritters(ctx, dt, t, w, h, pal, st) {
  const gy = h - 6, spacing = 200;
  if (!st.c.length) for (let x = -60; x < w + spacing; x += spacing) st.c.push(spawnCritter(x));
  if (dt) { for (const c of st.c) c.x += c.sp * dt; let minx = Infinity; for (const c of st.c) minx = Math.min(minx, c.x); for (const c of st.c) if (c.x > w + 80) { Object.assign(c, spawnCritter(minx - spacing)); minx = c.x; } }
  for (const c of st.c) { ctx.save(); ctx.translate(c.x, gy); ctx.scale(c.s, c.s); CRITTERS[c.type](ctx, t, c.ph, pal); ctx.restore(); }
}

// ---------- a hawk gliding past the Contact card ----------
function drawHawk(ctx, x, y, t, ph, pal, dir) {
  const flap = Math.sin(t * 3 + ph);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.fillStyle = rgbaStr('92, 74, 54', 0.9); ctx.strokeStyle = rgba(pal.ink, 0.4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.2, 0, 0, 6.2832); ctx.fill();                                   // body
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-11, 1); ctx.lineTo(-7, 2); ctx.closePath(); ctx.fill();  // tail
  const wy = flap * 6;                                                                                     // wings (slow soaring)
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.quadraticCurveTo(-12, wy - 5, -22, wy + 2); ctx.quadraticCurveTo(-11, wy + 2, -1, 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1, -1); ctx.quadraticCurveTo(12, wy - 5, 22, wy + 2); ctx.quadraticCurveTo(11, wy + 2, 1, 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(pal.ink, 0.8); ctx.beginPath(); ctx.arc(4, -0.5, 0.7, 0, 6.2832); ctx.fill();
  ctx.restore();
}
export function drawHawkScene(ctx, dt, t, w, h, pal, st) {
  if (dt) {
    if (st.phase === 'idle') { if (t >= st.nextAt) { st.phase = 'cross'; st.dir = Math.random() < 0.5 ? 1 : -1; st.x = st.dir > 0 ? -40 : w + 40; st.y = h * (0.35 + Math.random() * 0.25); st.ph = Math.random() * 6.28; } }
    else if (st.phase === 'cross') { st.x += st.dir * 46 * dt; if ((st.dir > 0 && st.x > w + 60) || (st.dir < 0 && st.x < -60)) { st.phase = 'idle'; st.nextAt = t + 10 + Math.random() * 10; } }
  }
  if (st.phase === 'cross') drawHawk(ctx, st.x, st.y + Math.sin(t * 0.8 + st.ph) * 6, t, st.ph, pal, st.dir);
}

export function initNatureProps() {
  let critters = null, hawk = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !critters) { const st = { c: [] }; critters = attach(f, 'left:0;width:100%;top:-58px;height:62px;', (c, dt, t, w, h, p) => drawCritters(c, dt, t, w, h, p, st)); }
    const cp = document.querySelector('#contact .contact-pane');
    if (cp && !hawk) { const st = { phase: 'idle', nextAt: 3 + Math.random() * 5, dir: 1, x: 0, y: 0, ph: 0 }; hawk = attach(cp, 'left:0;width:100%;top:-130px;height:130px;', (c, dt, t, w, h, p) => drawHawkScene(c, dt, t, w, h, p, st)); }
  }
  function unmount() { for (const p of [critters, hawk]) if (p) p.destroy(); critters = hawk = null; }
  function sync() { if (document.documentElement.dataset.skin === 'nature') mount(); else unmount(); }
  window.addEventListener('skinchange', sync);
  sync();
}
