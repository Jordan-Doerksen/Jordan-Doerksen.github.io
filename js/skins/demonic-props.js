// ==========================================================================
// DEMONIC PROPS — scene toys that appear ONLY under the Demonic skin:
//   · imps scuttling across the footer;
//   · a swarm of bats circling above the About portrait;
//   · a breathing hellgate above the Contact card that belches embers;
//   · ash + embers drifting down/up the whole page (fixed, sitewide).
// Mounts on skinchange when data-skin="demonic", unmounts otherwise.
// Reduced-motion draws a single still frame. Parallels military/angelic props.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgba(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; }
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return { molten: v('--gold', '#ff5a1f'), sulfur: v('--accent', '#e8b53a'), ember: v('--ember', '#e23b2a'), dark: v('--panel-solid', '#170f0a') };
}

function attach(host, css, draw) {
  const fixed = !host;
  const mountEl = host || document.body;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = (fixed ? 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;' : 'position:absolute;z-index:2;' + css) + 'pointer-events:none;';
  const prevPos = fixed ? '' : host.style.position;
  if (!fixed && getComputedStyle(host).position === 'static') host.style.position = 'relative';
  mountEl.appendChild(canvas);

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
  io.observe(fixed ? document.body : canvas);
  requestAnimationFrame(() => { size(); start(); });
  return { destroy() { stop(); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); io.disconnect(); canvas.remove(); if (!fixed) host.style.position = prevPos; } };
}

