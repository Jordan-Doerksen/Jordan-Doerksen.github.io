// ==========================================================================
// WARCRAFT III spoke (The Codex) — boots the shared shell and the playable
// Coin Survival mini-game. The Lua excerpt and maze blurb are static HTML.
// ==========================================================================

import { renderShell } from '../shell.js';
import { initStarChart } from '../starchart-nav.js';
import { initSky } from '../sky.js';
import { initReveal } from '../reveal.js';
import { initCursor } from '../cursor.js';
import { initClickFx } from '../click-fx.js';
import { initCoinSurvival } from '../projects/coin-survival.js';

function boot() {
  renderShell();
  initStarChart();

  initSky();
  initReveal();
  initCursor();
  initClickFx();
  initCoinSurvival(); // #coin-game + #coin-overlay + #coin-start
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
