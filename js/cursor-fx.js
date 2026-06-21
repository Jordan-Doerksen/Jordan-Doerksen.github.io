// ==========================================================================
// CURSOR FX — a per-skin cursor system. One fixed full-viewport canvas (on top,
// pointer-events:none) hides the native cursor and runs a different physics
// trail + cursor mark + click burst for each skin, chosen by data-skin (same
// dispatcher pattern as sky.js / hero.js). Fine-pointer only; never under
// prefers-reduced-motion. Replaces the old cursor.js + click-fx.js.
//
//   effect = make(ctx) -> { frame(dt, env), click(env) }
//   env = { mx, my, vx, vy, speed, down, w, h, t, pal }
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; }
function readPal() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return {
    gold: rgb(v('--gold', '#d8ac4e')), accent: rgb(v('--accent', '#4fe3d0')),
    star: rgb(v('--starlight', '#f2f4fa')), ink: rgb(v('--gold-ink', '#d8ac4e')),
    amber: rgb(v('--forge', '#ffaa44')),
  };
}

// ---------- OBSERVATORY · stardust comet ----------
function makeStardust(ctx) {
  let ps = [], rings = [];
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const n = Math.min(4, Math.floor(speed * 0.06));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 6, y: my + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 22, vy: (Math.random() - 0.5) * 22, age: 0, ttl: 0.7 + Math.random() * 0.6, blue: Math.random() < 0.4, sz: 1 + Math.random() * 1.6 });
      for (const p of ps) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl, c = p.blue ? pal.accent : pal.gold, tw = 0.6 + 0.4 * Math.sin(t * 20 + p.x); ctx.fillStyle = `rgba(${c}, ${f * tw})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * f + 0.4, 0, 6.2832); ctx.fill(); }
      for (const r of rings) { r.age += dt; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.5 * f})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      const s = 4 + Math.sin(t * 6);                                  // twinkling cursor star
      ctx.strokeStyle = `rgba(${pal.gold}, 0.95)`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(mx - s, my); ctx.lineTo(mx + s, my); ctx.moveTo(mx, my - s); ctx.lineTo(mx, my + s); ctx.stroke();
      ctx.fillStyle = `rgba(${pal.star}, 0.95)`; ctx.beginPath(); ctx.arc(mx, my, 1.6, 0, 6.2832); ctx.fill();
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, r0: 4, r1: 34, age: 0, ttl: 0.5 }); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832, sp = 60 + Math.random() * 70; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, ttl: 0.6 + Math.random() * 0.4, blue: Math.random() < 0.4, sz: 1.4 + Math.random() * 1.4 }); } },
  };
}

// ---------- SENTINEL · scanner reticle + radar ping ----------
function makeScanner(ctx) {
  let rx = 0, ry = 0, trail = [], pings = [];
  return {
    frame(dt, env) {
      const { mx, my, t, pal } = env;
      const k = Math.min(1, dt * 9); rx += (mx - rx) * k; ry += (my - ry) * k;
      trail.push({ x: mx, y: my, age: 0 }); for (const p of trail) p.age += dt; trail = trail.filter((p) => p.age < 0.25);
      ctx.strokeStyle = `rgba(${pal.gold}, 0.5)`; ctx.lineWidth = 1.4; ctx.beginPath();   // red tracer
      trail.forEach((p, i) => { const a = 1 - p.age / 0.25; ctx.globalAlpha = a; i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.globalAlpha = 1;
      for (const p of pings) { p.age += dt; const f = 1 - p.age / p.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.6 * f})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (p.maxr - 6) * (p.age / p.ttl), 0, 6.2832); ctx.stroke(); }
      pings = pings.filter((p) => p.age < p.ttl);
      ctx.strokeStyle = `rgba(${pal.gold}, 0.5)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 13, 0, 6.2832); ctx.stroke();   // lagging reticle ring
      ctx.strokeStyle = `rgba(${pal.gold}, 0.95)`; ctx.lineWidth = 1.4;                  // crosshair at cursor
      ctx.beginPath(); ctx.moveTo(mx - 8, my); ctx.lineTo(mx - 3, my); ctx.moveTo(mx + 3, my); ctx.lineTo(mx + 8, my); ctx.moveTo(mx, my - 8); ctx.lineTo(mx, my - 3); ctx.moveTo(mx, my + 3); ctx.lineTo(mx, my + 8); ctx.stroke();
      ctx.fillStyle = `rgba(${pal.gold}, 0.9)`; ctx.fillRect(mx - 1, my - 1, 2, 2);
    },
    click(env) { const { mx, my } = env; pings.push({ x: mx, y: my, maxr: 40, age: 0, ttl: 0.6 }, { x: mx, y: my, maxr: 26, age: -0.12, ttl: 0.6 }); },
  };
}

