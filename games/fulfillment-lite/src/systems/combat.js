// combat.js — the heart. Resolves every bullet↔enemy hit through the spatial grid, applies the
// element multiplier + shell + procs, routes damage to normal enemies OR the boss, and handles
// death (gems, scrip, shatter). Also player-contact damage. Cosmetic events are pushed to the
// capped world.fx.* queues (render-only; a dropped one can never change the run). One-way law:
// nothing here reads render state.

import { elementMult, matchTag } from './elements.js';
import { hurtPlayer } from '../entities/player.js';

// ---- capped cosmetic pushes ----
function fxHit(world, x, y, el) { const a = world.fx.hits; if (a.length < world.config.perf.fxHitsCap) a.push({ x, y, el }); }
function fxDmg(world, x, y, amt, tag) { const a = world.fx.dmg; if (a.length < world.config.perf.fxDmgCap) a.push({ x, y, amt: Math.round(amt), tag }); }
function fxArc(world, x1, y1, x2, y2, el) { const a = world.fx.arcs; if (a.length < world.config.perf.fxArcsCap) a.push({ x1, y1, x2, y2, el }); }
function fxSpark(world, x, y, color, n) { const a = world.fx.sparks; if (a.length < world.config.perf.fxParticleCap) a.push({ x, y, color, n }); }
function fxRing(world, x, y, r, color) { world.fx.rings.push({ x, y, r, color }); }

export function dropGems(world, x, y, n, val) {
  const cap = world.config.perf.gemCap, life = world.config.progression.gemLife, r = world.rng;
  for (let k = 0; k < n; k++) {
    if (world.gems.count >= cap) break;
    const g = world.gems.spawn();
    const a = r() * 6.283, s = 40 + r() * 90;
    g.x = x; g.y = y; g.vx = Math.cos(a) * s; g.vy = Math.sin(a) * s;
    g.value = val; g.life = life; g.seeking = false;
  }
}

// ---- the central damage function (normal enemies AND the boss) ----
export function damageEnemy(world, e, rawDmg, element, srcx, srcy, opts) {
  if (e.dead) return;
  opts = opts || {};
  let mult = elementMult(element, e.element);
  if (e.resist >= 0 && element === e.resist) mult *= 0.5;
  const dmg = rawDmg * mult;
  const tag = matchTag(element, e.element);

  if (e.boss) { damageBoss(world, e, dmg, srcx, srcy, tag); return; }

  if (e.shell > 0) { e.shell -= dmg; if (e.shell < 0) e.shell = 0; }   // shell fully absorbs while up
  else { e.hp -= dmg; }

  e.hitFlash = world.config.procs.hitFlashTime;
  fxHit(world, e.x, e.y, element);
  if (tag || dmg >= 8) fxDmg(world, e.x, e.y, dmg, tag);

  if (opts.kb && (srcx !== undefined)) {
    let kx = e.x - srcx, ky = e.y - srcy; const d = Math.hypot(kx, ky) || 1;
    e.kbx += (kx / d) * opts.kb; e.kby += (ky / d) * opts.kb;
  }

  if (e.hp <= 0) killEnemy(world, e, element, opts.bullet);
}

export function killEnemy(world, e, element, bullet) {
  const cfg = world.config, ch = cfg.champions;
  e.dead = true;
  world.kills++;
  world.scrip += e.champion ? cfg.scrip.champion : cfg.scrip.kill;

  // Shatter signature: a chilled enemy's death erupts in ice.
  if (bullet && bullet.shatter && e.slow > 0) {
    fxRing(world, e.x, e.y, cfg.procs.shatterRadius, '#45D9FF');
    world.grid.query(e.x, e.y, cfg.procs.shatterRadius, (o) => {
      if (o.dead || o === e || o.boss) return;
      const dx = o.x - e.x, dy = o.y - e.y;
      if (dx * dx + dy * dy <= cfg.procs.shatterRadius * cfg.procs.shatterRadius) damageEnemy(world, o, cfg.procs.shatterDmg, 2, e.x, e.y, {});
    });
  }

  if (e.champion) { dropGems(world, e.x, e.y, ch.gems, ch.gemValue); world.hitstop = Math.max(world.hitstop, 2); }
  else dropGems(world, e.x, e.y, 1, cfg.progression.gemValue);
  fxSpark(world, e.x, e.y, e.color, e.champion ? 18 : 8);
}

