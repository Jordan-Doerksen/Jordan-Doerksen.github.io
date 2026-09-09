/* atlas.js — one template renders any project's write-up.
   ---------------------------------------------------------------------------
   NAMING: "atlas" survives as the technical name of this URL, template, and
   stylesheet — the /atlas/ path predates CR-7 and old URLs never break. Nothing
   the reader sees says "atlas": the copy calls these pages "how it works".

   Re-authored in CR-7 as an editorial-rhythm document with a narrative rail:
   an opening stage (what it is, how it stands), then chapters that alternate
   dense (diagram, steps, components) and quiet (stack, integrations, decisions).
   The rail is orientation only — every chapter is reachable by scrolling, and
   the rail is hidden below 1000px where the section heads carry the same job.

   Safety, unchanged: everything is built with createElement/textContent. The
   ONLY markup injection is our own committed diagram SVG, and it is checked to
   start with "<svg" before it goes in. A missing slug, a missing JSON, or a
   missing diagram each render an explicit state — never a blank or fake page. */

import { progress, entrances, markCurrent } from '../shell/chrome.js';
import { finder } from '../shell/finder.js';

const root = document.documentElement.dataset.root || '../';
const host = document.getElementById('atlas');
const slug = new URLSearchParams(location.search).get('p') || '';

progress();
markCurrent();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function missing(msg) {
  host.textContent = '';
  const p = el('p', 'atlas-missing');
  p.append(document.createTextNode(msg + ' '));
  const a = el('a', null, '← back to the list');
  a.href = root + '#index';
  p.append(a);
  host.appendChild(p);
}

/* Chapter factory. Every chapter registers itself with the rail, so the rail
   can never list a section that was not rendered. */
function chapter(rail, body, id, title, folio) {
  const sec = el('section', 'atlas-sec enter');
  sec.id = id;
  const head = el('div', 'chapter-head');
  head.append(el('h2', null, title), el('span', 'folio bare', folio));
  sec.appendChild(head);
  body.appendChild(sec);

  const li = document.createElement('li');
  const a = el('a', null, title);
  a.href = '#' + id;
  li.appendChild(a);
  rail.appendChild(li);

  return sec;
}

