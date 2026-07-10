// src/sim/meta.js — Salvage bank: localStorage load/save (guarded) + run-end conversion.
// The ONLY sim file (besides core/state.js's call into here) allowed to touch localStorage.

export function loadSalvage(cfg) {
  try {
    if (typeof localStorage === 'undefined') return 0; // headless (node) has no localStorage
    const raw = localStorage.getItem(cfg.game.meta.storageKey);
    if (!raw) return 0;
    const v = JSON.parse(raw);
    return Number.isFinite(v.salvage) ? v.salvage : 0;
  } catch {
    return 0;
  }
}

export function saveMeta(cfg, meta) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(cfg.game.meta.storageKey, JSON.stringify({ salvage: meta.salvage }));
  } catch {
    // storage full / blocked: the bank just doesn't persist this run
  }
}

// Win or lose, unspent typed resources convert to permanent Salvage.
export function endRun(state, cfg, won) {
  if (state.run.ended) return;
  state.run.ended = true;
  const m = cfg.game.meta;
  const gained = Math.round(
    state.essence * m.salvagePerEssence +
    state.alienTech * m.salvagePerAlienTech +
    state.stats.wavesCleared * m.salvagePerWave +
    (won ? m.winBonus : 0)
  );
  state.meta.salvage += gained;
  saveMeta(cfg, state.meta);
  state.mode = won ? 'won' : 'lost';
  state.events.push({ type: won ? 'win' : 'lose', salvage: gained, wave: state.wave });
}