// ---------- the marching horde across the footer (Diablo 2 flavoured) ----------
// Each marcher draws at origin (0,0)=ground, facing right. Mix of Fallen,
// skeletons, hellhounds, whip-cracking overseers, and a rare looming Diablo.
function fallen(ctx, t, ph, pal) {
  const hop = Math.abs(Math.sin(t * 8 + ph)) * 3, step = Math.sin(t * 16 + ph);
  ctx.translate(0, -hop);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.molten, 0.7); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-3 - step * 2, 5); ctx.moveTo(3, 0); ctx.lineTo(3 + step * 2, 5); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -5, 5, 4, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -3); ctx.quadraticCurveTo(11, -1, 10, 4); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -10, 3, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.5, -12); ctx.lineTo(-4, -15); ctx.moveTo(2.5, -12); ctx.lineTo(4, -15); ctx.stroke();
  ctx.fillStyle = rgba(pal.ember, 0.95); ctx.beginPath(); ctx.arc(-1, -10, 0.8, 0, 6.2832); ctx.arc(1, -10, 0.8, 0, 6.2832); ctx.fill();
}
function skeleton(ctx, t, ph, pal) {
  const march = Math.sin(t * 7 + ph), bone = '226, 216, 198';
  ctx.strokeStyle = `rgba(${bone}, 0.85)`; ctx.fillStyle = `rgba(${bone}, 0.85)`; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-2 + march * 3, -8); ctx.moveTo(2, 0); ctx.lineTo(2 - march * 3, -8); ctx.stroke();   // legs
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -17); ctx.stroke();                                                              // spine
  for (let i = 0; i < 3; i++) { const ry = -10 - i * 2.4; ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(4, ry + 1, 3, ry + 2.6); ctx.moveTo(0, ry); ctx.quadraticCurveTo(-4, ry + 1, -3, ry + 2.6); ctx.stroke(); }
  const cl = -2 + march * 2;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(6, -18 + cl); ctx.lineTo(8, -23 + cl); ctx.stroke();                               // arm -> club
  ctx.beginPath(); ctx.arc(8, -24 + cl, 1.7, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -20, 3.4, 0, 6.2832); ctx.fill();                                                                      // skull
  ctx.fillStyle = 'rgba(18, 9, 7, 0.9)'; ctx.beginPath(); ctx.arc(-1.2, -20, 1, 0, 6.2832); ctx.arc(1.2, -20, 1, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba(pal.ember, 0.85); ctx.beginPath(); ctx.arc(-1.2, -20, 0.5, 0, 6.2832); ctx.arc(1.2, -20, 0.5, 0, 6.2832); ctx.fill();
}
function hound(ctx, t, ph, pal) {
  const a = Math.sin(t * 9 + ph), b = Math.sin(t * 9 + ph + 1.5);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.molten, 0.7); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-7 + a * 3, 2); ctx.moveTo(-5, -4); ctx.lineTo(-5 - a * 3, 2); ctx.moveTo(6, -4); ctx.lineTo(6 + b * 3, 2); ctx.moveTo(8, -4); ctx.lineTo(8 - b * 3, 2); ctx.stroke();  // 4 legs
  ctx.beginPath(); ctx.ellipse(0, -7, 10, 4.5, 0, 0, 6.2832); ctx.fill(); ctx.stroke();                                              // body
  ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 4, -11); ctx.lineTo(i * 4, -15); } ctx.stroke();                    // back spikes
  ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(15, -6); ctx.lineTo(15, -3); ctx.lineTo(9, -4); ctx.closePath(); ctx.fill(); ctx.stroke();  // head
  ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-15, -12); ctx.stroke();                                                          // tail
  ctx.fillStyle = rgba(pal.ember, 0.95); ctx.beginPath(); ctx.arc(13, -6, 0.9, 0, 6.2832); ctx.fill();
}
function overseer(ctx, t, ph, pal, m) {
  const walk = Math.sin(t * 5 + ph);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.molten, 0.7); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-2 + walk * 3, -9); ctx.moveTo(3, 0); ctx.lineTo(3 - walk * 3, -9); ctx.stroke();    // legs
  ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-3, -22); ctx.lineTo(3, -22); ctx.lineTo(4, -9); ctx.closePath(); ctx.fill(); ctx.stroke();  // torso
  ctx.beginPath(); ctx.arc(0, -26, 3.6, 0, 6.2832); ctx.fill(); ctx.stroke();                                                        // head
  ctx.beginPath(); ctx.moveTo(-2.6, -28); ctx.lineTo(-5, -33); ctx.moveTo(2.6, -28); ctx.lineTo(5, -33); ctx.stroke();               // horns
  ctx.fillStyle = rgba(pal.ember, 0.95); ctx.beginPath(); ctx.arc(-1.2, -26, 0.8, 0, 6.2832); ctx.arc(1.2, -26, 0.8, 0, 6.2832); ctx.fill();
  const ax = 5, ay = -20;
  ctx.strokeStyle = rgba(pal.molten, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(ax, ay); ctx.stroke();  // arm
  if (m.lash >= 0) {                                                                                                                 // WHIP CRACK
    const p = m.lash, tipX = ax + 14 + 18 * Math.sin(p * Math.PI), tipY = ay - 8 + 22 * p;
    ctx.strokeStyle = rgba(pal.molten, 0.85); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + 12, ay - 14 + 26 * p, tipX, tipY); ctx.stroke();
    if (p > 0.62) { const f = 1 - (p - 0.62) / 0.38; ctx.strokeStyle = rgba(pal.sulfur, 0.9 * f); ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { const a = i / 4 * 6.2832 + 0.4; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX + Math.cos(a) * 5, tipY + Math.sin(a) * 5); ctx.stroke(); } }
  } else { ctx.strokeStyle = rgba(pal.molten, 0.6); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(ax + 2, ay + 3, 3, 0.5, 6); ctx.stroke(); }  // coiled whip
}
function diablo(ctx, t, ph, pal) {
  const sway = Math.sin(t * 3 + ph) * 1.5, walk = Math.sin(t * 3.4 + ph);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.ember, 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-6 + walk * 3, -7); ctx.lineTo(-4, -15); ctx.moveTo(5, 0); ctx.lineTo(7 - walk * 3, -7); ctx.lineTo(5, -15); ctx.stroke();  // digitigrade legs
  ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(-6, -30); ctx.lineTo(6, -30); ctx.lineTo(7, -14); ctx.closePath(); ctx.fill(); ctx.stroke();  // torso
  const cg = ctx.createRadialGradient(0, -24, 0, 0, -24, 7); cg.addColorStop(0, rgba(pal.molten, 0.9)); cg.addColorStop(1, 'transparent');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, -24, 7, 0, 6.2832); ctx.fill();                                                    // chest glow
  ctx.strokeStyle = rgba(pal.ember, 0.85); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(-13, -22 + sway); ctx.lineTo(-15, -15 + sway); ctx.stroke();                       // arms
  ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(13, -22 - sway); ctx.lineTo(15, -15 - sway); ctx.stroke();
  ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.arc(0, -34, 4.5, 0, 6.2832); ctx.fill(); ctx.stroke();                              // head
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -37); ctx.quadraticCurveTo(-9, -42, -12, -38); ctx.moveTo(3, -37); ctx.quadraticCurveTo(9, -42, 12, -38); ctx.stroke();  // backswept horns
  ctx.fillStyle = rgba(pal.molten, 1); ctx.beginPath(); ctx.arc(-1.8, -34, 1, 0, 6.2832); ctx.arc(1.8, -34, 1, 0, 6.2832); ctx.fill();  // glowing eyes
  ctx.strokeStyle = rgba(pal.ember, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, -16); ctx.quadraticCurveTo(-16, -12, -14, -4); ctx.stroke();  // tail
  ctx.fillStyle = rgba(pal.ember, 0.8); ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-17, -1); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
}
function bat(ctx, t, ph, pal) {                                   // a flying bat in the line
  const flap = Math.sin(t * 14 + ph), bob = Math.sin(t * 2 + ph) * 4;
  ctx.translate(0, -26 + bob);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.molten, 0.6); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 3.2, 0, 0, 6.2832); ctx.fill();
  const wy = flap * 5;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-7, wy - 3, -13, wy + 1); ctx.quadraticCurveTo(-7, wy + 3, -2, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(7, wy - 3, 13, wy + 1); ctx.quadraticCurveTo(7, wy + 3, 2, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(pal.ember, 0.9); ctx.beginPath(); ctx.arc(0, -1, 0.7, 0, 6.2832); ctx.fill();
}
function spirit(ctx, t, ph, pal) {                               // a floating wraith
  const bob = Math.sin(t * 1.6 + ph) * 5, wav = Math.sin(t * 4 + ph);
  ctx.translate(0, -24 + bob);
  const g = ctx.createRadialGradient(0, -4, 0, 0, -4, 14); g.addColorStop(0, rgba(pal.sulfur, 0.3)); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 14, 0, 6.2832); ctx.fill();
  ctx.fillStyle = rgba(pal.sulfur, 0.18); ctx.strokeStyle = rgba(pal.sulfur, 0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.quadraticCurveTo(-6, -12, 0, -13); ctx.quadraticCurveTo(6, -12, 5, 2);
  ctx.lineTo(3, 2 + wav * 2); ctx.lineTo(1, -1); ctx.lineTo(-1, 2 - wav * 2); ctx.lineTo(-3, -1); ctx.closePath(); ctx.fill(); ctx.stroke();   // tattered hem
  ctx.fillStyle = 'rgba(10, 4, 3, 0.6)'; ctx.beginPath(); ctx.ellipse(0, -7, 3, 4, 0, 0, 6.2832); ctx.fill();                                 // hood
  ctx.fillStyle = rgba(pal.ember, 0.95); ctx.beginPath(); ctx.arc(-1.2, -7, 0.7, 0, 6.2832); ctx.arc(1.2, -7, 0.7, 0, 6.2832); ctx.fill();
}
const MARCH = { fallen, skeleton, hound, bat, spirit, overseer, diablo };
function spawnMarcher(x) {
  const r = Math.random();
  let type, s;
  if (r < 0.30) { type = 'fallen'; s = 0.95; }
  else if (r < 0.50) { type = 'skeleton'; s = 1.0; }
  else if (r < 0.65) { type = 'hound'; s = 1.0; }
  else if (r < 0.78) { type = 'bat'; s = 0.9; }
  else if (r < 0.88) { type = 'spirit'; s = 1.0; }
  else if (r < 0.97) { type = 'overseer'; s = 1.15; }
  else { type = 'diablo'; s = 1.7; }
  const base = { fallen: 52, skeleton: 50, hound: 64, bat: 72, spirit: 44, overseer: 50, diablo: 34 }[type];
  const sp = base * (0.7 + Math.random() * 0.7);                  // wide per-marcher speed variance
  return { x, type, s, sp, ph: Math.random() * 6.28, whip: 2 + Math.random() * 5, lash: -1 };
}
export function drawParade(ctx, dt, t, w, h, pal, st) {
  const gy = h - 8, spacing = 116;
  if (!st.imps.length) for (let x = -60; x < w + spacing; x += spacing) st.imps.push(spawnMarcher(x));
  if (dt) {
    for (const m of st.imps) {
      m.x += m.sp * dt;
      if (m.type === 'overseer') { m.whip -= dt; if (m.lash < 0 && m.whip <= 0) m.lash = 0; if (m.lash >= 0) { m.lash += dt * 2.4; if (m.lash > 1) { m.lash = -1; m.whip = 3 + Math.random() * 5; } } }
    }
    let minx = Infinity; for (const m of st.imps) minx = Math.min(minx, m.x);
    for (const m of st.imps) if (m.x > w + 90) { Object.assign(m, spawnMarcher(minx - spacing)); minx = m.x; }
  }
  for (const m of st.imps) { ctx.save(); ctx.translate(m.x, gy); ctx.scale(m.s, m.s); MARCH[m.type](ctx, t, m.ph, pal, m); ctx.restore(); }
}

// ---------- bats circling above the portrait ----------
function drawBat(ctx, x, y, t, ph, pal, s) {
  const flap = Math.sin(t * 12 + ph);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = pal.dark; ctx.strokeStyle = rgba(pal.molten, 0.55); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 3.4, 0, 0, 6.2832); ctx.fill();                                   // body
  const wy = flap * 5;
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-7, wy - 3, -13, wy + 1); ctx.quadraticCurveTo(-7, wy + 3, -2, 1); ctx.closePath(); ctx.fill(); ctx.stroke();   // left wing
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(7, wy - 3, 13, wy + 1); ctx.quadraticCurveTo(7, wy + 3, 2, 1); ctx.closePath(); ctx.fill(); ctx.stroke();        // right wing
  ctx.restore();
}
export function drawBats(ctx, dt, t, w, h, pal, st) {
  if (!st.bats.length) { const n = 7; for (let i = 0; i < n; i++) st.bats.push({ a: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.4, rad: 0.6 + Math.random() * 0.4, ph: Math.random() * 6.28, s: 0.8 + Math.random() * 0.5, tilt: Math.random() * 0.5 }); }
  const cx = w * 0.5, cy = h * 0.58, rx = w * 0.34, ry = h * 0.3;
  if (dt) for (const b of st.bats) b.a += b.sp * dt;
  for (const b of st.bats) { const x = cx + Math.cos(b.a) * rx * b.rad, y = cy + Math.sin(b.a) * ry * b.rad + Math.sin(t * 1.5 + b.ph) * 4; drawBat(ctx, x, y, t, b.ph, pal, b.s); }
}