// ---------- DAYBREAK · warm falling dust motes (light skin) ----------
function makeWarmDust(ctx) {
  let ps = [], rays = [];
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const n = Math.min(3, Math.floor(speed * 0.05));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 5, y: my + (Math.random() - 0.5) * 5, vx: (Math.random() - 0.5) * 10, vy: -4 + Math.random() * 6, age: 0, ttl: 0.9 + Math.random() * 0.7, green: Math.random() < 0.3, sz: 1 + Math.random() * 1.4 });
      for (const p of ps) { p.age += dt; p.vy += 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; }   // light gravity
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl, c = p.green ? pal.accent : pal.ink; ctx.fillStyle = `rgba(${c}, ${0.5 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * f + 0.4, 0, 6.2832); ctx.fill(); }
      for (const r of rays) { r.age += dt; const f = 1 - r.age / r.ttl, L = 8 + 16 * (r.age / r.ttl); ctx.strokeStyle = `rgba(${pal.ink}, ${0.5 * f})`; ctx.lineWidth = 1.4; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; ctx.beginPath(); ctx.moveTo(r.x + Math.cos(a) * 5, r.y + Math.sin(a) * 5); ctx.lineTo(r.x + Math.cos(a) * L, r.y + Math.sin(a) * L); ctx.stroke(); } }
      rays = rays.filter((r) => r.age < r.ttl);
      ctx.fillStyle = `rgba(${pal.ink}, 0.9)`; ctx.beginPath(); ctx.arc(mx, my, 3, 0, 6.2832); ctx.fill();        // soft warm dot
      ctx.strokeStyle = `rgba(${pal.ink}, 0.4)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, my, 9, 0, 6.2832); ctx.stroke();
    },
    click(env) { const { mx, my } = env; rays.push({ x: mx, y: my, age: 0, ttl: 0.5 }); },
  };
}

// ---------- MILITARY · HUD reticle + tracer + impact ----------
function makeHud(ctx) {
  let lx = 0, ly = 0, ps = [], rings = [];
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const k = Math.min(1, dt * 8); lx += (mx - lx) * k; ly += (my - ly) * k;
      if (speed > 2 && Math.random() < 0.7) ps.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, age: 0, ttl: 0.4 + Math.random() * 0.3, sz: 1 + Math.random() });
      for (const p of ps) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl; ctx.fillStyle = `rgba(${pal.gold}, ${0.5 * f})`; ctx.fillRect(p.x, p.y, p.sz, p.sz); }
      for (const r of rings) { r.age += dt; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${r.amber ? pal.amber : pal.gold}, ${0.7 * f})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + (r.maxr - 4) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      const s = 12, g = 4;                                            // HUD corner-bracket reticle at cursor
      ctx.strokeStyle = `rgba(${pal.gold}, 0.9)`; ctx.lineWidth = 1.3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(mx + sx * s, my + sy * s - sy * g); ctx.lineTo(mx + sx * s, my + sy * s); ctx.lineTo(mx + sx * s - sx * g, my + sy * s); ctx.stroke(); }
      ctx.fillStyle = `rgba(${pal.accent}, 0.9)`; ctx.fillRect(mx - 1, my - 1, 2, 2);
      ctx.font = '9px "JetBrains Mono", monospace'; ctx.fillStyle = `rgba(${pal.gold}, 0.6)`; ctx.textBaseline = 'top';   // coord readout (lags)
      ctx.fillText(`${lx | 0} ${ly | 0}`, lx + 16, ly + 12);
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 30, age: 0, ttl: 0.45 }); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832, sp = 50 + Math.random() * 50; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, ttl: 0.4 + Math.random() * 0.3, sz: 1.2 + Math.random(), amber: true }); } rings.push({ x: mx, y: my, maxr: 18, age: -0.05, ttl: 0.4, amber: true }); },
  };
}

