// core/state.js — the state machine + localStorage records + the run's mods bag.
// Phases: title → playing ↔ draft ↔ paused → over|won. SAVE_KEY comes from config.
// The mods bag is THE one place draft bonuses live (additive, one bag — Pentafall rule 4).

export function createState(cfg) {
  const s = {
    phase: 'title', // title | playing | draft | paused | over | won
    seed: 0,
    sector: 1,
    salvage: 0,
    hearts: cfg.ship.hearts,
    quota: 0,
    quotaDone: 0,
    chartedLog: [], // {x, y, sector} of every charted wreck, normalized 0..1 — feeds the plate
    mods: null,
    save: { best: 0, bestSector: 0, wins: 0, muted: false },
  };

  s.resetRun = () => {
    s.sector = 1; s.salvage = 0; s.hearts = cfg.ship.hearts;
    s.quotaDone = 0; s.chartedLog = [];
    s.mods = freshMods();
  };

  // additive mods bag — every card sums into here; modules read it each frame
  function freshMods() {
    return {
      beamArc: 1, beamRange: 1, sternLamp: 0, beamLinger: 1,
      pingRate: 1, pingRadius: 1, inkAlpha: 0, autoChart: 0,
      hearts: 0, speed: 1, iframes: 1,
      surveyRadius: 1, surveyRate: 1, salvageValue: 1,
    };
  }

  const KEY = cfg.meta.saveKey;
  try { Object.assign(s.save, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  s.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(s.save)); } catch (e) {} };

  s.dawn = () => (s.sector - 1) / cfg.run.sectors; // 0 night → 1 first light
  s.clockLabel = () => {
    const h = (cfg.run.startHour + (s.sector - 1)) % 24;
    return String(h).padStart(2, '0') + ':00';
  };
  s.quotaFor = (sector) => Math.min(
    cfg.run.quotaBase + Math.floor((sector - 1) / 2) * cfg.run.quotaPerTwoSectors,
    cfg.run.quotaCap
  );

  return s;
}
