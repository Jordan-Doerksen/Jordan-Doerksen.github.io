// src/sim/actions.js — the ONLY mutation surface for ui/input (ARCHITECTURE.md contract):
// startRun · selectBuild · placeAt · upgradeBuilding · cycleLane · buyTechRoot · buyTech
// · togglePause · toggleMute · toggleSfx · toggleMusic · backToTitle. Every method
// returns true on success (toggles return the new value).

import { resetRun } from '../core/state.js';
import { makeBuilding, pushEvent } from './factory.js';
import { buyRoot, buyTier } from './tech.js';
import { assignBarracksUnits } from './waves.js';
import { claimGarrison } from './spawn.js';

const BUILD_TYPES = ['turret', 'bunker', 'barracks'];
const LANE_CYCLE = ['north', 'east', 'west', 'auto'];

export function createActions(state, cfg) {
  return {
    startRun() {
      resetRun(state, cfg);
      state.mode = 'playing';
      return true;
    },

    selectBuild(type) {
      if (type !== null && !BUILD_TYPES.includes(type)) return false;
      state.selectedBuild = type;
      return true;
    },

    // turret/bunker → chokepoint slots only; barracks → build pads only.
    placeAt(slotOrPadId) {
      if (state.mode !== 'playing') return false;
      const type = state.selectedBuild;
      if (!type) return false;
      const slot = cfg.map.slots.find((s) => s.id === slotOrPadId);
      const pad = cfg.map.pads.find((p) => p.id === slotOrPadId);
      const spot = type === 'barracks' ? pad : slot;
      if (!spot) return false;
      if (state.buildings.some((b) => b.slotId === slotOrPadId || b.padId === slotOrPadId)) return false;
      const cost = cfg.game.economy.costs[type];
      if (state.credits < cost) return false;
      state.credits -= cost;
      const b = makeBuilding(state, cfg, type, spot.tile, pad ? { padId: spot.id } : { slotId: spot.id });
      if (type === 'bunker') claimGarrison(state, cfg, b);
      pushEvent(state, { type: 'place', building: type, id: b.id, x: spot.tile.x, y: spot.tile.y });
      return true;
    },

    upgradeBuilding(id) {
      if (state.mode !== 'playing') return false;
      const b = state.buildings.find((x) => x.id === id);
      if (!b) return false;
      const costs = cfg.game.economy.costs;
      let cost = null;
      if (b.type === 'income') {
        const tier = cfg.game.economy.income.tiers[b.level - 1];
        if (!tier || tier.upgradeCost == null) return false;
        cost = tier.upgradeCost;
      } else if (b.type === 'barracks') {
        if (b.level >= cfg.roster.buildings.barracks.levels.length) return false;
        cost = b.level === 1 ? costs.barracksL2 : costs.barracksL3;
      } else if (b.type === 'turret') {
        if (b.level >= cfg.roster.buildings.turret.levels.length) return false;
        cost = costs.turretMk2;
      } else {
        return false;
      }
      if (state.credits < cost) return false;
      state.credits -= cost;
      b.level += 1;
      pushEvent(state, { type: 'upgrade', building: b.type, id: b.id, level: b.level });
      return true;
    },

    // 'north' → 'east' → 'west' → 'auto' → 'north' … (assignment, not micro)
    cycleLane(barracksId) {
      if (state.mode !== 'playing') return false;
      const b = state.buildings.find((x) => x.id === barracksId && x.type === 'barracks');
      if (!b) return false;
      const idx = LANE_CYCLE.indexOf(b.laneId);
      b.laneId = LANE_CYCLE[(idx + 1) % LANE_CYCLE.length];
      assignBarracksUnits(state, b);
      return true;
    },

    buyTechRoot(treeId) {
      if (state.mode !== 'playing') return false;
      return buyRoot(state, cfg, treeId);
    },

    buyTech(treeId, tierIdx, branch) {
      if (state.mode !== 'playing') return false;
      return buyTier(state, cfg, treeId, tierIdx, branch);
    },

    togglePause() {
      state.paused = !state.paused;
      return state.paused;
    },

    toggleMute() {
      state.muted = !state.muted;
      return state.muted;
    },

    // Per-channel audio settings. Sim only flips the flags — persistence is the
    // audio module's job (its own localStorage key; sim never touches storage here).
    toggleSfx() {
      state.settings.sfx = !state.settings.sfx;
      return state.settings.sfx;
    },

    toggleMusic() {
      state.settings.music = !state.settings.music;
      return state.settings.music;
    },

    backToTitle() {
      state.mode = 'title';
      return true;
    },
  };
}
