// ==========================================================================
// MILITARY PROPS — scene toys that appear ONLY under the Military skin:
//   · an endless tank convoy rolling along the top of the footer, each tank
//     kicking up a dust/smoke trail behind its tracks;
//   · above the About portrait, an air-defence scene: a howitzer that lobs an
//     arcing shell now and then, beside an AA bunker that tracks and fires at
//     planes flying past (tracers + flak bursts, the odd one gets downed).
// Mounts on skinchange when data-skin="military", unmounts otherwise.
// Reduced-motion draws a single parked/idle frame. Same whimsy as the
// night-train + UFO flybys elsewhere on the site.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return {
    lime: rgb(v('--gold', '#9fd64a')), cyan: rgb(v('--accent', '#45c8e8')),
    amber: rgb(v('--forge', '#ff8c1f')), hull: v('--panel-solid', '#161d17'),
    dust: '150, 142, 112',
  };
}

// Generic mount: a positioned overlay canvas on `host` with its own loop,
// resize, off-screen pause, visibility pause, reduced-motion static frame.
function attach(host, css, draw) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:2;' + css;
  const prevPos = host.style.position;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, t = 0, raf = null, last = 0, onScreen = true, pal = readPalette();

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function still() { ctx.clearRect(0, 0, w, h); draw(ctx, 0, 0, w, h, pal); }
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    ctx.clearRect(0, 0, w, h); draw(ctx, dt, t, w, h, pal);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduced) { still(); return; }
    if (!raf && onScreen && document.visibilityState === 'visible') { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  const onResize = () => { size(); if (!raf) still(); };
  const onVis = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop(); });
  io.observe(canvas);

  requestAnimationFrame(() => { size(); start(); });   // defer one frame so layout is settled
  return {
    destroy() {
      stop(); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      io.disconnect(); canvas.remove(); host.style.position = prevPos;
    },
  };
}

// ---------- the tank (drawn left-origin, sitting on ground y, facing right) ----------
function drawTank(ctx, x, gy, s, pal, t) {
  const { lime, cyan, hull } = pal;
  ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);

  ctx.fillStyle = hull; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, -14, 96, 14, 5) : ctx.rect(0, -14, 96, 14); ctx.fill();
  ctx.strokeStyle = `rgba(${lime}, 0.5)`; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = `rgba(${lime}, 0.5)`;                          // moving tread links
  const gap = 8, ph = (t * 40) % gap;
  for (let lx = 2 - ph; lx < 94; lx += gap) ctx.fillRect(lx, -13, 3, 12);

  ctx.strokeStyle = `rgba(${lime}, 0.45)`; ctx.lineWidth = 1.2;  // rolling road wheels
  for (const wx of [12, 30, 48, 66, 84]) {
    ctx.beginPath(); ctx.arc(wx, -7, 5, 0, 6.2832); ctx.stroke();
    ctx.save(); ctx.translate(wx, -7); ctx.rotate(t * 5);
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); ctx.restore();
  }

  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.55)`; ctx.lineWidth = 1.4;  // sloped hull
  ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(8, -30); ctx.lineTo(78, -30); ctx.lineTo(94, -20); ctx.lineTo(94, -14); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(30, -30); ctx.lineTo(36, -44); ctx.lineTo(62, -44); ctx.lineTo(68, -30); ctx.closePath();  // turret
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = `rgba(${lime}, 0.7)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, -39); ctx.lineTo(98, -39); ctx.stroke(); // barrel
  ctx.strokeStyle = `rgba(${lime}, 0.4)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(40, -44); ctx.lineTo(36, -56); ctx.stroke();  // antenna
  ctx.fillStyle = `rgba(${cyan}, 0.85)`; ctx.beginPath(); ctx.arc(52, -37, 1.6, 0, 6.2832); ctx.fill();  // optic
  ctx.restore();
}
export function drawConvoy(ctx, dt, t, w, h, pal, st) {
  const gy = h - 5, s = 0.6, spacing = 232, speed = 40, tankW = 96 * s;
  if (st.tanks.length === 0) for (let x = -tankW; x < w + spacing; x += spacing) st.tanks.push({ x, emit: Math.random() * 0.12 });

  ctx.strokeStyle = `rgba(${pal.lime}, 0.12)`; ctx.lineWidth = 1;     // ground line
  ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(w, gy + 1); ctx.stroke();

  if (dt) {
    for (const tk of st.tanks) {
      tk.x += speed * dt; tk.emit -= dt;
      if (tk.emit <= 0) { st.puffs.push({ x: tk.x + 4, y: gy - 2, r: 2 + Math.random() * 2, age: 0, ttl: 0.7 + Math.random() * 0.5, vx: -12 - Math.random() * 12, vy: -5 - Math.random() * 9 }); tk.emit = 0.12; }
    }
    let minx = Infinity; for (const tk of st.tanks) minx = Math.min(minx, tk.x);
    for (const tk of st.tanks) if (tk.x > w + tankW) { tk.x = minx - spacing; minx = tk.x; }   // recycle behind the column
    for (const p of st.puffs) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 14 * dt; }
    st.puffs = st.puffs.filter((p) => p.age < p.ttl);
  }

  for (const p of st.puffs) { ctx.fillStyle = `rgba(${pal.dust}, ${(1 - p.age / p.ttl) * 0.45})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
  for (const tk of st.tanks) drawTank(ctx, tk.x, gy, s, pal, t);
}

