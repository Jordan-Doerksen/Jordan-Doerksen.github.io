// src/sim/tech.js — tech tree purchases + effect queries (the only reader of tech.json).
// Rules honored from tech.json: tiersSequential, branchesExclusivePerTier, noRespec.

import { makeUnit, pushEvent } from './factory.js';

function purchasedEffects(state, cfg, treeId = 'bug') {
  const tree = cfg.tech.trees[treeId];
  const t = state.tech[treeId];
  const out = [];
  if (!tree || !t || !t.root) return out;
  tree.tiers.forEach((tier, i) => {
    const branch = t.tiers[i];
    if (branch) out.push(tier[branch].effect);
  });
  return out;
}

// Applies to marines AND turrets only (Infested Rounds).
export function friendlyDamageMult(state, cfg) {
  let m = 1;
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'friendlyDamageMult') m *= e.factor;
  return m;
}

export function unitArmorBonus(state, cfg) {
  let a = 0;
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'unitArmorBonus') a += e.amount;
  return a;
}

export function unitRegenPerSec(state, cfg) {
  let r = 0;
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'unitRegen') r += e.hpPerSec;
  return r;
}

export function pheromone(state, cfg) {
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'enemySlowNearCore') return e;
  return null;
}

export function droneEffect(state, cfg) {
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'spawnDrones') return e;
  return null;
}

export function titanEffect(state, cfg) {
  for (const e of purchasedEffects(state, cfg)) if (e.type === 'spawnTitan') return e;
  return null;
}

export function buyRoot(state, cfg, treeId) {
  const tree = cfg.tech.trees[treeId];
  const t = state.tech[treeId];
  if (!tree || !tree.online || !t) return false; // Alien tree is honestly OFFLINE
  if (t.root) return false;
  if (state[tree.resource] < tree.root.cost) return false;
  state[tree.resource] -= tree.root.cost;
  t.root = true;
  pushEvent(state, { type: 'tech', id: tree.root.id, name: tree.root.name, root: true });
  return true;
}

export function buyTier(state, cfg, treeId, tierIdx, branch) {
  const tree = cfg.tech.trees[treeId];
  const t = state.tech[treeId];
  const rules = cfg.tech.rules;
  if (!tree || !tree.online || !t || !t.root) return false;
  if (branch !== 'A' && branch !== 'B') return false;
  const tier = tree.tiers[tierIdx];
  if (!tier) return false;
  if (t.tiers[tierIdx] !== null) return false; // branchesExclusivePerTier + noRespec
  if (rules.tiersSequential && tierIdx > 0 && t.tiers[tierIdx - 1] === null) return false;
  if (state[tree.resource] < tier.cost) return false;
  state[tree.resource] -= tier.cost;
  t.tiers[tierIdx] = branch;
  const node = tier[branch];
  pushEvent(state, { type: 'tech', id: node.id, name: node.name, tier: tierIdx, branch });
  applyImmediate(state, cfg, node.effect);
  return true;
}

// One-shot effects on purchase (spawn systems). Passive effects are queried live.
function applyImmediate(state, cfg, effect) {
  const core = state.buildings.find((b) => b.type === 'core');
  if (!core) return;
  if (effect.type === 'spawnDrones') {
    for (let i = 0; i < effect.count; i++) {
      makeUnit(state, cfg, 'drone', core.tile.x, core.tile.y, { tech: true });
    }
    state.run.droneT = effect.respawnSec;
  } else if (effect.type === 'spawnTitan') {
    makeUnit(state, cfg, 'titan', core.tile.x, core.tile.y, { tech: true });
    state.run.titanT = effect.respawnSec;
  }
}
