// ==========================================================================
// SKY — the living night sky behind the entire site.
//   · three parallax star layers that drift with scroll and mouse
//   · nebula glows whose hue follows the section you're reading
//     (sections opt in with data-sky="#hexcolor")
//   · the occasional shooting star
// Reduced motion gets a single static render.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_HUE = '#d8ac4e'; // hero gold
const DEEP_HUE = [59, 74, 143]; // constant indigo under-glow

export function initSky() {
  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Parallax depth per layer: [scroll factor, star size, alpha]
  const LAYERS = [
    { f: 0.10, size: 0.7, alpha: 0.5 },
    { f: 0.22, size: 1.1, alpha: 0.7 },
    { f: 0.42, size: 1.6, alpha: 0.95 },
  ];

  let w = 0, h = 0, t = 0, raf = null;
  let stars = [];
  let meteors = [];
  let nextMeteor = 0;
  let mx = 0.5, my = 0.5;          // normalized mouse
  let smx = 0.5, smy = 0.5;        // smoothed mouse

  // Current/target nebula color (rgb triplets)
  let hue = hexToRgb(DEFAULT_HUE);
  let targetHue = [...hue];

  const sections = [...document.querySelectorAll('[data-sky]')];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) drawStatic();
  }

  function seed() {
    const total = Math.min(340, Math.floor((w * h) / 5200));
    stars = [];
    LAYERS.forEach((layer, li) => {
      const n = Math.floor(total * (li === 0 ? 0.45 : li === 1 ? 0.33 : 0.22));
      for (let i = 0; i < n; i++) {
        stars.push({
          layer: li,
          x: Math.random() * w,
          y: Math.random() * h,
          r: (Math.random() * 0.8 + 0.5) * layer.size,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.3 + Math.random() * 1.1,
          warm: Math.random() < 0.12, // a few stars burn faintly gold
        });
      }
    });
  }

  // Which section's hue should the sky take right now?
  function updateTargetHue() {
    const mid = scrollY + innerHeight * 0.5;
    let best = null, bestDist = Infinity;
    for (const s of sections) {
      const top = s.offsetTop;
      const center = top + s.offsetHeight / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    targetHue = hexToRgb(best ? best.dataset.sky : DEFAULT_HUE);
  }

  function drawNebulae() {
    // Primary nebula — carries the section hue
    const [r, g, b] = hue;
    let grad = ctx.createRadialGradient(w * 0.24, h * 0.30, 0, w * 0.24, h * 0.30, Math.max(w, h) * 0.62);
    grad.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.13)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Constant indigo counter-glow — depth on the opposite shoulder of the sky
    grad = ctx.createRadialGradient(w * 0.82, h * 0.74, 0, w * 0.82, h * 0.74, Math.max(w, h) * 0.55);
    grad.addColorStop(0, `rgba(${DEEP_HUE[0]}, ${DEEP_HUE[1]}, ${DEEP_HUE[2]}, 0.12)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawStars(animated) {
    const sy = animated ? scrollY : 0;
    for (const s of stars) {
      const L = LAYERS[s.layer];
      // wrap vertically against scroll parallax
      let y = (s.y - sy * L.f) % h;
      if (y < 0) y += h;
      const x = s.x + (smx - 0.5) * 22 * L.f * 2;

      const a = animated
        ? L.alpha * (0.3 + 0.7 * Math.abs(Math.sin(s.phase + t * s.twinkle)))
        : L.alpha * 0.6;
      ctx.fillStyle = s.warm
        ? `rgba(232, 200, 140, ${a})`
        : `rgba(233, 237, 246, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function spawnMeteor() {
    const fromLeft = Math.random() < 0.5;
    meteors.push({
      x: fromLeft ? -40 : w * (0.3 + Math.random() * 0.7),
      y: Math.random() * h * 0.35,
      vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 5),
      vy: 4 + Math.random() * 3,
      life: 1,
    });
    nextMeteor = t + 7 + Math.random() * 11;
  }

  function drawMeteors() {
    if (t > nextMeteor && document.visibilityState === 'visible') spawnMeteor();
    meteors = meteors.filter((m) => m.life > 0);
    for (const m of meteors) {
      const tail = 11;
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
      grad.addColorStop(0, `rgba(240, 240, 250, ${0.8 * m.life})`);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
      ctx.stroke();
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.011;
      if (m.x < -200 || m.x > w + 200 || m.y > h + 100) m.life = 0;
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    // ease the nebula hue toward the active section's color
    for (let i = 0; i < 3; i++) hue[i] += (targetHue[i] - hue[i]) * 0.025;
    smx += (mx - smx) * 0.04;
    smy += (my - smy) * 0.04;

    drawNebulae();
    drawStars(true);
    drawMeteors();

    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    drawNebulae();
    drawStars(false);
  }

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    updateTargetHue();
    hue = [...targetHue];
    drawStatic();
    // still let the sky tint follow the reader, just without animation
    addEventListener('scroll', () => {
      updateTargetHue();
      hue = [...targetHue];
      drawStatic();
    }, { passive: true });
    return;
  }

  addEventListener('scroll', updateTargetHue, { passive: true });
  addEventListener('mousemove', (e) => {
    mx = e.clientX / w;
    my = e.clientY / h;
  }, { passive: true });

  // Don't burn battery in a hidden tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    } else if (document.visibilityState === 'visible' && !raf) {
      frame();
    }
  });

  updateTargetHue();
  nextMeteor = 3 + Math.random() * 5;
  frame();
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
