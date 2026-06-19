// ==========================================================================
// PROJECTS spoke — boots the shared shell, renders project cards from
// data/projects.json, and runs the live Particle Window showpiece.
// Standard cards come from JSON (add a project = add an entry); interactive
// showpieces like the particle demo are hand-placed in the HTML.
// ==========================================================================

import { renderShell } from '../shell.js';
import { initStarChart } from '../starchart-nav.js';
import { initSky } from '../sky.js';
import { initReveal } from '../reveal.js';
import { initCursor } from '../cursor.js';
import { initClickFx } from '../click-fx.js';
import { initParticleWindow } from '../projects/particle-window.js';

async function boot() {
  renderShell();
  initStarChart();

  await renderProjects(); // before initReveal so the cards animate in

  initSky();
  initReveal();
  initCursor();
  initClickFx();
  initParticleWindow(); // #particle-window
}

async function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  let data;
  try {
    data = await (await fetch('/data/projects.json')).json();
  } catch {
    return;
  }

  for (const p of data.projects || []) {
    const card = document.createElement('article');
    card.className = 'glass-panel reveal';

    const media = p.img
      ? `<figure class="card-media" data-src="${esc(p.img)}">
           <img src="${esc(p.img)}" alt="${esc(p.alt || p.name)}" loading="lazy"
                onerror="this.closest('figure').classList.add('img-missing')" />
         </figure>`
      : '';

    const links = (p.links || [])
      .map(
        (l) =>
          `<a class="btn btn-sm${l.primary ? ' btn-primary' : ''}" href="${esc(l.href)}"${
            l.href.startsWith('http') || l.newTab ? ' target="_blank" rel="noopener"' : ''
          }>${esc(l.label)}</a>`
      )
      .join('');

    card.innerHTML = `
      <div class="panel-body">
        ${media}
        <h3>${esc(p.name)}</h3>
        ${p.tag ? `<span class="panel-tag">${esc(p.tag)}</span>` : ''}
        <p class="card-blurb">${esc(p.blurb)}</p>
        ${links ? `<div class="card-links">${links}</div>` : ''}
      </div>
    `;
    grid.appendChild(card);
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
