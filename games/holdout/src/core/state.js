// src/core/state.js — createState(cfg): the single mutable state object, shaped
// EXACTLY per ARCHITECTURE.md "The Contract" (plus selectedBuildingId, plus a
// sim-internal `run` namespace presentation must not touch). resetRun() re-arms
// a fresh run in place so presentation's reference to `state` never goes stale.

import { mulberry32, makeBuilding } from '../sim/factory.js';
import { loadSalvage } from '../sim/meta.js';
import { activeLanesFor } from '../sim/waves.js';

export function createState(cfg, seed) {
  const state = {
    mode: 'title',
    time: 0,
    wave: 0,
    phase: 'build',
    phaseT: 0,
    credits: 0,
    essence: 0,
    alienTech: 0,
    buildings: [],
    units: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floaters: [],
    pickups: [],
    tech: { bug: { root: false, tiers: [null, null, null] } },
    meta: { salvage: loadSalvage(cfg) },
    selectedBuild: null,
    selectedBuildingId: null,
    hoverSlot: null,
    events: [],
    stats: { kills: 0, wavesCleared: 0 },
    shake: 0,
    paused: false,
    muted: false,
    settings: { sfx: true, music: true }, // audio channels; loaded/persisted by src/audio (own key, never the meta key); survives resetRun
    reducedMotion: false,
    run: null, // sim-internal bookkeeping (spawn queue, rng, timers)
  };
  state._seed = seed ?? null; // fixed seed → deterministic runs (headless verify)
  resetRun(state, cfg);
  return state;
}

export function resetRun(state, cfg) {
  state.time = 0;
  state.wave = 1;
  state.phase = 'build';
  state.phaseT = cfg.game.waves.firstBuildPhaseSec;
  state.credits = cfg.game.economy.startingCredits;
  state.essence = 0;
  state.alienTech = 0;
  state.buildings.length = 0;
  state.units.length = 0;
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.particles.length = 0;
  state.floaters.length = 0;
  state.pickups.length = 0;
  state.tech.bug.root = false;
  state.tech.bug.tiers = [null, null, null];
  state.selectedBuild = null;
  state.selectedBuildingId = null;
  state.hoverSlot = null;
  state.stats.kills = 0;
  state.stats.wavesCleared = 0;
  state.shake = 0;
  state.paused = false;

  const seed = state._seed ?? ((Math.random() * 0xffffffff) >>> 0);
  state.run = {
    nextId: 1,
    rand: mulberry32(seed),
    spawnQueue: [],
    spawnT: 0,
    activeLanes: activeLanesFor(cfg, 1),
    laneRR: 0,
    droneT: 0,
    titanT: 0,
    ended: false,
  };

  // pre-place the Command Core + the map's starting buildings
  makeBuilding(state, cfg, 'core', cfg.map.core.tile);
  for (const p of cfg.map.prePlaced) makeBuilding(state, cfg, p.type, p.tile);
}
