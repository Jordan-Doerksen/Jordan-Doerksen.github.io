// ==========================================================================
// HERO MOTIF · SERAPH — Angelic. A sacred-geometry seraph: a Flower-of-Life /
// Metatron lattice in concentric rings that slowly counter-rotate, radiant rays
// from a luminous core, the whole figure breathing in on entry and leaning its
// glow toward the cursor. accent = --gold, data = --accent (blue), light =
// --starlight (dark slate on this light skin, used for the fine lattice).
// make(ctx) -> { resize, frame(dt,env), static(env) }
// ==========================================================================

export function makeSeraph(ctx) {
  let w = 0, h = 0, px = 0, py = 0;   // px/py = eased core lean toward the cursor

  function resize(_w, _h) { w = _w; h = _h; }

  function ring(cx, cy, r, col, a, lw) { ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke(); }
  function flower(cx, cy, R, rot, col, a) {                       // seed-of-life: 6 circles around 1
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    for (let i = 0; i < 6; i++) { const ang = rot + i * Math.PI / 3; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, R, 0, 6.2832); ctx.stroke(); }
  }
  function lattice(cx, cy, R, rot, col, a) {                      // 12 points, Metatron-ish chords
    const pts = [];
    for (let i = 0; i < 12; i++) { const ang = rot + i * Math.PI / 6; pts.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]); }
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 0.8;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if ((j - i) % 2 === 0) continue;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
    }
  }

  function draw(dt, env, intro) {
    const { t, mx, my, skin } = env;
    const gold = skin.accent, blue = skin.data || skin.accent, ink = skin.light;
    const cx = w * 0.5, cy = h * 0.5;
    const settle = 1 - Math.pow(1 - intro, 3);
    const R = Math.min(w, h) * 0.18 * (0.6 + 0.4 * settle);
    const near = mx > -9000;
    const tx = near ? Math.max(-1, Math.min(1, (mx - cx) / w)) * 14 : 0;
    const ty = near ? Math.max(-1, Math.min(1, (my - cy) / h)) * 14 : 0;
    const k = dt ? Math.min(1, dt * 4) : 1;
    px += (tx - px) * k; py += (ty - py) * k;
    const spin = t * (0.25 + (near ? 0.12 : 0));
    const ex = cx + px, ey = cy + py;

    const gg = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 2.4);    // core glow leans to cursor
    gg.addColorStop(0, `rgba(${gold}, ${0.22 * settle})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);

    ctx.save(); ctx.globalAlpha = settle;
    lattice(cx, cy, R * 2.0, spin, ink, 0.12);                    // outer lattice (faint ink)
    ring(cx, cy, R * 2.0, gold, 0.35, 1.4);
    ring(cx, cy, R * 2.25, gold, 0.18, 1);
    flower(cx, cy, R, -spin * 1.4, gold, 0.4);                    // inner flower counter-rotates
    lattice(cx, cy, R, -spin * 1.4, blue, 0.16);
    ctx.restore();

    ctx.strokeStyle = `rgba(${gold}, ${0.3 * settle})`; ctx.lineWidth = 1.4;   // radiant rays
    for (let i = 0; i < 12; i++) {
      const ang = spin * 0.5 + i * 6.2832 / 12, r1 = R * 0.3, r2 = R * 0.62 * (0.8 + 0.2 * Math.sin(t * 2 + i));
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * r1, ey + Math.sin(ang) * r1); ctx.lineTo(ex + Math.cos(ang) * r2, ey + Math.sin(ang) * r2); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${blue}, ${0.5 * settle})`; ctx.beginPath(); ctx.arc(ex, ey, 9 * settle, 0, 6.2832); ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * settle})`; ctx.beginPath(); ctx.arc(ex, ey, 4 + 2 * Math.sin(t * 2), 0, 6.2832); ctx.fill();
  }

  function frame(dt, env) { draw(dt, env, Math.min(1, env.t / 1.1)); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
