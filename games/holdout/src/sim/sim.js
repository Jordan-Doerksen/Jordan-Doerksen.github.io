// src/sim/sim.js — the tick orchestrator. Order: economy → waves → movement → combat
// → production/tech upkeep → fx decay → lose check. Presentation never calls anything
// here directly except simTick (via core/main.js); mutations come through actions.js.

import { tickWaves } from './waves.js';
import { tickMovement } from './movement.js';
import { tickCombat } from './combat.js';
import { tickProduction } from './spawn.js';
import { endRun } from './meta.js';

const PROJ_LIFE_SEC = 0.12;             // tracer lifetime (visual only; damage was instant)
const FLOATER_RISE_TILES_PER_SEC = 0.6; // "+1 ✦" drift
const SHAKE_DECAY_PER_SEC = 18;

export function simTick(state, cfg, dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;

  // passive income accrues during BOTH phases
  const tiers = cfg.game.economy.income.tiers;
  for (const b of state.buildings) {
    if (b.type === 'income' && b.hp > 0) state.credits += tiers[b.level - 1].creditsPerSec * dt;
  }

  tickWaves(state, cfg, dt); // may end the run (won)
  if (state.mode !== 'playing') { tickFx(state, dt); return; }

  tickMovement(state, cfg, dt);
  tickCombat(state, cfg, dt);
  tickProduction(state, cfg, dt);
  tickFx(state, dt);

  const core = state.buildings.find((b) => b.type === 'core');
  if (!core || core.hp <= 0) endRun(state, cfg, false);
}

function tickFx(state, dt) {
  if (state.projectiles.length) {
    for (const p of state.projectiles) p.t += dt / PROJ_LIFE_SEC;
    state.projectiles = state.projectiles.filter((p) => p.t < 1);
  }
  if (state.particles.length) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }
  if (state.floaters.length) {
    for (const f of state.floaters) {
      f.age += dt; // render rises/fades by age; the sim no longer drifts y (double-drift seam)
      f.life -= dt;
    }
    state.floaters = state.floaters.filter((f) => f.life > 0);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - SHAKE_DECAY_PER_SEC * dt);
  if (state.reducedMotion) { state.particles.length = 0; state.shake = 0; } // law
}
