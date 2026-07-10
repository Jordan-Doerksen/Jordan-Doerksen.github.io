// src/sim/factory.js — entity constructors, seeded rng, event/fx helpers.
// Presentation-free: no window/document/fetch/localStorage in here.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextId(state) { return state.run.nextId++; }

export function pushEvent(state, ev) { state.events.push(ev); }

export function entityById(state, id) {
  for (const b of state.buildings) if (b.id === id) return b;
  for (const u of state.units) if (u.id === id) return u;
  for (const e of state.enemies) if (e.id === id) return e;
  return null;
}

export function makeBuilding(state, cfg, type, tile, ids = {}) {
  const def = cfg.roster.buildings[type];
  const b = {
    id: nextId(state),
    type,
    tile: { x: tile.x, y: tile.y },
    hp: def.hp,
    maxHp: def.hp,
    level: 1,
    garrison: [],
    cooldown: 0,
  };
  if (ids.slotId) b.slotId = ids.slotId;
  if (ids.padId) b.padId = ids.padId;
  if (type === 'barracks') b.laneId = 'auto';
  state.buildings.push(b);
  return b;
}

export function makeUnit(state, cfg, type, x, y, opts = {}) {
  const def = cfg.roster.units[type];
  const r = state.run.rand;
  const u = {
    id: nextId(state),
    type,
    x, y,
    hp: def.hp,
    maxHp: def.hp,
    laneId: opts.laneId ?? null,
    barracksId: opts.barracksId ?? null,
    bunkerId: null,
    targetId: null,
    cooldown: 0,
    tech: !!opts.tech,
    // stats copied from roster so combat never re-reads config per tick
    spd: def.speed,
    baseArmor: def.armor,
    range: def.rangeTiles,
    dmg: def.damage ?? 0,
    atkCd: def.cooldownSec ?? 1,
    kind: def.kind,
    healPerSec: def.healPerSec ?? 0,
    splash: def.splashTiles ?? 0,
    coneSplash: !!def.coneSplash,
    off: { x: (r() - 0.5) * 0.9, y: (r() - 0.5) * 0.9 }, // rally jitter so squads don't stack
  };
  state.units.push(u);
  return u;
}

export function makeEnemy(state, cfg, type, laneId, opts = {}) {
  const boss = !!opts.boss;
  const def = boss ? cfg.roster.bosses[type] : cfg.roster.enemies[type];
  const elite = !!opts.elite && !boss;
  const em = cfg.roster.elites;
  const lane = cfg.map.lanes.find((l) => l.id === laneId) || cfg.map.lanes[0];
  const hp = Math.round(def.hp * (elite ? em.hpMult : 1));
  const e = {
    id: nextId(state),
    type,
    x: opts.x ?? lane.waypoints[0].x,
    y: opts.y ?? lane.waypoints[0].y,
    hp,
    maxHp: hp,
    laneId: lane.id,
    wpIndex: opts.wpIndex ?? 1,
    elite,
    boss,
    targetId: null,
    cooldown: 0,
    slowT: 0,
    dmg: def.damage * (elite ? em.damageMult : 1),
    spd: def.speed,
    armor: def.armor,
    kind: def.kind,
    range: def.rangeTiles ?? 0,
    atkCd: def.cooldownSec,
    size: boss ? (def.sizeMult ?? 1) : (elite ? em.sizeMult : 1),
    drop: def.drop || {},
    onDeathSpawn: def.onDeathSpawn || null,
    ability: def.ability || null,
    abilityT: def.ability?.everySec ?? 0,
    enraged: false,
  };
  if (def.shield) {
    e.shield = def.shield;
    e.shieldMax = def.shield;
    e.shieldRegen = def.shieldRegenPerSec;
    e.shieldHitT = 999; // "long since last hit" so a fresh phantom regens if chipped early
  }
  state.enemies.push(e);
  return e;
}

// Visual-only tracer; damage is already applied instantly by combat.
// Shape is the render contract: {from:{x,y}, to:{x,y}, t, color(palette key), heavy}.
// The sim owns t's lifecycle (tickFx advances + removes); render only reads it.
const PROJ_COLOR = { spit: 'bug', flamer: 'flame' };
export function addProjectile(state, fromX, fromY, toX, toY, kind) {
  state.projectiles.push({
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    t: 0,
    kind,
    color: PROJ_COLOR[kind] || 'unitAccent',
    heavy: kind === 'turret',
  });
}

export function addParticles(state, cfg, x, y, color, n) {
  if (state.reducedMotion) return; // prefers-reduced-motion is law
  const max = cfg.game.fx.particlesMax;
  const r = state.run.rand;
  for (let i = 0; i < n && state.particles.length < max; i++) {
    state.particles.push({
      x, y,
      vx: (r() - 0.5) * 3,
      vy: (r() - 0.5) * 3 - 1,
      life: 0.35 + r() * 0.45,
      color,
    });
  }
}

export function addFloater(state, cfg, x, y, text, color) {
  // age counts up for render's rise/fade; life counts down for removal.
  state.floaters.push({ x, y, text, color, age: 0, life: cfg.game.fx.floaterLifetimeSec });
}
