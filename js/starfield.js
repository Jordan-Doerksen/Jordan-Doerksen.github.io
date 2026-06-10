// ==========================================================================
// STARFIELD — hero background: drifting, twinkling stars + faint gold rings.
// Rings rotate slowly at ~50% the intensity of the old fantasy draft.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, stars = [], t = 0, raf = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) drawStatic();
  }

  function seed() {
    // Cap star count by area so phones don't melt
    const count = Math.min(220, Math.floor((w * h) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.4 + Math.random() * 1.2,
      drift: 0.01 + Math.random() * 0.04,
    }));
  }

  function drawRings(rotating) {
    const cx = w / 2;
    const cy = h * 0.46;
    const base = Math.min(w, h);
    [0.27, 0.38, 0.52].forEach((scale, i) => {
      ctx.save();
      ctx.translate(cx, cy);
      if (rotating) ctx.rotate(t * (0.018 + i * 0.009) * (i % 2 ? -1 : 1));
      ctx.strokeStyle = 'rgba(212, 168, 67, 0.09)'; // toned-down gold
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 16 + i * 8]);
      ctx.beginPath();
      ctx.arc(0, 0, base * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawStars(animated) {
    for (const s of stars) {
      const a = animated
        ? 0.25 + 0.45 * Math.abs(Math.sin(s.phase + t * s.twinkle))
        : 0.45;
      ctx.fillStyle = `rgba(231, 234, 240, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (animated) {
        s.x += s.drift;
        if (s.x > w + 2) s.x = -2;
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawStars(true);
    drawRings(true);
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    drawStars(false);
    drawRings(false);
  }

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    drawStatic();
    return;
  }

  // Pause when the hero is off screen — saves battery
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) frame();
    else if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(canvas);
}
