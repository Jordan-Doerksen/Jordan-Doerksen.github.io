// src/sim/combat.js — attack resolution (instant damage + visual tracers), healing,
// shields, boss abilities, deaths, drops. Movement/targeting lives in movement.js.

import {
  pushEvent, addProjectile, addParticles, addFloater, makeEnemy,
} from './factory.js';
import { friendlyDamageMult, unitArmorBonus, pheromone } from './tech.js';

// Design constants (not present in any config — see build prompt / DECISIONS.md):
const MELEE_ATTACK_TILES = 1.1;   // melee swing reach (aggro notice range is movement.js's 2.0)
const FLAMER_SPLASH_TILES = 0.8;  // flame damage splashes this far around the target
const SHIELD_REGEN_DELAY_SEC = 3; // phantom shields regen after 3s without being hit
const SHAKE_ON_CORE_HIT = 6;      // render hint; decays in sim.js, zeroed under reduced motion
const RANGE_SLACK = 0.15;         // attack tolerance so movers on the range edge still swing

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// Big bosses get a longer melee reach so they don't have to stand inside the core.
export function attackRangeOf(e) {
  return e.kind === 'ranged' ? e.range : MELEE_ATTACK_TILES + (e.size - 1) * 0.5;
}

export function tickCombat(state, cfg, dt) {
  unitAttacks(state, cfg, dt);
  turretAttacks(state, cfg, dt);
  enemyAttacks(state, cfg, dt);
  bossAbilities(state, cfg, dt);
  shieldRegen(state, dt);
  sweepDeaths(state, cfg);
}

export function damageEnemy(state, cfg, e, raw) {
  let rest = Math.max(1, raw - e.armor);
  if (e.shieldMax) {
    e.shieldHitT = 0;
    if (e.shield > 0) {
      const absorbed = Math.min(e.shield, rest);
      e.shield -= absorbed;
      rest -= absorbed;
    }
  }
  e.hp -= rest;
  pushEvent(state, { type: 'hit', x: e.x, y: e.y, target: 'enemy' });
}

function damageFriendly(state, cfg, t, raw) {
  const isBuilding = !!t.tile;
  const armor = isBuilding ? 0 : t.baseArmor + unitArmorBonus(state, cfg);
  t.hp -= Math.max(1, raw - armor);
  const p = isBuilding ? t.tile : t;
  pushEvent(state, { type: 'hit', x: p.x, y: p.y, target: isBuilding ? 'building' : 'unit' });
  if (t.type === 'core') {
    pushEvent(state, { type: 'coreHit', hp: Math.max(0, t.hp), maxHp: t.maxHp });
    if (cfg.game.fx.screenShake && !state.reducedMotion) state.shake = SHAKE_ON_CORE_HIT;
  }
}

function nearestEnemy(state, x, y, range) {
  let best = null;
  let bd = range;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const d = dist(e.x, e.y, x, y);
    if (d <= bd) { bd = d; best = e; }
  }
  return best;
}

function unitAttacks(state, cfg, dt) {
  const dmgMult = friendlyDamageMult(state, cfg);
  for (const u of state.units) {
    if (u.cooldown > 0) u.cooldown -= dt;
    if (u.kind === 'healer') { medicHeal(state, u, dt); continue; }
    if (u.dmg <= 0) continue;

    let target = null;
    let fromX = u.x;
    let fromY = u.y;
    if (u.bunkerId) {
      const bunker = state.buildings.find((b) => b.id === u.bunkerId);
      if (!bunker) { u.bunkerId = null; continue; }
      fromX = bunker.tile.x;
      fromY = bunker.tile.y;
      const range = u.range + cfg.roster.buildings.bunker.garrisonRangeBonus;
      target = nearestEnemy(state, fromX, fromY, range);
    } else {
      target = u.targetId ? state.enemies.find((e) => e.id === u.targetId) : null;
      if (target && (target.hp <= 0 || dist(u.x, u.y, target.x, target.y) > u.range + RANGE_SLACK)) target = null;
    }
    if (!target || u.cooldown > 0) continue;

    const raw = u.dmg * (u.type === 'marine' ? dmgMult : 1); // tech dmg mult: marines + turrets only
    damageEnemy(state, cfg, target, raw);
    const splashR = u.splash || (u.coneSplash ? FLAMER_SPLASH_TILES : 0);
    if (splashR > 0) {
      for (const e2 of state.enemies) {
        if (e2 !== target && e2.hp > 0 && dist(e2.x, e2.y, target.x, target.y) <= splashR) {
          damageEnemy(state, cfg, e2, raw);
        }
      }
    }
    if (u.kind !== 'melee') {
      addProjectile(state, fromX, fromY, target.x, target.y, u.type);
      pushEvent(state, { type: 'shot', kind: u.type });
    }
    u.cooldown = u.atkCd;
  }
}

