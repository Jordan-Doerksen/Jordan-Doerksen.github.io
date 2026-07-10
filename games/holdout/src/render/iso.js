// iso.js — 2:1 isometric projection helpers. Pure math, no drawing decisions.
// Formula pinned by ARCHITECTURE.md: sx = offsetX + (x - y) * tileW/2,
//                                    sy = offsetY + (x + y) * tileH/2.
// Grid values come from config/map.json via initIso — never hardcoded here.

let G = null;

export function initIso(mapCfg) {
  if (mapCfg && mapCfg.grid) G = mapCfg.grid;
}

export function grid() { return G; }

// Tile-space (floats allowed) → screen pixels. Returns the tile's center point.
export function toScreen(x, y) {
  return {
    x: G.offsetX + (x - y) * G.tileW / 2,
    y: G.offsetY + (x + y) * G.tileH / 2,
  };
}

// Screen pixels → tile-space floats (inverse of toScreen). Used for picking.
export function pickTile(px, py) {
  if (!G) return { x: -1, y: -1 };
  const a = (px - G.offsetX) / (G.tileW / 2);
  const b = (py - G.offsetY) / (G.tileH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// Trace an iso diamond path centered on (sx, sy). scale 1 = one tile. Caller fills/strokes.
export function diamondPath(ctx, sx, sy, scale = 1) {
  const w = (G.tileW * scale) / 2;
  const h = (G.tileH * scale) / 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - h);
  ctx.lineTo(sx + w, sy);
  ctx.lineTo(sx, sy + h);
  ctx.lineTo(sx - w, sy);
  ctx.closePath();
}

// Radii for a tile-space circle of radius r projected to screen (an axis-aligned ellipse).
export function ellipseRadii(r) {
  return {
    rx: r * (G.tileW / 2) * Math.SQRT2,
    ry: r * (G.tileH / 2) * Math.SQRT2,
  };
}
