/* boot.js — shell entry point for the front page and the seven sections.
   ---------------------------------------------------------------------------
   One fetch (data/registry.json) feeds the list and the finder. Depth is read
   from <html data-root>, so the same module runs at "/" and at "/rail/".

   Failure is stated, never hidden: if the registry does not arrive, the list
   says so and the finder button disables itself. The page's own prose, the
   four hand-written chapters, and every hard-coded link keep working — nothing
   essential lives behind this script. */

import { progress, entrances, markCurrent } from './chrome.js';
import { finder } from './finder.js';
import { indexList } from './index-list.js';

const root = document.documentElement.dataset.root || '';

progress();
entrances();
markCurrent();

const host = document.querySelector('.index');

fetch(root + 'data/registry.json')
  .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
  .then(data => {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];

    indexList(host, projects, categories, root, () => entrances(host));
    finder(projects, categories, root);
    stats(projects);
  })
  .catch(err => {
    console.error('registry unavailable', err);
    if (host) {
      host.textContent = '';
      const p = document.createElement('p');
      p.className = 'index-empty';
      p.textContent = 'the list could not load — the repos are at github.com/Jordan-Doerksen';
      host.appendChild(p);
    }
    const btn = document.querySelector('.find');
    if (btn) { btn.disabled = true; btn.textContent = 'list unavailable'; }
  });

/* Live counts in the stage's edge annotation. Every number is derived from the
   registry at read time — no hand-maintained figure can drift out of date.
   (The data-stat keys keep their names; the copy beside them says "written up".) */
function stats(projects) {
  const put = (sel, value) => {
    const n = document.querySelector(sel);
    if (n) n.textContent = String(value);
  };
  put('[data-stat="total"]', projects.length);
  put('[data-stat="documented"]', projects.filter(p => p.tier === 'full').length);
  put('[data-stat="live"]', projects.filter(p => p.status === 'live').length);
}