function medicHeal(state, u, dt) {
  const t = u.targetId ? state.units.find((x) => x.id === u.targetId) : null;
  if (!t || t.hp <= 0 || t.hp >= t.maxHp) { u.targetId = null; return; }
  if (dist(u.x, u.y, t.x, t.y) <= u.range) t.hp = Math.min(t.maxHp, t.hp + u.healPerSec * dt);
}

function turretAttacks(state, cfg, dt) {
  const dmgMult = friendlyDamageMult(state, cfg);
  const levels = cfg.roster.buildings.turret.levels;
  for (const b of state.buildings) {
    if (b.type !== 'turret' || b.hp <= 0) continue;
    if (b.cooldown > 0) b.cooldown -= dt;
    const lv = levels[b.level - 1];
    if (b.cooldown > 0) continue;
    const target = nearestEnemy(state, b.tile.x, b.tile.y, lv.rangeTiles);
    if (!target) continue;
    damageEnemy(state, cfg, target, lv.damage * dmgMult);
    addProjectile(state, b.tile.x, b.tile.y, target.x, target.y, 'turret');
    pushEvent(state, { type: 'shot', kind: 'turret' });
    b.cooldown = lv.cooldownSec;
  }
}

function enemyAttacks(state, cfg, dt) {
  const ph = pheromone(state, cfg);
  for (const e of state.enemies) {
    const slowed = ph && e.slowT > 0; // aura flag maintained in movement.js
    if (e.cooldown > 0) e.cooldown -= dt * (slowed ? ph.factor : 1); // attack slower in the aura
    if (!e.targetId || e.cooldown > 0) continue;
    const t = findFriendly(state, e.targetId);
    if (!t || t.hp <= 0) { e.targetId = null; continue; }
    const p = t.tile ? t.tile : t;
    if (dist(e.x, e.y, p.x, p.y) > attackRangeOf(e) + RANGE_SLACK) continue;
    let raw = e.dmg;
    if (e.enraged && e.ability?.damageMult) raw *= e.ability.damageMult;
    damageFriendly(state, cfg, t, raw);
    if (e.kind === 'ranged') {
      addProjectile(state, e.x, e.y, p.x, p.y, 'spit');
      pushEvent(state, { type: 'shot', kind: 'spit' });
    }
    e.cooldown = e.atkCd;
  }
}

function findFriendly(state, id) {
  for (const b of state.buildings) if (b.id === id) return b;
  for (const u of state.units) if (u.id === id) return u;
  return null;
}

function bossAbilities(state, cfg, dt) {
  const spawners = [];
  for (const e of state.enemies) {
    const ab = e.ability;
    if (!ab || e.hp <= 0) continue;
    if (ab.type === 'spawnAdds') {
      e.abilityT -= dt;
      if (e.abilityT <= 0) { e.abilityT = ab.everySec; spawners.push(e); }
    } else if (ab.type === 'healAllies') {
      e.abilityT -= dt;
      if (e.abilityT <= 0) {
        e.abilityT = ab.everySec;
        for (const a of state.enemies) {
          if (a !== e && a.hp > 0 && dist(a.x, a.y, e.x, e.y) <= ab.radiusTiles) {
            a.hp = Math.min(a.maxHp, a.hp + ab.hpPerSec * ab.everySec);
          }
        }
      }
    } else if (ab.type === 'enrage' && !e.enraged && e.hp <= e.maxHp * ab.belowHpFrac) {
      e.enraged = true;
      pushEvent(state, { type: 'boss', boss: e.type, enraged: true, x: e.x, y: e.y });
    }
  }
  for (const e of spawners) {
    for (let i = 0; i < e.ability.count; i++) {
      makeEnemy(state, cfg, e.ability.enemy, e.laneId, { x: e.x, y: e.y, wpIndex: e.wpIndex });
    }
  }
}

