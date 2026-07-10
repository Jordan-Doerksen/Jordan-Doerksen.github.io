// draw-fx.js — projectiles/tracers, particles, floaters. Everything here is read-only:
// the sim owns projectile t (tickFx advances + removes it), so render must not also
// advance it — double-advancing was the original seam bug.
import { toScreen } from './iso.js';
import { hexToRgba } from './draw.js';

// Colors may arrive as palette keys OR raw hex (the sim passes palette hexes directly).
function resolveColor(pal, c, fallback) {
  if (c && pal[c]) return pal[c];
  if (typeof c === 'string' && c.startsWith('#')) return c;
  return fallback;
}

// Tracers between a shot's endpoints. Accepts either {from:{x,y}, to:{x,y}} or
// flat {x, y, tx, ty}; p.t (0..1) is sim-owned interpolation state.
export function drawProjectiles(ctx, C, state) {
  const pal = C.game.palette;
  for (const p of state.projectiles) {
    const fx = p.from ? p.from.x : p.x;
    const fy = p.from ? p.from.y : p.y;
    const tx = p.to ? p.to.x : p.tx;
    const ty = p.to ? p.to.y : p.ty;
    if (fx == null || tx == null) continue;
    const t = Math.min(1, p.t || 0);
    const a = toScreen(fx, fy);
    const b = toScreen(tx, ty);
    const hx = a.x + (b.x - a.x) * t;
    const hy = a.y + (b.y - a.y) * t - 8; // shots fly at torso height
    const trail = 0.12;
    const t0 = Math.max(0, t - trail);
    const sx = a.x + (b.x - a.x) * t0;
    const sy = a.y + (b.y - a.y) * t0 - 8;
    const color = resolveColor(pal, p.color, pal.unitAccent);
    ctx.strokeStyle = hexToRgba(color, 0.9);
    ctx.lineWidth = p.heavy ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  }
}

// Particles are decorative — render.js skips this entirely under reduced motion.
export function drawParticles(ctx, C, state) {
  const pal = C.game.palette;
  for (const pt of state.particles) {
    const max = pt.maxLife || 0.5;
    const frac = Math.max(0, Math.min(1, (pt.life != null ? pt.life : max) / max));
    const p = toScreen(pt.x, pt.y);
    ctx.fillStyle = hexToRgba(resolveColor(pal, pt.color, pal.text), frac * 0.9);
    const s = pt.size || 2;
    ctx.fillRect(p.x - s / 2, p.y - (pt.z || 0) - s / 2, s, s);
  }
}

// Floaters carry information (+essence, damage) so they render under reduced
// motion too — they just hold still instead of rising.
export function drawFloaters(ctx, C, state) {
  const pal = C.game.palette;
  const lifetime = C.game.fx.floaterLifetimeSec;
  ctx.font = '11px "JetBrains Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const age = f.age != null ? f.age : (f.t || 0);
    const frac = Math.max(0, 1 - age / lifetime);
    if (frac <= 0) continue;
    const p = toScreen(f.x, f.y);
    const rise = state.reducedMotion ? 12 : 12 + age * 22;
    ctx.fillStyle = hexToRgba(resolveColor(pal, f.color, pal.text), frac);
    ctx.fillText(String(f.text), p.x, p.y - rise);
  }
  ctx.textAlign = 'start';
}
