// render.js — the one-way draw pass (ARCHITECTURE "two hard contracts"). It READS world and never
// writes gameplay state; the only things it mutates are the camera (follow + shake, cosmetic) and its
// OWN particle pools, which it fills by draining world.fx.* each frame and then clearing them. No blur
// pass anywhere (perf law): glow is faked with a translucent 'lighter' layer. Everything off the
// viewport is culled. Under prefers-reduced-motion the shake, parallax, and spark/ring bursts drop out.

import { polyPath, shipPath, diamondPath, boltPath } from './glyphs.js';

const SPARK_CAP = 520, FLOAT_CAP = 48, RING_CAP = 40, ARC_CAP = 40;

export function createRenderer(canvas, world) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const cfg = world.config;
  const elColors = world.content.elements.map((e) => e.color);
  const el = (i) => elColors[i] || '#AEB9CC';
  let dpr = 1;

  // cosmetic-only pools (Math.random is allowed here — never touches world.rng)
  const sparks = [], floats = [], rings = [], arcs = [];

  // starfield: fixed fractional positions, scrolled by camera * parallax for a cheap depth read
  const sf = cfg.starfield;
  const stars = [];
  for (let i = 0; i < sf.count; i++) {
    stars.push({
      fx: Math.random(), fy: Math.random(),
      size: sf.minSize + Math.random() * (sf.maxSize - sf.minSize),
      p: sf.parallax * (0.4 + 0.6 * Math.random()),
      a: 0.25 + 0.6 * Math.random(),
    });
  }

  // prop field: drifting cargo containers + station spars, mid-depth between the stars and the
  // play plane (contained maximalism: dim, behind everything, never on top of content). Same
  // wrap-scroll trick as the starfield, just bigger shapes with a slow tumble.
  const pf = cfg.props;
  const props = [];
  if (pf) for (let i = 0; i < pf.count; i++) {
    props.push({
      fx: Math.random(), fy: Math.random(),
      p: pf.parallaxMin + Math.random() * (pf.parallaxMax - pf.parallaxMin),
      kind: Math.random() < 0.65 ? 'box' : 'spar',
      w: 26 + Math.random() * 36, h: 11 + Math.random() * 10,
      rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * pf.spin,
      a: pf.alpha * (0.7 + 0.6 * Math.random()),
      stripe: Math.random() < 0.55,
    });
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); // cap DPR at 2 (perf on hi-dpi laptops)
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    world.view = { w, h };
  }

  function clearFx() { sparks.length = 0; floats.length = 0; rings.length = 0; arcs.length = 0; }

  // ---------- camera ----------
  function updateCamera(dt) {
    const cam = world.camera, p = world.player, c = cfg.camera;
    const f = 1 - Math.pow(1 - c.follow, Math.min(3, dt * 60)); // framerate-independent follow
    cam.x += (p.x - cam.x) * f; cam.y += (p.y - cam.y) * f;
    if (world.reducedMotion || cam.shake <= 0.3) { cam.shake = 0; cam.ox = 0; cam.oy = 0; return; }
    cam.ox = (Math.random() * 2 - 1) * cam.shake;
    cam.oy = (Math.random() * 2 - 1) * cam.shake;
    cam.shake *= Math.exp(-c.shakeDecay * dt);
  }

  function inView(x, y, pad) {
    const cam = world.camera, v = world.view, z = cfg.camera.zoom;
    return Math.abs(x - cam.x) <= v.w / (2 * z) + pad && Math.abs(y - cam.y) <= v.h / (2 * z) + pad;
  }

  // ---------- fx intake ----------
  function pushSparks(x, y, color, n, spd) {
    if (world.reducedMotion) return;
    for (let i = 0; i < n && sparks.length < SPARK_CAP; i++) {
      const a = Math.random() * 6.283, s = spd * (0.3 + 0.7 * Math.random());
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, max: 0.6, color, r: 1 + Math.random() * 1.6 });
    }
  }
  function drainFx() {
    const fx = world.fx;
    for (const h of fx.hits) pushSparks(h.x, h.y, el(h.el), 2, 70);
    for (const d of fx.dmg) if (floats.length < FLOAT_CAP)
      floats.push({ x: d.x + (Math.random() * 10 - 5), y: d.y, life: 0.7, max: 0.7, text: String(d.amt), color: d.tag === 'strong' ? '#FFD470' : d.tag === 'weak' ? '#8FA8CC' : '#EDF7FF', big: d.tag === 'strong' });
    for (const a of fx.arcs) if (arcs.length < ARC_CAP)
      arcs.push({ x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, life: 0.12, max: 0.12, color: el(a.el) });
    if (!world.reducedMotion) for (const r of fx.rings) if (rings.length < RING_CAP)
      rings.push({ x: r.x, y: r.y, r1: r.r, life: 0.42, max: 0.42, color: r.color });
    for (const s of fx.sparks) pushSparks(s.x, s.y, s.color, s.n, 130);
    fx.hits.length = 0; fx.dmg.length = 0; fx.arcs.length = 0; fx.rings.length = 0; fx.sparks.length = 0;
  }
  function stepFx(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; if (s.life <= 0) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); } }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= 34 * dt; if (f.life <= 0) { floats[i] = floats[floats.length - 1]; floats.pop(); } }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life -= dt; if (r.life <= 0) { rings[i] = rings[rings.length - 1]; rings.pop(); } }
    for (let i = arcs.length - 1; i >= 0; i--) { const a = arcs[i]; a.life -= dt; if (a.life <= 0) { arcs[i] = arcs[arcs.length - 1]; arcs.pop(); } }
  }

  // ---------- entity draws ----------
  function drawGems() {
    ctx.fillStyle = '#FFD470';
    for (const g of world.gems.items) {
      if (!inView(g.x, g.y, 6)) continue;
      diamondPath(ctx, g.x, g.y, g.seeking ? 3.4 : 2.6); ctx.fill();
    }
  }

  function drawEnemy(e) {
    if (!inView(e.x, e.y, e.radius + 10)) return;
    const rot = e.spin * 0.6, flash = e.hitFlash > 0;
    // faint body tint + neon outline (Geometry-Dash read: the outline IS the shape)
    polyPath(ctx, e.x, e.y, e.radius, e.corners, rot);
    ctx.globalAlpha = flash ? 0.9 : 0.2; ctx.fillStyle = flash ? '#ffffff' : e.color; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 2; ctx.strokeStyle = flash ? '#ffffff' : (e.element > 0 ? el(e.element) : e.color); ctx.stroke();
    // armor shell — an outer ring in the element colour, thicker while it holds (strip it with the counter)
    if (e.shell > 0) {
      polyPath(ctx, e.x, e.y, e.radius * 1.3, e.corners, -rot);
      ctx.lineWidth = 2 + Math.min(4, e.shell / 8); ctx.strokeStyle = el(e.element > 0 ? e.element : 0);
      ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // hot core (fake glow via lighter, no blur)
    if (!world.reducedMotion) {
      ctx.globalCompositeOperation = 'lighter';
      polyPath(ctx, e.x, e.y, e.radius * 0.5, e.corners, rot);
      ctx.globalAlpha = e.champion ? 0.55 : 0.3; ctx.fillStyle = e.champion ? el(e.element) : '#7C93BE'; ctx.fill();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawBossLaser(b) {
    const L = b.laser; if (L.phase === 'off') return;
    const len = cfg.boss.laserLen, ex = b.x + Math.cos(L.ang) * len, ey = b.y + Math.sin(L.ang) * len;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey);
    if (L.phase === 'live') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,128,102,0.85)'; ctx.lineWidth = cfg.boss.laserW * 2; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = cfg.boss.laserW * 0.6; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else { // warm telegraph — the promised line, dim + dashed
      ctx.strokeStyle = 'rgba(255,128,102,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawBoss(b) {
    drawBossLaser(b);
    const rot = b.spin * 0.4, flash = b.hitFlash > 0;
    if (b.shell > 0) {
      polyPath(ctx, b.x, b.y, b.radius * 1.34, 8, -rot);
      ctx.lineWidth = 4; ctx.strokeStyle = el(b.element); ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
    }
    polyPath(ctx, b.x, b.y, b.radius, 8, rot);
    ctx.globalAlpha = 0.3; ctx.fillStyle = flash ? '#ffffff' : '#FF8066'; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 3; ctx.strokeStyle = flash ? '#ffffff' : '#FF8066'; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    polyPath(ctx, b.x, b.y, b.radius * 0.55, 8, -rot);
    ctx.globalAlpha = b.phaseFlash > 0 ? 0.8 : 0.45; ctx.fillStyle = '#FF8066'; ctx.fill(); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawBullets() {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of world.bullets.items) {
      if (!inView(b.x, b.y, 30)) continue;
      const c = el(b.element);
      if (b.glyph === 'pellet') { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 6.283); ctx.fillStyle = c; ctx.fill(); }
      else if (b.glyph === 'orb') { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 3, 0, 6.283); ctx.globalAlpha = 0.5; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1; }
      else { const len = b.glyph === 'lance' ? 22 : 10; boltPath(ctx, b.x, b.y, b.ang, len); ctx.strokeStyle = c; ctx.lineWidth = b.glyph === 'lance' ? 3 : 2; ctx.stroke(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawShots() {
    for (const s of world.eshots.items) {
      if (!inView(s.x, s.y, 10)) continue;
      const c = s.element > 0 ? el(s.element) : '#FF8066';
      diamondPath(ctx, s.x, s.y, s.radius);
      ctx.globalAlpha = s.invuln > 0 ? 0.5 : 1; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  function drawPlayer() {
    const p = world.player; if (!p.alive) return;
    const shieldMax = cfg.ship.shield + world.mods.shieldMaxAdd, sfrac = p.shield / shieldMax, hit = p.hitFlash > 0;
    const r = p.radius;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.heading);
    ctx.globalAlpha = (p.invuln > 0) ? (0.5 + 0.5 * Math.abs(Math.sin(p.invuln * 30))) : 1;

    // engine plume BEHIND the hull — length rides actual speed, so movement is legible from the
    // ship itself, not just the scrolling background. Flicker is cosmetic (Math.random ok).
    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 12) {
      const flick = world.reducedMotion ? 1 : (0.85 + Math.random() * 0.3);
      const len = (r * 0.7 + spd * 0.045) * (p.boosting ? 1.9 : 1) * flick;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(-r * 0.7 - len, 0);
      ctx.strokeStyle = p.boosting ? 'rgba(255,179,71,0.85)' : 'rgba(107,224,255,0.5)';
      ctx.lineWidth = p.boosting ? 5 : 3.5; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(-r * 0.7 - len * 0.55, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';
    }

    // shield as a hull-TRACING glow (not a ring around the ship) — the owner's standing note
    if (sfrac > 0.02) {
      ctx.globalCompositeOperation = 'lighter'; shipPath(ctx, r * 1.22);
      ctx.strokeStyle = '#6BE0FF'; ctx.globalAlpha = 0.2 + 0.4 * sfrac; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    // the hull: filled body + cyan outline, a dorsal ridge, and a lit canopy
    shipPath(ctx, r);
    ctx.fillStyle = hit ? '#ffffff' : '#101B2E'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hit ? '#ffffff' : '#6BE0FF'; ctx.stroke();
    if (!hit) {
      ctx.beginPath(); ctx.moveTo(r * 1.65, 0); ctx.lineTo(-r * 0.7, 0);         // dorsal ridge
      ctx.strokeStyle = 'rgba(107,224,255,0.28)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.55, 0, r * 0.2, 0, 6.283);                  // canopy
      ctx.fillStyle = '#9FE8FF'; ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    if (p.muzzle > 0) { ctx.beginPath(); ctx.arc(r * 1.65, 0, 3 + 4 * p.muzzle, 0, 6.283); ctx.fillStyle = 'rgba(180,235,255,' + (0.5 * p.muzzle) + ')'; ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawFx() {
    // arcs (chain lightning)
    ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
    for (const a of arcs) { ctx.globalAlpha = a.life / a.max; ctx.strokeStyle = a.color; ctx.beginPath(); ctx.moveTo(a.x1, a.y1); const mx = (a.x1 + a.x2) / 2 + (Math.random() * 12 - 6), my = (a.y1 + a.y2) / 2 + (Math.random() * 12 - 6); ctx.lineTo(mx, my); ctx.lineTo(a.x2, a.y2); ctx.stroke(); }
    // rings (blast / pull / shatter / boss death)
    for (const r of rings) { const t = 1 - r.life / r.max; ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = r.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r1 * t, 0, 6.283); ctx.stroke(); }
    // sparks
    for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life / s.max); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // floating damage numbers (drawn in world space, small)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of floats) { ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.color; ctx.font = (f.big ? '700 15px ' : '600 12px ') + "'Chakra Petch',sans-serif"; ctx.fillText(f.text, f.x, f.y); }
    ctx.globalAlpha = 1;
  }

  function drawProps(dt) {
    if (!props.length) return;
    const v = world.view, cam = world.camera;
    const pad = 90; // wrap margin so a prop never pops at the screen edge
    const spanW = v.w + pad * 2, spanH = v.h + pad * 2;
    for (const o of props) {
      if (!world.reducedMotion) o.rot += o.vr * dt;
      let sx = (o.fx * spanW - (world.reducedMotion ? 0 : cam.x * o.p)) % spanW;
      let sy = (o.fy * spanH - (world.reducedMotion ? 0 : cam.y * o.p)) % spanH;
      if (sx < 0) sx += spanW; if (sy < 0) sy += spanH;
      sx -= pad; sy -= pad;
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(o.rot);
      ctx.globalAlpha = o.a;
      if (o.kind === 'box') {           // a drifting cargo container
        ctx.fillStyle = '#3C4C68'; ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
        ctx.strokeStyle = 'rgba(120,160,220,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
        if (o.stripe) { ctx.fillStyle = 'rgba(255,212,112,0.55)'; ctx.fillRect(-o.w / 2 + o.w * 0.32, -o.h / 2, o.w * 0.12, o.h); }
      } else {                          // a broken station spar
        ctx.strokeStyle = 'rgba(120,160,220,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-o.w / 2, 0); ctx.lineTo(o.w / 2, 0);
        ctx.moveTo(o.w * 0.15, -o.h / 2); ctx.lineTo(o.w * 0.15, o.h / 2); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawStarfield() {
    const v = world.view, cam = world.camera;
    ctx.fillStyle = '#EDF7FF';
    for (const s of stars) {
      let sx = (s.fx * v.w - (world.reducedMotion ? 0 : cam.x * s.p)) % v.w;
      let sy = (s.fy * v.h - (world.reducedMotion ? 0 : cam.y * s.p)) % v.h;
      if (sx < 0) sx += v.w; if (sy < 0) sy += v.h;
      ctx.globalAlpha = s.a; ctx.fillRect(sx, sy, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- the frame ----------
  function frame(dt) {
    // self-heal: if boot measured the page before layout (view/canvas came back 0), re-measure now
    // that the first frame is running — the sim's aim math reads world.view, so it must never be 0.
    if (!world.view || world.view.w === 0 || canvas.width === 0) resize();
    updateCamera(dt);
    drainFx(); stepFx(dt);
    const v = world.view, z = cfg.camera.zoom, cam = world.camera;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#03060B'; ctx.fillRect(0, 0, v.w, v.h);
    drawStarfield();
    drawProps(dt);

    ctx.save();
    ctx.translate(v.w / 2 + cam.ox, v.h / 2 + cam.oy);
    ctx.scale(z, z);
    ctx.translate(-cam.x, -cam.y);

    drawGems();
    const es = world.enemies.items; for (let i = 0; i < es.length; i++) drawEnemy(es[i]);
    if (world.boss && !world.boss.dead) drawBoss(world.boss);
    drawShots();
    drawBullets();
    drawPlayer();
    drawFx();

    ctx.restore();

    // ---- screen-space UX layers (read world one-way; never gameplay state) ----
    const p = world.player, inp = world.input;
    if (world.started && !world.over && p.alive) {
      // cursor reticle — tightens + brightens while focus-firing so the mode is visible
      const rr = inp.focus ? 6 : 8, ra = inp.focus ? 0.9 : 0.45;
      ctx.globalAlpha = ra; ctx.strokeStyle = '#6BE0FF'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(inp.sx, inp.sy, rr, 0, 6.283); ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(inp.sx + Math.cos(a) * (rr + 2), inp.sy + Math.sin(a) * (rr + 2));
        ctx.lineTo(inp.sx + Math.cos(a) * (rr + 6), inp.sy + Math.sin(a) * (rr + 6));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // low-hull vignette — last pip, shield down: the edge of the screen says so
      if (p.pips <= 1 && p.shield <= 0.5) {
        const pulse = world.reducedMotion ? 0.16 : 0.12 + 0.1 * Math.abs(Math.sin(world.time * 4));
        const grad = ctx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.38, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.72);
        grad.addColorStop(0, 'rgba(255,64,48,0)');
        grad.addColorStop(1, 'rgba(255,64,48,' + pulse.toFixed(3) + ')');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, v.w, v.h);
      }
    }
  }

  return { resize, frame, clearFx };
}
