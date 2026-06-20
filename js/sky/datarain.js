// ==========================================================================
// SKY MODE · DATARAIN — Sentinel. A dark field with sparse columns of red data
// raining down (leading glyph brighter), under a faint breathing red glow.
// ==========================================================================

export function makeDataRain(ctx) {
  let w = 0, h = 0, cols = [];

  function resize(_w, _h) {
    w = _w; h = _h;
    const n = Math.max(8, Math.floor(w / 22));
    cols = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * (w / n) + (Math.random() - 0.5) * 10,
      y: Math.random() * h,
      speed: 55 + Math.random() * 120,
      len: 6 + Math.floor(Math.random() * 12),
    }));
  }

  function glow(skin, t) {
    const [r, g, b] = skin.nebula;
    const breath = 0.85 + 0.15 * Math.sin(t * 0.5);
    const grd = ctx.createRadialGradient(w * 0.5, h * 0.22, 0, w * 0.5, h * 0.22, Math.max(w, h) * 0.72);
    grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.08 * breath})`); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  }

  function draw(dt, env) {
    const { t, skin } = env;
    glow(skin, t);
    for (const c of cols) {
      if (dt) { c.y += c.speed * dt; if (c.y - c.len * 9 > h) { c.y = -Math.random() * h * 0.5; c.x = Math.random() * w; } }
      for (let k = 0; k < c.len; k++) {
        const yy = c.y - k * 9;
        if (yy < 0 || yy > h) continue;
        const a = (k === 0 ? 0.55 : 0.30 - k * 0.03);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(${k === 0 ? skin.meteor : skin.warm}, ${a})`;
        ctx.fillRect(c.x - 1, yy, 2, 7);
      }
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
