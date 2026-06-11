// ==========================================================================
// BEDROOM WEATHER — rain against a window at 2am, clipped inside the panel.
// Soft cloud blobs drift along the top; thin rain streaks fall below them.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initBedroomWeather() {
  const zone = document.querySelector('[data-effect="rain"]');
  if (!zone) return;
  const canvas = zone.querySelector('.ambient-canvas');
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, t = 0, raf = null;
  let drops = [];
  let clouds = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drops = Array.from({ length: Math.min(170, Math.floor(w / 3.5)) }, newDrop);
    clouds = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * w,
      y: 10 + i * 12,
      r: 70 + Math.random() * 80,
      v: 0.08 + Math.random() * 0.1,
    }));
    if (reduced) drawStatic();
  }

  function newDrop() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      len: 12 + Math.random() * 17,
      v: 3.6 + Math.random() * 3.2,
      a: 0.14 + Math.random() * 0.26,
    };
  }

  function drawClouds(moving) {
    for (const c of clouds) {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, 'rgba(192, 132, 252, 0.07)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      if (moving) {
        c.x += c.v;
        if (c.x - c.r > w) c.x = -c.r;
      }
    }
  }

  function drawRain() {
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (const d of drops) {
      ctx.strokeStyle = `rgba(192, 160, 252, ${d.a})`;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 2.4, d.y + d.len); // wind-blown slant
      ctx.stroke();
      d.y += d.v;
      d.x -= 0.45;
      if (d.y > h + d.len) {
        d.y = -d.len;
        d.x = Math.random() * (w + 20);
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawClouds(true);
    drawRain();
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    drawClouds(false);
  }

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    drawStatic();
    return;
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) frame();
    else if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(canvas);
}
