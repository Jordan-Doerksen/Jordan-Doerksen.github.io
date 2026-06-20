// ==========================================================================
// HERO MOTIF · DATAEYE — Sentinel. A surveillance SCREEN (a soft rounded panel)
// raining red data, with an eye/pupil that TRACKS the cursor across the page
// and idly wanders when it's gone. make(ctx) -> { resize, frame(dt,env), static(env) }
// ==========================================================================

export function makeDataEye(ctx) {
  let w = 0, h = 0, cols = [], px = 0, py = 0;   // px/py = eased pupil offset

  function resize(_w, _h) {
    w = _w; h = _h; px = 0; py = 0;
    const n = Math.max(10, Math.floor(w / 11));
    cols = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * (w / n), y: Math.random() * h,
      speed: 34 + Math.random() * 70, len: 4 + Math.floor(Math.random() * 7),
    }));
  }

  function screenPath(cx, cy, sw, sh, r) {
    const x = cx - sw, y = cy - sh, ww = sw * 2, hh = sh * 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  }

  function draw(dt, env, open) {
    const { t, mx, my, skin } = env;
    const accent = skin.accent;
    const cx = w * 0.5, cy = h * 0.5;
    const sw = w * 0.44, sh = Math.max(3, h * 0.30 * open);
    const r = Math.min(sw, sh) * 0.42;

    ctx.save();
    screenPath(cx, cy, sw, sh, r);
    ctx.save();
    ctx.clip();

    // faint screen wash + the red data raining inside it
    ctx.fillStyle = `rgba(${accent}, 0.045)`;
    ctx.fillRect(cx - sw, cy - sh, sw * 2, sh * 2);
    for (const c of cols) {
      if (dt) { c.y += c.speed * dt; if (c.y > h + 24) c.y = -24; }
      for (let k = 0; k < c.len; k++) {
        const yy = c.y - k * 9;
        const a = (k === 0 ? 0.9 : 0.5 - k * 0.07);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(${k === 0 ? skin.meteor : accent}, ${a})`;
        ctx.fillRect(c.x - 1.3, yy, 2.6, 6);
      }
    }

    // pupil target: toward the cursor (clamped inside the screen); idle wander when gone
    let tx, ty;
    if (mx > -9000) {
      tx = Math.max(-1, Math.min(1, (mx - cx) / (sw * 1.6))) * sw * 0.5;
      ty = Math.max(-1, Math.min(1, (my - cy) / (sh * 1.6))) * sh * 0.5;
    } else {
      tx = Math.cos(t * 0.6) * sw * 0.2; ty = Math.sin(t * 0.85) * sh * 0.2;
    }
    px += (tx - px) * 0.10; py += (ty - py) * 0.10;
    const ex = cx + px, ey = cy + py;
    const pr = Math.min(sw, sh) * 0.34 * (0.92 + 0.05 * Math.sin(t * 2));

    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, pr * 2);
    g.addColorStop(0, `rgba(${accent}, 0.5)`); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, pr * 2, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = `rgba(${accent}, 0.6)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ex, ey, pr, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(8, 2, 3, 0.85)';
    ctx.beginPath(); ctx.arc(ex, ey, pr * 0.46, 0, 6.2832); ctx.fill();
    ctx.fillStyle = `rgba(${skin.meteor}, 0.95)`;
    ctx.beginPath(); ctx.arc(ex - pr * 0.16, ey - pr * 0.16, pr * 0.17, 0, 6.2832); ctx.fill();

    ctx.restore(); // end clip

    // soft screen border (glow), not a sharp eye outline
    ctx.shadowColor = `rgba(${accent}, 0.7)`; ctx.shadowBlur = 14;
    ctx.strokeStyle = `rgba(${accent}, 0.5)`; ctx.lineWidth = 2;
    screenPath(cx, cy, sw, sh, r); ctx.stroke();
    ctx.restore();
  }

  function frame(dt, env) { draw(dt, env, Math.min(1, env.t / 0.9)); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
