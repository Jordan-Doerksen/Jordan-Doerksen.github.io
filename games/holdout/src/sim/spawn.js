// src/sim/spawn.js — barracks squad production, bunker garrison claiming,
// tech-unit (drone/titan) respawn upkeep, tech regen.

import { makeUnit } from './factory.js';
import { laneForNewUnit } from './waves.js';
import { unitRegenPerSec, droneEffect, titanEffect } from './tech.js';

export function tickProduction(state, cfg, dt) {
  barracksProduction(state, cfg, dt);
  techUnitUpkeep(state, cfg, dt);
  const regen = unitRegenPerSec(state, cfg);
  if (regen > 0) {
    for (const u of state.units) {
      if (u.hp > 0 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + regen * dt);
    }
  }
}

function barracksProduction(state, cfg, dt) {
  const levels = cfg.roster.buildings.barracks.levels;
  for (const b of state.buildings) {
    if (b.type !== 'barracks' || b.hp <= 0) continue;
    const lv = levels[b.level - 1];
    const mine = state.units.filter((u) => u.barracksId === b.id);
    if (mine.length >= lv.squadCap) { b.cooldown = lv.respawnSec; continue; }
    b.cooldown -= dt;
    if (b.cooldown > 0) continue;
    b.cooldown = lv.respawnSec;
    const type = nextMissing(lv.composition, mine);
    if (!type) continue;
    const u = makeUnit(state, cfg, type, b.tile.x, b.tile.y, { barracksId: b.id });
    u.laneId = laneForNewUnit(state, b);
  }
}

// First composition slot not yet filled by a living squad member.
function nextMissing(composition, mine) {
  const counts = {};
  for (const u of mine) counts[u.type] = (counts[u.type] || 0) + 1;
  for (const [type, want] of Object.entries(composition)) {
    if ((counts[type] || 0) < want) return type;
  }
  return null;
}

// On bunker placement: claim up to garrisonCap nearest un-garrisoned marines.
export function claimGarrison(state, cfg, bunker) {
  const cap = cfg.roster.buildings.bunker.garrisonCap;
  const d2 = (u) => (u.x - bunker.tile.x) ** 2 + (u.y - bunker.tile.y) ** 2;
  const picked = state.units
    .filter((u) => u.type === 'marine' && !u.bunkerId && u.hp > 0)
    .sort((a, b) => d2(a) - d2(b))
    .slice(0, cap);
  for (const u of picked) {
    u.bunkerId = bunker.id;
    u.x = bunker.tile.x;
    u.y = bunker.tile.y;
    bunker.garrison.push(u.id);
  }
}

// Drones/titan from the tech tree rally at the core and respawn on their timers.
function techUnitUpkeep(state, cfg, dt) {
  const core = state.buildings.find((b) => b.type === 'core');
  if (!core) return;
  const drones = droneEffect(state, cfg);
  if (drones) {
    const alive = state.units.filter((u) => u.tech && u.type === 'drone').length;
    if (alive < drones.count) {
      state.run.droneT -= dt;
      if (state.run.droneT <= 0) {
        state.run.droneT = drones.respawnSec;
        makeUnit(state, cfg, 'drone', core.tile.x, core.tile.y, { tech: true });
      }
    } else {
      state.run.droneT = drones.respawnSec;
    }
  }
  const titan = titanEffect(state, cfg);
  if (titan) {
    const alive = state.units.some((u) => u.tech && u.type === 'titan');
    if (!alive) {
      state.run.titanT -= dt;
      if (state.run.titanT <= 0) {
        state.run.titanT = titan.respawnSec;
        makeUnit(state, cfg, 'titan', core.tile.x, core.tile.y, { tech: true });
      }
    } else {
      state.run.titanT = titan.respawnSec;
    }
  }
}
