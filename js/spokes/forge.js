// ==========================================================================
// FORGE spoke (Red River 3D) — boots the shared shell and renders the print
// gallery from data/forge.json. Add a print = add a JSON entry.
// ==========================================================================

import { renderShell } from '../shell.js';
import { initStarChart } from '../starchart-nav.js';
import { initSky } from '../sky.js';
import { initReveal } from '../reveal.js';
import { initCursor } from '../cursor.js';
import { initClickFx } from '../click-fx.js';

async function boot() {
  renderShell();
  initStarChart();

  await renderGallery(); // before initReveal so the gallery panel animates in

  initSky();
  initReveal();
  initCursor();
  initClickFx();
}

async function renderGallery() {
  const grid = document.getElementById('forge-gallery');
  if (!grid) return;

  let data;
  try {
    data = await (await fetch('/data/forge.json')).json();
  } catch {
    return;
  }

  for (const print of data.prints || []) {
    const fig = document.createElement('figure');
    fig.dataset.src = print.img;
    const rarity = print.rarity || 'rare';
    fig.innerHTML = `
      <img src="${esc(print.img)}" alt="${esc(print.alt || print.name || '3D print')}" loading="lazy"
           onerror="this.closest('figure').classList.add('img-missing')" />
      <figcaption>
        ${print.name ? `<span class="print-name">${esc(print.name)}</span>` : ''}
        <span class="rarity rarity-${esc(rarity)}">${esc(rarity)}</span>
      </figcaption>
    `;
    grid.appendChild(fig);
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
