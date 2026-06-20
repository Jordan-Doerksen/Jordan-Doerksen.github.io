// ==========================================================================
// SOL OBSCURUS — fire and sigils, clipped inside the band panel.
// Rising embers + two counter-rotating rune rings at very low opacity.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ';

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
// sigils ride the gold thread, embers the ember accent — both deepen on light
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fb) => hexToRgb(cs.getPropertyValue(n).trim() || fb);
  return { sigil: v('--gold', '#d4a843'), ember: v('--ember', '#ff6b35') };
}

export function initSolObscurus() {
  const zone = document.querySelector('[data-effect="ritual"]');
  if (!zone) return;
  const canvas = zone.querySelector('.ambient-canvas');
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, t = 0, raf = null;
  let embers = [];
  let colors = readColors();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    embers = Array.from({ length: Math.min(75, Math.floor(w / 8)) }, newEmber);
    if (reduced) drawStatic();
  }

  function newEmber() {
    return {
      x: Math.random() * w,
      y: h + Math.random() * h * 0.5,
      r: 1.0 + Math.random() * 2.2,
      vy: 0.35 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2,
      life: 0.5 + Math.random() * 0.6,
    };
  }

  function drawSigils(rotating) {
    const cx = w * 0.5;
    const cy = h * 0.62;
    [{ r: Math.min(w, h) * 0.34, dir: 1, n: 14 }, { r: Math.min(w, h) * 0.46, dir: -1, n: 18 }]
      .forEach((ring, idx) => {
        ctx.save();
        ctx.translate(cx, cy);
        if (rotating) ctx.rotate(t * 0.04 * ring.dir);
        ctx.strokeStyle = `rgba(${colors.sigil}, 0.13)`;
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${colors.sigil}, 0.18)`;
        ctx.font = '13px serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < ring.n; i++) {
          const a = (Math.PI * 2 * i) / ring.n;
          const rune = RUNES[(i + idx * 7) % RUNES.length];
          ctx.save();
          ctx.translate(Math.cos(a) * ring.r, Math.sin(a) * ring.r);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillText(rune, 0, 0);
          ctx.restore();
        }
        ctx.restore();
      });
  }

  function drawEmbers() {
    for (const e of embers) {
      const flicker = 0.55 + 0.45 * Math.sin(t * 6 + e.sway);
      const a = e.life * flicker;
      const x = e.x + Math.sin(t * 1.4 + e.sway) * 9;
      // soft heat halo behind each ember (cheap: a second, larger circle)
      ctx.fillStyle = `rgba(${colors.ember}, ${a * 0.22})`;
      ctx.beginPath();
      ctx.arc(x, e.y, e.r * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${colors.ember}, ${a * 0.85})`;
      ctx.beginPath();
      ctx.arc(x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      e.y -= e.vy;
      e.life -= 0.0016;
      if (e.y < -4 || e.life <= 0) Object.assign(e, newEmber(), { y: h + 4 });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawSigils(true);
    drawEmbers();
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    drawSigils(false);
  }

  resize();
  addEventListener('resize', resize);
  window.addEventListener('skinchange', () => { colors = readColors(); if (reduced) drawStatic(); });

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