// ---------- breathing hellgate above the Contact card ----------
export function drawHellgate(ctx, dt, t, w, h, pal, st) {
  const cx = w * 0.5, gy = h - 6, gw = Math.min(110, w * 0.5), gh = h * 0.8;
  const pulse = 0.82 + 0.18 * Math.sin(t * 2);
  if (dt) {
    if (Math.random() < dt * 14) st.emb.push({ x: cx + (Math.random() - 0.5) * gw * 0.7, y: gy - gh * 0.2, vx: (Math.random() - 0.5) * 16, vy: -20 - Math.random() * 36, age: 0, ttl: 1.2 + Math.random() * 1 });
    for (const e of st.emb) { e.age += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 10 * dt; }
    st.emb = st.emb.filter((e) => e.age < e.ttl);
  }
  // molten interior glow
  const g = ctx.createRadialGradient(cx, gy - gh * 0.4, 0, cx, gy - gh * 0.4, gw);
  g.addColorStop(0, rgba(pal.molten, 0.5 * pulse)); g.addColorStop(0.5, rgba(pal.ember, 0.22 * pulse)); g.addColorStop(1, 'transparent');
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - gw, gy); ctx.lineTo(cx - gw, gy - gh * 0.55); ctx.quadraticCurveTo(cx, gy - gh * 1.05, cx + gw, gy - gh * 0.55); ctx.lineTo(cx + gw, gy); ctx.closePath();
  ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
  // arch outline (stone pillars + lintel)
  ctx.strokeStyle = rgba(pal.molten, 0.7); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(cx - gw, gy); ctx.lineTo(cx - gw, gy - gh * 0.55); ctx.quadraticCurveTo(cx, gy - gh * 1.05, cx + gw, gy - gh * 0.55); ctx.lineTo(cx + gw, gy); ctx.stroke();
  ctx.strokeStyle = rgba(pal.sulfur, 0.4); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - gw * 0.7, gy); ctx.lineTo(cx - gw * 0.7, gy - gh * 0.5); ctx.quadraticCurveTo(cx, gy - gh * 0.85, cx + gw * 0.7, gy - gh * 0.5); ctx.lineTo(cx + gw * 0.7, gy); ctx.stroke();
  for (const e of st.emb) { const f = 1 - e.age / e.ttl; ctx.fillStyle = rgba(pal.molten, 0.9 * f); ctx.beginPath(); ctx.arc(e.x, e.y, 1.6 * f + 0.5, 0, 6.2832); ctx.fill(); }
}

