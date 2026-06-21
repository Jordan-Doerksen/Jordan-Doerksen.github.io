// ==========================================================================
// HERO MOTIF · GEM — Chic. A brilliant-cut gem: a crown of facets above a
// pavilion, slowly rotating, each facet catching light from a source that
// follows the cursor (so the gem "turns to the light"). Sparkle glints pop at
// the brightest facets; it grows in on entry. gold = --gold, ivory = --accent.
// make(ctx) -> { resize, frame(dt, env), static(env) }
// ==========================================================================

export function makeGem(ctx) {
  let w = 0, h = 0;
  const N = 8;   // facets around

  function draw(dt, env, intro) {
    const { t, mx, my, skin } = env;
    const gold = skin.accent, ivory = skin.data || skin.accent;   // hero: accent=--gold, data=--accent(ivory)
    const cx = w * 0.5, cy = h * 0.46;
    const settle = Math.max(0, Math.min(1, intro));
    const R = Math.min(w, h) * 0.26 * (0.5 + 0.5 * settle);
    const tableR = R * 0.46, culet = cy + R * 1.15;
    const spin = t * 0.3;
    const lightA = mx > -9000 ? Math.atan2(my - cy, mx - cx) : -2.2;   // light follows cursor
    const A = (i) => spin - Math.PI / 2 + i * 2 * Math.PI / N;
    const outer = (i) => [cx + Math.cos(A(i)) * R, cy + Math.sin(A(i)) * R];
    const tabl = (i) => [cx + Math.cos(A(i) + Math.PI / N) * tableR, cy + Math.sin(A(i) + Math.PI / N) * tableR];
    const shade = (ang) => 0.18 + 0.6 * Math.max(0, Math.cos(ang - lightA));

    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);   // gem glow
    gg.addColorStop(0, `rgba(${gold}, ${0.16 * settle})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);

    ctx.save(); ctx.globalAlpha = settle;
    // pavilion (lower facets, darker) — triangles from each girdle edge to the culet
    for (let i = 0; i < N; i++) {
      const a = outer(i), b = outer((i + 1) % N), mid = A(i) + Math.PI / N;
      ctx.fillStyle = `rgba(${gold}, ${0.10 + 0.28 * shade(mid)})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cx, culet); ctx.closePath(); ctx.fill();
    }
    // crown facets — trapezoids between girdle and table
    for (let i = 0; i < N; i++) {
      const a = outer(i), b = outer((i + 1) % N), tb = tabl(i), ta = tabl((i - 1 + N) % N);
      ctx.fillStyle = `rgba(${gold}, ${0.22 + 0.5 * shade(A(i) + Math.PI / N)})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(tb[0], tb[1]); ctx.lineTo(ta[0], ta[1]); ctx.closePath(); ctx.fill();
    }
    // table (flat top) — brightest
    ctx.fillStyle = `rgba(${ivory}, ${0.5 + 0.3 * settle})`;
    ctx.beginPath(); for (let i = 0; i < N; i++) { const p = tabl(i); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.closePath(); ctx.fill();
    // facet edges
    ctx.strokeStyle = `rgba(${ivory}, 0.4)`; ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) { const o = outer(i), tb = tabl(i), ta = tabl((i - 1 + N) % N); ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(cx, culet); ctx.moveTo(o[0], o[1]); ctx.lineTo(tb[0], tb[1]); ctx.lineTo(ta[0], ta[1]); ctx.stroke(); }
    ctx.restore();

    // sparkle glints at the two facets most toward the light
    for (let i = 0; i < N; i++) {
      const mid = A(i), s = shade(mid);
      if (s > 0.7) { const o = outer(i), tw = 0.6 + 0.4 * Math.sin(t * 6 + i), len = 5 + 4 * tw; ctx.strokeStyle = `rgba(${ivory}, ${(s - 0.7) / 0.3 * tw * settle})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(o[0] - len, o[1]); ctx.lineTo(o[0] + len, o[1]); ctx.moveTo(o[0], o[1] - len); ctx.lineTo(o[0], o[1] + len); ctx.stroke(); }
    }
  }

  function resize(_w, _h) { w = _w; h = _h; }
  function frame(dt, env) { draw(dt, env, env.t / 1.0); }
  function staticFrame(env) { draw(0, env, 1); }
  return { resize, frame, static: staticFrame };
}
