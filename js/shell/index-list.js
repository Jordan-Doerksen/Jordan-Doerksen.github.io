/* index-list.js — the typographic index.
   ---------------------------------------------------------------------------
   The bible's anti_card_composition rule: "use a typographic index when titles
   are more useful than thumbnails." There are no per-project thumbnails in this
   repo, so a card grid would be 57 identical rectangles with nothing in them.
   The index leads with names, states role and status, and reveals the spec line
   on hover AND focus.

   Order is registry order inside registry-order categories — curated, never
   sorted by whatever happens to be newest.

   Every row is honest: a project with no live URL, no repo, and no atlas entry
   renders as a non-link row labelled with its real state (private / retired /
   frozen). Show nothing rather than something false. */

import { destination } from './finder.js';

const STATE_CLASS = {
  live: 'is-live', built: 'is-built', active: 'is-active'
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function rowFor(p, n, root) {
  const href = destination(p, root);
  const row = el(href ? 'a' : 'div', 'row' + (href ? '' : ' is-closed'));
  if (href) row.href = href;

  row.append(
    el('span', 'row-n', String(n).padStart(2, '0')),
    el('span', 'row-name', p.name || p.slug || 'Untitled'),
    el('span', 'row-what', p.blurb || ''),
    el('span', 'row-state ' + (STATE_CLASS[p.status] || ''), p.status || 'unlisted')
  );
  return row;
}

/* Rebuilds the whole list for the current query + wing. Cheap enough at this
   size (57 rows) that partial updates would be complexity without a payoff. */
function paint(host, projects, categories, root, state) {
  host.textContent = '';
  const q = state.q.trim().toLowerCase();

  const match = p => {
    if (state.wing !== 'all' && p.category !== state.wing) return false;
    if (!q) return true;
    const hay = [p.name, p.blurb, p.status, p.category, (p.tags || []).join(' ')].join(' ').toLowerCase();
    return hay.includes(q);
  };

  let n = 0;
  let shown = 0;
  const grouped = state.wing === 'all' && !q;

  categories.forEach(c => {
    const list = projects.filter(p => p.category === c.slug && match(p));
    if (!list.length) return;
    if (grouped) {
      const head = el('div', 'index-group');
      head.append(el('b', null, c.num), document.createTextNode(c.name + ' — ' + c.desc));
      host.appendChild(head);
    }
    list.forEach(p => host.appendChild(rowFor(p, ++n, root)));
    shown += list.length;
  });

  if (!shown) host.appendChild(el('p', 'index-empty', 'nothing under that name'));

  const count = document.querySelector('.index-count');
  if (count) count.textContent = shown + (shown === 1 ? ' project' : ' projects');
  return shown;
}

/* host: the .index element. Its data-wing attribute restricts a section page to
   one category; the front page leaves it off (or sets "all") and gets the chips.
   (The attribute keeps its old name; the copy says "section" everywhere.) */
export function indexList(host, projects, categories, root, onPaint) {
  if (!host) return;
  const state = { q: '', wing: host.dataset.wing || 'all' };

  const filter = document.querySelector('.index-filter');
  const chips = document.querySelector('.chips');

  if (chips) {
    const add = (slug, label) => {
      const b = el('button', 'chip', label);
      b.type = 'button';
      b.dataset.wing = slug;
      b.setAttribute('aria-pressed', String(slug === state.wing));
      b.addEventListener('click', () => {
        state.wing = slug;
        chips.querySelectorAll('.chip').forEach(c =>
          c.setAttribute('aria-pressed', String(c.dataset.wing === slug)));
        run();
      });
      chips.appendChild(b);
    };
    add('all', 'All');
    categories.forEach(c => add(c.slug, c.name));
  }

  if (filter) {
    filter.addEventListener('input', () => { state.q = filter.value; run(); });
  }

  function run() {
    paint(host, projects, categories, root, state);
    if (onPaint) onPaint(host);
  }
  run();
}