function shieldRegen(state, dt) {
  for (const e of state.enemies) {
    if (!e.shieldMax) continue;
    e.shieldHitT += dt;
    if (e.shieldHitT >= SHIELD_REGEN_DELAY_SEC && e.shield < e.shieldMax) {
      e.shield = Math.min(e.shieldMax, e.shield + e.shieldRegen * dt);
    }
  }
}

function sweepDeaths(state, cfg) {
  const deadEnemies = state.enemies.filter((e) => e.hp <= 0);
  if (deadEnemies.length) {
    state.enemies = state.enemies.filter((e) => e.hp > 0);
    for (const e of deadEnemies) killEnemy(state, cfg, e); // may push broodlings (survives filter)
  }

  const deadUnits = state.units.filter((u) => u.hp <= 0);
  if (deadUnits.length) {
    state.units = state.units.filter((u) => u.hp > 0);
    for (const u of deadUnits) {
      pushEvent(state, { type: 'die', x: u.x, y: u.y, kind: 'unit', unit: u.type });
      addParticles(state, cfg, u.x, u.y, cfg.game.palette.unit, 6);
      if (u.bunkerId) {
        const b = state.buildings.find((x) => x.id === u.bunkerId);
        if (b) b.garrison = b.garrison.filter((id) => id !== u.id);
      }
    }
  }

  // buildings — the core is never removed here; sim.js turns core death into the loss
  const deadBuildings = state.buildings.filter((b) => b.hp <= 0 && b.type !== 'core');
  if (deadBuildings.length) {
    state.buildings = state.buildings.filter((b) => b.hp > 0 || b.type === 'core');
    for (const b of deadBuildings) {
      pushEvent(state, { type: 'die', x: b.tile.x, y: b.tile.y, kind: 'building', building: b.type });
      addParticles(state, cfg, b.tile.x, b.tile.y, cfg.game.palette.base, 10);
      if (b.type === 'bunker') ejectGarrison(state, b);
    }
  }
}

function ejectGarrison(state, b) {
  let i = 0;
  for (const u of state.units) {
    if (u.bunkerId !== b.id) continue;
    u.bunkerId = null; // targetable again
    u.x = b.tile.x + ((i % 3) - 1) * 0.6;
    u.y = b.tile.y + (Math.floor(i / 3) - 0.5) * 0.6;
    i++;
  }
  b.garrison.length = 0;
}

function killEnemy(state, cfg, e) {
  state.stats.kills += 1;
  pushEvent(state, { type: 'die', x: e.x, y: e.y, kind: 'enemy', enemy: e.type, elite: e.elite, boss: e.boss });
  addParticles(state, cfg, e.x, e.y, e.type === 'phantom' ? cfg.game.palette.alien : cfg.game.palette.bug, e.boss ? 20 : 8);
  rollDrops(state, cfg, e);
  if (e.onDeathSpawn) {
    for (let i = 0; i < e.onDeathSpawn.count; i++) {
      // broodlings keep the boomer's lane/wpIndex so they continue toward the core when idle
      makeEnemy(state, cfg, e.onDeathSpawn.type, e.laneId, { x: e.x, y: e.y, wpIndex: e.wpIndex });
    }
  }
}

function rollDrops(state, cfg, e) {
  const rand = state.run.rand;
  if (e.boss) {
    if (e.drop.essenceFlat) grant(state, cfg, 'essence', e.drop.essenceFlat, e.x, e.y);
    if (e.drop.alienTechFlat) grant(state, cfg, 'alienTech', e.drop.alienTechFlat, e.x, e.y);
    return;
  }
  const keys = Object.keys(e.drop);
  if (!keys.length) return;
  if (e.elite) {
    // elites: guaranteed random 1-2 (config eliteGuaranteed) of their drop type
    const [lo, hi] = cfg.game.drops.eliteGuaranteed;
    const key = keys[Math.floor(rand() * keys.length)];
    grant(state, cfg, key, lo + Math.floor(rand() * (hi - lo + 1)), e.x, e.y);
    return;
  }
  for (const key of keys) if (rand() < e.drop[key]) grant(state, cfg, key, 1, e.x, e.y);
}

function grant(state, cfg, resource, amount, x, y) {
  state[resource] += amount;
  const pal = cfg.game.palette;
  addFloater(state, cfg, x, y, `+${amount} ✦`, resource === 'essence' ? pal.essence : pal.alienTech);
  pushEvent(state, { type: resource, amount, x, y });
}
