// ==========================================================================
// SOL OBSCURUS spoke — boots the shared shell, then renders the band's
// full track list from data/sol-obscurus.json and lights the embers.
// Reuses the same sky / reveal / cursor / spark / ember modules as the hub.
// ==========================================================================

import { renderShell } from '../shell.js';
import { initStarChart } from '../starchart-nav.js';
import { initSky } from '../sky.js';
import { initReveal } from '../reveal.js';
import { initCursor } from '../cursor.js';
import { initClickFx } from '../click-fx.js';
import { initSolObscurus } from '../zones/sol-obscurus.js';

async function boot() {
  renderShell();
  initStarChart(); // wires the mobile star-map toggle on the shell nav

  // Render the tracks BEFORE initReveal so its observer picks them up.
  await renderTracks();

  initSky();
  initReveal();
  initCursor();
  initClickFx();
  initSolObscurus(); // embers + rune rings in the hero (data-effect="ritual")
}

async function renderTracks() {
  const list = document.getElementById('sol-tracks');
  if (!list) return;

  let data;
  try {
    data = await (await fetch('/data/sol-obscurus.json')).json();
  } catch {
    return; // leave the list empty if the JSON can't load
  }

  for (const track of data.tracks || []) {
    const row = document.createElement('div');
    row.className = 'track reveal';
    row.innerHTML = `
      <span class="panel-tag">${esc(track.title)}</span>
      <audio controls src="${esc(track.src)}" preload="none"></audio>
      ${
        track.pdf
          ? `<a class="btn btn-sm" href="${esc(track.pdf)}" target="_blank" rel="noopener">Sheet music (PDF)</a>`
          : ''
      }
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
