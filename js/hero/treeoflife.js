// ==========================================================================
// HERO MOTIF · TREEOFLIFE — Nature. A glowing tree: a procedurally branched
// trunk (generated once, stable) with luminous leaf-nodes that pulse, a soft
// golden halo behind, and a gentle wind sway that bends toward the cursor. The
// tree grows in on entry. branches = --gold (evergreen), nodes = --accent (cyan)
// + warm; halo = soft gold. make(ctx) -> { resize, frame(dt, env), static(env) }
// ==========================================================================

export function makeTreeOfLife(ctx) {
  let w = 0, h = 0, segs = [], leaves = [], baseY = 0, treeH = 1;

  function grow(x, y, ang, len, depth, maxD) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push({ x1: x, y1: y, x2, y2, depth });
    if (depth >= maxD || len < 7) { leaves.push({ x: x2, y: y2, ph: Math.random() * 6.28, warm: Math.random() < 0.4 }); return; }
    const spread = 0.42 + Math.random() * 0.28;
    grow(x2, y2, ang - spread + (Math.random() - 0.5) * 0.2, len * 0.74, depth + 1, maxD);
    grow(x2, y2, ang + spread + (Math.random() - 0.5) * 0.2, len * 0.74, depth + 1, maxD);
    if (depth < 3 && Math.random() < 0.5) grow(x2, y2, ang + (Math.random() - 0.5) * 0.4, len * 0.6, depth + 1, maxD);
  }
  function resize(_w, _h) {
    w = _w; h = _h; segs = []; leaves = [];
    baseY = h * 0.92; treeH = h * 0.62;
    grow(w * 0.5, baseY, -Math.PI / 2, h * 0.17, 0, 5);
  }

  function draw(dt, env, intro) {
    const { t, mx, skin } = env;
    const ever = skin.accent, cyan = skin.data || skin.accent;
    const settle = Math.max(0, Math.min(1, intro));
    const sway = Math.sin(t * 0.8) * 0.5 + (mx > -9000 ? (mx / w - 0.5) * 14 : 0);   // wind + cursor bend
    const bend = (y) => ((baseY - y) / treeH) * sway;                                // higher = bends more

    const gg = ctx.createRadialGradient(w * 0.5, baseY - treeH * 0.55, 0, w * 0.5, baseY - treeH * 0.55, treeH * 0.7);
    gg.addColorStop(0, `rgba(${ever}, ${0.14 * settle})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);                                    // soft canopy glow

    const shown = Math.floor(segs.length * settle);                                  // grow in
    ctx.lineCap = 'round';
    for (let i = 0; i < shown; i++) {
      const s = segs[i];
      ctx.strokeStyle = `rgba(${ever}, ${0.85})`; ctx.lineWidth = Math.max(1, 6 - s.depth * 1.1);
      ctx.beginPath(); ctx.moveTo(s.x1 + bend(s.y1), s.y1); ctx.lineTo(s.x2 + bend(s.y2), s.y2); ctx.stroke();
    }
    if (settle > 0.6) {
      const lf = (settle - 0.6) / 0.4;
      for (const lvs of leaves) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + lvs.ph), col = lvs.warm ? '245, 220, 150' : cyan, x = lvs.x + bend(lvs.y);
        const g = ctx.createRadialGradient(x, lvs.y, 0, x, lvs.y, 7); g.addColorStop(0, `rgba(${col}, ${0.5 * pulse * lf})`); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, lvs.y, 7, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgba(${col}, ${0.95 * lf})`; ctx.beginPath(); ctx.arc(x, lvs.y, 1.6, 0, 6.2832); ctx.fill();
      }
    }
  }

  function frame(dt, env) { draw(dt, env, env.t / 1.3); }
  function staticFrame(env) { draw(0, env, 1); }

  return { resize, frame, static: staticFrame };
}
