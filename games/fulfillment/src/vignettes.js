// FULFILLMENT hero vignettes — three looping scenes behind the wordmark, crossfaded on a slow cycle:
// EXHIBIT A the floor (swarm + tracers) · EXHIBIT B management (gapped rings) · EXHIBIT C the pact
// (accretion + lightning). Pure canvas, no deps; honors prefers-reduced-motion (static single frame).
"use strict";
(() => {
  const cv = document.getElementById('vig'), cx = cv.getContext('2d');
  const label = document.getElementById('vig-label');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0;
  const fit = () => { W = cv.width = cv.clientWidth * devicePixelRatio; H = cv.height = cv.clientHeight * devicePixelRatio; };
  addEventListener('resize', fit); fit();

  const stars = Array.from({length: 130}, () => ({ x: Math.random(), y: Math.random(), d: .3 + Math.random() * .7, r: .6 + Math.random() * 1.4 }));
  const NAMES = ['EXHIBIT A — THE FLOOR', 'EXHIBIT B — MANAGEMENT', 'EXHIBIT C — THE PACT'];
  let scene = 0, sceneT = 0, fade = 1;

  // scene state
  let ship = { x: .3, y: .55, vx: .04, vy: 0 };
  let foes = [], shots = [], parts = [], rings = [], bshards = [], bolts = [], infall = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function drawStars(camx) {
    for (const s of stars) {
      const sx = ((s.x - camx * s.d * .05) % 1 + 1) % 1;
      cx.globalAlpha = .5 * s.d; cx.fillStyle = '#9fb8e0';
      cx.fillRect(sx * W, s.y * H, s.r * devicePixelRatio, s.r * devicePixelRatio);
    }
    cx.globalAlpha = 1;
  }
  function craft(x, y, ang, scale, col) {
    cx.save(); cx.translate(x, y); cx.rotate(ang); cx.scale(scale, scale);
    cx.fillStyle = col;
    cx.beginPath(); cx.moveTo(16, 0); cx.lineTo(-9, 9); cx.lineTo(-4, 0); cx.lineTo(-9, -9); cx.closePath(); cx.fill();
    cx.fillStyle = '#48d8ff'; cx.fillRect(-8, -2, 4, 4);
    cx.restore();
  }
  function boomAt(x, y, col) { for (let i = 0; i < 10; i++) { const a = rnd(0, 6.283), s = rnd(40, 190); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.25, .5), col }); } }

  // ── scene ticks (all coordinates in device px) ──
  function tickFloor(dt, t) {
    ship.x = W * .5 + Math.cos(t * .5) * W * .18; ship.y = H * .55 + Math.sin(t * .8) * H * .13;
    const ang = Math.atan2(Math.cos(t * .8) * H * .13 * .8, -Math.sin(t * .5) * W * .18 * .5);
    while (foes.length < 26) foes.push({ x: rnd(0, W), y: -20, vx: rnd(-20, 20), vy: rnd(30, 80), r: rnd(7, 15) * devicePixelRatio, hp: 2 });
    if (Math.random() < .5) { const f = foes[(Math.random() * foes.length) | 0]; if (f) { const a = Math.atan2(f.y - ship.y, f.x - ship.x) + rnd(-.06, .06); shots.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * 900 * devicePixelRatio, vy: Math.sin(a) * 900 * devicePixelRatio, life: 1 }); } }
    for (const s of shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      for (const f of foes) { if (Math.abs(f.x - s.x) < f.r && Math.abs(f.y - s.y) < f.r) { f.hp--; s.life = 0; if (f.hp <= 0) { f.dead = true; boomAt(f.x, f.y, '#9fe8ff'); } } } }
    for (const f of foes) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > H + 30) f.dead = true; }
    foes = foes.filter(f => !f.dead); shots = shots.filter(s => s.life > 0);
    // draw
    drawStars(t * .1);
    for (const f of foes) { cx.fillStyle = '#b45a4e'; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill(); }
    cx.strokeStyle = '#ffd27a';
    for (const s of shots) { cx.beginPath(); cx.moveTo(s.x - s.vx * .012, s.y - s.vy * .012); cx.lineTo(s.x, s.y); cx.stroke(); }
    craft(ship.x, ship.y, ang, devicePixelRatio * 1.15, '#cfe4ff');
  }
  function tickBoss(dt, t) {
    const bx = W * .62, by = H * .42;
    ship.x = W * .5 + Math.cos(t * 1.1) * W * .3; ship.y = H * .62 + Math.sin(t * 1.7) * H * .16;
    if ((t % 2.6) < dt) { // gapped ring
      const gap = Math.atan2(ship.y - by, ship.x - bx), base = rnd(0, 6.283);
      for (let k = 0; k < 22; k++) { const a = base + 6.283 * k / 22;
        if (Math.abs(((a - gap + 9.42) % 6.283) - 3.14) < .5) continue;
        bshards.push({ x: bx, y: by, vx: Math.cos(a) * 170 * devicePixelRatio, vy: Math.sin(a) * 170 * devicePixelRatio, life: 3 }); }
      rings.push({ x: bx, y: by, r: 30, life: .5 });
    }
    for (const s of bshards) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; }
    bshards = bshards.filter(s => s.life > 0);
    drawStars(t * .05);
    // the supervisor: octagon + halo
    cx.save(); cx.translate(bx, by); cx.rotate(t * .3);
    cx.fillStyle = '#57606e'; cx.beginPath();
    for (let i = 0; i < 8; i++) { const a = 6.283 * i / 8, r = 34 * devicePixelRatio; i ? cx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : cx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    cx.closePath(); cx.fill();
    cx.strokeStyle = '#ff8a70'; cx.lineWidth = 2 * devicePixelRatio; cx.stroke(); cx.lineWidth = 1;
    cx.restore();
    cx.fillStyle = '#ffd0a0';
    for (const s of bshards) { cx.beginPath(); cx.arc(s.x, s.y, 3.4 * devicePixelRatio, 0, 6.283); cx.fill(); }
    for (const g of rings) { g.r += 300 * dt * devicePixelRatio; g.life -= dt; cx.globalAlpha = Math.max(0, g.life); cx.strokeStyle = '#ff8a70'; cx.beginPath(); cx.arc(g.x, g.y, g.r, 0, 6.283); cx.stroke(); cx.globalAlpha = 1; }
    rings = rings.filter(g => g.life > 0);
    craft(ship.x, ship.y, t * 1.1 + 1.6, devicePixelRatio, '#cfe4ff');
  }
  function tickPact(dt, t) {
    const cxp = W * .5, cyp = H * .46, core = Math.min(W, H) * .085, rr = Math.min(W, H) * .3;
    if (infall.length < 90) infall.push({ a: rnd(0, 6.283), r: rr * rnd(.95, 1.3), av: rnd(1.2, 2.6), rv: rnd(.04, .09) * rr });
    if (Math.random() < .05) { const pts = []; let a0 = rnd(0, 6.283); for (let i = 0; i < 8; i++) { const f = i / 7; pts.push([cxp + Math.cos(a0 + f * rnd(.5, 1.5)) * (rr - f * (rr - core)) + rnd(-14, 14), cyp + Math.sin(a0 + f * rnd(.5, 1.5)) * (rr - f * (rr - core)) * .42 + rnd(-14, 14)]); } bolts.push({ pts, life: .3 }); }
    drawStars(t * .02);
    for (let i = 0; i < 5; i++) { const f = i / 4, ringr = core * 1.15 + (rr - core) * f;
      cx.strokeStyle = `rgba(${200 - f * 80},${90 + f * 40},${200},${.16 - f * .02})`; cx.lineWidth = (3 - f * 2) * devicePixelRatio;
      cx.beginPath(); cx.ellipse(cxp, cyp, ringr, ringr * .42, 0, 0, 6.283); cx.stroke(); }
    cx.lineWidth = 1;
    for (const p of infall) { const acc = 1 + core / Math.max(core, p.r) * 1.5; p.r -= p.rv * dt * 60 * acc * .3; p.a += p.av * dt * acc; if (p.r < core * .9) { p.r = rr * rnd(.95, 1.3); p.a = rnd(0, 6.283); }
      cx.fillStyle = 'rgba(255,170,240,.8)'; cx.fillRect(cxp + Math.cos(p.a) * p.r, cyp + Math.sin(p.a) * p.r * .42, 2 * devicePixelRatio, 2 * devicePixelRatio); }
    for (const b of bolts) { b.life -= dt; cx.globalAlpha = Math.max(0, b.life * 3); cx.strokeStyle = '#cdb6ff';
      cx.beginPath(); b.pts.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.stroke(); cx.globalAlpha = 1; }
    bolts = bolts.filter(b => b.life > 0);
    cx.fillStyle = '#050208'; cx.beginPath(); cx.arc(cxp, cyp, core, 0, 6.283); cx.fill();
    cx.strokeStyle = 'rgba(200,120,255,.95)'; cx.lineWidth = 2.4 * devicePixelRatio; cx.beginPath(); cx.arc(cxp, cyp, core, 0, 6.283); cx.stroke(); cx.lineWidth = 1;
  }

  const TICKS = [tickFloor, tickBoss, tickPact];
  function swap() { scene = (scene + 1) % 3; foes = []; shots = []; parts = []; rings = []; bshards = []; bolts = []; infall = []; label.textContent = NAMES[scene]; }

  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; sceneT += dt;
    if (sceneT > 11) { sceneT = 0; swap(); }
    fade = Math.min(1, Math.min(sceneT, 11 - sceneT) * 1.4);
    cx.fillStyle = '#04070f'; cx.fillRect(0, 0, W, H);
    cx.globalAlpha = fade * .9;
    TICKS[scene](dt, t);
    for (const p of parts) { p.x += p.vx * dt * devicePixelRatio; p.y += p.vy * dt * devicePixelRatio; p.life -= dt; cx.globalAlpha = Math.max(0, p.life * 2 * fade); cx.fillStyle = p.col; cx.fillRect(p.x, p.y, 3, 3); }
    parts = parts.filter(p => p.life > 0);
    cx.globalAlpha = 1;
    // vignette dark edges so the wordmark owns the middle
    const g = cx.createRadialGradient(W / 2, H / 2, H * .18, W / 2, H / 2, H * .75);
    g.addColorStop(0, 'rgba(4,7,15,.45)'); g.addColorStop(1, 'rgba(4,7,15,.92)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    if (!REDUCED) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);   // reduced-motion: renders exactly one composed frame and stops
})();
