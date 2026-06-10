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

    drops = Array.from({ length: Math.min(90, Math.floor(w / 6)) }, newDrop);
    clouds = Array.from({ length: 4 }, (_, i) => ({
      x: Math.random() * w,
      y: 10 + i * 14,
      r: 60 + Math.random() * 70,
      v: 0.06 + Math.random() * 0.08,
    }));
    if (reduced) drawStatic();
  }

  function newDrop() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      len: 9 + Math.random() * 13,
      v: 2.6 + Math.random() * 2.4,
      a: 0.10 + Math.random() * 0.18,
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
      ctx.lineTo(d.x - 1.5, d.y + d.len); // slight slant
      ctx.stroke();
      d.y += d.v;
      d.x -= 0.3;
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
