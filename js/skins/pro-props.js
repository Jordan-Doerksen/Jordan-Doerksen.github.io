// ==========================================================================
// PRO PROPS — scene toys that appear ONLY under the Pro skin:
//   · suited commuters striding with briefcases across the footer;
//   · floating KPI stat-cards popping around the About portrait;
//   · paper planes gliding past the Contact card.
// Mounts on skinchange when data-skin="pro", unmounts otherwise.
// Reduced-motion draws a single still frame. Parallels the other props modules.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgba(s, a) { return `rgba(${s}, ${a})`; }
function rr(ctx, x, y, w, h, r) { if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); } else { ctx.beginPath(); ctx.rect(x, y, w, h); } }
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const hex = (h) => { const n = parseInt((h || '').replace('#', ''), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return { navy: hex(v('--gold', '#1c2a44')), ox: hex(v('--accent', '#7a2230')), green: '46, 125, 82', ink: hex(v('--starlight', '#1c2a44')) };
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

// ---------- briefcase commuters on the footer ----------
function commuter(ctx, t, ph, pal) {
  const stride = Math.sin(t * 5 + ph) * 6, sw = Math.sin(t * 5 + ph) * 2;
  ctx.strokeStyle = rgba(pal.navy, 0.9); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(stride, 0); ctx.moveTo(0, -15); ctx.lineTo(-stride * 0.7, 0); ctx.stroke();   // legs
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -30); ctx.stroke();                                                       // torso
  ctx.strokeStyle = rgba(pal.ox, 0.85); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -29); ctx.lineTo(0, -22); ctx.stroke();   // tie
  ctx.strokeStyle = rgba(pal.navy, 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(-sw * 2 - 2, -20); ctx.stroke();   // back arm
  const cx = 5 + sw; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(cx, -18); ctx.stroke();                                   // case arm
  ctx.fillStyle = rgba(pal.navy, 0.9); ctx.fillRect(cx - 3, -18, 7, 6); ctx.strokeStyle = rgba(pal.ox, 0.6); ctx.lineWidth = 1; ctx.strokeRect(cx - 3, -18, 7, 6);   // briefcase
  ctx.fillStyle = rgba(pal.navy, 0.95); ctx.beginPath(); ctx.arc(0, -33, 3, 0, 6.2832); ctx.fill();                            // head
}
function spawnCommuter(x) { return { x, ph: Math.random() * 6.28, sp: 42 + Math.random() * 30, s: 0.95 + Math.random() * 0.28 }; }
export function drawCommuters(ctx, dt, t, w, h, pal, st) {
  const gy = h - 6, spacing = 130;
  if (!st.c.length) for (let x = -50; x < w + spacing; x += spacing) st.c.push(spawnCommuter(x));
  if (dt) { for (const c of st.c) c.x += c.sp * dt; let minx = Infinity; for (const c of st.c) minx = Math.min(minx, c.x); for (const c of st.c) if (c.x > w + 60) { Object.assign(c, spawnCommuter(minx - spacing)); minx = c.x; } }
  for (const c of st.c) { ctx.save(); ctx.translate(c.x, gy); ctx.scale(c.s, c.s); commuter(ctx, t, c.ph, pal); ctx.restore(); }
}

// ---------- floating stat-cards around the portrait ----------
const UP = ['+12%', '+8%', '+24%', '$1.2M', '+5.4%'], DOWN = ['-3%', '-1.4%', '-0.8%'];
export function drawStats(ctx, dt, t, w, h, pal, st) {
  if (dt) { if (Math.random() < dt * 2) { const up = Math.random() < 0.72; st.s.push({ x: 24 + Math.random() * Math.max(10, w - 110), y: 18 + Math.random() * Math.max(10, h - 50), age: 0, ttl: 1.6 + Math.random() * 1, up, txt: (up ? UP : DOWN)[Math.floor(Math.random() * (up ? UP : DOWN).length)] }); } for (const c of st.s) c.age += dt; st.s = st.s.filter((c) => c.age < c.ttl); }
  ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
  for (const c of st.s) {
    const f = Math.sin((c.age / c.ttl) * Math.PI), col = c.up ? pal.green : pal.ox, lift = (c.age / c.ttl) * -8, y = c.y + lift;
    const wpx = ctx.measureText(c.txt).width + 22;
    ctx.globalAlpha = Math.max(0, f);
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1; rr(ctx, c.x, y, wpx, 18, 5); ctx.fill(); ctx.stroke();
    const ax = c.x + 9, ay = y + 9; ctx.fillStyle = rgba(col, 0.95); ctx.beginPath();
    if (c.up) { ctx.moveTo(ax, ay - 3); ctx.lineTo(ax + 3.2, ay + 2); ctx.lineTo(ax - 3.2, ay + 2); } else { ctx.moveTo(ax, ay + 3); ctx.lineTo(ax + 3.2, ay - 2); ctx.lineTo(ax - 3.2, ay - 2); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(pal.navy, 0.95); ctx.fillText(c.txt, c.x + 16, ay);
    ctx.globalAlpha = 1;
  }
}

// ---------- paper planes by the Contact card ----------
export function drawPlanes(ctx, dt, t, w, h, pal, st) {
  if (dt) {
    if (st.phase === 'idle') { if (t >= st.nextAt) { st.phase = 'cross'; st.dir = Math.random() < 0.5 ? 1 : -1; st.x = st.dir > 0 ? -30 : w + 30; st.y = h * (0.3 + Math.random() * 0.3); st.bob = Math.random() * 6.28; st.trail = []; } }
    else { st.x += st.dir * 72 * dt; st.y += Math.sin(t * 1.5 + st.bob) * 8 * dt; st.trail.push({ x: st.x, y: st.y, age: 0 }); for (const p of st.trail) p.age += dt; st.trail = st.trail.filter((p) => p.age < 0.7); if ((st.dir > 0 && st.x > w + 50) || (st.dir < 0 && st.x < -50)) { st.phase = 'idle'; st.nextAt = t + 8 + Math.random() * 8; } }
  }
  if (st.phase !== 'cross') return;
  for (const p of st.trail) { const f = 1 - p.age / 0.7; ctx.fillStyle = rgba(pal.navy, 0.35 * f); ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, 6.2832); ctx.fill(); }
  ctx.save(); ctx.translate(st.x, st.y); ctx.scale(st.dir, 1);
  ctx.fillStyle = rgba(pal.navy, 0.92); ctx.strokeStyle = rgba(pal.ox, 0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -6); ctx.lineTo(-4, 0); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, 0); ctx.stroke();
  ctx.restore();
}