// ---------- ash + embers drifting the whole page ----------
function spawnMote(w, h, seed) {
  const ember = Math.random() < 0.4;
  return { x: Math.random() * w, y: seed ? Math.random() * h : (ember ? h + 10 : -10), vy: ember ? -(12 + Math.random() * 22) : (10 + Math.random() * 18), sw: 0.5 + Math.random(), ph: Math.random() * 6.28, age: 0, ttl: 3 + Math.random() * 4, ember, s: 0.8 + Math.random() * 1.2 };
}
export function drawAsh(ctx, dt, t, w, h, pal, st) {
  if (!st.m.length) { const n = Math.max(28, Math.round((w * h) / 22000)); for (let i = 0; i < n; i++) st.m.push(spawnMote(w, h, true)); }
  if (dt) for (const m of st.m) { m.age += dt; m.x += Math.sin(t * m.sw + m.ph) * 10 * dt; m.y += m.vy * dt; if (m.age > m.ttl || m.y < -14 || m.y > h + 14) Object.assign(m, spawnMote(w, h, false)); }
  for (const m of st.m) {
    const f = Math.max(0, Math.min(1, Math.min(m.age / 0.8, (m.ttl - m.age) / 1)));
    if (m.ember) { ctx.fillStyle = rgba(pal.molten, 0.7 * f); ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, 6.2832); ctx.fill(); }
    else { ctx.fillStyle = `rgba(150, 140, 132, ${0.4 * f})`; ctx.fillRect(m.x, m.y, m.s * 1.4, m.s * 1.4); }
  }
}

