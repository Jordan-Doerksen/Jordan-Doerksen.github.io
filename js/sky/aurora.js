// ==========================================================================
// SKY MODE · AURORA — Angelic. A combined heavenly field: flowing curtains of
// soft gold + celestial-blue light (the aurora veils) layered with gentle bokeh
// orbs that bloom, rise and fade, and the odd halo ring expanding outward. All
// low-alpha so it stays luminous, not busy, on the pearl background. Reads
// --sky-warm (gold) + --sky-meteor (blue).
// ==========================================================================

export function makeAurora(ctx) {
  let w = 0, h = 0, bands = [], orbs = [], halos = [];

  function spawnOrb(seed) {
    return {
      x: Math.random() * w, y: seed ? Math.random() * h : h + 30 + Math.random() * 50,
      r: 16 + Math.random() * 64, age: seed ? Math.random() * 4 : 0, ttl: 5 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 6, vy: -(6 + Math.random() * 14), blue: Math.random() < 0.42,
    };
  }
  function spawnHalo() { return { x: w * (0.2 + Math.random() * 0.6), y: h * (0.2 + Math.random() * 0.6), r: 10, age: 0, ttl: 3 + Math.random() * 2 }; }
  function resize(_w, _h) {
    w = _w; h = _h;
    bands = Array.from({ length: 5 }, (_, i) => ({
      cx: (i + 0.5) / 5, amp: 0.05 + Math.random() * 0.06, freq: 2 + Math.random() * 2,
      speed: 0.22 + Math.random() * 0.3, phase: Math.random() * 6.28,
      width: 0.10 + Math.random() * 0.08, blue: i % 2 === 1,
    }));
    orbs = Array.from({ length: Math.max(8, Math.round((w * h) / 90000)) }, () => spawnOrb(true));
    halos = [];
  }

  function band(b, t, skin) {                                       // a flowing aurora curtain
    const col = b.blue ? skin.meteor : skin.warm, steps = 24, xs = [];
    for (let i = 0; i <= steps; i++) xs.push((b.cx + Math.sin((i / steps) * b.freq * 3 + t * b.speed + b.phase) * b.amp) * w);
    const ww = b.width * w;
    ctx.beginPath();
    ctx.moveTo(xs[0] - ww / 2, 0);
    for (let i = 0; i <= steps; i++) ctx.lineTo(xs[i] - ww / 2, (i / steps) * h);
    for (let i = steps; i >= 0; i--) ctx.lineTo(xs[i] + ww / 2, (i / steps) * h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(${col}, 0)`); g.addColorStop(0.25, `rgba(${col}, 0.14)`);
    g.addColorStop(0.65, `rgba(${col}, 0.06)`); g.addColorStop(1, `rgba(${col}, 0)`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(${col}, 0.10)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = 0; i <= steps; i++) { const y = (i / steps) * h; i ? ctx.lineTo(xs[i], y) : ctx.moveTo(xs[i], y); } ctx.stroke();
  }
  function orb(o, skin) {                                           // a soft bokeh bloom
    const f = Math.max(0, Math.min(1, Math.min(o.age / 1.2, (o.ttl - o.age) / 1.5)));
    if (f <= 0) return;
    const col = o.blue ? skin.meteor : skin.warm, a = 0.16 * f;
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, `rgba(${col}, ${a})`); g.addColorStop(0.6, `rgba(${col}, ${a * 0.4})`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.2832); ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.55})`; ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.16, 0, 6.2832); ctx.fill();
  }
  function halo(hl, skin) {                                         // an expanding halo ring
    const f = 1 - hl.age / hl.ttl; if (f <= 0) return;
    ctx.strokeStyle = `rgba(${skin.warm}, ${0.20 * f})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hl.x, hl.y, hl.r, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * f})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hl.x, hl.y, hl.r * 0.7, 0, 6.2832); ctx.stroke();
  }

  function draw(dt, env) {
    const { t, skin } = env;
    const g = ctx.createLinearGradient(0, 0, 0, h);                 // faint wash from the top
    g.addColorStop(0, `rgba(${skin.warm}, 0.05)`); g.addColorStop(0.6, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    for (const b of bands) band(b, t, skin);                        // veils behind
    for (const o of orbs) {                                         // bokeh in the middle
      if (dt) { o.age += dt; o.x += o.vx * dt; o.y += o.vy * dt; if (o.age > o.ttl || o.y < -o.r) Object.assign(o, spawnOrb(false)); }
      orb(o, skin);
    }
    if (dt) {
      if (Math.random() < dt * 0.4) halos.push(spawnHalo());
      for (const hl of halos) { hl.age += dt; hl.r += 26 * dt; }
      halos = halos.filter((hl) => hl.age < hl.ttl);
    }
    for (const hl of halos) halo(hl, skin);                         // halo rings in front
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
