// draw.js — static world layers: ground checker, lanes, build slots/pads, range preview.
// Also home of the palette-derived color helpers (all colors trace back to config/game.json).
import { grid, toScreen, diamondPath, ellipseRadii } from './iso.js';

// ---------- palette-derived helpers (never invent a hex — derive from config values) ----

export function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Multiply a palette hex toward black (f < 1) — used for iso box side shading.
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

// Blend two palette hexes; t = 0 → a, t = 1 → b. Used for HP bar color ramps.
export function mixHex(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = (sa, sb) => Math.round(sa + (sb - sa) * t);
  const r = ch((na >> 16) & 255, (nb >> 16) & 255);
  const g = ch((na >> 8) & 255, (nb >> 8) & 255);
  const bl = ch(na & 255, nb & 255);
  return `rgb(${r},${g},${bl})`;
}

// ---------- world layers -----------------------------------------------------------------

export function drawGround(ctx, C) {
  const pal = C.game.palette;
  const g = grid();
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      const p = toScreen(x, y);
      diamondPath(ctx, p.x, p.y, 1);
      ctx.fillStyle = (x + y) % 2 === 0 ? pal.ground : pal.groundAlt;
      ctx.fill();
    }
  }
}

export function drawLanes(ctx, C) {
  const pal = C.game.palette;
  const g = grid();
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const lane of C.map.lanes) {
    // Dark edge underneath, tinted body on top — reads as a worn approach road.
    for (const pass of [
      { color: shade(pal.lane, 0.7), width: g.tileH * 1.05 },
      { color: pal.lane, width: g.tileH * 0.8 },
    ]) {
      ctx.beginPath();
      lane.waypoints.forEach((wp, i) => {
        const p = toScreen(wp.x, wp.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.width;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Slots (solid outline) and pads (dashed outline). Hovered spot lights goldenrod.
// Spots already occupied by a building are skipped — the building reads for itself.
export function drawSpots(ctx, C, state) {
  const pal = C.game.palette;
  const occupied = new Set();
  for (const b of state.buildings) {
    if (b.slotId) occupied.add(b.slotId);
    if (b.padId) occupied.add(b.padId);
  }
  ctx.save();
  for (const kind of ['slots', 'pads']) {
    ctx.setLineDash(kind === 'pads' ? [4, 3] : []);
    for (const spot of C.map[kind]) {
      if (occupied.has(spot.id)) continue;
      const hovered = state.hoverSlot === spot.id;
      const p = toScreen(spot.tile.x, spot.tile.y);
      diamondPath(ctx, p.x, p.y, 0.9);
      if (hovered) {
        ctx.fillStyle = hexToRgba(pal.slotHover, 0.18);
        ctx.fill();
      }
      ctx.strokeStyle = hovered ? pal.slotHover : pal.slot;
      ctx.lineWidth = hovered ? 2 : 1.25;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// When a build is selected and a spot is hovered, preview the weapon range there.
export function drawRangePreview(ctx, C, state) {
  if (!state.selectedBuild || !state.hoverSlot) return;
  const r = rangeTilesFor(C, state.selectedBuild);
  if (!r) return;
  const spot = [...C.map.slots, ...C.map.pads].find(s => s.id === state.hoverSlot);
  if (!spot) return;
  const pal = C.game.palette;
  const p = toScreen(spot.tile.x, spot.tile.y);
  const { rx, ry } = ellipseRadii(r);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(pal.slotHover, 0.07);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(pal.slotHover, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function rangeTilesFor(C, type) {
  const B = C.roster.buildings;
  if (type === 'turret') return B.turret.levels[0].rangeTiles;
  // A bunker's reach is its garrisoned marines' range plus the bunker bonus.
  if (type === 'bunker') return C.roster.units.marine.rangeTiles + B.bunker.garrisonRangeBonus;
  return null; // barracks: squads rally to lanes; a range ring here would be false.
}
