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

    // NOTE: no sun bloom / godrays in the sky — the sunrise HERO is the only
    // sun. A second light source up here competed with it and fired shafts off
    // to one side. The sky is just warm haze behind the hero now.

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
