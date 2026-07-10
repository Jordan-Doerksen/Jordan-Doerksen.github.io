// render.js — orchestrates one frame of world drawing. Display only: never mutates
// sim state (draw-fx advances projectile p.t, an allowed presentation-local field).
// Seam pinned by ARCHITECTURE.md: initRender(canvas, cfg, state) + render(state, dt).
// cfg is the loaded config bundle { game, map, roster, tech }.
import { initIso } from './iso.js';
import { shade, drawGround, drawLanes, drawSpots, drawRangePreview } from './draw.js';
import { drawBuilding, drawUnit, drawEnemy } from './draw-entities.js';
import { drawProjectiles, drawParticles, drawFloaters } from './draw-fx.js';

let ctx = null;
let cv = null;
let C = null;
let t = 0; // local clock for decorative pulses (never fed back to the sim)

export function initRender(canvas, cfg, state) {
  cv = canvas;
  C = cfg;
  cv.width = cfg.game.canvas.width;
  cv.height = cfg.game.canvas.height;
  ctx = cv.getContext('2d');
  initIso(cfg.map);
}

export function render(state, dt) {
  if (!ctx) return;
  t += dt || 0;

  // Backdrop — a step darker than the darkest ground tile.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = shade(C.game.palette.groundAlt, 0.5);
  ctx.fillRect(0, 0, cv.width, cv.height);

  // Screen shake: config-gated AND reduced-motion is law.
  if (state.shake > 0 && C.game.fx.screenShake && !state.reducedMotion) {
    ctx.translate(
      (Math.random() * 2 - 1) * state.shake * 6,
      (Math.random() * 2 - 1) * state.shake * 4
    );
  }

  drawGround(ctx, C);
  drawLanes(ctx, C);
  drawSpots(ctx, C, state);
  drawRangePreview(ctx, C, state);

  // Painter's algorithm: everything with a footprint sorts by (x + y) so iso
  // overlap reads correctly. Garrisoned marines are never drawn in the field.
  const items = [];
  for (const b of state.buildings) items.push({ d: b.tile.x + b.tile.y, kind: 'b', e: b });
  for (const u of state.units) if (!u.bunkerId) items.push({ d: u.x + u.y, kind: 'u', e: u });
  for (const e of state.enemies) items.push({ d: e.x + e.y, kind: 'e', e });
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    if (it.kind === 'b') drawBuilding(ctx, C, it.e, state, t);
    else if (it.kind === 'u') drawUnit(ctx, C, it.e);
    else drawEnemy(ctx, C, it.e, t, state.reducedMotion);
  }

  drawProjectiles(ctx, C, state, dt || 0);
  if (!state.reducedMotion) drawParticles(ctx, C, state);
  drawFloaters(ctx, C, state);
}
