// src/sim/movement.js — enemy lane-walking + aggro acquisition, unit rally/leash AI,
// medic escort movement, pheromone aura flagging. Damage lives in combat.js.

import { pheromone } from './tech.js';
import { attackRangeOf } from './combat.js';
import { entityById } from './factory.js';

// Design constants (not present in any config — see build prompt / DECISIONS.md):
const MELEE_AGGRO_TILES = 2.0;  // melee enemies notice targets this close while walking
const LEASH_TILES = 3.0;        // units engage enemies within this radius of their rally point
const LEASH_DROP_SLACK = 1.0;   // stop chasing once a target drags past leash + this
const MEDIC_SEARCH_EXTRA = 2.0; // medics look a bit beyond the leash for wounded allies
const ARRIVE_EPS = 0.12;        // "close enough" to a rally/waypoint point
const AURA_FLAG_SEC = 0.2;      // slowT refresh while inside the pheromone aura (render tint hint)

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function moveToward(o, tx, ty, step) {
  const d = Math.hypot(tx - o.x, ty - o.y);
  if (d <= step || d === 0) { o.x = tx; o.y = ty; return true; }
  o.x += ((tx - o.x) / d) * step;
  o.y += ((ty - o.y) / d) * step;
  return false;
}

export function tickMovement(state, cfg, dt) {
  moveEnemies(state, cfg, dt);
  moveUnits(state, cfg, dt);
}

function moveEnemies(state, cfg, dt) {
  const laneById = Object.fromEntries(cfg.map.lanes.map((l) => [l.id, l]));
  const core = state.buildings.find((b) => b.type === 'core');
  const ph = pheromone(state, cfg);
  for (const e of state.enemies) {
    if (ph && core && dist(e.x, e.y, core.tile.x, core.tile.y) <= ph.radiusTiles) {
      e.slowT = AURA_FLAG_SEC;
    } else if (e.slowT > 0) {
      e.slowT = Math.max(0, e.slowT - dt);
    }
    let spd = e.spd * (ph && e.slowT > 0 ? ph.factor : 1);
    if (e.enraged && e.ability?.speedMult) spd *= e.ability.speedMult;

    // keep or drop the current fight
    let t = e.targetId ? entityById(state, e.targetId) : null;
    if (!t || t.hp <= 0 || t.bunkerId) { e.targetId = null; t = null; } // garrisoned = untargetable
    if (!t) {
      t = acquireEnemyTarget(state, e);
      if (t) e.targetId = t.id;
    }
    if (t) {
      const p = t.tile ? t.tile : t;
      if (dist(e.x, e.y, p.x, p.y) > attackRangeOf(e)) moveToward(e, p.x, p.y, spd * dt);
      continue;
    }

    // no fight: walk the lane, then go for the core
    const lane = laneById[e.laneId];
    const wps = lane ? lane.waypoints : null;
    if (wps && e.wpIndex < wps.length) {
      const wp = wps[e.wpIndex];
      if (moveToward(e, wp.x, wp.y, spd * dt)) e.wpIndex += 1;
    } else if (core && core.hp > 0) {
      e.targetId = core.id;
    }
  }
}

// While walking: stop for any targetable unit/building within 2.0 tiles (melee)
// or rangeTiles (ranged). Nearest wins.
function acquireEnemyTarget(state, e) {
  const aggro = e.kind === 'ranged' ? e.range : MELEE_AGGRO_TILES;
  let best = null;
  let bd = aggro;
  for (const u of state.units) {
    if (u.hp <= 0 || u.bunkerId) continue;
    const d = dist(e.x, e.y, u.x, u.y);
    if (d <= bd) { bd = d; best = u; }
  }
  for (const b of state.buildings) {
    if (b.hp <= 0) continue;
    const d = dist(e.x, e.y, b.tile.x, b.tile.y);
    if (d <= bd) { bd = d; best = b; }
  }
  return best;
}

function moveUnits(state, cfg, dt) {
  const laneById = Object.fromEntries(cfg.map.lanes.map((l) => [l.id, l]));
  const core = state.buildings.find((b) => b.type === 'core');
  const coreRally = core ? core.tile : { x: 0, y: 0 };
  for (const u of state.units) {
    if (u.bunkerId) {
      const b = state.buildings.find((x) => x.id === u.bunkerId);
      if (b) { u.x = b.tile.x; u.y = b.tile.y; } // pinned to the bunker while garrisoned
      continue;
    }
    const lane = u.laneId ? laneById[u.laneId] : null;
    const rally = u.tech || !lane ? coreRally : lane.rally; // drones/titan hold the core
    if (u.kind === 'healer') { medicMove(state, u, rally, dt); continue; }

    let t = u.targetId ? state.enemies.find((e) => e.id === u.targetId) : null;
    if (!t || t.hp <= 0 || dist(t.x, t.y, rally.x, rally.y) > LEASH_TILES + LEASH_DROP_SLACK) {
      u.targetId = null;
      t = null;
    }
    if (!t) {
      t = acquireUnitTarget(state, u, rally);
      if (t) u.targetId = t.id;
    }
    if (t) {
      if (dist(u.x, u.y, t.x, t.y) > u.range) moveToward(u, t.x, t.y, u.spd * dt);
    } else {
      const hx = rally.x + u.off.x;
      const hy = rally.y + u.off.y;
      if (dist(u.x, u.y, hx, hy) > ARRIVE_EPS) moveToward(u, hx, hy, u.spd * dt);
    }
  }
}

// Nearest enemy inside the rally leash, preferring enemies already attacking allies.
function acquireUnitTarget(state, u, rally) {
  let best = null;
  let bestScore = Infinity;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (dist(e.x, e.y, rally.x, rally.y) > LEASH_TILES) continue;
    const score = dist(u.x, u.y, e.x, e.y) - (e.targetId ? 1.5 : 0);
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}

// Medics never attack: shadow the lowest-HP wounded ally, else hold the rally.
function medicMove(state, u, rally, dt) {
  let best = null;
  let lowest = Infinity;
  for (const a of state.units) {
    if (a === u || a.hp <= 0 || a.hp >= a.maxHp || a.bunkerId) continue;
    if (dist(a.x, a.y, rally.x, rally.y) > LEASH_TILES + MEDIC_SEARCH_EXTRA) continue;
    if (a.hp < lowest) { lowest = a.hp; best = a; }
  }
  if (best) {
    u.targetId = best.id; // combat.js heals this target while it's in range
    if (dist(u.x, u.y, best.x, best.y) > u.range) moveToward(u, best.x, best.y, u.spd * dt);
  } else {
    u.targetId = null;
    const hx = rally.x + u.off.x;
    const hy = rally.y + u.off.y;
    if (dist(u.x, u.y, hx, hy) > ARRIVE_EPS) moveToward(u, hx, hy, u.spd * dt);
  }
}
