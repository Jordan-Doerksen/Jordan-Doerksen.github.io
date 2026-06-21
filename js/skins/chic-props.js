// ==========================================================================
// CHIC PROPS — scene toys that appear ONLY under the Chic skin:
//   · chic silhouettes strutting a runway across the footer;
//   · twinkling sparkles framing the About portrait;
//   · a champagne bottle + flute (rising bubbles, the odd cork pop) by Contact;
//   · fine gold dust drifting the whole page (fixed, sitewide).
// Mounts on skinchange when data-skin="chic", unmounts otherwise.
// Reduced-motion draws a single still frame. Parallels the other props modules.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgba(s, a) { return `rgba(${s}, ${a})`; }
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const hex = (h) => { const n = parseInt((h || '').replace('#', ''), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return { gold: hex(v('--gold', '#d8b66a')), accent: hex(v('--accent', '#ece1c8')), dark: hex(v('--panel-solid', '#1a1713')) };
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

// ---------- runway strut on the footer ----------
function strut(ctx, t, ph, pal, dress) {
  const stride = Math.sin(t * 4 + ph) * 5, arm = Math.sin(t * 4 + ph + Math.PI) * 4, lean = Math.sin(t * 2 + ph) * 0.6;
  ctx.strokeStyle = rgba(pal.gold, 0.85); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(stride, 0); ctx.moveTo(0, -18); ctx.lineTo(-stride, 0); ctx.stroke();   // legs
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(lean, -33); ctx.stroke();                                             // torso
  if (dress) { ctx.fillStyle = rgba(pal.gold, 0.2); ctx.beginPath(); ctx.moveTo(lean * 0.6, -30); ctx.lineTo(-5, -10); ctx.lineTo(5, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(lean, -31); ctx.lineTo(arm, -24); ctx.moveTo(lean, -31); ctx.lineTo(-arm, -23); ctx.stroke();  // arms
  ctx.fillStyle = rgba(pal.gold, 0.9); ctx.beginPath(); ctx.arc(lean, -36, 3, 0, 6.2832); ctx.fill();                    // head
}
function spawnModel(x) { return { x, ph: Math.random() * 6.28, sp: 26 + Math.random() * 26, s: 0.92 + Math.random() * 0.3, dress: Math.random() < 0.5 }; }
export function drawRunway(ctx, dt, t, w, h, pal, st) {
  const gy = h - 6, spacing = 150;
  if (!st.m.length) for (let x = -60; x < w + spacing; x += spacing) st.m.push(spawnModel(x));
  ctx.strokeStyle = rgba(pal.gold, 0.16); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(w, gy + 1); ctx.stroke();   // catwalk line
  if (dt) { for (const m of st.m) m.x += m.sp * dt; let minx = Infinity; for (const m of st.m) minx = Math.min(minx, m.x); for (const m of st.m) if (m.x > w + 70) { Object.assign(m, spawnModel(minx - spacing)); minx = m.x; } }
  for (const m of st.m) { ctx.save(); ctx.translate(m.x, gy); ctx.scale(m.s, m.s); strut(ctx, t, m.ph, pal, m.dress); ctx.restore(); }
}

// ---------- sparkles framing the portrait ----------
export function drawSparkles(ctx, dt, t, w, h, pal, st) {
  if (dt) { if (Math.random() < dt * 7) st.s.push({ x: Math.random() * w, y: Math.random() * h, age: 0, ttl: 0.7 + Math.random() * 0.8, sz: 3 + Math.random() * 5, ivory: Math.random() < 0.45 }); for (const s of st.s) s.age += dt; st.s = st.s.filter((s) => s.age < s.ttl); }
  for (const s of st.s) {
    const f = Math.sin((s.age / s.ttl) * Math.PI), col = s.ivory ? pal.accent : pal.gold, L = s.sz * (0.5 + f);
    ctx.strokeStyle = rgba(col, 0.9 * f); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y); ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x - L * 0.5, s.y - L * 0.5); ctx.lineTo(s.x + L * 0.5, s.y + L * 0.5); ctx.moveTo(s.x + L * 0.5, s.y - L * 0.5); ctx.lineTo(s.x - L * 0.5, s.y + L * 0.5); ctx.stroke();
  }
}

// ---------- champagne by the Contact card ----------
export function drawChampagne(ctx, dt, t, w, h, pal, st) {
  const bx = w * 0.5, gy = h - 8, fx = bx + 26, fluteTop = gy - 26;
  if (dt) {
    if (Math.random() < dt * 16) st.bub.push({ x: fx + (Math.random() - 0.5) * 5, y: fluteTop, vx: (Math.random() - 0.5) * 6, vy: -(18 + Math.random() * 22), age: 0, ttl: 1.4 + Math.random() * 0.6, r: 0.7 + Math.random() * 1.1 });
    st.pop -= dt;
    if (st.pop <= 0) { st.cork = { x: bx - 24, y: gy - 48, vx: -36 - Math.random() * 30, vy: -100 - Math.random() * 50, age: 0 }; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; st.bub.push({ x: bx - 24, y: gy - 48, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 20, age: 0, ttl: 1, r: 1 + Math.random() * 1.4 }); } st.pop = 6 + Math.random() * 7; }
    for (const b of st.bub) { b.age += dt; b.x += (b.vx + Math.sin(t * 3 + b.y) * 5) * dt; b.y += b.vy * dt; b.vy += 18 * dt; }
    st.bub = st.bub.filter((b) => b.age < b.ttl && b.y > 6);
    if (st.cork) { st.cork.age += dt; st.cork.x += st.cork.vx * dt; st.cork.y += st.cork.vy * dt; st.cork.vy += 140 * dt; if (st.cork.age > 1.5) st.cork = null; }
  }
  // bottle (left, tilted to pour) — dark glass + gold foil
  ctx.save(); ctx.translate(bx - 24, gy); ctx.rotate(-0.5);
  ctx.fillStyle = rgba(pal.dark, 0.95); ctx.strokeStyle = rgba(pal.gold, 0.6); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-7, -34, 14, 34, 5) : ctx.rect(-7, -34, 14, 34); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-3.5, -48, 7, 15); ctx.fill(); ctx.stroke();                                   // neck
  ctx.fillStyle = rgba(pal.gold, 0.85); ctx.beginPath(); ctx.rect(-3.5, -48, 7, 5); ctx.fill();             // foil
  ctx.restore();
  // flute (right)
  ctx.strokeStyle = rgba(pal.accent, 0.6); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(fx - 4, fluteTop - 2); ctx.lineTo(fx - 2, gy - 10); ctx.lineTo(fx + 2, gy - 10); ctx.lineTo(fx + 4, fluteTop - 2); ctx.stroke();   // bowl
  ctx.beginPath(); ctx.moveTo(fx, gy - 10); ctx.lineTo(fx, gy - 2); ctx.moveTo(fx - 4, gy - 2); ctx.lineTo(fx + 4, gy - 2); ctx.stroke();                        // stem + base
  ctx.fillStyle = rgba(pal.gold, 0.3); ctx.beginPath(); ctx.moveTo(fx - 3.2, fluteTop + 4); ctx.lineTo(fx - 2, gy - 10); ctx.lineTo(fx + 2, gy - 10); ctx.lineTo(fx + 3.2, fluteTop + 4); ctx.closePath(); ctx.fill();   // wine
  for (const b of st.bub) { const f = 1 - b.age / b.ttl; ctx.fillStyle = rgba(pal.accent, 0.7 * f); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); }
  if (st.cork) { ctx.save(); ctx.translate(st.cork.x, st.cork.y); ctx.rotate(st.cork.age * 8); ctx.fillStyle = rgba(pal.gold, 0.9); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-2.5, -3.5, 5, 7, 2) : ctx.rect(-2.5, -3.5, 5, 7); ctx.fill(); ctx.restore(); }
}

