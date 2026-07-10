// src/sim/waves.js — phase machine (build → combat), wave generation, spawn queue,
// boss entrances, wave-clear / win detection, active-lane bookkeeping.

import { makeEnemy, pushEvent } from './factory.js';
import { endRun } from './meta.js';

export function activeLanesFor(cfg, wave) {
  let n = 1;
  for (const rule of cfg.game.waves.lanesByWave) if (wave >= rule.fromWave) n = rule.lanes;
  return cfg.map.lanes.slice(0, n).map((l) => l.id);
}

// budget = budgetBase * budgetGrowth^(wave-1); fill with random affordable unlocked types.
export function generateWave(state, cfg, wave) {
  const w = cfg.game.waves;
  const rand = state.run.rand;
  let budget = w.budgetBase * Math.pow(w.budgetGrowth, wave - 1);
  const pool = Object.entries(w.unlockByWave)
    .filter(([, unlockWave]) => unlockWave <= wave)
    .map(([type]) => type);
  const queue = [];
  let guard = 2000; // safety: never loop forever on a bad config
  while (guard-- > 0) {
    const affordable = pool.filter((t) => cfg.roster.enemies[t].budgetCost <= budget);
    if (!affordable.length) break;
    const type = affordable[Math.floor(rand() * affordable.length)];
    budget -= cfg.roster.enemies[type].budgetCost;
    const laneId = state.run.activeLanes[Math.floor(rand() * state.run.activeLanes.length)];
    queue.push({ type, laneId });
  }
  return queue;
}

export function tickWaves(state, cfg, dt) {
  const w = cfg.game.waves;
  const run = state.run;

  if (state.phase === 'build') {
    state.phaseT -= dt;
    if (state.phaseT <= 0) startCombat(state, cfg);
    return;
  }

  // combat: drain the spawn queue on the spawn interval
  if (run.spawnQueue.length) {
    run.spawnT -= dt;
    while (run.spawnT <= 0 && run.spawnQueue.length) {
      const next = run.spawnQueue.shift();
      const ec = w.eliteChanceByWave;
      const elite = state.wave >= ec.fromWave && run.rand() < ec.chance;
      makeEnemy(state, cfg, next.type, next.laneId, { elite });
      run.spawnT += w.spawnIntervalSec;
    }
  }

  // wave cleared: queue empty and nothing left alive
  if (!run.spawnQueue.length && state.enemies.length === 0) {
    state.stats.wavesCleared = state.wave;
    if (state.wave >= w.total) {
      endRun(state, cfg, true);
      return;
    }
    state.wave += 1;
    state.phase = 'build';
    state.phaseT = w.buildPhaseSec;
  }
}

function startCombat(state, cfg) {
  const run = state.run;
  state.phase = 'combat';
  state.phaseT = 0;
  run.activeLanes = activeLanesFor(cfg, state.wave);
  run.spawnQueue = generateWave(state, cfg, state.wave);
  run.spawnT = cfg.game.waves.spawnIntervalSec;
  pushEvent(state, { type: 'wave', wave: state.wave });

  // boss waves: the boss walks in first, on a random active lane
  const bossType = cfg.game.waves.bossWaves[String(state.wave)];
  if (bossType) {
    const laneId = run.activeLanes[Math.floor(run.rand() * run.activeLanes.length)];
    const boss = makeEnemy(state, cfg, bossType, laneId, { boss: true });
    pushEvent(state, {
      type: 'boss', boss: bossType, name: cfg.roster.bosses[bossType].name,
      x: boss.x, y: boss.y, laneId,
    });
  }

  // 'auto' barracks redistribute their squads across the (possibly new) active lanes
  for (const b of state.buildings) {
    if (b.type === 'barracks' && b.laneId === 'auto') assignBarracksUnits(state, b);
  }
}

// Reassign every unit of one barracks: concrete lane, or round-robin over active lanes.
export function assignBarracksUnits(state, b) {
  for (const u of state.units) {
    if (u.barracksId !== b.id) continue;
    u.laneId = laneFor(state, b);
  }
}

export function laneForNewUnit(state, b) { return laneFor(state, b); }

function laneFor(state, b) {
  const run = state.run;
  if (b.laneId !== 'auto') return b.laneId;
  return run.activeLanes[run.laneRR++ % run.activeLanes.length];
}
