// ==========================================================================
// ROUTER — hash routes. "#/" (or empty) = the search/list view; "#/e/<id>" =
// an entry detail. Keeps the app a static file with no server rewrites.
// ==========================================================================

import { search } from './search.js';
import { renderList, renderEntry } from './reference.js';
import { renderDrills } from './drills.js';
import { renderProgress } from './progressview.js';
import { renderStudy } from './study.js';
import { renderGuide } from './guide.js';

const view = () => document.getElementById('view');

function syncNav(h) {
  const active = h.startsWith('/guide') ? 'guide' : h.startsWith('/study') ? 'study'
    : h.startsWith('/drills') ? 'drills' : h.startsWith('/progress') ? 'progress' : 'ref';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.getAttribute('data-nav') === active;
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

export function route() {
  const h = location.hash.slice(1);
  syncNav(h);
  if (h.startsWith('/guide')) { renderGuide(view()); window.scrollTo(0, 0); return; }
  if (h.startsWith('/study')) { renderStudy(view()); window.scrollTo(0, 0); return; }
  if (h.startsWith('/progress')) { renderProgress(view()); window.scrollTo(0, 0); return; }
  if (h.startsWith('/drills')) { renderDrills(view()); window.scrollTo(0, 0); return; }
  const m = h.match(/^\/e\/(.+)$/);
  if (m) { renderEntry(view(), decodeURIComponent(m[1])); window.scrollTo(0, 0); return; }
  const q = document.getElementById('q')?.value || '';
  renderList(view(), search(q), q);
}

export function initRouter() { addEventListener('hashchange', route); route(); }