// ---------- ANGELIC · feather / halo sparkle (light skin) ----------
function makeHaloTrail(ctx) {
  let ps = [], feathers = [], rings = [];
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const n = Math.min(3, Math.floor(speed * 0.05));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 6, y: my + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, age: 0, ttl: 0.9 + Math.random() * 0.7, white: Math.random() < 0.5, sz: 1 + Math.random() * 1.3 });
      if (speed > 6 && Math.random() < 0.05) feathers.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 8, vy: -4, age: 0, ttl: 1.8, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) });
      for (const p of ps) { p.age += dt; p.vy += 16 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }   // gentle upward buoyancy then settle
      for (const f of feathers) { f.age += dt; f.vy += 14 * dt; f.x += (f.vx + Math.sin(t * 2 + f.x) * 6) * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
      ps = ps.filter((p) => p.age < p.ttl); feathers = feathers.filter((f) => f.age < f.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl, c = p.white ? '255, 255, 255' : pal.gold; ctx.fillStyle = `rgba(${c}, ${0.55 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * f + 0.4, 0, 6.2832); ctx.fill(); }
      for (const fe of feathers) { const f = 1 - fe.age / fe.ttl; ctx.save(); ctx.translate(fe.x, fe.y); ctx.rotate(fe.rot); ctx.fillStyle = `rgba(${pal.gold}, ${0.5 * f})`; ctx.beginPath(); ctx.moveTo(0, -5); ctx.quadraticCurveTo(3, 0, 0, 5); ctx.quadraticCurveTo(-3, 0, 0, -5); ctx.closePath(); ctx.fill(); ctx.restore(); }
      for (const r of rings) { r.age += dt; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.6 * f})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + (r.maxr - 4) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      ctx.strokeStyle = `rgba(${pal.gold}, 0.85)`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(mx, my - 1, 8, 8, 0, 0, 6.2832); ctx.stroke();   // halo ring
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; ctx.beginPath(); ctx.arc(mx, my, 2.2, 0, 6.2832); ctx.fill();
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 30, age: 0, ttl: 0.6 }); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, sp = 40 + Math.random() * 50; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, age: 0, ttl: 0.7 + Math.random() * 0.4, white: Math.random() < 0.5, sz: 1.3 + Math.random() }); } },
  };
}

// ---------- DEMONIC · molten ember trail + summoning-circle click ----------
function makeInferno(ctx) {
  let ps = [], rings = [];
  return {
    frame(dt, env) {
      const { mx, my, speed, pal } = env;
      const n = Math.min(4, Math.floor(speed * 0.06));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 5, y: my + (Math.random() - 0.5) * 5, vx: (Math.random() - 0.5) * 16, vy: -10 - Math.random() * 24, age: 0, ttl: 0.6 + Math.random() * 0.5, sz: 1 + Math.random() * 1.6, amber: Math.random() < 0.3 });
      for (const p of ps) { p.age += dt; p.vy += 8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; }   // embers rise then fall
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl, c = p.amber ? pal.amber : pal.gold; ctx.fillStyle = `rgba(${c}, ${0.85 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * f + 0.4, 0, 6.2832); ctx.fill(); }
      for (const r of rings) {
        r.age += dt; const f = 1 - r.age / r.ttl, rr = 4 + (r.maxr - 4) * (r.age / r.ttl);
        ctx.strokeStyle = `rgba(${pal.gold}, ${0.7 * f})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, 6.2832); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + r.age * 3 + i * 4 * Math.PI / 5, px = r.x + Math.cos(a) * rr * 0.9, py = r.y + Math.sin(a) * rr * 0.9; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
      }
      rings = rings.filter((r) => r.age < r.ttl);
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 10); g.addColorStop(0, `rgba(${pal.gold}, 0.6)`); g.addColorStop(1, 'transparent');   // molten cursor
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 10, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 220, 0.95)'; ctx.beginPath(); ctx.arc(mx, my, 2, 0, 6.2832); ctx.fill();
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 36, age: 0, ttl: 0.6 }); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, sp = 50 + Math.random() * 60; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, ttl: 0.6 + Math.random() * 0.4, sz: 1.4 + Math.random() * 1.3, amber: Math.random() < 0.3 }); } },
  };
}

// ---------- NATURE · leaf + pollen trail, bloom click (light skin) ----------
function makeGrove(ctx) {
  let ps = [], rings = [];
  function leaf(x, y, rot, sz, col, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = `rgba(${col}, ${a})`; ctx.beginPath(); ctx.moveTo(0, -sz * 2.4); ctx.quadraticCurveTo(sz * 1.6, 0, 0, sz * 2.4); ctx.quadraticCurveTo(-sz * 1.6, 0, 0, -sz * 2.4); ctx.closePath(); ctx.fill(); ctx.restore(); }
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const n = Math.min(3, Math.floor(speed * 0.05));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 6, y: my + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, age: 0, ttl: 0.9 + Math.random() * 0.7, leaf: Math.random() < 0.45, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 3, sz: 1 + Math.random() * 1.4 });
      for (const p of ps) { p.age += dt; p.vy += 10 * dt; p.x += (p.vx + Math.sin(t * 3 + p.x) * 4) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }   // float + sway + gravity
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl; if (p.leaf) leaf(p.x, p.y, p.rot, p.sz, pal.gold, 0.7 * f); else { ctx.fillStyle = `rgba(${pal.accent}, ${0.7 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 0.7 + 0.3, 0, 6.2832); ctx.fill(); } }
      for (const r of rings) { r.age += dt; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.6 * f})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + (r.maxr - 4) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      leaf(mx, my, 0.5 + Math.sin(t * 2) * 0.1, 2.4, pal.gold, 0.92);                       // cursor leaf
      ctx.strokeStyle = `rgba(${pal.accent}, 0.6)`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(mx, my - 5.5); ctx.lineTo(mx, my + 5.5); ctx.stroke();
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 30, age: 0, ttl: 0.6 }); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832, sp = 40 + Math.random() * 40; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, ttl: 0.7 + Math.random() * 0.4, leaf: Math.random() < 0.6, rot: a, vr: (Math.random() - 0.5) * 3, sz: 1.3 + Math.random() }); } },
  };
}

