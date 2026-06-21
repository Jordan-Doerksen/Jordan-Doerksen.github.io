// ==========================================================================
// SKY MODE · VALLEY — Nature. The full-page alpine backdrop: a soft sun, three
// parallaxing evergreen ridgelines (lighter = farther) with a pine treeline on
// the front ridge, a winding river with a moving shimmer, and drifting mist +
// rising pollen motes for atmosphere. Parallax follows the cursor. Reads
// --sky-nebula (evergreen) + --sky-warm (pollen) + --sky-meteor (river cyan).
// ==========================================================================

export function makeValley(ctx) {
  let w = 0, h = 0, ridges = [], trees = [], wisps = [], motes = [];
  let ducks = [], debris = [], fishes = [], splashes = [], fishTimer = 3, debrisTimer = 5;
  const peaks = (n) => Array.from({ length: n + 1 }, () => Math.random());
  function spawnMote(seed) { return { x: Math.random() * w, y: seed ? Math.random() * h : h + 10, r: 1 + Math.random() * 2, vy: -(4 + Math.random() * 9), sw: 0.4 + Math.random() * 0.8, ph: Math.random() * 6.28, age: seed ? Math.random() * 5 : 0, ttl: 6 + Math.random() * 5, cyan: Math.random() < 0.4 }; }
  function spawnDuck(x) { const dep = Math.random(); return { x, ph: Math.random() * 6.28, dep, s: 0.78 + dep * 0.5, sp: 8 + Math.random() * 18 + dep * 8 }; }   // dep = how near (0 far/small/slow .. 1 near/big/fast)
  function spawnDebris() { const dep = Math.random(); return { x: -40, dep, s: 0.8 + dep * 0.5, sp: 7 + Math.random() * 15 + dep * 6, kind: Math.random() < 0.6 ? 'log' : 'mat' }; }
  function resize(_w, _h) {
    w = _w; h = _h;
    ridges = [
      { base: 0.55, amp: 0.14, n: 8, a: 0.16, depth: 0.06, p: peaks(8) },
      { base: 0.66, amp: 0.22, n: 7, a: 0.32, depth: 0.13, p: peaks(7) },
      { base: 0.78, amp: 0.30, n: 6, a: 0.56, depth: 0.24, p: peaks(6) },
    ];
    const tn = Math.max(6, Math.round(w / 80)), step = w / tn;
    trees = Array.from({ length: tn }, (_, i) => ({ x: (i + 0.2 + Math.random() * 0.6) * step, hgt: 14 + Math.random() * 18 }));
    wisps = Array.from({ length: 4 }, () => ({ x: Math.random() * w, y: h * (0.5 + Math.random() * 0.32), r: 160 + Math.random() * 160, v: 4 + Math.random() * 5, a: 0.05 + Math.random() * 0.05 }));
    motes = Array.from({ length: Math.max(10, Math.round((w * h) / 42000)) }, () => spawnMote(true));
    ducks = Array.from({ length: Math.max(2, Math.round(w / 440)) }, () => spawnDuck(Math.random() * w));
    debris = []; fishes = []; splashes = []; fishTimer = 2 + Math.random() * 4; debrisTimer = 4 + Math.random() * 6;
  }

  function drawDuck(x, y, ever, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(78, 66, 48, 0.92)';
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 6.2832); ctx.fill();                                              // body
    ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(-10, -3); ctx.lineTo(-5, 1); ctx.closePath(); ctx.fill();        // tail
    ctx.fillStyle = `rgba(${ever}, 0.95)`;
    ctx.beginPath(); ctx.moveTo(4, -1); ctx.quadraticCurveTo(8, -2, 7, -6); ctx.quadraticCurveTo(5, -7, 3, -4); ctx.closePath(); ctx.fill();   // neck
    ctx.beginPath(); ctx.arc(6, -6, 2.2, 0, 6.2832); ctx.fill();                                                     // head
    ctx.fillStyle = 'rgba(222, 170, 60, 0.95)'; ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(11, -5.4); ctx.lineTo(8, -4.6); ctx.closePath(); ctx.fill();   // bill
    ctx.restore();
  }
  function drawDebris(x, y, kind, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'log') { ctx.fillStyle = 'rgba(74, 54, 36, 0.9)'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = 'rgba(40, 28, 18, 0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(11, 0, 1.5, 2.6, 0, 0, 6.2832); ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(60, 90, 55, 0.7)'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 2, 0, 0, 6.2832); ctx.fill(); }   // leafy mat
    ctx.restore();
  }
  function drawFish(x, y, ang, dir, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(dir * s, s);
    ctx.fillStyle = 'rgba(150, 170, 175, 0.92)';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, 0, 0, 6.2832); ctx.fill();                                            // body
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-8, -2.5); ctx.lineTo(-8, 2.5); ctx.closePath(); ctx.fill();      // tail
    ctx.fillStyle = 'rgba(40, 60, 70, 0.8)'; ctx.beginPath(); ctx.arc(3.4, -0.4, 0.6, 0, 6.2832); ctx.fill();        // eye
    ctx.restore();
  }

  function ridge(L, ever, par) {
    ctx.fillStyle = `rgba(${ever}, ${L.a})`; ctx.beginPath(); ctx.moveTo(-20, h);
    for (let i = 0; i <= L.n; i++) ctx.lineTo(-20 + (w + 40) * (i / L.n) + par * L.depth, h * L.base - L.p[i] * L.amp * h);
    ctx.lineTo(w + 20, h); ctx.closePath(); ctx.fill();
  }
  function pine(x, baseY, hgt, ever) {
    ctx.fillStyle = `rgba(${ever}, 0.66)`;
    for (let k = 0; k < 3; k++) { const ky = baseY - k * hgt * 0.28, kw = hgt * (0.34 - k * 0.07); ctx.beginPath(); ctx.moveTo(x, ky - hgt * 0.5); ctx.lineTo(x - kw, ky); ctx.lineTo(x + kw, ky); ctx.closePath(); ctx.fill(); }
  }

  function draw(dt, env) {
    const { t, scrollY, smx, skin } = env;
    const ever = skin.nebula.join(', '), cyan = skin.meteor, pollen = skin.warm;
    const par = ((smx || 0.5) - 0.5) * 18 - (scrollY || 0) * 0.01;

    let g = ctx.createLinearGradient(0, 0, 0, h * 0.85);            // cool sky
    g.addColorStop(0, `rgba(${cyan}, 0.10)`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    const sx = w * 0.74, sy = h * 0.2;                              // sun
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.4);
    sg.addColorStop(0, 'rgba(245, 230, 190, 0.45)'); sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(250, 240, 215, 0.7)'; ctx.beginPath(); ctx.arc(sx, sy, h * 0.05, 0, 6.2832); ctx.fill();

    ridge(ridges[0], ever, par); ridge(ridges[1], ever, par);      // far + mid ridges
    for (const c of wisps) { if (dt) { c.x += c.v * dt; if (c.x - c.r > w) { c.x = -c.r; c.y = h * (0.5 + Math.random() * 0.32); } } ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, 0.16); const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r); wg.addColorStop(0, `rgba(236, 242, 245, ${c.a})`); wg.addColorStop(1, 'transparent'); ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.2832); ctx.fill(); ctx.restore(); }
    ridge(ridges[2], ever, par);                                   // front ridge
    const baseY = h * ridges[2].base + 2;                          // treeline on the front ridge
    for (const tr of trees) pine(tr.x + par * ridges[2].depth, baseY, tr.hgt, ever);

    const ry = h * 0.9, amp = 6;                                   // winding river band
    ctx.save(); ctx.beginPath();
    ctx.moveTo(0, ry + Math.sin(t * 0.4) * amp);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, ry + Math.sin(x * 0.01 + t * 0.4) * amp);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    const rg = ctx.createLinearGradient(0, ry, 0, h); rg.addColorStop(0, `rgba(${cyan}, 0.28)`); rg.addColorStop(1, `rgba(${cyan}, 0.5)`);
    ctx.fillStyle = rg; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) { const sxx = ((t * 30 + i * 180) % (w + 200)) - 100; ctx.beginPath(); ctx.moveTo(sxx, ry + 8 + i * 4); ctx.lineTo(sxx + 40, ry + 8 + i * 4); ctx.stroke(); }
    ctx.restore();

    // ----- river life: ducks drifting down, drifting logs/debris, the odd fish jumping -----
    const surf = (x) => ry + Math.sin(x * 0.01 + t * 0.4) * amp;
    const yAt = (x, dep) => { const s = surf(x); return s + dep * (h - s) * 0.7; };   // spread across the river band by depth
    if (dt) {
      for (const d of ducks) { d.x += d.sp * dt; if (d.x > w + 30) Object.assign(d, spawnDuck(-30)); }
      debrisTimer -= dt; if (debrisTimer <= 0) { debris.push(spawnDebris()); debrisTimer = 5 + Math.random() * 9; }
      for (const o of debris) o.x += o.sp * dt; debris = debris.filter((o) => o.x < w + 50);
      fishTimer -= dt; if (fishTimer <= 0) { const fx = w * (0.12 + Math.random() * 0.76); fishes.push({ x0: fx, t0: t, dur: 0.9 + Math.random() * 0.5, peak: 14 + Math.random() * 22, dir: Math.random() < 0.5 ? 1 : -1, s: 0.8 + Math.random() * 0.6 }); splashes.push({ x: fx, y: surf(fx), age: 0 }); fishTimer = 3 + Math.random() * 6; }
      fishes = fishes.filter((f) => t - f.t0 < f.dur);
      for (const s of splashes) s.age += dt; splashes = splashes.filter((s) => s.age < 0.5);
    }
    for (const o of debris) drawDebris(o.x, yAt(o.x, o.dep) - 1, o.kind, o.s);
    for (const d of ducks) drawDuck(d.x, yAt(d.x, d.dep) - 3 + Math.sin(t * 2 + d.ph) * 1.2, ever, d.s);
    for (const f of fishes) { const p = (t - f.t0) / f.dur, x = f.x0 + f.dir * p * 18, y = surf(f.x0) - Math.sin(p * Math.PI) * f.peak, ang = Math.cos(p * Math.PI) * f.dir * 0.9; drawFish(x, y, ang, f.dir, f.s); }
    for (const s of splashes) { const f = 1 - s.age / 0.5; ctx.strokeStyle = `rgba(${cyan}, ${0.6 * f})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, 3 + 14 * (s.age / 0.5), 0, 6.2832); ctx.stroke(); }

    for (const m of motes) {                                       // rising pollen
      if (dt) { m.age += dt; m.y += m.vy * dt; m.x += Math.sin(t * m.sw + m.ph) * 8 * dt; if (m.age > m.ttl || m.y < -10) Object.assign(m, spawnMote(false)); }
      const f = Math.max(0, Math.min(1, Math.min(m.age / 1, (m.ttl - m.age) / 1.4)));
      if (f <= 0) continue;
      ctx.fillStyle = `rgba(${m.cyan ? cyan : pollen}, ${0.5 * f})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
