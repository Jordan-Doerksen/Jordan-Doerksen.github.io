/* ============================================================
   main.js — bootstraps every module on the site.
   You shouldn't need to edit this file unless you are adding
   or removing a whole feature.
   ============================================================ */

import { renderShell } from './shell.js';
import { initSky } from './sky.js';
import { initSigil } from './sigil.js';
import { initStarChart } from './starchart-nav.js';
import { initCursor } from './cursor.js';
import { initClickFx } from './click-fx.js';
import { initReveal } from './reveal.js';
import { initConstellation } from './constellation.js';
import { initSolObscurus } from './zones/sol-obscurus.js';
import { initBedroomWeather } from './zones/bedroom-weather.js';
import { initLibrary } from './library/quotes.js';
import { initTriforce } from './easter-egg/triforce.js';

function boot() {
  // The observatory shell — inject logo, nav, sky canvas, and footer first,
  // so initStarChart() below can bind to the nav it renders.
  renderShell();

  initSky();
  initSigil();
  initStarChart();
  initCursor();
  initClickFx();
  initReveal();

  // Themed panels — the hub Music teasers keep their ambient effects;
  // the playable Coin Survival + Particle Window now live on their spokes.
  initSolObscurus();
  initBedroomWeather();
  initConstellation();

  // Library (books + quote button)
  initLibrary();

  // Hidden Triforce sequence → OoT temple modal
  initTriforce();
  // (the footer year is set by renderShell, which owns the footer markup)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
