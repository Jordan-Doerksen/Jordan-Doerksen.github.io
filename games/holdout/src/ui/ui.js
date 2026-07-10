// ui.js — DOM HUD orchestrator. Builds everything inside #ui-root once, then patches
// text/classes per frame (no innerHTML rebuilds). Mutates sim state ONLY via actions;
// owns exactly one presentation field: state.ui = { techOpen }.
// Seam pinned by ARCHITECTURE.md: initUI(state, actions, cfg) + updateUI(state).
import { el, setText, setClass, show } from './dom.js';
import { buildTitle, buildEnd, updateScreens } from './ui-screens.js';
import { buildTech, updateTech } from './ui-tech.js';

let R = null; // cached node refs
let A = null; // actions
let C = null; // config bundle { game, map, roster, tech }

const BUILD_TYPES = ['turret', 'bunker', 'barracks'];

export function initUI(state, actions, cfg) {
  A = actions;
  C = cfg;
  if (!state.ui) state.ui = { techOpen: false }; // presentation-owned namespace
  applyPaletteVars(cfg.game.palette);

  const root = document.getElementById('ui-root');
  root.textContent = '';
  R = { root };
  buildTopBar(root, state);
  buildBuildBar(root, state);
  buildInfoPanel(root);
  R.tech = buildTech(root, state, actions, cfg);
  R.title = buildTitle(root, actions, cfg);
  R.end = buildEnd(root, actions);
  updateUI(state);
}

export function updateUI(state) {
  if (!R) return;
  const playing = state.mode === 'playing';
  show(R.topbar, playing);
  show(R.buildbar, playing);
  if (!playing) {
    show(R.infoPanel, false);
    if (state.ui.techOpen) state.ui.techOpen = false;
  }

  if (playing) {
    setText(R.credits, Math.floor(state.credits));
    setText(R.essence, Math.floor(state.essence));
    setText(R.alienTech, Math.floor(state.alienTech));
    setText(R.waveLabel, `W ${state.wave}/${C.game.waves.total}`);
    setText(R.phase, state.paused ? 'PAUSED'
      : state.phase === 'build' ? `BREACH IN ${fmtTime(state.phaseT)}`
      : 'ENGAGED');
    setText(R.pauseBtn, state.paused ? 'RESUME' : 'PAUSE');
    setText(R.muteBtn, state.muted ? 'MUTED' : 'MUTE');
    for (const type of BUILD_TYPES) {
      const btn = R.buildBtns[type];
      const cost = C.game.economy.costs[type];
      const afford = state.credits >= cost;
      if (btn.disabled !== !afford) btn.disabled = !afford;
      setClass(btn, 'active', state.selectedBuild === type);
    }
    updateInfoPanel(state);
  }
  updateTech(R.tech, state, C);
  updateScreens(R, state, C);
}

// ---------- top bar ----------------------------------------------------------------------

function buildTopBar(root, state) {
  const bar = el('div', 'topbar hidden');
  for (const key of ['credits', 'essence', 'alienTech']) {
    const span = el('span', 'res');
    span.appendChild(el('i', `dot dot-${key}`));
    const val = el('b', null, '0');
    span.appendChild(val);
    bar.appendChild(span);
    R[key] = val;
  }
  R.waveLabel = el('span', 'wave', 'W 0/0');
  bar.appendChild(R.waveLabel);
  R.phase = el('span', 'phase', '');
  bar.appendChild(R.phase);
  bar.appendChild(el('span', 'spacer'));
  R.pauseBtn = el('button', 'btn', 'PAUSE');
  R.pauseBtn.addEventListener('click', () => A.togglePause());
  bar.appendChild(R.pauseBtn);
  R.muteBtn = el('button', 'btn', 'MUTE');
  R.muteBtn.addEventListener('click', () => A.toggleMute());
  bar.appendChild(R.muteBtn);
  root.appendChild(bar);
  R.topbar = bar;
}

// ---------- bottom build bar ---------------------------------------------------------------