// ---------- the air-defence scene above the portrait ----------
function spawnPlane(st, w, h) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  st.planes.push({ x: dir > 0 ? -30 : w + 30, y: h * (0.14 + Math.random() * 0.22), vx: dir * (32 + Math.random() * 22), vy: 0, phase: Math.random() * 6.28, hit: false, smokeT: 0 });
}
function drawPlane(ctx, p, t, pal) {
  const dir = p.vx >= 0 ? 1 : -1, y = p.y + Math.sin(t * 2 + p.phase) * 2;
  ctx.save(); ctx.translate(p.x, y); ctx.scale(dir, 1); if (p.hit) ctx.rotate(0.5);
  ctx.fillStyle = pal.hull; ctx.strokeStyle = `rgba(${pal.lime}, 0.7)`; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 3, 0, 0, 6.2832); ctx.fill(); ctx.stroke();           // fuselage
  ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(-3, -9); ctx.lineTo(-1, -9); ctx.lineTo(4, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(-3, 9); ctx.lineTo(-1, 9); ctx.lineTo(4, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-13, -4); ctx.lineTo(-9, -1); ctx.closePath(); ctx.fill(); ctx.stroke();  // tail
  ctx.fillStyle = `rgba(${pal.cyan}, 0.9)`; ctx.beginPath(); ctx.arc(10, 0, 1.3, 0, 6.2832); ctx.fill();                   // nose light
  ctx.restore();
}
function drawAA(ctx, x, y, aim, flash, pal) {
  const { lime, amber, hull } = pal;
  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.55)`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 10, y - 9); ctx.lineTo(x + 10, y - 9); ctx.lineTo(x + 14, y); ctx.closePath(); ctx.fill(); ctx.stroke();  // bunker
  ctx.beginPath(); ctx.arc(x, y - 9, 6, Math.PI, 0); ctx.fill(); ctx.stroke();                  // dome
  ctx.save(); ctx.translate(x, y - 11); ctx.rotate(aim);                                          // twin barrels track the plane
  ctx.strokeStyle = `rgba(${lime}, 0.8)`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(20, -2); ctx.moveTo(0, 2); ctx.lineTo(20, 2); ctx.stroke();
  if (flash > 0.02) { ctx.fillStyle = `rgba(${amber}, ${0.95 * flash})`; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(20 + 10 * flash, -3 * flash); ctx.lineTo(28 + 10 * flash, 0); ctx.lineTo(20 + 10 * flash, 3 * flash); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawHowitzer(ctx, dt, t, w, h, pal, st) {
  const { lime, cyan, amber, hull } = pal;
  const face = -1;                                                   // -1 = barrel faces up-left
  const gx = w * 0.30, gy = h - 18, ang = -0.62, dx = Math.cos(ang) * face, dy = Math.sin(ang), len = 44;
  const bang = Math.atan2(dy, dx);
  const bx = gx + 2 * face, by = gy - 15, mzx = bx + dx * len, mzy = by + dy * len;

  if (dt) {
    if (t >= st.nextAt) {
      st.flash = 1; st.recoil = 1; const sp = 230;
      st.shells.push({ x: mzx, y: mzy, vx: dx * sp, vy: dy * sp, age: 0 });
      st.puffs.push({ x: mzx, y: mzy, r: 3, age: 0 });
      st.nextAt = t + 8 + Math.random() * 6;
    }
    st.flash = Math.max(0, st.flash - dt * 6);
    st.recoil = Math.max(0, st.recoil - dt * 4);
    for (const s of st.shells) { s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 380 * dt; }
    st.shells = st.shells.filter((s) => s.age < 2.4 && s.y < h + 60 && s.x > -60 && s.x < w + 60);
    for (const p of st.puffs) { p.age += dt; p.r += 17 * dt; }
    st.puffs = st.puffs.filter((p) => p.age < 1.1);
  }

  for (const p of st.puffs) { ctx.fillStyle = `rgba(${lime}, ${0.38 * (1 - p.age / 1.1)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
  for (const s of st.shells) {
    const a = Math.min(1, 1.6 - s.age);
    ctx.strokeStyle = `rgba(${cyan}, ${0.4 * a})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035); ctx.stroke();
    ctx.fillStyle = `rgba(${cyan}, ${0.9 * a})`; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 6.2832); ctx.fill();
  }

  const rec = st.recoil * 8;
  ctx.strokeStyle = `rgba(${lime}, 0.5)`; ctx.lineWidth = 2;                       // split trail legs
  ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx + 20 * face, gy); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx - 16 * face, gy); ctx.stroke();
  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.6)`; ctx.lineWidth = 1.4; // wheel
  ctx.beginPath(); ctx.arc(gx - 3 * face, gy - 7, 7, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(gx - 8 * face, gy - 7); ctx.lineTo(gx + 2 * face, gy - 7); ctx.moveTo(gx - 3 * face, gy - 12); ctx.lineTo(gx - 3 * face, gy - 2); ctx.stroke();
  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.5)`; ctx.lineWidth = 1.2; // gun shield
  ctx.beginPath(); ctx.moveTo(gx - 9 * face, gy - 6); ctx.lineTo(gx - 11 * face, gy - 23); ctx.lineTo(gx + 4 * face, gy - 21); ctx.lineTo(gx + 7 * face, gy - 6); ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.save(); ctx.translate(bx - dx * rec, by - dy * rec);                          // breech + barrel (recoils)
  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.6)`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = `rgba(${lime}, 0.8)`; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * len, dy * len); ctx.stroke();
  ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(dx * (len - 5), dy * (len - 5)); ctx.lineTo(dx * len, dy * len); ctx.stroke();
  ctx.restore();

  if (st.flash > 0.02) {
    const a = st.flash;
    ctx.save(); ctx.translate(mzx - dx * rec, mzy - dy * rec); ctx.rotate(bang);
    ctx.fillStyle = `rgba(${amber}, ${0.5 * a})`; ctx.beginPath(); ctx.arc(0, 0, 8 * a, 0, 6.2832); ctx.fill();
    ctx.fillStyle = `rgba(${amber}, ${0.95 * a})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15 * a, -5 * a); ctx.lineTo(22 * a, 0); ctx.lineTo(15 * a, 5 * a); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
export function drawAirDefense(ctx, dt, t, w, h, pal, st) {
  const { lime, cyan, amber } = pal;
  const aax = w * 0.70, aay = h - 12;

  if (dt) {
    if (t >= st.planeAt) { spawnPlane(st, w, h); st.planeAt = t + 6 + Math.random() * 7; }
    for (const p of st.planes) {
      p.x += p.vx * dt;
      if (p.hit) { p.vy += 60 * dt; p.y += p.vy * dt; p.smokeT -= dt; if (p.smokeT <= 0) { st.aaBursts.push({ x: p.x, y: p.y, age: 0, ttl: 0.6, r: 2, smoke: true }); p.smokeT = 0.08; } }
    }
    st.planes = st.planes.filter((p) => p.x > -50 && p.x < w + 50 && p.y < h + 40);
  }

  let tgt = null, td = 1e9;                                              // nearest live plane
  for (const p of st.planes) { if (p.hit) continue; const d = Math.hypot(p.x - aax, p.y - aay); if (d < td) { td = d; tgt = p; } }
  const aimTarget = tgt ? Math.atan2(tgt.y - aay, tgt.x - aax) : -1.1;
  st.aaAim = st.aaAim == null ? aimTarget : st.aaAim + (aimTarget - st.aaAim) * (dt ? Math.min(1, dt * 6) : 1);

  if (dt) {
    st.aaCd -= dt;
    if (tgt && td < Math.max(w, h) * 0.95 && st.aaCd <= 0) {
      const lead = 0.25, ang = Math.atan2(tgt.y + tgt.vy * lead - aay, tgt.x + tgt.vx * lead - aax), sp = 185;
      st.aaTracers.push({ x: aax, y: aay - 11, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, age: 0, done: false });
      st.aaFlash = 1; st.aaCd = 0.45 + Math.random() * 0.4;
    }
    st.aaFlash = Math.max(0, st.aaFlash - dt * 7);
    for (const tr of st.aaTracers) {
      tr.age += dt; tr.x += tr.vx * dt; tr.y += tr.vy * dt;
      if (tr.age > 0.5 && !tr.done) {
        tr.done = true; st.aaBursts.push({ x: tr.x, y: tr.y, age: 0, ttl: 0.5, r: 2 });
        for (const p of st.planes) if (!p.hit && Math.hypot(p.x - tr.x, p.y - tr.y) < 16 && Math.random() < 0.5) { p.hit = true; p.vy = 10; p.smokeT = 0; }
      }
    }
    st.aaTracers = st.aaTracers.filter((tr) => !tr.done && tr.age < 0.6);
    for (const b of st.aaBursts) { b.age += dt; b.r += 26 * dt; }
    st.aaBursts = st.aaBursts.filter((b) => b.age < b.ttl);
  }

  for (const p of st.planes) drawPlane(ctx, p, t, pal);
  for (const b of st.aaBursts) { const a = 1 - b.age / b.ttl; ctx.strokeStyle = `rgba(${b.smoke ? lime : amber}, ${0.6 * a})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.stroke(); }
  ctx.lineWidth = 1.6;
  for (const tr of st.aaTracers) { const a = 1 - tr.age / 0.6; ctx.strokeStyle = `rgba(${cyan}, ${0.9 * a})`; ctx.beginPath(); ctx.moveTo(tr.x, tr.y); ctx.lineTo(tr.x - tr.vx * 0.03, tr.y - tr.vy * 0.03); ctx.stroke(); }
  drawAA(ctx, aax, aay, st.aaAim, st.aaFlash, pal);
  drawHowitzer(ctx, dt, t, w, h, pal, st);
}

// ---------- searching helicopters over the Contact card ----------
function makeFormation() {
  const n = 2 + (Math.random() < 0.5 ? 0 : 1);                 // 2 or 3, echelon trailing up-left
  return Array.from({ length: n }, (_, i) => ({ ox: -i * 34, oy: -i * 15, bob: Math.random() * 6.28, sweep: Math.random() * 6.28 }));
}
function beam(ctx, hx, hy, h, ang) {
  const reach = h - hy + 14, y = hy + 5, spread = 0.17;
  const x1 = hx + Math.tan(ang - spread) * reach, x2 = hx + Math.tan(ang + spread) * reach;
  const grd = ctx.createLinearGradient(hx, y, hx, y + reach);
  grd.addColorStop(0, 'rgba(255, 244, 206, 0.18)'); grd.addColorStop(1, 'rgba(255, 244, 206, 0)');
  ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(hx - 2, y); ctx.lineTo(hx + 2, y); ctx.lineTo(x2, y + reach); ctx.lineTo(x1, y + reach); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 206, 0.10)'; ctx.beginPath(); ctx.ellipse((x1 + x2) / 2, y + reach - 2, Math.abs(x2 - x1) / 2 + 5, 3.5, 0, 0, 6.2832); ctx.fill();
}
function drawHelo(ctx, hx, hy, t, pal) {
  const { lime, cyan, hull } = pal;
  ctx.save(); ctx.translate(hx, hy);
  ctx.fillStyle = hull; ctx.strokeStyle = `rgba(${lime}, 0.75)`; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-22, -3); ctx.lineTo(-22, -5); ctx.lineTo(-4, -3); ctx.closePath(); ctx.fill(); ctx.stroke(); // tail boom
  ctx.beginPath(); ctx.ellipse(2, 0, 10, 6, 0, 0, 6.2832); ctx.fill(); ctx.stroke();                                                          // body
  ctx.fillStyle = `rgba(${cyan}, 0.5)`; ctx.beginPath(); ctx.ellipse(7, -1, 3.4, 3, 0, 0, 6.2832); ctx.fill();                                 // canopy
  ctx.strokeStyle = `rgba(${lime}, 0.7)`; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-26, -9); ctx.stroke();                             // tail fin
  ctx.save(); ctx.translate(-24, -6); ctx.rotate(t * 18); ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke(); ctx.restore();    // tail rotor
  ctx.strokeStyle = `rgba(${lime}, 0.6)`; ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(10, 7); ctx.moveTo(-1, 6); ctx.lineTo(-1, 7); ctx.moveTo(7, 6); ctx.lineTo(7, 7); ctx.stroke(); // skids
  ctx.strokeStyle = `rgba(${lime}, 0.5)`; ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(2, -13); ctx.stroke();                                // mast
  ctx.strokeStyle = `rgba(${lime}, 0.22)`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(2, -13, 18, 2.4, 0, 0, 6.2832); ctx.stroke();      // rotor disc
  const rb = Math.cos(t * 30) * 18; ctx.strokeStyle = `rgba(${lime}, 0.6)`; ctx.beginPath(); ctx.moveTo(2 - rb, -13); ctx.lineTo(2 + rb, -13); ctx.stroke(); // blade
  ctx.restore();
}
export function drawChoppers(ctx, dt, t, w, h, pal, st) {
  if (dt) {
    if (st.phase === 'idle') {
      if (t >= st.nextAt) { st.phase = 'enter'; st.searchX = w * 0.5; st.fx = -90; st.fy = h * 0.30; st.helos = makeFormation(); }
    } else if (st.phase === 'enter') {
      st.fx += (st.searchX - st.fx) * Math.min(1, dt * 1.2);
      if (Math.abs(st.fx - st.searchX) < 6) { st.phase = 'search'; st.searchUntil = t + 5 + Math.random() * 3; }
    } else if (st.phase === 'search') {
      if (t >= st.searchUntil) st.phase = 'exit';
    } else if (st.phase === 'exit') {
      st.fx += 72 * dt;
      if (st.fx > w + 130) { st.phase = 'idle'; st.nextAt = t + 14 + Math.random() * 12; st.helos = []; }
    }
  }
  if (!st.helos.length) return;
  for (const he of st.helos) {                                   // beams first, helos on top
    const hx = st.fx + he.ox, hy = st.fy + he.oy + Math.sin(t * 1.6 + he.bob) * 3;
    beam(ctx, hx, hy, h, Math.sin(t * 0.9 + he.sweep) * 0.5);
  }
  for (const he of st.helos) {
    const hx = st.fx + he.ox, hy = st.fy + he.oy + Math.sin(t * 1.6 + he.bob) * 3;
    drawHelo(ctx, hx, hy, t, pal);
  }
}

