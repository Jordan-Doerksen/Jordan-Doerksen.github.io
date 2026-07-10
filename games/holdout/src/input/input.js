// input.js — canvas picking + hotkeys, normalized to the actions API. The only sim
// fields written directly are the two presentation-pinned ones (hoverSlot,
// selectedBuildingId) plus the presentation-owned state.ui namespace.
// Seam pinned by ARCHITECTURE.md: initInput(canvas, state, actions, cfg).
import { initIso, pickTile } from '../render/iso.js';

const HOVER_RADIUS = 0.8;  // tiles — slot/pad pick distance
const SELECT_RADIUS = 0.9; // tiles — building pick distance

export function initInput(canvas, state, actions, cfg) {
  initIso(cfg.map); // idempotent — render also calls this; order doesn't matter
  if (!state.ui) state.ui = { techOpen: false };
  const spots = [...cfg.map.slots, ...cfg.map.pads];

  canvas.addEventListener('mousemove', e => {
    if (state.mode !== 'playing') { state.hoverSlot = null; return; }
    const t = tileFromEvent(canvas, e);
    state.hoverSlot = nearestSpot(spots, t, HOVER_RADIUS);
  });

  canvas.addEventListener('mouseleave', () => { state.hoverSlot = null; });

  canvas.addEventListener('click', e => {
    if (state.mode !== 'playing') return;
    const t = tileFromEvent(canvas, e);
    if (state.selectedBuild) {
      const id = nearestSpot(spots, t, HOVER_RADIUS);
      if (id) actions.placeAt(id);
      return;
    }
    state.selectedBuildingId = nearestBuilding(state.buildings, t, SELECT_RADIUS);
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      actions.selectBuild(null);
      state.selectedBuildingId = null;
      state.ui.techOpen = false;
      return;
    }
    if (state.mode !== 'playing') return;
    const key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3') {
      const type = ['turret', 'bunker', 'barracks'][Number(key) - 1];
      actions.selectBuild(state.selectedBuild === type ? null : type);
    } else if (key === 'p') {
      actions.togglePause();
    } else if (key === 'm') {
      actions.toggleMute();
    } else if (key === 't') {
      state.ui.techOpen = !state.ui.techOpen;
    }
  });
}

// Convert a mouse event to tile-space, scaling for CSS-resized canvases.
function tileFromEvent(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (canvas.width / rect.width);
  const py = (e.clientY - rect.top) * (canvas.height / rect.height);
  return pickTile(px, py);
}

function nearestSpot(spots, t, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const s of spots) {
    const d = Math.hypot(s.tile.x - t.x, s.tile.y - t.y);
    if (d <= bestD) { bestD = d; best = s.id; }
  }
  return best;
}

function nearestBuilding(buildings, t, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const b of buildings) {
    const d = Math.hypot(b.tile.x - t.x, b.tile.y - t.y);
    if (d <= bestD) { bestD = d; best = b.id; }
  }
  return best;
}
