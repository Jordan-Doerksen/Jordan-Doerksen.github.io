// ==========================================================================
// HERO MOTIF · GLOBE — Pro. A rotating wireframe globe: latitude rings, spinning
// meridians, and a scatter of nodes linked by arcs with travelling data pulses.
// Back-facing nodes dim; the spin picks up and the glow leans toward the cursor.
// Grows in on entry. lines = --gold (navy), nodes/pulses = --accent (oxblood).
// make(ctx) -> { resize, frame(dt, env), static(env) }
// ==========================================================================

export function makeGlobe(ctx) {
  let w = 0, h = 0, nodes = [], links = [];
  function resize(_w, _h) {
    w = _w; h = _h;
    nodes = Array.from({ length: 11 }, () => ({ lat: (Math.random() - 0.5) * 2.4, lon: Math.random() * 6.28 }));
    links = [];
    for (let i = 0; i < 9; i++) { const a = Math.floor(Math.random() * nodes.length); let b = Math.floor(Math.random() * nodes.length); if (b === a) b = (b + 1) % nodes.length; links.push({ a, b, ph: Math.random() }); }
  }

  function draw(dt, env, intro) {
    const { t, mx, my, skin } = env;
    const navy = skin.accent, ox = skin.data || skin.accent;
    const cx = w * 0.5, cy = h * 0.48;
    const settle = Math.max(0, Math.min(1, intro));
    const R = Math.min(w, h) * 0.32 * (0.55 + 0.45 * settle);
    const near = mx > -9000;
    const spin = t * (0.25 + (near ? 0.12 : 0));
    const lx = near ? (mx - cx) / w : -0.3, ly = near ? (my - cy) / h : -0.3;

    const gg = ctx.createRadialGradient(cx + lx * 30, cy + ly * 30, 0, cx, cy, R * 1.8);   // glow leans to cursor
    gg.addColorStop(0, `rgba(${navy}, ${0.10 * settle})`); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, w, h);

    ctx.save(); ctx.globalAlpha = settle;
    ctx.strokeStyle = `rgba(${navy}, 0.5)`; ctx.lineWidth = 1.2;                 // rim
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = `rgba(${navy}, 0.18)`; ctx.lineWidth = 1;
    for (const lat of [-0.9, -0.45, 0, 0.45, 0.9]) { const ry = Math.sin(lat) * R, rx = Math.cos(lat) * R; ctx.beginPath(); ctx.ellipse(cx, cy + ry, rx, rx * 0.17, 0, 0, 6.2832); ctx.stroke(); }   // latitudes
    for (let k = 0; k < 4; k++) { const rx = Math.abs(Math.sin(spin + k * Math.PI / 4)) * R; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, rx), R, 0, 0, 6.2832); ctx.stroke(); }   // meridians
    ctx.restore();

    const P = (n) => { const lon = n.lon + spin; const z = Math.cos(n.lat) * Math.cos(lon); return { x: cx + R * Math.cos(n.lat) * Math.sin(lon), y: cy + R * Math.sin(n.lat), z }; };
    const pr = nodes.map(P);
    // links between front-facing nodes, with a travelling pulse
    for (const L of links) {
      const a = pr[L.a], b = pr[L.b]; if (a.z < -0.1 || b.z < -0.1) continue;
      ctx.strokeStyle = `rgba(${ox}, ${0.25 * settle})`; ctx.lineWidth = 1;
      const mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2 - 8;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx2, my2, b.x, b.y); ctx.stroke();
      const p = (t * 0.5 + L.ph) % 1, px = (1 - p) * (1 - p) * a.x + 2 * (1 - p) * p * mx2 + p * p * b.x, py = (1 - p) * (1 - p) * a.y + 2 * (1 - p) * p * my2 + p * p * b.y;
      ctx.fillStyle = `rgba(${ox}, ${0.9 * settle})`; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 6.2832); ctx.fill();
    }
    // nodes (front bright, back dim)
    for (const p of pr) { const front = p.z > 0, a = (front ? 0.5 + 0.5 * p.z : 0.12) * settle; ctx.fillStyle = `rgba(${ox}, ${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, front ? 2.4 : 1.4, 0, 6.2832); ctx.fill(); }
  }

  function frame(dt, env) { draw(dt, env, env.t / 1.0); }
  function staticFrame(env) { draw(0, env, 1); }
  return { resize, frame, static: staticFrame };
}
