// draw-entities.js — buildings, units, enemies, HP bars. Flat-shaded vector silhouettes.
// Display only: reads state, never mutates it. All colors from config/game.json palette.
import { grid, toScreen, diamondPath, ellipseRadii } from './iso.js';
import { hexToRgba, shade, mixHex } from './draw.js';

// Visual radii in px (presentation constants, not gameplay tunables — sim ignores them).
const ENEMY_R = { ling: 5, roach: 9, spitter: 6, boomer: 8, broodling: 3.5, phantom: 6 };
const BOSS_BASE_R = 8;

// ---------- shared bits ------------------------------------------------------------------

// A flat-shaded iso box: top diamond raised by h px, two visible side faces.
function isoBox(ctx, sx, sy, scale, h, color) {
  const g = grid();
  const w = (g.tileW * scale) / 2;
  const d = (g.tileH * scale) / 2;
  ctx.fillStyle = shade(color, 0.55); // left face
  ctx.beginPath();
  ctx.moveTo(sx - w, sy); ctx.lineTo(sx, sy + d);
  ctx.lineTo(sx, sy + d - h); ctx.lineTo(sx - w, sy - h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(color, 0.72); // right face
  ctx.beginPath();
  ctx.moveTo(sx + w, sy); ctx.lineTo(sx, sy + d);
  ctx.lineTo(sx, sy + d - h); ctx.lineTo(sx + w, sy - h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; // top
  diamondPath(ctx, sx, sy - h, scale);
  ctx.fill();
}

export function drawHpBar(ctx, C, px, py, hp, maxHp, width = 22) {
  if (hp >= maxHp) return;
  const pal = C.game.palette;
  const frac = Math.max(0, hp / maxHp);
  ctx.fillStyle = hexToRgba(pal.groundAlt, 0.9);
  ctx.fillRect(px - width / 2, py, width, 3);
  ctx.fillStyle = mixHex(pal.hpBad, pal.hpGood, frac);
  ctx.fillRect(px - width / 2, py, width * frac, 3);
}

function levelPips(ctx, C, px, py, level) {
  const pal = C.game.palette;
  for (let i = 0; i < level; i++) {
    ctx.fillStyle = pal.slotHover;
    ctx.fillRect(px - 8 + i * 6, py, 4, 3);
  }
}

// ---------- buildings --------------------------------------------------------------------

export function drawBuilding(ctx, C, b, state, t) {
  const pal = C.game.palette;
  const p = toScreen(b.tile.x, b.tile.y);
  if (state.selectedBuildingId === b.id) {
    const { rx, ry } = ellipseRadii(0.85);
    ctx.strokeStyle = pal.slotHover;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (b.type === 'core') {
    // Static glow when reduced motion is set — the pulse is decoration, not information.
    const pulse = state.reducedMotion ? 0.6 : 0.5 + 0.3 * Math.sin(t * 2.2);
    ctx.save();
    ctx.shadowColor = pal.coreGlow;
    ctx.shadowBlur = 14 + pulse * 14;
    isoBox(ctx, p.x, p.y, 1.8, 22, pal.base);
    isoBox(ctx, p.x, p.y - 22, 0.9, 12, pal.core);
    ctx.fillStyle = pal.coreGlow;
    diamondPath(ctx, p.x, p.y - 38, 0.3);
    ctx.fill();
    ctx.restore();
    drawHpBar(ctx, C, p.x, p.y - 52, b.hp, b.maxHp, 40);
  } else if (b.type === 'income') {
    isoBox(ctx, p.x, p.y, 0.95, 12, pal.base);
    ctx.fillStyle = pal.credits; // credit-colored intake strip on the roof
    diamondPath(ctx, p.x, p.y - 12, 0.35);
    ctx.fill();
    levelPips(ctx, C, p.x, p.y - 24, b.level);
    drawHpBar(ctx, C, p.x, p.y - 30, b.hp, b.maxHp);
  } else if (b.type === 'barracks') {
    isoBox(ctx, p.x, p.y, 1.1, 16, pal.base);
    ctx.fillStyle = shade(pal.base, 0.4); // door
    ctx.fillRect(p.x - 3, p.y - 8, 6, 9);
    ctx.fillStyle = pal.unit; // squad banner
    ctx.fillRect(p.x + 6, p.y - 22, 3, 8);
    levelPips(ctx, C, p.x, p.y - 30, b.level);
    drawHpBar(ctx, C, p.x, p.y - 36, b.hp, b.maxHp);
  } else if (b.type === 'turret') {
    isoBox(ctx, p.x, p.y, 0.7, 8, pal.base);
    const ang = aimAngle(state, b, p);
    ctx.strokeStyle = b.level >= 2 ? pal.slotHover : pal.unitAccent;
    ctx.lineWidth = b.level >= 2 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 10);
    ctx.lineTo(p.x + Math.cos(ang) * 12, p.y - 10 + Math.sin(ang) * 7);
    ctx.stroke();
    ctx.fillStyle = pal.base;
    ctx.beginPath(); ctx.arc(p.x, p.y - 10, 4, 0, Math.PI * 2); ctx.fill();
    levelPips(ctx, C, p.x, p.y - 20, b.level);
    drawHpBar(ctx, C, p.x, p.y - 26, b.hp, b.maxHp);
  } else if (b.type === 'bunker') {
    isoBox(ctx, p.x, p.y, 1.0, 10, pal.base);
    ctx.fillStyle = shade(pal.base, 0.35); // firing slit
    ctx.fillRect(p.x - 9, p.y - 7, 18, 2.5);
    // Garrison pips — garrisoned marines are never drawn in the field.
    const n = (b.garrison || []).length;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = C.game.palette.unit;
      ctx.beginPath(); ctx.arc(p.x - 8 + i * 8, p.y - 16, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    drawHpBar(ctx, C, p.x, p.y - 26, b.hp, b.maxHp);
  }
}

function aimAngle(state, b, p) {
  const target = b.targetId != null && state.enemies.find(e => e.id === b.targetId);
  if (!target) return -Math.PI / 4;
  const tp = toScreen(target.x, target.y);
  return Math.atan2(tp.y - (p.y - 10), tp.x - p.x);
}

// ---------- units --------------------------------------------------------------------------

const UNIT_COLOR = { marine: 'unit', medic: 'medic', flamer: 'flame', drone: 'essence', titan: 'essence' };

export function drawUnit(ctx, C, u) {
  const pal = C.game.palette;
  const p = toScreen(u.x, u.y);
  const color = pal[UNIT_COLOR[u.type]] || pal.unit;
  const big = u.type === 'titan';
  const r = big ? 7 : 3;
  ctx.fillStyle = hexToRgba(pal.groundAlt, 0.6); // contact shadow
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, r + 2, (r + 2) / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; // body
  ctx.beginPath(); ctx.ellipse(p.x, p.y - r - 2, r, r * 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = u.type === 'marine' ? pal.unitAccent : shade(color, 0.7); // head
  ctx.beginPath(); ctx.arc(p.x, p.y - r * 3 - 1, r * 0.7, 0, Math.PI * 2); ctx.fill();
  drawHpBar(ctx, C, p.x, p.y - r * 4 - 6, u.hp, u.maxHp, big ? 26 : 14);
}

// ---------- enemies --------------------------------------------------------------------------

export function drawEnemy(ctx, C, e, t, reducedMotion) {
  const pal = C.game.palette;
  const p = toScreen(e.x, e.y);
  const bossDef = e.boss ? C.roster.bosses[e.type] : null;
  let r = bossDef ? BOSS_BASE_R * (bossDef.sizeMult || 2) : (ENEMY_R[e.type] || 5);
  if (e.elite) r *= C.roster.elites.sizeMult;
  const isAlien = e.type === 'phantom';
  const body = isAlien ? pal.alien : pal.bug;
  const dark = isAlien ? shade(pal.alien, 0.6) : pal.bugDark;
  // Blobby squash driven by travel, static under reduced motion.
  const squash = reducedMotion ? 0 : Math.sin(t * 8 + (e.x + e.y) * 2) * 0.1;
  ctx.fillStyle = hexToRgba(pal.groundAlt, 0.6);
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, r * 1.1, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; // underside lobes
  ctx.beginPath(); ctx.ellipse(p.x - r * 0.5, p.y - r * 0.4, r * 0.6, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(p.x + r * 0.5, p.y - r * 0.4, r * 0.6, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = body; // main blob
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - r * 0.7, r * (1 + squash), r * 0.8 * (1 - squash), 0, 0, Math.PI * 2);
  ctx.fill();
  if (e.elite) {
    ctx.strokeStyle = pal.text;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (isAlien && e.shield > 0) {
    ctx.strokeStyle = pal.shield;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - r * 0.7, r * 1.5, r * 1.2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (e.slowT > 0) { // pheromone slow tell
    ctx.strokeStyle = hexToRgba(pal.essence, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.3, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  drawHpBar(ctx, C, p.x, p.y - r * 1.8 - 6, e.hp, e.maxHp, Math.max(14, r * 2.2));
  if (bossDef) drawNameTag(ctx, C, p.x, p.y - r * 1.8 - 18, bossDef.name);
}

function drawNameTag(ctx, C, px, py, name) {
  const pal = C.game.palette;
  ctx.font = '10px "JetBrains Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  const w = ctx.measureText(name).width + 10;
  ctx.fillStyle = hexToRgba(pal.groundAlt, 0.85);
  ctx.fillRect(px - w / 2, py - 9, w, 12);
  ctx.fillStyle = pal.text;
  ctx.fillText(name, px, py);
  ctx.textAlign = 'start';
}
