// ==========================================================================
// SKY MODE · DAYLIGHT — Daybreak. A warm wash, a soft sun bloom high in the
// sky, gentle godrays, low haze wisps (NOT fat white blobs), and rising motes.
// Kept deliberately faint so it reads as sky, not as smudges on the paper.
// ==========================================================================

export function makeDaylight(ctx) {
  let w = 0, h = 0, wisps = [], motes = [];

  function resize(_w, _h) {
    w = _w; h = _h;
    // thin, low, horizontal haze bands — drift slowly across the lower-middle
    wisps = Array.from({ length: 4 }, () => ({
      x: Math.random() * w, y: h * (0.45 + Math.random() * 0.4),
      r: 130 + Math.random() * 150, v: 4 + Math.random() * 5,
      a: 0.05 + Math.random() * 0.05,
    }));
    motes = Array.from({ length: 26 }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 4, vy: -(3 + Math.random() * 6), p: Math.random() * 6.28,
    }));
  }

  function drawWisp(c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, 0.16);                         // flatten the circle into a haze band
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r);
    g.addColorStop(0, `rgba(255, 250, 240, ${c.a})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function draw(dt, env) {
    const { t } = env;

    // warm wash, strongest at the top
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255, 236, 200, 0.42)');
    g.addColorStop(0.55, 'rgba(255, 246, 228, 0.10)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // a soft sun bloom, high and to one side (no hard disc)
    const sx = w * 0.74, sy = h * 0.12, sr = Math.min(w, h) * 0.55;
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    g.addColorStop(0, 'rgba(255, 224, 154, 0.20)');
    g.addColorStop(0.5, 'rgba(255, 232, 178, 0.06)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // gentle godrays fanning from the sun
    ctx.save(); ctx.translate(sx, sy);
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.17;
      const x2 = Math.sin(a) * h * 1.6, y2 = Math.cos(a) * h * 1.6;
      const gr = ctx.createLinearGradient(0, 0, x2, y2);
      gr.addColorStop(0, 'rgba(255, 226, 160, 0.05)'); gr.addColorStop(1, 'transparent');
      ctx.strokeStyle = gr; ctx.lineWidth = 46; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();

    for (const c of wisps) {
      if (dt) { c.x += c.v * dt; if (c.x - c.r > w) c.x = -c.r; }
      drawWisp(c);
    }
    for (const m of motes) {
      if (dt) { m.x += m.vx * dt; m.y += m.vy * dt; if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; } }
      const a = 0.07 + 0.09 * Math.abs(Math.sin(m.p + t));
      ctx.fillStyle = `rgba(228, 188, 120, ${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832); ctx.fill();
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