export function initProProps() {
  let commuters = null, stats = null, planes = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !commuters) { const st = { c: [] }; commuters = attach(f, 'left:0;width:100%;top:-62px;height:66px;', (c, dt, t, w, h, p) => drawCommuters(c, dt, t, w, h, p, st)); }
    const aside = document.querySelector('#about .portrait')?.closest('aside') || document.querySelector('#about .portrait')?.parentElement;
    if (aside && !stats) { const st = { s: [] }; stats = attach(aside, 'left:0;width:100%;top:0;height:100%;', (c, dt, t, w, h, p) => drawStats(c, dt, t, w, h, p, st)); }
    const cp = document.querySelector('#contact .contact-pane');
    if (cp && !planes) { const st = { phase: 'idle', nextAt: 3 + Math.random() * 5, dir: 1, x: 0, y: 0, bob: 0, trail: [] }; planes = attach(cp, 'left:0;width:100%;top:-130px;height:130px;', (c, dt, t, w, h, p) => drawPlanes(c, dt, t, w, h, p, st)); }
  }
  function unmount() { for (const p of [commuters, stats, planes]) if (p) p.destroy(); commuters = stats = planes = null; }
  function sync() { if (document.documentElement.dataset.skin === 'pro') mount(); else unmount(); }
  window.addEventListener('skinchange', sync);
  sync();
}
