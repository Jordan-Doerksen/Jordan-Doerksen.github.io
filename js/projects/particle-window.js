// ==========================================================================
// PARTICLE WINDOW — particle.exe
// ~150 particles. Move the mouse to attract them; press and hold to repel.
// Vanilla JS, no libraries — this file IS the portfolio piece.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initParticleWindow() {
  const canvas = document.getElementById('particle-window');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, raf = null;
  const mouse = { x: null, y: null, down: false };
  let particles = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) draw();
  }

  function seed() {
    const count = Math.min(150, Math.floor((w * h) / 950));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: 1 + Math.random() * 1.6,
    }));
  }

  function update() {
    for (const p of particles) {
      // Mouse force: attract normally, repel while pressed
      if (mouse.x !== null) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 170) {
          const force = (1 - dist / 170) * (mouse.down ? -0.9 : 0.22);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97; // friction
      p.vy *= 0.97;

      // Gentle wandering so the swarm never fully stalls
      p.vx += (Math.random() - 0.5) * 0.04;
      p.vy += (Math.random() - 0.5) * 0.04;

      // Soft walls
      if (p.x < 0 || p.x > w) p.vx *= -0.9;
      if (p.y < 0 || p.y > h) p.vy *= -0.9;
      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Connection lines between close neighbours
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 3600) { // 60px
          ctx.strokeStyle = `rgba(79, 227, 208, ${0.14 * (1 - distSq / 3600)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.fillStyle = 'rgba(231, 234, 240, 0.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame() {
    update();
    draw();
    raf = requestAnimationFrame(frame);
  }

  // --- Input ---
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (e) => { mouse.down = true; e.preventDefault(); });
  addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('pointerleave', () => { mouse.x = null; mouse.y = null; });

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    draw(); // static scatter — still looks intentional
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
