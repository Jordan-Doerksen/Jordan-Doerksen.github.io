// ==========================================================================
// HERO MOTIF · TARGETLOCK — Military. A targeting reticle that LOCKS onto the
// cursor: corner brackets fly in and settle to a tight box, a recon ring spins,
// an acquire pulse rings out, and a live RNG/AZ readout ticks beside it. When
// the cursor is gone it idles and slow-wanders. green = --gold thread, cyan =
// --accent data, bone = --starlight. make(ctx) -> { resize, frame, static }.
// ==========================================================================

export function makeTargetLock(ctx) {
  let w = 0, h = 0, lx = 0, ly = 0, rot = 0;   // lx/ly = eased lock position

  function resize(_w, _h) { w = _w; h = _h; lx = w * 0.5; ly = h * 0.5; }

  function bracket(cx, cy, s, col, a, lw) {
    const c = s * 0.5, k = s * 0.28;
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = lw;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * c, cy + sy * c - sy * k);
      ctx.lineTo(cx + sx * c, cy + sy * c);
      ctx.lineTo(cx + sx * c - sx * k, cy + sy * c);
      ctx.stroke();
    }
  }

  function draw(dt, env, intro) {
    const { t, mx, my, skin } = env;
    const green = skin.accent;                       // hero reads --gold into .accent
    const cyan = skin.data || skin.accent;           // --accent (added in hero.js readHero)
    const light = skin.light;
    const cx = w * 0.5, cy = h * 0.5;
    const boxS = Math.min(w, h) * 0.30;

    // target = cursor (leaned toward, kept on-canvas) or an idle wander
    const have = mx > -9000;
    let tx, ty;
    if (have) { tx = Math.max(w * 0.18, Math.min(w * 0.82, mx)); ty = Math.max(h * 0.20, Math.min(h * 0.80, my)); }
    else { tx = cx + Math.cos(t * 0.5) * w * 0.16; ty = cy + Math.sin(t * 0.7) * h * 0.18; }
    lx += (tx - lx) * 0.12; ly += (ty - ly) * 0.12;
    rot += dt * 0.5;

    // live readout off the lock's offset from centre
    const dx = lx - cx, dy = ly - cy;
    const rng = Math.round(Math.hypot(dx, dy));
    const az = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360);

    const settle = 1 - Math.pow(1 - intro, 3);       // ease-out for the fly-in
    const wide = Math.min(w, h) * 0.46;
    const s = wide + (boxS - wide) * settle;          // brackets converge from wide to the box
    const tight = have ? 1 : 0.82;

    // spinning recon ring (two arcs)
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
    ctx.strokeStyle = `rgba(${green}, 0.22)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, boxS * 0.62, 0.3, 2.0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, boxS * 0.62, Math.PI + 0.3, Math.PI + 2.0); ctx.stroke();
    ctx.restore();

    // acquire pulse ringing outward
    const span = boxS * 0.95, pr = (t * 60) % span;
    ctx.strokeStyle = `rgba(${cyan}, ${0.26 * (1 - pr / span) * settle})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(lx, ly, boxS * 0.18 + pr, 0, 6.2832); ctx.stroke();

    // crosshair lines through the lock (gap at the box)
    ctx.strokeStyle = `rgba(${green}, 0.16)`; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx - s * 0.9, ly); ctx.lineTo(lx - boxS * 0.42, ly);
    ctx.moveTo(lx + boxS * 0.42, ly); ctx.lineTo(lx + s * 0.9, ly);
    ctx.moveTo(lx, ly - s * 0.9); ctx.lineTo(lx, ly - boxS * 0.42);
    ctx.moveTo(lx, ly + boxS * 0.42); ctx.lineTo(lx, ly + s * 0.9);
    ctx.stroke();

    bracket(lx, ly, s, green, 0.5 * tight, 1.6);                  // converging outer brackets
    bracket(lx, ly, boxS, cyan, 0.55 * settle * tight, 1.8);      // locked inner box
    ctx.fillStyle = `rgba(${cyan}, ${0.85 * settle})`;            // centre pip
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, 6.2832); ctx.fill();

    // readout (mono) — to the right of the box, flipped left if it would overflow
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';
    let rx = lx + boxS * 0.5 + 9; ctx.textAlign = 'left';
    if (rx + 64 > w) { rx = lx - boxS * 0.5 - 9; ctx.textAlign = 'right'; }
    const ry = ly - boxS * 0.5;
    ctx.fillStyle = `rgba(${light}, ${0.55 * settle})`;
    ctx.fillText(have ? '● LOCK' : '○ SCAN', rx, ry);
    ctx.fillStyle = `rgba(${green}, ${0.75 * settle})`;
    ctx.fillText('RNG ' + String(rng).padStart(4, '0'), rx, ry + 15);
    ctx.fillText('AZ ' + String(az).padStart(3, '0') + '°', rx, ry + 29);
    ctx.textAlign = 'left';
  }

  function frame(dt, env) { draw(dt, env, Math.min(1, env.t / 0.9)); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
