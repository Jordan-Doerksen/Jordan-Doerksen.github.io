/* ============================================================
   main.js — bootstraps every module on the site.
   You shouldn't need to edit this file unless you are adding
   or removing a whole feature.
   ============================================================ */

// NOTE: ES module imports are NOT busted by index.html's ?v= — the browser
// caches them hard. When you edit a module, bump the ?v= on its import here
// (and in any other file that imports it) so a normal reload picks it up.
import { renderShell } from './shell.js';
import { initSky } from './sky.js?v=19';
import { initHero } from './hero.js?v=9';
import { initStarChart } from './starchart-nav.js';
import { initCursorFx } from './cursor-fx.js?v=5';
import { initReveal } from './reveal.js';
import { initSkins } from './skins.js?v=2';
import { initMilitaryProps } from './skins/military-props.js?v=4';
import { initAngelicProps } from './skins/angelic-props.js?v=2';
import { initDemonicProps } from './skins/demonic-props.js?v=4';
import { initNatureProps } from './skins/nature-props.js?v=2';
import { initChicProps } from './skins/chic-props.js';
import { initProProps } from './skins/pro-props.js';
import { initConstellation } from './constellation.js?v=13';
import { initSolObscurus } from './zones/sol-obscurus.js?v=2';
import { initBedroomWeather } from './zones/bedroom-weather.js?v=2';
import { initLibrary } from './library/quotes.js';
import { initTriforce } from './easter-egg/triforce.js';

function boot() {
  // The observatory shell — inject logo, nav, sky canvas, and footer first,
  // so initStarChart() below can bind to the nav it renders.
  renderShell();

  // Skin picker (topbar) — mounts the control and applies the saved skin so the
  // sky reads the right --sky-* vars when it inits just below.
  initSkins();

  initSky();
  initHero();
  initMilitaryProps();   // tank convoy + howitzer, only while the Military skin is active
  initAngelicProps();    // doves, only while the Angelic skin is active
  initDemonicProps();    // imps + bats + hellgate + ash, only while the Demonic skin is active
  initNatureProps();     // critters + hawk, only while the Nature skin is active
  initChicProps();       // runway + sparkle + champagne + gold dust, only while the Chic skin is active
  initProProps();        // commuters + stat cards + paper planes, only while the Pro skin is active
  initStarChart();
  initCursorFx();   // per-skin cursor trail + click FX (replaces the old cursor/click-fx)
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
