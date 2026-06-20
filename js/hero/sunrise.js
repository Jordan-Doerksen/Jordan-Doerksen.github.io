// ==========================================================================
// HERO MOTIF · SUNRISE — Daybreak. A warm sun crests two/three drifting cloud
// bands, soft rays turning slowly behind it. make(ctx) -> { resize, frame, static }
// (Uses its own warm sun palette; a literal sun reads better than the token gold.)
// ==========================================================================

const SUN = '255, 198, 92';      // warm gold sun
const SUN_DEEP = '247, 150, 60'; // lower-edge warmth
const CLOUD = '255, 250, 242';   // soft cream cloud

export function makeSunrise(ctx) {
  let w = 0, h = 0, clouds = [], bird = null;

  function resize(_w, _h) {
    w = _w; h = _h;
    clouds = [
      { y: h * 0.70, x: w * 0.30, s: 1.00, v: 5 },
      { y: h * 0.80, x: w * 0.66, s: 1.35, v: -3.5 },
      { y: h * 0.90, x: w * 0.12, s: 1.15, v: 4 },
    ];
    bird = { x: 0, y: 0, dir: 1, v: 28, flap: 0, active: false, wait: 2 + Math.random() * 4 };
  }

  // soft puffs only — no underside (the flat base box read as a visible rectangle)
  function cloud(x, y, s) {
    ctx.fillStyle = `rgba(${CLOUD}, 0.92)`;
    const r = 13 * s;
    for (const [dx, dy, m] of [[-2.2, 0.2, 1], [-1.1, -0.4, 1.3], [0, -0.1, 1.5], [1.1, -0.3, 1.25], [2.2, 0.2, 1]]) {
      ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * m, 0, 6.2832); ctx.fill();
    }
  }

  // a far-off gull gliding across the upper sky, wings rising and falling
  function drawBird(x, y, flap) {
    const up = 5 + Math.sin(flap) * 3.5, span = 8;
    ctx.strokeStyle = 'rgba(74, 58, 44, 0.5)';
    ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - span, y - up * 0.25);
    ctx.quadraticCurveTo(x - span * 0.35, y - up, x, y);
    ctx.quadraticCurveTo(x + span * 0.35, y - up, x + span, y - up * 0.25);
    ctx.stroke();
  }

  function draw(dt, env, rise) {
    const { t } = env;
    const cx = w * 0.5, horizon = h * 0.74;
    const sunY = horizon - h * 0.30 * rise;
    const sunR = h * 0.17;

    // rays — long soft spokes turning slowly behind the sun
    ctx.save();
    ctx.translate(cx, sunY);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.2832 + t * 0.05;
      const x2 = Math.cos(a) * sunR * 3.2, y2 = Math.sin(a) * sunR * 3.2;
      const g = ctx.createLinearGradient(0, 0, x2, y2);
      g.addColorStop(0, `rgba(${SUN}, 0.16)`); g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();

    // sun glow + disc
    let g = ctx.createRadialGradient(cx, sunY, 0, cx, sunY, sunR * 2.2);
    g.addColorStop(0, `rgba(${SUN}, 0.55)`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, sunY, sunR * 2.2, 0, 6.2832); ctx.fill();
    g = ctx.createLinearGradient(cx, sunY - sunR, cx, sunY + sunR);
    g.addColorStop(0, `rgb(${SUN})`); g.addColorStop(1, `rgb(${SUN_DEEP})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, sunY, sunR, 0, 6.2832); ctx.fill();

    // cloud bands in front, drifting
    for (const c of clouds) {
      if (dt) { c.x += c.v * dt; if (c.x > w + 60) c.x = -60; else if (c.x < -60) c.x = w + 60; }
      cloud(c.x, c.y, c.s);
    }

    // an occasional bird crossing the upper sky
    if (dt) {
      if (bird.active) {
        bird.x += bird.dir * bird.v * dt; bird.flap += dt * 7;
        if ((bird.dir > 0 && bird.x > w + 30) || (bird.dir < 0 && bird.x < -30)) {
          bird.active = false; bird.wait = 7 + Math.random() * 9;
        }
      } else if ((bird.wait -= dt) <= 0) {
        bird.active = true; bird.dir = Math.random() < 0.5 ? 1 : -1;
        bird.x = bird.dir > 0 ? -30 : w + 30;
        bird.y = h * (0.16 + Math.random() * 0.22);
        bird.v = 24 + Math.random() * 16;
      }
    }
    if (bird.active) drawBird(bird.x, bird.y + Math.sin(bird.x * 0.02) * 4, bird.flap);
  }

  function frame(dt, env) { draw(dt, env, Math.min(1, env.t / 1.6)); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
