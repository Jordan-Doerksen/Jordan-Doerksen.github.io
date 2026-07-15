// state.js — the single mutable `world`, the source of truth. Systems mutate it in a fixed
// order; render reads it one-way and drains world.fx.* each frame. See ARCHITECTURE.md "two
// hard contracts". This factory wires the pools, the player, the run counters, and the modifier
// bag; `resetRun` re-seeds and rebuilds a fresh run in place (no reallocation of the world).

import { Pool } from './pool.js';
import { Grid } from './grid.js';
import { makeRng } from './rng.js';

const blankEnemy = () => ({
  active: false, dead: false, x: 0, y: 0, vx: 0, vy: 0, kbx: 0, kby: 0,
  hp: 1, maxhp: 1, radius: 8, speed: 40, dmg: 13, corners: 0, color: '#fff',
  element: 0, resist: -1, shell: 0, maxshell: 0, spec: null, champion: false, boss: false,
  behavior: 'seek', fireCd: 0, hitFlash: 0, burn: 0, burnSrc: 0, slow: 0, chainMark: 0, spin: 0, phase: 0,
});
const blankBullet = () => ({
  active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, radius: 3, dmg: 1, element: 0,
  kb: 0, pierce: 0, hitSet: null, glyph: 'bolt', wid: '', special: null, blastRadius: 0,
  blastFrac: 0, wellRadius: 0, wellForce: 0, ang: 0,
});
const blankShot = () => ({   // enemy / boss ordnance
  active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, radius: 5, dmg: 8, element: 0, kind: 'shard', invuln: 0,
});
const blankGem = () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, value: 1, life: 30, seeking: false });

export function createWorld(config, content, rng, seed) {
  const world = {
    config, content, rng, seed,
    time: 0, frame: 0, paused: false, over: false, started: false,
    reducedMotion: false,

    player: {
      x: 0, y: 0, vx: 0, vy: 0, radius: config.ship.radius, heading: -Math.PI / 2, headingTarget: -Math.PI / 2,
      pipsMax: config.ship.hullPips, pips: config.ship.hullPips,
      shieldMax: config.ship.shield, shield: config.ship.shield, shieldTimer: 0,
      invuln: 0, hitFlash: 0, alive: true,
      boostFuel: config.ship.boostFuelMax, boostRecharge: 0, boosting: false, boostReady: true,
      aimx: 1, aimy: 0, muzzle: 0,
    },

    mods: {
      moveMult: 1, dmgMult: 1, fireMult: 1, rangeMult: 1, magnetMult: 1,
      boostMult: 1, xpMult: 1, shieldMaxAdd: 0, shieldRegenAdd: 0, hullPipAdd: 0,
    },

    weapons: [],                 // installed turret instances (see systems/weapons.js)
    enemies: new Pool(blankEnemy),
    bullets: new Pool(blankBullet),
    eshots: new Pool(blankShot),
    gems: new Pool(blankGem),
    grid: new Grid(config.perf.gridCell),

    // cosmetic event queues — sim WRITES, render DRAINS + clears. Never read by the sim.
    fx: { hits: [], dmg: [], arcs: [], rings: [], sparks: [] },

    camera: { x: 0, y: 0, shake: 0, ox: 0, oy: 0 },
    hitstop: 0,

    // progression
    xp: 0, level: 1, xpToNext: config.progression.xpBase, kills: 0, scrip: 0, bossesKilled: 0,

    // directors
    spawnTimer: 0, idleTimer: 0, troughUntil: 0,
    bossTimer: config.boss.firstAt, boss: null, bossTier: 0, bossActive: false,

    input: { mx: 0, my: 0, moveX: 0, moveY: 0, focus: false, boost: false },
    draftPending: null,          // set by progression when a level-up is owed
  };
  return world;
}

// Re-seed and rebuild a run in place. Called from the title/results → play transition.
export function resetRun(world, seed) {
  const { config } = world;
  world.rng = makeRng(seed);
  world.seed = seed;
  world.time = 0; world.frame = 0; world.paused = false; world.over = false; world.started = true;
  world.enemies.clear(); world.bullets.clear(); world.eshots.clear(); world.gems.clear();
  world.weapons.length = 0;
  world.fx.hits.length = 0; world.fx.dmg.length = 0; world.fx.arcs.length = 0;
  world.fx.rings.length = 0; world.fx.sparks.length = 0;

  const m = world.mods;
  m.moveMult = 1; m.dmgMult = 1; m.fireMult = 1; m.rangeMult = 1; m.magnetMult = 1;
  m.boostMult = 1; m.xpMult = 1; m.shieldMaxAdd = 0; m.shieldRegenAdd = 0; m.hullPipAdd = 0;

  const p = world.player;
  p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.heading = -Math.PI / 2; p.headingTarget = -Math.PI / 2;
  p.pipsMax = config.ship.hullPips; p.pips = p.pipsMax;
  p.shieldMax = config.ship.shield; p.shield = p.shieldMax; p.shieldTimer = 0;
  p.invuln = 0; p.hitFlash = 0; p.alive = true;
  p.boostFuel = config.ship.boostFuelMax; p.boostRecharge = 0; p.boosting = false; p.boostReady = true;

  world.xp = 0; world.level = 1; world.xpToNext = config.progression.xpBase;
  world.kills = 0; world.scrip = 0; world.bossesKilled = 0;
  world.spawnTimer = 0; world.idleTimer = 0; world.troughUntil = 0;
  world.bossTimer = config.boss.firstAt; world.boss = null; world.bossTier = 0; world.bossActive = false;
  world.camera.x = 0; world.camera.y = 0; world.camera.shake = 0;
  world.hitstop = 0; world.draftPending = null;

  // draft/meta bags that accumulate DURING a run — must be wiped or they leak across runs
  // (e.g. takenOnce would keep Field Rivets un-offerable forever; a banked pendingLevels
  // would fire a phantom draft on the next shift). draftKind/draftOffers are UI scratch.
  world.pendingLevels = 0; world.takenOnce = null;
  world.bossDownT = 0; world.draftKind = null; world.draftOffers = null;
}
