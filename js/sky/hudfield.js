// ==========================================================================
// SKY MODE · HUDFIELD — Military. Cockpit-glass HUD over a parallaxing CADPAT
// camo: a faint dot grid + low green glow, floating telemetry tags that fade in
// and out, and targeting reticles that drift — the nearest one leaning toward
// the cursor and locking (cyan) as you pass. The digi-camo is drawn here (not in
// CSS) so it can drift with scroll/mouse. Reads --sky-nebula/--sky-warm (green)
// + --sky-meteor (cyan); uses env.smx/smy/scrollY for parallax + pointer react.
// ==========================================================================

export function makeHudField(ctx) {
  let w = 0, h = 0, reticles = [], tags = [];
  let psx = 0.5, psy = 0.5, act = 0;            // pointer-movement tracking
  let camoImg = null, camoPat = null, camoReady = false;

  // CADPAT tile, loaded once -> repeating pattern. Triggers a redraw so the
  // reduced-motion (single static frame) path still gets the camo once it lands.
  camoImg = new Image();
  camoImg.onload = () => { try { camoPat = ctx.createPattern(camoImg, 'repeat'); camoReady = true; window.dispatchEvent(new Event('sky-redraw')); } catch (e) { /* ignore */ } };
  camoImg.src = '/assets/img/camo-cadpat.svg';

  function spawn() {
    const x = Math.random() * w, y = Math.random() * h;
    return { x, y, lx: x, ly: y, s: 26 + Math.random() * 42, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, phase: Math.random() * 6.28, lock: 0 };
  }
  function spawnTag(stagger) {
    const id = String(1 + Math.floor(Math.random() * 40)).padStart(2, '0');
    const az = String(Math.floor(Math.random() * 360)).padStart(3, '0');
    const alt = String(200 + Math.floor(Math.random() * 1800)).padStart(4, '0');
    const lat = (49 + Math.random() * 0.9).toFixed(1), lon = (96.5 + Math.random() * 1.2).toFixed(1);
    const sets = [
      ['TGT-' + id, 'AZ ' + az + '°'],
      [lat + 'N  ' + lon + 'W'],
      ['ALT ' + alt, 'TGT-' + id],
      ['▸ ' + az + '°', 'LOCK ' + id],
    ];
    return {
      x: 56 + Math.random() * Math.max(10, w - 220),
      y: 84 + Math.random() * Math.max(10, h - 120),
      age: stagger ? Math.random() * 3 : 0, ttl: 4 + Math.random() * 4, fade: 0,
      lines: sets[Math.floor(Math.random() * sets.length)],
    };
  }
  function resize(_w, _h) {
    w = _w; h = _h;
    const n = Math.max(3, Math.round((w * h) / 360000));   // ~one reticle per 600x600
    reticles = Array.from({ length: n }, spawn);
    const tn = Math.max(2, Math.round(w / 520));
    tags = Array.from({ length: tn }, () => spawnTag(true));
  }

  function camo(env) {
    if (!camoReady || !camoPat) return;
    const ox = -(env.smx - 0.5) * 18 + env.t * 2;          // mouse parallax + slow drift
    const oy = -(env.smy - 0.5) * 18 - env.scrollY * 0.04; // mouse parallax + scroll parallax
    ctx.save();
    ctx.globalAlpha = 0.55;
    if (camoPat.setTransform) {
      camoPat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy]));
      ctx.fillStyle = camoPat; ctx.fillRect(0, 0, w, h);
    } else {                                                // fallback: shift the context
      ctx.translate(((ox % 96) + 96) % 96 - 96, ((oy % 96) + 96) % 96 - 96);
      ctx.fillStyle = camoPat; ctx.fillRect(0, 0, w + 96, h + 96);
    }
    ctx.restore();
  }
  function glow(skin, t) {
    const [r, g, b] = skin.nebula;
    const breath = 0.85 + 0.15 * Math.sin(t * 0.4);
    const grd = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.7);
    grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.05 * breath})`); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  }
  function grid(skin) {
    const [r, g, b] = skin.nebula;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.05)`;
    const step = 46;
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) ctx.fillRect(x, y, 1.4, 1.4);
  }
  function tag(tg, skin) {
    const f = tg.fade; if (f <= 0.01) return;
    const g = skin.warm, cy = skin.meteor;
    ctx.strokeStyle = `rgba(${cy}, ${0.5 * f})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, 2, 0, 6.2832); ctx.stroke();          // anchor pip
    ctx.beginPath(); ctx.moveTo(tg.x + 2, tg.y); ctx.lineTo(tg.x + 12, tg.y - 10); ctx.lineTo(tg.x + 30, tg.y - 10); ctx.stroke(); // elbow leader
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'bottom';
    let ty = tg.y - 13;
    for (let i = tg.lines.length - 1; i >= 0; i--) {
      ctx.fillStyle = i === 0 ? `rgba(${g}, ${0.6 * f})` : `rgba(${cy}, ${0.6 * f})`;
      ctx.fillText(tg.lines[i], tg.x + 14, ty); ty -= 12;
    }
  }
  function reticle(rt, skin, t) {
    const locked = rt.lock > 0.02;
    const col = locked ? skin.meteor : skin.warm;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + rt.phase);
    const a = 0.10 + 0.09 * pulse + rt.lock * 0.5;
    const s = rt.s * (1 - rt.lock * 0.12);          // snaps inward as it locks
    const c = s * 0.5, k = s * 0.24;
    ctx.save();
    ctx.translate(rt.lx, rt.ly);
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(sx * c, sy * c - sy * k); ctx.lineTo(sx * c, sy * c); ctx.lineTo(sx * c - sx * k, sy * c);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-k * 0.6, 0); ctx.lineTo(k * 0.6, 0); ctx.moveTo(0, -k * 0.6); ctx.lineTo(0, k * 0.6);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${col}, ${a * 0.6})`;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  function draw(dt, env) {
    const { t, skin } = env;
    camo(env); glow(skin, t); grid(skin);

    // pointer activity — react only while the mouse is actually moving (or just was)
    const dmove = Math.abs(env.smx - psx) + Math.abs(env.smy - psy);
    if (dt) { act = dmove > 0.0006 ? 1.2 : Math.max(0, act - dt); }
    psx = env.smx; psy = env.smy;
    const live = act > 0;
    const px = env.smx * w, py = env.smy * h, R = Math.min(w, h) * 0.45;

    let near = null, nd = 1e9;
    if (live) for (const rt of reticles) { const d = Math.hypot(rt.x - px, rt.y - py); if (d < nd) { nd = d; near = rt; } }

    for (const tg of tags) {
      if (dt) { tg.age += dt; if (tg.age > tg.ttl) Object.assign(tg, spawnTag(false)); }
      tg.fade = Math.max(0, Math.min(1, Math.min(tg.age / 0.7, (tg.ttl - tg.age) / 0.9)));
      tag(tg, skin);
    }

    const k = dt ? Math.min(1, dt * 6) : 1;
    for (const rt of reticles) {
      if (dt) {
        rt.x += rt.vx * dt; rt.y += rt.vy * dt;
        if (rt.x < -60) rt.x = w + 60; else if (rt.x > w + 60) rt.x = -60;
        if (rt.y < -60) rt.y = h + 60; else if (rt.y > h + 60) rt.y = -60;
      }
      let tl = 0, tx = rt.x, ty = rt.y;
      if (rt === near && nd < R) { const sgn = 1 - nd / R; tl = sgn; tx = rt.x + (px - rt.x) * 0.22 * sgn; ty = rt.y + (py - rt.y) * 0.22 * sgn; }
      rt.lock += (tl - rt.lock) * k;
      rt.lx += (tx - rt.lx) * k; rt.ly += (ty - rt.ly) * k;
      reticle(rt, skin, t);
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