// ---------- CHIC · gold sparkle trail + shine click ----------
function makeGlam(ctx) {
  let ps = [], rings = [];
  function glint(x, y, L, col, a) { ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke(); }
  return {
    frame(dt, env) {
      const { mx, my, speed, t, pal } = env;
      const n = Math.min(3, Math.floor(speed * 0.05));
      for (let i = 0; i < n; i++) ps.push({ x: mx + (Math.random() - 0.5) * 6, y: my + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, age: 0, ttl: 0.6 + Math.random() * 0.6, sz: 1 + Math.random() * 1.4, ivory: Math.random() < 0.4, star: Math.random() < 0.3 });
      for (const p of ps) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
      ps = ps.filter((p) => p.age < p.ttl);
      for (const p of ps) { const f = 1 - p.age / p.ttl, c = p.ivory ? pal.accent : pal.gold; if (p.star) glint(p.x, p.y, p.sz + 2, c, 0.8 * f); else { ctx.fillStyle = `rgba(${c}, ${0.8 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * f + 0.4, 0, 6.2832); ctx.fill(); } }
      for (const r of rings) { r.age += dt; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.6 * f})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + (r.maxr - 4) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      const tw = 0.7 + 0.3 * Math.sin(t * 5); glint(mx, my, 5 + tw * 2, pal.gold, 0.9);                  // cursor sparkle
      ctx.fillStyle = `rgba(${pal.accent}, 0.95)`; ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, 6.2832); ctx.fill();
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 34, age: 0, ttl: 0.55 }); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, sp = 50 + Math.random() * 60; ps.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, ttl: 0.6 + Math.random() * 0.4, sz: 1.3 + Math.random() * 1.3, ivory: Math.random() < 0.5, star: Math.random() < 0.5 }); } },
  };
}

// ---------- PRO · precise crosshair + ink trail + ring click ----------
function makeExec(ctx) {
  let trail = [], rings = [];
  return {
    frame(dt, env) {
      const { mx, my, pal } = env;
      trail.push({ x: mx, y: my, age: 0 }); for (const p of trail) p.age += dt; trail = trail.filter((p) => p.age < 0.3);
      for (const p of trail) { const f = 1 - p.age / 0.3; ctx.fillStyle = `rgba(${pal.gold}, ${0.3 * f})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 * f + 0.4, 0, 6.2832); ctx.fill(); }   // ink trail
      for (const r of rings) { r.age += dt; if (r.age < 0) continue; const f = 1 - r.age / r.ttl; ctx.strokeStyle = `rgba(${pal.gold}, ${0.6 * f})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(r.x, r.y, 4 + (r.maxr - 4) * (r.age / r.ttl), 0, 6.2832); ctx.stroke(); }
      rings = rings.filter((r) => r.age < r.ttl);
      ctx.strokeStyle = `rgba(${pal.gold}, 0.9)`; ctx.lineWidth = 1.2;                                  // precise crosshair
      ctx.beginPath(); ctx.moveTo(mx - 6, my); ctx.lineTo(mx - 2, my); ctx.moveTo(mx + 2, my); ctx.lineTo(mx + 6, my); ctx.moveTo(mx, my - 6); ctx.lineTo(mx, my - 2); ctx.moveTo(mx, my + 2); ctx.lineTo(mx, my + 6); ctx.stroke();
      ctx.fillStyle = `rgba(${pal.accent}, 0.95)`; ctx.fillRect(mx - 1, my - 1, 2, 2);
    },
    click(env) { const { mx, my } = env; rings.push({ x: mx, y: my, maxr: 30, age: 0, ttl: 0.5 }, { x: mx, y: my, maxr: 18, age: -0.1, ttl: 0.5 }); },
  };
}

export const CURSORS = { observatory: makeStardust, sentinel: makeScanner, daybreak: makeWarmDust, military: makeHud, angelic: makeHaloTrail, demonic: makeInferno, nature: makeGrove, chic: makeGlam, pro: makeExec };

export function initCursorFx() {
  if (reduced || !matchMedia('(pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998;';
  document.body.appendChild(canvas);
  document.documentElement.classList.add('has-cursor');             // hide the native cursor
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, mx = innerWidth / 2, my = innerHeight / 2, pmx = mx, pmy = my, inside = false, down = false;
  let t = 0, last = 0, pal = readPal(), effect = pick();

  function size() { const dpr = Math.min(window.devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function pick() { const id = document.documentElement.dataset.skin || 'observatory'; return (CURSORS[id] || CURSORS.observatory)(ctx); }

  size();
  addEventListener('resize', size);
  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; inside = true; }, { passive: true });
  document.addEventListener('mouseleave', () => { inside = false; });
  addEventListener('mousedown', (e) => { if (e.button === 0) { down = true; effect.click({ mx: e.clientX, my: e.clientY, w, h, t, pal }); } });
  addEventListener('mouseup', () => { down = false; });
  window.addEventListener('skinchange', () => { pal = readPal(); effect = pick(); });

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    const vx = mx - pmx, vy = my - pmy, speed = Math.hypot(vx, vy); pmx = mx; pmy = my;
    ctx.clearRect(0, 0, w, h);
    if (inside) effect.frame(dt, { mx, my, vx, vy, speed, down, w, h, t, pal });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((ts) => { last = ts; requestAnimationFrame(loop); });
}