function buildBuildBar(root, state) {
  const bar = el('div', 'buildbar hidden');
  R.buildBtns = {};
  BUILD_TYPES.forEach((type, i) => {
    const btn = el('button', 'btn');
    const label = el('span');
    label.appendChild(el('span', 'key', String(i + 1)));
    label.append(C.roster.buildings[type].name.toUpperCase());
    btn.appendChild(label);
    btn.appendChild(el('span', 'cost', `${C.game.economy.costs[type]} cr`));
    btn.addEventListener('click', () => {
      A.selectBuild(state.selectedBuild === type ? null : type);
    });
    bar.appendChild(btn);
    R.buildBtns[type] = btn;
  });
  const tech = el('button', 'btn', 'TECH');
  tech.addEventListener('click', () => { state.ui.techOpen = !state.ui.techOpen; });
  bar.appendChild(tech);
  root.appendChild(bar);
  R.buildbar = bar;
}

// ---------- selected-building info panel -----------------------------------------------------

function buildInfoPanel(root) {
  const panel = el('div', 'info-panel hidden');
  R.infoName = el('div', 'name', '');
  panel.appendChild(R.infoName);
  const row = el('div', 'row');
  const hpWrap = el('span');
  hpWrap.append('HP ');
  R.infoHp = el('b', null, '');
  hpWrap.appendChild(R.infoHp);
  row.appendChild(hpWrap);
  const lvlWrap = el('span');
  lvlWrap.append('LVL ');
  R.infoLvl = el('b', null, '');
  lvlWrap.appendChild(R.infoLvl);
  row.appendChild(lvlWrap);
  panel.appendChild(row);
  const actions = el('div', 'actions');
  R.upgradeBtn = el('button', 'btn', 'UPGRADE');
  R.upgradeBtn.addEventListener('click', () => {
    if (R.infoId != null) A.upgradeBuilding(R.infoId);
  });
  actions.appendChild(R.upgradeBtn);
  R.laneBtn = el('button', 'btn', 'LANE');
  R.laneBtn.addEventListener('click', () => {
    if (R.infoId != null) A.cycleLane(R.infoId);
  });
  actions.appendChild(R.laneBtn);
  panel.appendChild(actions);
  root.appendChild(panel);
  R.infoPanel = panel;
}

function updateInfoPanel(state) {
  const b = state.selectedBuildingId != null
    && state.buildings.find(x => x.id === state.selectedBuildingId);
  show(R.infoPanel, !!b);
  if (!b) { R.infoId = null; return; }
  R.infoId = b.id;
  const def = C.roster.buildings[b.type];
  setText(R.infoName, def ? def.name : b.type);
  setText(R.infoHp, `${Math.ceil(b.hp)}/${b.maxHp}`);
  setText(R.infoLvl, b.level);
  const cost = upgradeCost(b);
  show(R.upgradeBtn, cost != null);
  if (cost != null) {
    setText(R.upgradeBtn, `UPGRADE ${cost} cr`);
    const afford = state.credits >= cost;
    if (R.upgradeBtn.disabled !== !afford) R.upgradeBtn.disabled = !afford;
  }
  const isBarracks = b.type === 'barracks';
  show(R.laneBtn, isBarracks);
  if (isBarracks) {
    const lane = b.laneId ? String(b.laneId).toUpperCase() : 'AUTO';
    setText(R.laneBtn, `LANE ${lane}`);
  }
}

// Upgrade pricing lives in config/game.json economy.costs / income tiers.
function upgradeCost(b) {
  const costs = C.game.economy.costs;
  if (b.type === 'turret') return b.level === 1 ? costs.turretMk2 : null;
  if (b.type === 'barracks') {
    return b.level === 1 ? costs.barracksL2 : b.level === 2 ? costs.barracksL3 : null;
  }
  if (b.type === 'income') {
    const tier = C.game.economy.income.tiers[b.level - 1];
    return tier ? tier.upgradeCost : null;
  }
  return null; // core and bunker do not upgrade in V1
}

// ---------- helpers ---------------------------------------------------------------------------

// Publish the config palette as CSS vars so ui.css never hardcodes a game hex.
function applyPaletteVars(palette) {
  const rootEl = document.documentElement;
  for (const [key, hex] of Object.entries(palette)) {
    rootEl.style.setProperty(`--p-${key}`, hex);
  }
}

function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