export function initDemonicProps() {
  let imps = null, bats = null, gate = null, ash = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !imps) { const st = { imps: [] }; imps = attach(f, 'left:0;width:100%;top:-80px;height:86px;', (c, dt, t, w, h, p) => drawParade(c, dt, t, w, h, p, st)); }
    const aside = document.querySelector('#about .portrait')?.closest('aside') || document.querySelector('#about .portrait')?.parentElement;
    if (aside && !bats) { const st = { bats: [] }; bats = attach(aside, 'left:0;width:100%;top:-150px;height:160px;', (c, dt, t, w, h, p) => drawBats(c, dt, t, w, h, p, st)); }
    const cp = document.querySelector('#contact .contact-pane');
    if (cp && !gate) { const st = { emb: [] }; gate = attach(cp, 'left:0;width:100%;top:-150px;height:150px;', (c, dt, t, w, h, p) => drawHellgate(c, dt, t, w, h, p, st)); }
    if (!ash) { const st = { m: [] }; ash = attach(null, '', (c, dt, t, w, h, p) => drawAsh(c, dt, t, w, h, p, st)); }
  }
  function unmount() { for (const p of [imps, bats, gate, ash]) if (p) p.destroy(); imps = bats = gate = ash = null; }
  function sync() { if (document.documentElement.dataset.skin === 'demonic') mount(); else unmount(); }
  window.addEventListener('skinchange', sync);
  sync();
}