export function initMilitaryProps() {
  let tank = null, arty = null, choppers = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !tank) { const st = { tanks: [], puffs: [] }; tank = attach(f, 'left:0;width:100%;top:-46px;height:48px;', (ctx, dt, t, w, h, pal) => drawConvoy(ctx, dt, t, w, h, pal, st)); }
    const aside = document.querySelector('#about .portrait')?.closest('aside') || document.querySelector('#about .portrait')?.parentElement;
    if (aside && !arty) {
      const st = { nextAt: 3 + Math.random() * 4, flash: 0, recoil: 0, shells: [], puffs: [], planes: [], planeAt: 2 + Math.random() * 3, aaAim: null, aaCd: 0, aaFlash: 0, aaTracers: [], aaBursts: [] };
      arty = attach(aside, 'left:0;width:100%;top:-172px;height:172px;', (ctx, dt, t, w, h, pal) => drawAirDefense(ctx, dt, t, w, h, pal, st));
    }
    const cp = document.querySelector('#contact .contact-pane');
    if (cp && !choppers) {
      const st = { phase: 'idle', nextAt: 4 + Math.random() * 6, fx: 0, fy: 0, searchX: 0, searchUntil: 0, helos: [] };
      choppers = attach(cp, 'left:0;width:100%;top:-150px;height:150px;', (ctx, dt, t, w, h, pal) => drawChoppers(ctx, dt, t, w, h, pal, st));
    }
  }
  function unmount() { if (tank) { tank.destroy(); tank = null; } if (arty) { arty.destroy(); arty = null; } if (choppers) { choppers.destroy(); choppers = null; } }
  function sync() { if (document.documentElement.dataset.skin === 'military') mount(); else unmount(); }

  window.addEventListener('skinchange', sync);
  sync();
}