function render(p) {
  document.title = (p.name || slug) + ' — how it works — Jordan Doerksen';
  host.textContent = '';

  /* ---- opening stage ---- */
  const head = el('section', 'atlas-head');
  head.appendChild(el('p', 'folio', 'How it works · ' + (p.category || 'uncategorised')));
  head.appendChild(el('h1', null, p.name || p.slug));
  if (p.oneLiner) head.appendChild(el('p', 'atlas-oneliner', p.oneLiner));

  const meta = el('p', 'atlas-meta');
  /* fallback matches index-list.js so the two surfaces agree on the same project */
  meta.appendChild(el('span', 'atlas-status', String(p.status || 'unlisted').toUpperCase()));
  if (p.category) meta.appendChild(el('span', null, p.category.toUpperCase()));
  head.appendChild(meta);
  if (p.statusNote) head.appendChild(el('p', 'atlas-note', p.statusNote));

  const links = el('div', 'atlas-links');
  if (p.links && p.links.live) {
    const live = el('a', 'atlas-link', 'Open it →');
    live.href = p.links.live;
    links.appendChild(live);
  }
  if (p.links && p.links.repo) {
    const repo = el('a', 'atlas-link', 'Code →');
    repo.href = p.links.repo;
    links.appendChild(repo);
  }
  if (!(p.links && (p.links.live || p.links.repo))) {
    links.appendChild(el('span', 'atlas-private', 'code private'));
  }
  head.appendChild(links);
  host.appendChild(head);

  /* ---- railed body ---- */
  const railed = el('div', 'railed');
  const nav = el('nav', 'rail');
  nav.setAttribute('aria-label', 'Chapters');
  const rail = document.createElement('ol');
  nav.appendChild(rail);
  const body = document.createElement('div');
  railed.append(nav, body);
  host.appendChild(railed);

  let n = 0;
  const folio = () => '§ ' + String(++n).padStart(2, '0');

  if (Array.isArray(p.stack) && p.stack.length) {
    const sec = chapter(rail, body, 's-stack', 'Stack', folio());
    const tags = el('div', 'tags');
    p.stack.forEach(t => tags.appendChild(el('span', 'tag', t)));
    sec.appendChild(tags);
  }

  if (p.diagram) {
    const sec = chapter(rail, body, 's-diagram', 'Data flow', folio());
    const fig = el('figure', 'diagram');
    const well = el('div', 'diagram-well');
    well.setAttribute('tabindex', '0');
    /* matches the visible chapter title and caption — a screen-reader user and a
       sighted reader must be given the same name for the same figure */
    well.setAttribute('aria-label', 'Data flow diagram — scrolls horizontally');
    fig.appendChild(well);
    fig.appendChild(el('figcaption', 'diagram-cap',
      'FIG 01 — ' + (p.name || p.slug).toUpperCase() + ' DATA FLOW'));
    sec.appendChild(fig);

    fetch(root + p.diagram.replace(/^\//, ''))
      .then(r => r.ok ? r.text() : Promise.reject(new Error(r.status)))
      .then(svg => {
        if (svg.trim().indexOf('<svg') !== 0) { dropChapter(sec, rail, 's-diagram'); return; }
        well.innerHTML = svg;
        if (window.DiagramLive) window.DiagramLive.scan();
        else setTimeout(() => { if (window.DiagramLive) window.DiagramLive.scan(); }, 400);
      })
      /* no diagram beats a broken well — the chapter and its rail entry go */
      .catch(() => dropChapter(sec, rail, 's-diagram'));
  }

  if (Array.isArray(p.dataFlow) && p.dataFlow.length) {
    const sec = chapter(rail, body, 's-steps', 'Step by step', folio());
    const ol = el('ol', 'ol-steps');
    p.dataFlow.forEach(step => ol.appendChild(el('li', null, step)));
    sec.appendChild(ol);
  }

  /* THE one place this site uses cards: components are genuinely peer-level,
     repeatable, and read side by side. Card policy honoured, not dodged. */
  if (Array.isArray(p.components) && p.components.length) {
    const sec = chapter(rail, body, 's-parts', 'Components', folio());
    const grid = el('div', 'peers');
    p.components.forEach(c => {
      if (!c) return;
      const cell = el('div', 'peer');
      cell.append(el('span', 'p-name', c.name || '—'), el('p', 'p-desc', c.desc || ''));
      grid.appendChild(cell);
    });
    sec.appendChild(grid);
  }

  if (Array.isArray(p.integrations) && p.integrations.length) {
    const sec = chapter(rail, body, 's-talks', 'Talks to', folio());
    const tags = el('div', 'tags');
    p.integrations.forEach(t => tags.appendChild(el('span', 'tag', t)));
    sec.appendChild(tags);
  }

  if (Array.isArray(p.decisions) && p.decisions.length) {
    const sec = chapter(rail, body, 's-why', 'Why it’s built this way', folio());
    const ul = el('ul', 'ul-marks');
    p.decisions.forEach(d => ul.appendChild(el('li', null, d)));
    sec.appendChild(ul);
  }

  /* transition cue — a write-up resolves back into its section, not into nothing */
  if (p.category) {
    const turn = el('a', 'turn', 'Back to ' + p.category);
    turn.href = root + p.category + '/';
    body.appendChild(turn);
  }

  entrances(host);
  trackRail(rail, body);
}

function dropChapter(sec, rail, id) {
  sec.remove();
  const link = rail.querySelector('a[href="#' + id + '"]');
  if (link && link.parentNode) link.parentNode.remove();
}

/* Rail position. Orientation only: if this observer never fires, every link
   still works and the page still reads. */
function trackRail(rail, body) {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = rail.querySelector('a[href="#' + e.target.id + '"]');
      if (!link) return;
      if (e.isIntersecting) {
        rail.querySelectorAll('a[aria-current]').forEach(a => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-15% 0px -70% 0px' });
  body.querySelectorAll('.atlas-sec').forEach(s => io.observe(s));
}

/* The finder works at this depth too — navigation is reachable from every
   depth, per portfolio_as_experience. It fails quietly if the registry does not
   come back; the rest of the page does not depend on it. */
fetch(root + 'data/registry.json')
  .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
  .then(d => finder(d.projects || [], d.categories || [], root))
  .catch(() => {
    const btn = document.querySelector('.find');
    if (btn) { btn.disabled = true; btn.textContent = 'list unavailable'; }
  });

if (host) {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    missing('Nothing named here — nothing to show.');
  } else {
    fetch(root + 'data/projects/' + slug + '.json')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
      .then(p => { try { render(p); } catch (e) { console.error(e); missing('This one failed to render.'); } })
      .catch(() => missing('Nothing written up for “' + slug + '” yet.'));
  }
}
