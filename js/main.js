/* ============================================================
   main.js — bootstraps every module on the site.
   You shouldn't need to edit this file unless you are adding
   or removing a whole feature.
   ============================================================ */

import { initStarfield } from './starfield.js';
import { initCursor } from './cursor.js';
import { initClickFx } from './click-fx.js';
import { initReveal } from './reveal.js';
import { initConstellation } from './constellation.js';
import { initSolObscurus } from './zones/sol-obscurus.js';
import { initBedroomWeather } from './zones/bedroom-weather.js';
import { initCoinSurvival } from './projects/coin-survival.js';
import { initParticleWindow } from './projects/particle-window.js';
import { initLibrary } from './library/quotes.js';
import { initTriforce } from './easter-egg/triforce.js';

function boot() {
  // Global shell FX
  initStarfield();
  initCursor();
  initClickFx();
  initReveal();

  // Themed panels
  initSolObscurus();
  initBedroomWeather();
  initConstellation();

  // Projects
  initCoinSurvival();
  initParticleWindow();

  // Library (books + quote button)
  initLibrary();

  // Hidden Triforce sequence → OoT temple modal
  initTriforce();

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
