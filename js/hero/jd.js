// ==========================================================================
// HERO MOTIF · JD — the J·D constellation (Observatory only).
// Stars drift in from the dark, settle into the sigil, thread together; the
// cursor perturbs nearby stars. Colours come from env.skin (--gold/--starlight).
// make(ctx) -> { resize(w,h,skin), frame(dt,env), static(env) }
//   env = { w, h, t, mx, my, skin: { accent:'r,g,b', light:'r,g,b' } }
// ==========================================================================

const POINTS = [
  { x: 0.130, y: 0.140 }, { x: 0.245, y: 0.110 }, { x: 0.330, y: 0.090 },
  { x: 0.262, y: 0.470 }, { x: 0.255, y: 0.720 }, { x: 0.190, y: 0.880 }, { x: 0.100, y: 0.790 },
  { x: 0.475, y: 0.480, gold: true },
  { x: 0.620, y: 0.095 }, { x: 0.612, y: 0.490 }, { x: 0.618, y: 0.880 },
  { x: 0.780, y: 0.150 }, { x: 0.892, y: 0.380 }, { x: 0.872, y: 0.640 }, { x: 0.756, y: 0.855 },
];
const EDGES = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6],
  [8, 9], [9, 10], [8, 11], [11, 12], [12, 13], [13, 14], [14, 10],
];
const ARRIVE_DUR = 1.9, THREAD_START = 1.6, THREAD_EACH = 0.16;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

export function makeJd(ctx) {
  let w = 0, h = 0, nodes = [], scatter = [];

  function resize(_w, _h) {
    w = _w; h = _h;
    nodes = POINTS.map((p, i) => ({
      ...p,
      sx: p.x + (Math.random() - 0.5) * 0.9, sy: p.y + (Math.random() - 0.5) * 1.6,
      delay: Math.random() * 0.55, phase: (i * 2.39) % (Math.PI * 2),
      ox: 0, oy: 0, px: 0, py: 0,
    }));
    scatter = Array.from({ length: 26 }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 0.9 + 0.3,
      phase: Math.random() * Math.PI * 2, tw: 0.4 + Math.random() * 1.3,
    }));
  }

  function nodePos(n, t, settled, mx, my) {
    let nx, ny;
    if (settled) { nx = n.x; ny = n.y; }
    else { const k = easeOut(Math.min(1, Math.max(0, (t - n.delay) / ARRIVE_DUR))); nx = n.sx + (n.x - n.sx) * k; ny = n.sy + (n.y - n.sy) * k; }
    const bobX = Math.sin(t * 0.5 + n.phase) * 2.2, bobY = Math.cos(t * 0.4 + n.phase) * 2.2;
    const tx = nx * w, ty = ny * h, d = Math.hypot(tx - mx, ty - my), R = 90;
    let pushX = 0, pushY = 0;
    if (d < R && d > 0.001) { const force = (1 - d / R) * 22; pushX = ((tx - mx) / d) * force; pushY = ((ty - my) / d) * force; }
    n.ox += (pushX - n.ox) * 0.12; n.oy += (pushY - n.oy) * 0.12;
    n.px = tx + bobX + n.ox; n.py = ty + bobY + n.oy;
  }

  function drawScatter(t, light, animated) {
    for (const s of scatter) {
      const a = animated ? 0.10 + 0.22 * Math.abs(Math.sin(s.phase + t * s.tw)) : 0.18;
      ctx.fillStyle = `rgba(${light}, ${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawThreads(t, accent, progressAll) {
    ctx.lineWidth = 1;
    EDGES.forEach(([ai, bi], idx) => {
      const start = THREAD_START + idx * THREAD_EACH;
      const k = progressAll ? 1 : Math.min(1, Math.max(0, (t - start) / 0.45));
      if (k <= 0) return;
      const a = nodes[ai], b = nodes[bi];
      ctx.strokeStyle = `rgba(${accent}, ${0.24 * k})`;
      ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(a.px + (b.px - a.px) * k, a.py + (b.py - a.py) * k); ctx.stroke();
    });
  }

  function drawStars(t, accent, light, animated) {
    for (const n of nodes) {
      const arrived = animated ? Math.min(1, Math.max(0, (t - n.delay) / ARRIVE_DUR)) : 1;
      if (arrived <= 0) continue;
      const tw = animated ? 0.75 + 0.25 * Math.sin(t * 1.6 + n.phase) : 1;
      const r = (n.gold ? 3.4 : 2.4) * arrived;
      const color = n.gold ? accent : light;
      const glow = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r * 6);
      glow.addColorStop(0, `rgba(${color}, ${0.5 * arrived * tw})`); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(n.px, n.py, r * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${color}, ${arrived * tw})`;
      ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(dt, env) {
    const { t, mx, my, skin } = env;
    nodes.forEach((n) => nodePos(n, t, t > ARRIVE_DUR + 0.6, mx, my));
    drawScatter(t, skin.light, true);
    drawThreads(t, skin.accent, false);
    drawStars(t, skin.accent, skin.light, true);
  }

  function staticFrame(env) {
    const { skin } = env;
    nodes.forEach((n) => { n.px = n.x * w; n.py = n.y * h; });
    drawScatter(0, skin.light, false);
    drawThreads(0, skin.accent, true);
    drawStars(0, skin.accent, skin.light, false);
  }

  return { resize, frame, static: staticFrame };
}
