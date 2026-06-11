// ==========================================================================
// SIGIL — the hero constellation.
// Stars drift in from the dark and settle into a J·D sigil, then thread
// themselves together. The cursor (or a finger) perturbs nearby stars;
// they spring softly back. Reduced motion renders the finished sigil.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Normalized letterform anchors (x, y in 0..1 of the canvas)
const POINTS = [
  // — J —
  { x: 0.130, y: 0.140 }, // 0 bar left
  { x: 0.245, y: 0.110 }, // 1 bar mid (stem top)
  { x: 0.330, y: 0.090 }, // 2 bar right
  { x: 0.262, y: 0.470 }, // 3 stem mid
  { x: 0.255, y: 0.720 }, // 4 stem low
  { x: 0.190, y: 0.880 }, // 5 hook bottom
  { x: 0.100, y: 0.790 }, // 6 hook tip
  // — interpunct —
  { x: 0.475, y: 0.480, gold: true }, // 7
  // — D —
  { x: 0.620, y: 0.095 }, // 8  spine top
  { x: 0.612, y: 0.490 }, // 9  spine mid
  { x: 0.618, y: 0.880 }, // 10 spine bottom
  { x: 0.780, y: 0.150 }, // 11 belly upper
  { x: 0.892, y: 0.380 }, // 12 belly right
  { x: 0.872, y: 0.640 }, // 13 belly lower-right
  { x: 0.756, y: 0.855 }, // 14 belly lower
];

// Edges threaded in draw order (indexes into POINTS)
const EDGES = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6],          // J
  [8, 9], [9, 10], [8, 11], [11, 12], [12, 13], [13, 14], [14, 10], // D
];

const ARRIVE_DUR = 1.9;   // seconds for stars to settle
const THREAD_START = 1.6; // when the first line begins
const THREAD_EACH = 0.16; // seconds per line

export function initSigil() {
  const canvas = document.getElementById('sigil');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, t = 0, raf = null;
  let mx = -9999, my = -9999;
  let scatter = [];

  const nodes = POINTS.map((p, i) => ({
    ...p,
    // arrival: every star begins somewhere else in the dark
    sx: p.x + (Math.random() - 0.5) * 0.9,
    sy: p.y + (Math.random() - 0.5) * 1.6,
    delay: Math.random() * 0.55,
    phase: (i * 2.39) % (Math.PI * 2),
    ox: 0, oy: 0, // cursor-perturbation offset (px)
    px: 0, py: 0, // rendered pixel position
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scatter = Array.from({ length: 26 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 0.9 + 0.3,
      phase: Math.random() * Math.PI * 2,
      tw: 0.4 + Math.random() * 1.3,
    }));
    if (reduced) drawFinal();
  }

  const easeOut = (k) => 1 - Math.pow(1 - k, 3);

  function nodePos(n, settled) {
    let nx, ny;
    if (settled) {
      nx = n.x; ny = n.y;
    } else {
      const k = easeOut(Math.min(1, Math.max(0, (t - n.delay) / ARRIVE_DUR)));
      nx = n.sx + (n.x - n.sx) * k;
      ny = n.sy + (n.y - n.sy) * k;
    }
    // gentle bob once settled
    const bobX = Math.sin(t * 0.5 + n.phase) * 2.2;
    const bobY = Math.cos(t * 0.4 + n.phase) * 2.2;

    // cursor repulsion → spring back
    const tx = nx * w, ty = ny * h;
    const d = Math.hypot(tx - mx, ty - my);
    const R = 90;
    let pushX = 0, pushY = 0;
    if (d < R && d > 0.001) {
      const force = (1 - d / R) * 22;
      pushX = ((tx - mx) / d) * force;
      pushY = ((ty - my) / d) * force;
    }
    n.ox += (pushX - n.ox) * 0.12;
    n.oy += (pushY - n.oy) * 0.12;

    n.px = tx + bobX + n.ox;
    n.py = ty + bobY + n.oy;
  }

  function drawScatter(animated) {
    for (const s of scatter) {
      const a = animated
        ? 0.10 + 0.22 * Math.abs(Math.sin(s.phase + t * s.tw))
        : 0.18;
      ctx.fillStyle = `rgba(233, 237, 246, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawThreads(progressAll) {
    ctx.lineWidth = 1;
    EDGES.forEach(([ai, bi], idx) => {
      const start = THREAD_START + idx * THREAD_EACH;
      const k = progressAll ? 1 : Math.min(1, Math.max(0, (t - start) / 0.45));
      if (k <= 0) return;
      const a = nodes[ai], b = nodes[bi];
      ctx.strokeStyle = `rgba(228, 222, 200, ${0.30 * k})`;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(a.px + (b.px - a.px) * k, a.py + (b.py - a.py) * k);
      ctx.stroke();
    });
  }

  function drawStars(animated) {
    for (const n of nodes) {
      const arrived = animated ? Math.min(1, Math.max(0, (t - n.delay) / ARRIVE_DUR)) : 1;
      if (arrived <= 0) continue;
      const tw = animated ? 0.75 + 0.25 * Math.sin(t * 1.6 + n.phase) : 1;
      const r = (n.gold ? 3.4 : 2.4) * arrived;

      // glow
      const color = n.gold ? '216, 172, 78' : '236, 240, 250';
      const glow = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r * 6);
      glow.addColorStop(0, `rgba(${color}, ${0.5 * arrived * tw})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r * 6, 0, Math.PI * 2);
      ctx.fill();

      // core
      ctx.fillStyle = `rgba(${n.gold ? '240, 212, 150' : '245, 247, 252'}, ${arrived * tw})`;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    nodes.forEach((n) => nodePos(n, t > ARRIVE_DUR + 0.6));
    drawScatter(true);
    drawThreads(false);
    drawStars(true);
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function drawFinal() {
    ctx.clearRect(0, 0, w, h);
    nodes.forEach((n) => {
      n.px = n.x * w;
      n.py = n.y * h;
    });
    drawScatter(false);
    drawThreads(true);
    drawStars(false);
  }

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    drawFinal();
    return;
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  });
  canvas.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

  // Animate only while the hero is on screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) frame();
    else if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(canvas);
}