// ---- procs (unlocked at Mk II; bullet carries the flags) ----
export function applyProcs(world, e, b) {
  if (e.dead || !b.proc || b.element === 0) return;
  const pr = world.config.procs;
  if (b.element === 1) {                       // Blaze — burn
    e.burn = pr.burnTime; e.burnDps = pr.burnDps;
    if (b.wildfire) {
      world.grid.query(e.x, e.y, pr.wildfireRadius, (o) => {
        if (o.dead || o.boss || o === e) return;
        const dx = o.x - e.x, dy = o.y - e.y;
        if (dx * dx + dy * dy <= pr.wildfireRadius * pr.wildfireRadius) { o.burn = pr.burnTime; o.burnDps = pr.burnDps; }
      });
    }
  } else if (b.element === 2) {                // Frost — slow
    e.slow = Math.max(e.slow, pr.slowTime);
  } else if (b.element === 3) {                // Shock — chain
    const jumps = pr.chainCount + (b.overload ? pr.overloadExtra : 0);
    const frac = pr.chainFrac * (b.overload ? pr.overloadMult : 1);
    let fromx = e.x, fromy = e.y; const hit = new Set([e]);
    for (let j = 0; j < jumps; j++) {
      const t = world.grid.nearest(fromx, fromy, pr.chainRange, (o) => !hit.has(o) && !o.boss);
      if (!t) break;
      hit.add(t);
      fxArc(world, fromx, fromy, t.x, t.y, 3);
      damageEnemy(world, t, b.dmg * world.mods.dmgMult * frac, 3, fromx, fromy, {});
      fromx = t.x; fromy = t.y;
    }
  } else if (b.element === 4) {                // Void — pull
    const rad = pr.pullRadius * (b.collapse ? pr.collapseRadiusMult : 1);
    const force = pr.pullForce * (b.collapse ? pr.collapseForceMult : 1);
    fxRing(world, e.x, e.y, rad, '#C25CFF');
    world.grid.query(e.x, e.y, rad, (o) => {
      if (o.dead || o.boss) return;
      let dx = e.x - o.x, dy = e.y - o.y; const d = Math.hypot(dx, dy) || 1;
      if (d > rad) return;
      const f = force * (1 - d / rad);
      o.kbx += (dx / d) * f * 0.5; o.kby += (dy / d) * f * 0.5;
    });
  }
}

function doBlast(world, b) {
  fxRing(world, b.x, b.y, b.blastRadius, '#FF8066');
  world.grid.query(b.x, b.y, b.blastRadius, (o) => {
    if (o.dead) return;
    const dx = o.x - b.x, dy = o.y - b.y;
    if (dx * dx + dy * dy <= b.blastRadius * b.blastRadius) damageEnemy(world, o, b.dmg * world.mods.dmgMult * b.blastFrac, b.element, b.x, b.y, { kb: 40 });
  });
}

function ricochet(world, b, from) {
  const t = world.grid.nearest(b.x, b.y, world.config.weaponTiers.rangeMult * 420, (o) => !(b.hitSet && b.hitSet.has(o)) && !o.dead);
  if (!t) return false;
  const dx = t.x - b.x, dy = t.y - b.y, d = Math.hypot(dx, dy) || 1;
  const sp = Math.hypot(b.vx, b.vy);
  b.vx = (dx / d) * sp; b.vy = (dy / d) * sp;
  b.bounces--;
  return true;
}

// ---- bullet ↔ enemy/boss hits ----
export function stepBulletHits(world) {
  const pool = world.bullets, dmgMult = world.mods.dmgMult;
  for (let i = pool.items.length - 1; i >= 0; i--) {
    const b = pool.items[i];
    let done = false;
    world.grid.query(b.x, b.y, b.radius + 36, (e) => {
      if (done || e.dead) return;
      if (b.hitSet && b.hitSet.has(e)) return;
      const rr = b.radius + e.radius, dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy > rr * rr) return;
      damageEnemy(world, e, b.dmg * dmgMult, b.element, b.x, b.y, { kb: b.kb, bullet: b });
      applyProcs(world, e, b);
      if (!b.hitSet) b.hitSet = new Set();
      b.hitSet.add(e);
      if (b.special === 'blast') { doBlast(world, b); done = true; return; }
      if (b.pierce > 0) { b.pierce--; }
      else if (b.bounces > 0) { if (!ricochet(world, b, e)) done = true; }
      else { done = true; }
    });
    if (done) pool.removeAt(i);
  }
}

// ---- player contact damage ----
export function stepContact(world) {
  const p = world.player; if (!p.alive) return;
  const bossMult = world.config.boss.contactMult;
  world.grid.query(p.x, p.y, p.radius + 40, (e) => {
    if (e.dead) return;
    const rr = p.radius + e.radius, dx = e.x - p.x, dy = e.y - p.y;
    if (dx * dx + dy * dy > rr * rr) return;
    const dmg = e.boss ? e.dmg * bossMult : e.dmg;
    const res = hurtPlayer(world, dmg, e.x, e.y);
    if (res && !e.boss) {
      let kx = e.x - p.x, ky = e.y - p.y; const d = Math.hypot(kx, ky) || 1;
      e.kbx += (kx / d) * 140; e.kby += (ky / d) * 140;
    }
  });
}

export function reapEnemies(world) {
  const pool = world.enemies;
  for (let i = pool.items.length - 1; i >= 0; i--) if (pool.items[i].dead) pool.removeAt(i);
}

// ---- boss damage (hp + element shell + phase-two trigger); death finalized in boss.js ----
function damageBoss(world, boss, dmg, srcx, srcy, tag) {
  if (boss.shell > 0) {
    boss.shell -= dmg;
    if (boss.shell <= 0) { boss.shell = 0; boss.phase2 = true; boss.phaseFlash = 0.6; }
  } else {
    boss.hp -= dmg;
  }
  boss.hitFlash = world.config.procs.hitFlashTime;
  fxHit(world, srcx, srcy, boss.element);
  if (tag) fxDmg(world, srcx, srcy, dmg, tag);
  if (boss.hp <= 0) boss.dead = true;   // boss.js reaps it (rewards + reschedule)
}