// ---------- fine gold dust drifting the whole page ----------
function spawnFleck(w, h, seed) { return { x: Math.random() * w, y: seed ? Math.random() * h : -6, vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 16, r: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28, sw: 0.6 + Math.random() * 1.2, age: 0, ttl: 6 + Math.random() * 6, sparkle: Math.random() < 0.14 }; }
export function drawDustFx(ctx, dt, t, w, h, pal, st) {
  if (!st.d.length) { const n = Math.max(16, Math.round((w * h) / 26000)); for (let i = 0; i < n; i++) st.d.push(spawnFleck(w, h, true)); }
  if (dt) for (const m of st.d) { m.age += dt; m.x += (m.vx + Math.sin(t * m.sw + m.ph) * 4) * dt; m.y += m.vy * dt; if (m.age > m.ttl || m.y > h + 6) Object.assign(m, spawnFleck(w, h, false)); }
  for (const m of st.d) { const f = Math.max(0, Math.min(1, Math.min(m.age / 1, (m.ttl - m.age) / 1.4))), tw = 0.55 + 0.45 * Math.sin(t * m.sw + m.ph); ctx.fillStyle = rgba(pal.gold, 0.6 * f * tw); ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill(); if (m.sparkle && tw > 0.85) { ctx.strokeStyle = rgba(pal.accent, 0.5 * f); ctx.lineWidth = 0.8; const L = m.r + 2.5; ctx.beginPath(); ctx.moveTo(m.x - L, m.y); ctx.lineTo(m.x + L, m.y); ctx.moveTo(m.x, m.y - L); ctx.lineTo(m.x, m.y + L); ctx.stroke(); } }
}

export function initChicProps() {
  let runway = null, sparkle = null, champ = null, dust = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !runway) { const st = { m: [] }; runway = attach(f, 'left:0;width:100%;top:-78px;height:82px;', (c, dt, t, w, h, p) => drawRunway(c, dt, t, w, h, p, st)); }
    const aside = document.querySelector('#about .portrait')?.closest('aside') || document.querySelector('#about .portrait')?.parentElement;
    if (aside && !sparkle) { const st = { s: [] }; sparkle = attach(aside, 'left:0;width:100%;top:0;height:100%;', (c, dt, t, w, h, p) => drawSparkles(c, dt, t, w, h, p, st)); }
    const cp = document.querySelector('#contact .contact-pane');
    if (cp && !champ) { const st = { bub: [], pop: 4 + Math.random() * 5, cork: null }; champ = attach(cp, 'left:0;width:100%;top:-150px;height:150px;', (c, dt, t, w, h, p) => drawChampagne(c, dt, t, w, h, p, st)); }
    if (!dust) { const st = { d: [] }; dust = attach(null, '', (c, dt, t, w, h, p) => drawDustFx(c, dt, t, w, h, p, st)); }
  }
  function unmount() { for (const p of [runway, sparkle, champ, dust]) if (p) p.destroy(); runway = sparkle = champ = dust = null; }
  function sync() { if (document.documentElement.dataset.skin === 'chic') mount(); else unmount(); }
  window.addEventListener('skinchange', sync);
  sync();
}
