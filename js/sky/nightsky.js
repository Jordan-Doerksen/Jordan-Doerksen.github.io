// ==========================================================================
// SKY MODE · NIGHTSKY — the observatory default.
// Three parallax star layers, a section-hued nebula, the occasional meteor.
// Driven by the dispatcher: make(ctx) -> { resize(w,h,skin), frame(dt,env), static(env) }
//   env = { w, h, t, scrollY, smx, smy, skin }
// ==========================================================================

const LAYERS = [
  { f: 0.10, size: 0.7, alpha: 0.5 },
  { f: 0.22, size: 1.1, alpha: 0.7 },
  { f: 0.42, size: 1.6, alpha: 0.95 },
];

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function makeNightSky(ctx) {
  let w = 0, h = 0;
  let stars = [], meteors = [], nextMeteor = 3;
  let hue = null, targetHue = null;
  let sections = [];

  function seed() {
    const total = Math.min(340, Math.floor((w * h) / 5200));
    stars = [];
    LAYERS.forEach((layer, li) => {
      const n = Math.floor(total * (li === 0 ? 0.45 : li === 1 ? 0.33 : 0.22));
      for (let i = 0; i < n; i++) {
        stars.push({
          layer: li, x: Math.random() * w, y: Math.random() * h,
          r: (Math.random() * 0.8 + 0.5) * layer.size,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.3 + Math.random() * 1.1,
          warm: Math.random() < 0.13,
        });
      }
    });
  }

  function resize(_w, _h, skin) {
    w = _w; h = _h;
    seed();
    sections = [...document.querySelectorAll('[data-sky]')];
    if (!hue) { hue = [...skin.nebula]; targetHue = [...skin.nebula]; }
  }

  function computeTarget(scrollY, skin) {
    if (!skin.follow) { targetHue = [...skin.nebula]; return; }
    const mid = scrollY + innerHeight * 0.5;
    let best = null, bestDist = Infinity;
    for (const s of sections) {
      const center = s.offsetTop + s.offsetHeight / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    targetHue = best ? hexToRgb(best.dataset.sky) : [...skin.nebula];
  }

  function drawNebulae(skin) {
    const [r, g, b] = hue;
    let grad = ctx.createRadialGradient(w * 0.24, h * 0.30, 0, w * 0.24, h * 0.30, Math.max(w, h) * 0.62);
    grad.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0.13)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    grad = ctx.createRadialGradient(w * 0.82, h * 0.74, 0, w * 0.82, h * 0.74, Math.max(w, h) * 0.55);
    grad.addColorStop(0, `rgba(${skin.deep[0]}, ${skin.deep[1]}, ${skin.deep[2]}, 0.12)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  }

  function drawStars(t, smx, scrollY, skin, animated) {
    const sy = animated ? scrollY : 0;
    for (const s of stars) {
      const L = LAYERS[s.layer];
      let y = (s.y - sy * L.f) % h; if (y < 0) y += h;
      const x = s.x + (smx - 0.5) * 22 * L.f * 2;
      const a = (animated
        ? L.alpha * (0.3 + 0.7 * Math.abs(Math.sin(s.phase + t * s.twinkle)))
        : L.alpha * 0.6) * skin.starAlpha;
      ctx.fillStyle = `rgba(${s.warm ? skin.warm : skin.star}, ${a})`;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawMeteors(t, skin) {
    if (t > nextMeteor && document.visibilityState === 'visible') {
      const fromLeft = Math.random() < 0.5;
      meteors.push({
        x: fromLeft ? -40 : w * (0.3 + Math.random() * 0.7),
        y: Math.random() * h * 0.35,
        vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 5),
        vy: 4 + Math.random() * 3, life: 1,
      });
      nextMeteor = t + 7 + Math.random() * 11;
    }
    meteors = meteors.filter((m) => m.life > 0);
    for (const m of meteors) {
      const tail = 11;
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
      grad.addColorStop(0, `rgba(${skin.meteor}, ${0.8 * m.life})`);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail); ctx.stroke();
      m.x += m.vx; m.y += m.vy; m.life -= 0.011;
      if (m.x < -200 || m.x > w + 200 || m.y > h + 100) m.life = 0;
    }
  }

  function frame(dt, env) {
    const { t, scrollY, smx, skin } = env;
    computeTarget(scrollY, skin);
    for (let i = 0; i < 3; i++) hue[i] += (targetHue[i] - hue[i]) * 0.025;
    drawNebulae(skin);
    drawStars(t, smx, scrollY, skin, true);
    drawMeteors(t, skin);
  }

  function staticFrame(env) {
    const { scrollY, skin } = env;
    computeTarget(scrollY, skin);
    hue = [...targetHue];
    drawNebulae(skin);
    drawStars(0, 0.5, scrollY, skin, false);
  }

  return { resize, frame, static: staticFrame };
}
