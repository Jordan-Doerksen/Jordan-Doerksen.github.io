// ==========================================================================
// HERO MOTIF · SIGILGATE — Demonic. A summoning gate: an outer ring of runes
// and a counter-rotating inscribed pentagram around a molten core that flares
// and leans toward the cursor; the spin/heat pick up when the pointer is near.
// The infernal inverse of Angelic's seraph. accent = --gold (molten), data =
// --accent (sulfur), light = --starlight. make(ctx) -> { resize, frame, static }
// ==========================================================================

export function makeSigilGate(ctx) {
  let w = 0, h = 0, px = 0, py = 0;
  function resize(_w, _h) { w = _w; h = _h; }

  function pentagram(cx, cy, r, rot, col, a) {
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const ang = rot - Math.PI / 2 + i * 4 * Math.PI / 5; const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
  }
  function runeRing(cx, cy, r, rot, n, col, a) {
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const ang = rot + i * 6.2832 / n, x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r, k = i % 3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      if (k === 0) { ctx.moveTo(0, -5); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); }
      else if (k === 1) { ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); }
      else { ctx.arc(0, 0, 4, 0, 6.2832); }
      ctx.stroke(); ctx.restore();
    }
  }

  function draw(dt, env, intro) {
    const { t, mx, my, skin } = env;
    const molten = skin.accent, sulfur = skin.data || skin.accent, light = skin.light;
    const cx = w * 0.5, cy = h * 0.5;
    const settle = 1 - Math.pow(1 - intro, 3);
    const R = Math.min(w, h) * 0.2 * (0.6 + 0.4 * settle);
    const near = mx > -9000;
    const tx = near ? Math.max(-1, Math.min(1, (mx - cx) / w)) * 12 : 0;
    const ty = near ? Math.max(-1, Math.min(1, (my - cy) / h)) * 12 : 0;
    const k = dt ? Math.min(1, dt * 4) : 1;
    px += (tx - px) * k; py += (ty - py) * k;
    const spin = t * (0.3 + (near ? 0.18 : 0));
    const ex = cx + px, ey = cy + py;
    const flare = 0.85 + 0.15 * Math.sin(t * 3);

    const gg = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 2.6);     // molten core glow, leans to cursor
    gg.addColorStop(0, `rgba(${molten}, ${0.28 * settle * flare})`); gg.addColorStop(0.5, `rgba(${molten}, ${0.08 * settle})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);

    ctx.save(); ctx.globalAlpha = settle;
    ctx.strokeStyle = `rgba(${molten}, 0.4)`; ctx.lineWidth = 1.6;        // outer rings
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.32, 0, 6.2832); ctx.stroke();
    runeRing(cx, cy, R * 1.5, spin, 12, sulfur, 0.5);                    // rotating rune ring
    pentagram(cx, cy, R * 1.18, -spin * 1.3, molten, 0.6);              // counter-rotating pentagram
    ctx.strokeStyle = `rgba(${sulfur}, 0.3)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, 6.2832); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = `rgba(${molten}, ${0.6 * settle * flare})`; ctx.beginPath(); ctx.arc(ex, ey, R * 0.3 * flare, 0, 6.2832); ctx.fill();   // molten core
    ctx.fillStyle = `rgba(255, 240, 220, ${0.9 * settle})`; ctx.beginPath(); ctx.arc(ex, ey, 3 + Math.sin(t * 3), 0, 6.2832); ctx.fill();
  }

  function frame(dt, env) { draw(dt, env, Math.min(1, env.t / 1.1)); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
