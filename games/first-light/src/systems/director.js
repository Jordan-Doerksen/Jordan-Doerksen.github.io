// systems/director.js — the night's shape (Decision 1.3): 8 sectors, 21:00 → 05:00,
// quota per sector, seeded per-sector world gen, safe entry point. Owns nothing about
// drawing or feel — it decides WHAT the sector contains.

import { stream } from '../core/rng.js';

export function createDirector(cfg, state, scene, { wrecks, hazards, leviathan }) {
  function setupSector() {
    const rng = stream(state.seed, 'sector-' + state.sector);
    const safe = { x: scene.W / 2, y: scene.H * 0.72 }; // ship entry point
    state.quota = state.quotaFor(state.sector);
    state.quotaDone = 0;
    const wreckCount = state.quota + cfg.run.extraWrecksPerSector;
    wrecks.place(rng, wreckCount, safe);
    hazards.place(rng, state.sector, safe, wrecks.list);
    leviathan.reset(state.sector, rng);
    // Dead Reckoning synergy: the chart fills itself in, faintly
    if (state.mods.autoChart) for (const w of wrecks.list) w.seen = 1;
  }

  const isFinalSector = () => state.sector >= cfg.run.sectors;

  return { setupSector, isFinalSector };
}
