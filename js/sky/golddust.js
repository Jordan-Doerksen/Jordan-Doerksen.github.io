// ==========================================================================
// SKY MODE · GOLDDUST — Chic. A quiet luxe field: fine champagne-gold motes
// drifting slowly and twinkling, the odd brighter sparkle with a 4-point glint,
// under a faint gold haze. Reads --sky-warm (gold) + --sky-meteor (ivory). Low-
// alpha so it stays glamorous, not busy, on the charcoal.
// ==========================================================================

export function makeGoldDust(ctx) {
  let w = 0, h = 0, motes = [];

  function spawn(seed) {
    return {
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      r: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28, sw: 0.6 + Math.random() * 1.4,
      sparkle: Math.random() < 0.16, ivory: Math.random() < 0.3,
      age: seed ? Math.random() * 6 : 0, ttl: 6 + Math.random() * 6,
    };
  }
  function resize(_w, _h) {
    w = _w; h = _h;
    motes = Array.from({ length: Math.max(20, Math.round((w * h) / 14000)) }, () => spawn(true));
  }

  function glint(x, y, s, col, a) {
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
  }
  function draw(dt, env) {
    const { t, skin } = env, gold = skin.warm, ivory = skin.meteor;
    const [r, g, b] = skin.nebula;
    const grd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.7);   // faint gold haze
    grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.04)`); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

    for (const m of motes) {
      if (dt) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; if (m.age > m.ttl || m.x < -6 || m.x > w + 6 || m.y < -6 || m.y > h + 6) Object.assign(m, spawn(false)); }
      const f = Math.max(0, Math.min(1, Math.min(m.age / 1.2, (m.ttl - m.age) / 1.6)));
      if (f <= 0) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * m.sw + m.ph), col = m.ivory ? ivory : gold, a = f * tw;
      ctx.fillStyle = `rgba(${col}, ${0.6 * a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
      if (m.sparkle && tw > 0.85) glint(m.x, m.y, m.r + 2.5, ivory, 0.5 * a);
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
