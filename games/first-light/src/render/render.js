// render/render.js — the night's picture. Draws only what reveal says is visible
// (alpha = max(lit, seen·ink) — the visibility law); every color comes from config;
// reduced-motion is law: twinkle/shimmer/pulse/drift all go static when set.

import { REDUCED } from '../core/scene.js';

const TAU = Math.PI * 2;

export function createRenderer(cfg, scene) {
  const C = cfg.colors;
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mix = (a, b, u) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * u));

  // palettes parsed once
  const pal = {};
  for (const k of ['night', 'predawn', 'dawn']) pal[k] = { top: hx(C[k].bgTop), bot: hx(C[k].bgBottom), shim: hx(C[k].shimmer) };
  const lerpPal = (A, B, u) => ({ top: mix(A.top, B.top, u), bot: mix(A.bot, B.bot, u), shim: mix(A.shim, B.shim, u) });
  const INK = hx(C.ink), STAR = hx(C.star), LAMP = hx(C.lamp), CORE = hx(C.lampCore),
    SONAR = hx(C.sonar), WRECK = hx(C.wreck), GOLD = hx(C.wreckDone), REEF = hx(C.reef),
    MINE = hx(C.mine), EYES = hx(C.eyes), LEV = hx(C.leviathan), HULL = hx(C.hull), WAKE = hx(C.wake);

  // cosmetic star/shimmer fields — normalized positions, so resize costs nothing
  const stars = [], shimmers = [];
  for (let i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.8, s: 0.5 + Math.random() * 1.3, ph: Math.random() * TAU, a: 0.2 + Math.random() * 0.5 });
  for (let i = 0; i < 22; i++) shimmers.push({ x: Math.random(), y: 0.12 + Math.random() * 0.85, w: 0.05 + Math.random() * 0.11, sp: 0.006 + Math.random() * 0.012, ph: Math.random() * TAU });

  const trail = []; // wake — last ~14 ship positions
  let t = 0;

  // night → predawn across the run (in-run dawn caps at 0.875); full daybreak = win screen
  function seaPal(d) {
    if (d <= 0.55) return pal.night;
    if (d <= 0.875) return lerpPal(pal.night, pal.predawn, (d - 0.55) / 0.325);
    return lerpPal(pal.predawn, pal.dawn, Math.min(1, (d - 0.875) / 0.125));
  }

  function poly(ctx, e, rot) {
    ctx.beginPath();
    for (let i = 0; i < e.pts.length; i++) {
      const p = e.pts[i], a = p.a + (rot || 0);
      const x = e.x + Math.cos(a) * e.r * p.r, y = e.y + Math.sin(a) * e.r * p.r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function inCone(beams, x, y) {
    if (!beams) return false;
    for (const b of beams) {
      const dx = x - b.x, dy = y - b.y;
      if (Math.hypot(dx, dy) > b.range * 1.08) continue;
      let da = Math.atan2(dy, dx) - b.heading;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < b.arc / 2 + 0.06) return true;
    }
    return false;
  }

  function drawStar4(ctx, x, y, r) { // tiny ✦ — the one ornament
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }

  function vignette(ctx, W, H, dawn) {
    const edge = 0.55 * Math.max(0, 1 - dawn * 0.8); // the dark loosens as dawn rises
    if (edge <= 0.01) return;
    const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.36, W / 2, H * 0.46, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${edge})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function draw(dt, view) {
    const ctx = scene.ctx, W = scene.W, H = scene.H, DPR = scene.DPR;
    t += dt;
    const dawn = view.phase === 'won' ? 1 : view.dawn; // full daybreak belongs to the win screen
    const P = seaPal(dawn);

    // ----- sea -----
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(P.top, 1)); g.addColorStop(1, rgba(P.bot, 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ----- stars (fade with dawn) + sea shimmer -----
    const starFade = Math.max(0, 1 - dawn * 1.7);
    if (starFade > 0.01) {
      ctx.fillStyle = rgba(STAR, 1);
      for (const s of stars) {
        const tw = REDUCED ? 0.75 : 0.55 + 0.45 * Math.sin(t * 1.7 + s.ph);
        ctx.globalAlpha = s.a * tw * starFade;
        ctx.fillRect(s.x * W, s.y * H, s.s * DPR, s.s * DPR);
      }
    }
    ctx.strokeStyle = rgba(P.shim, 1); ctx.lineWidth = 1 * DPR;
    for (const s of shimmers) {
      const drift = REDUCED ? 0 : (t * s.sp) % 1;
      const x = ((s.x + drift) % 1) * W;
      ctx.globalAlpha = REDUCED ? 0.3 : 0.16 + 0.18 * Math.sin(t * 0.8 + s.ph);
      ctx.beginPath(); ctx.moveTo(x, s.y * H); ctx.lineTo(x + s.w * W, s.y * H); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ----- title: sea + one slow ambient sounding, then out -----
    if (view.phase === 'title') {
      if (!REDUCED) {
        const prog = (((t % 4) + 4) % 4) / 4, r = prog * Math.min(W, H) * 0.42; // sign-safe: a negative clock must never mint a negative radius
        ctx.strokeStyle = rgba(SONAR, 0.2 * (1 - prog)); ctx.lineWidth = 1.5 * DPR;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.stroke();
      }
      vignette(ctx, W, H, dawn); return;
    }

    const ink = Math.min(1, cfg.sonar.inkAlpha + (view.mods ? view.mods.inkAlpha : 0));

    // ----- chart ink: everything ever seen, faint monochrome -----
    ctx.strokeStyle = rgba(INK, 1); ctx.lineWidth = 1.2 * DPR;
    for (const w of view.wrecks) {
      if (!w.seen || w.charted) continue; // charted wrecks live in the gold pass
      ctx.globalAlpha = ink; poly(ctx, w, w.tilt); ctx.stroke();
    }
    for (const rf of view.reefs) {
      if (!rf.seen) continue;
      ctx.globalAlpha = ink; poly(ctx, rf, 0); ctx.stroke();
    }
    for (const mn of view.mines) {
      if (!mn.seen) continue;
      ctx.globalAlpha = ink;
      ctx.beginPath(); ctx.arc(mn.x, mn.y, mn.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ----- sonar pings -----
    const maxR = cfg.sonar.maxRadius * (view.mods ? view.mods.pingRadius : 1) * DPR;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1.5 * DPR;
    for (const p of view.pings) {
      const a = Math.max(0, 1 - p.r / maxR);
      ctx.strokeStyle = rgba(SONAR, 0.45 * a * a);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
    }
    ctx.restore();

    // ----- the beam(s) — the signature image -----
    if (view.beams) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const b of view.beams) {
        const grad = ctx.createRadialGradient(b.x, b.y, 4 * DPR, b.x, b.y, b.range);
        grad.addColorStop(0, rgba(CORE, (view.focus ? 0.85 : 0.6) * b.power));
        grad.addColorStop(0.2, rgba(LAMP, (view.focus ? 0.4 : 0.3) * b.power));
        grad.addColorStop(1, rgba(LAMP, 0));
        ctx.fillStyle = grad;
        for (const [halfMul, alpha] of [[1.12, 0.45], [0.85, 0.55], [0.5, 0.5]]) { // stacked cones = soft edges
          const half = (b.arc / 2) * halfMul;
          ctx.globalAlpha = alpha;
          ctx.beginPath(); ctx.moveTo(b.x, b.y);
          ctx.arc(b.x, b.y, b.range, b.heading - half, b.heading + half);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // ----- lit entities -----
    for (const rf of view.reefs) {
      if (rf.lit <= 0.01) continue;
      ctx.globalAlpha = rf.lit;
      ctx.fillStyle = rgba(mix(REEF, [0, 0, 0], 0.35), 1); poly(ctx, rf, 0); ctx.fill();
      ctx.strokeStyle = rgba(mix(REEF, STAR, 0.35), 0.9); ctx.lineWidth = 1.5 * DPR; ctx.stroke();
    }
    for (const w of view.wrecks) {
      const a = w.charted ? Math.max(w.lit, Math.min(1, ink * 1.6)) : w.lit;
      if (a <= 0.01) continue;
      const col = w.charted ? GOLD : WRECK;
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(mix(col, [0, 0, 0], 0.65), 0.85); poly(ctx, w, w.tilt); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 1.6 * DPR; ctx.stroke();
      ctx.beginPath(); // a broken keel line across the hull
      ctx.moveTo(w.x - Math.cos(w.tilt) * w.r * 0.7, w.y - Math.sin(w.tilt) * w.r * 0.7);
      ctx.lineTo(w.x + Math.cos(w.tilt) * w.r * 0.7, w.y + Math.sin(w.tilt) * w.r * 0.7);
      ctx.lineWidth = 1 * DPR; ctx.stroke();
      if (w.charted) { ctx.fillStyle = rgba(GOLD, 1); drawStar4(ctx, w.x, w.y - w.r - 10 * DPR, 5 * DPR); }
    }
    for (const mn of view.mines) {
      if (mn.lit <= 0.01) continue;
      const blink = REDUCED ? 0.7 : 0.45 + 0.55 * Math.sin(mn.ph + t * 5);
      ctx.globalAlpha = mn.lit;
      ctx.strokeStyle = rgba(MINE, 0.95); ctx.lineWidth = 1.5 * DPR;
      for (let k = 0; k < 8; k++) { // spikes
        const a = (k / 8) * TAU;
        ctx.beginPath(); ctx.moveTo(mn.x + Math.cos(a) * mn.r, mn.y + Math.sin(a) * mn.r);
        ctx.lineTo(mn.x + Math.cos(a) * mn.r * 1.55, mn.y + Math.sin(a) * mn.r * 1.55); ctx.stroke();
      }
      ctx.fillStyle = rgba(mix(MINE, [0, 0, 0], 0.5), 1);
      ctx.beginPath(); ctx.arc(mn.x, mn.y, mn.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(MINE, 1); ctx.stroke();
      ctx.globalAlpha = mn.lit * blink * 0.6; // the warning glow
      ctx.fillStyle = rgba(MINE, 1);
      ctx.beginPath(); ctx.arc(mn.x, mn.y, mn.r * 0.4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ----- survey progress arcs -----
    for (const w of view.wrecks) {
      if (w.charted || w.progress <= 0) continue;
      const pulse = REDUCED ? 0 : Math.sin(t * 3) * 2 * DPR;
      ctx.strokeStyle = rgba(GOLD, 0.18); ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath(); ctx.arc(w.x, w.y, view.surveyRadius + pulse, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(GOLD, 0.9); ctx.lineWidth = 2.5 * DPR;
      ctx.beginPath(); ctx.arc(w.x, w.y, view.surveyRadius + pulse, -Math.PI / 2, -Math.PI / 2 + w.progress * TAU); ctx.stroke();
    }

    // ----- the Leviathan (only its stalking shape is ever shown) -----
    const lev = view.lev;
    if (lev && lev.active && lev.state === 'stalking') {
      const p = lev.p, ang = Math.atan2(view.ship.p.y - p.y, view.ship.p.x - p.x);
      const feared = inCone(view.beams, p.x, p.y);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
      ctx.fillStyle = rgba(LEV, 0.6); // barely-darker bulk
      ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.5, p.r * 0.95, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = feared ? rgba(GOLD, REDUCED ? 0.4 : 0.25 + 0.2 * Math.sin(t * 9)) : rgba(INK, 0.12);
      ctx.lineWidth = 1.5 * DPR; ctx.stroke(); // gold shimmer at the edges while in the beam
      ctx.strokeStyle = rgba(INK, 0.08); ctx.lineWidth = 1 * DPR;
      for (const rr of [1.9, 2.5]) { // faint wake ripples
        ctx.beginPath(); ctx.ellipse(0, 0, p.r * rr, p.r * rr * 0.62, 0, 0, TAU); ctx.stroke();
      }
      if ((lev.blink % 3.4) > 0.13) { // occasional blink — eyes otherwise ALWAYS on
        const eyeR = 2.8 * DPR * (1 - lev.fear * 0.55); // fear narrows the eyes
        for (const side of [-1, 1]) {
          const ex = p.r * 0.62, ey = side * p.r * 0.3;
          ctx.fillStyle = rgba(EYES, 0.22);
          ctx.beginPath(); ctx.arc(ex, ey, eyeR * 2.4, 0, TAU); ctx.fill();
          ctx.fillStyle = rgba(EYES, 0.95);
          ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }

    // ----- particles -----
    for (const pt of view.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life));
      ctx.fillStyle = `rgb(${pt.col})`;
      ctx.fillRect(pt.x - 1.5 * DPR, pt.y - 1.5 * DPR, 3 * DPR, 3 * DPR);
    }
    ctx.globalAlpha = 1;

    // ----- the ship + wake -----
    const sp = view.ship.p;
    if (view.phase === 'playing' && !REDUCED) {
      trail.push({ x: sp.x, y: sp.y });
      if (trail.length > 14) trail.shift();
      ctx.strokeStyle = rgba(WAKE, 1); ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) { // orbital-field's light-painting nod
        ctx.globalAlpha = (i / trail.length) * 0.3;
        ctx.lineWidth = (i / trail.length) * 2.5 * DPR;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (view.phase !== 'playing') trail.length = 0;
    const flicker = view.ship.invuln() && Math.floor(t * 8) % 2 === 1; // ~8Hz i-frame blink
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.heading);
    ctx.globalAlpha = flicker ? 0.25 : 1;
    const r = sp.r;
    ctx.fillStyle = rgba(HULL, 1);
    ctx.beginPath(); // slim lightship hull, bow toward heading
    ctx.moveTo(r * 1.45, 0);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.62, -r * 1.05, -r * 0.42);
    ctx.lineTo(-r * 1.3, 0); ctx.lineTo(-r * 1.05, r * 0.42);
    ctx.quadraticCurveTo(r * 0.3, r * 0.62, r * 1.45, 0);
    ctx.fill();
    ctx.fillStyle = rgba(CORE, 0.5); // lamp housing at the bow
    ctx.beginPath(); ctx.arc(r * 1.02, 0, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(LAMP, 1);
    ctx.beginPath(); ctx.arc(r * 1.02, 0, r * 0.26, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;

    vignette(ctx, W, H, dawn);
  }

  return { draw };
}
