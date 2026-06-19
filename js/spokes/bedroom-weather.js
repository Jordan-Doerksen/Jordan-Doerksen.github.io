// ==========================================================================
// BEDROOM WEATHER spoke — boots the shared shell, renders the full track
// list from data/bedroom-weather.json, and runs the rain effect in the hero.
// ==========================================================================

import { renderShell } from '../shell.js';
import { initStarChart } from '../starchart-nav.js';
import { initSky } from '../sky.js';
import { initReveal } from '../reveal.js';
import { initCursor } from '../cursor.js';
import { initClickFx } from '../click-fx.js';
import { initBedroomWeather } from '../zones/bedroom-weather.js';

async function boot() {
  renderShell();
  initStarChart();

  await renderTracks(); // before initReveal so its observer picks the rows up

  initSky();
  initReveal();
  initCursor();
  initClickFx();
  initBedroomWeather(); // rain + clouds in the hero (data-effect="rain")
}

async function renderTracks() {
  const list = document.getElementById('bw-tracks');
  if (!list) return;

  let data;
  try {
    data = await (await fetch('/data/bedroom-weather.json')).json();
  } catch {
    return;
  }

  for (const track of data.tracks || []) {
    const row = document.createElement('div');
    row.className = 'track reveal';
    row.innerHTML = `
      <span class="panel-tag">${esc(track.title)}</span>
      <audio controls src="${esc(track.src)}" preload="none"></audio>
    `;
    list.appendChild(row);
  }
}

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
