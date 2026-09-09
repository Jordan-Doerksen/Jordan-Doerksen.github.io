/* finder.js — the third and last persistent cluster: primary_action.
   ---------------------------------------------------------------------------
   An overlay_layer per the bible's constraints: it traps focus while modal,
   always offers a close action, and never stacks on another overlay.

   It is an ACCELERATOR, not a route. Every destination it can reach is also
   reachable by scrolling the page and clicking a link, so the site still works
   with this script dead. If the registry never arrives, the button says so
   instead of opening an empty box. */

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function finder(projects, categories, root) {
  const btn = document.querySelector('.find');
  if (!btn) return;

  const hint = btn.querySelector('kbd');
  if (hint) hint.textContent = isMac ? '⌘K' : 'Ctrl K';

  const entries = [
    ...categories.map(c => ({
      name: c.name,
      meta: 'section · ' + c.num,
      href: root + c.slug + '/'
    })),
    ...projects.map(p => ({
      name: p.name || p.slug,
      meta: (p.category || '') + ' · ' + (p.status || ''),
      href: destination(p, root)
    })).filter(e => e.href)
  ];

  if (!entries.length) {
    btn.disabled = true;
    btn.textContent = 'list unavailable';
    return;
  }

  /* --- markup, built once, appended to <body> --- */
  const veil = document.createElement('div');
  veil.className = 'veil';
  veil.innerHTML =
    '<div class="finder" role="dialog" aria-modal="true" aria-label="Find a project">' +
      '<input type="search" autocomplete="off" spellcheck="false" placeholder="Find a project or section — Esc to close">' +
      '<ul role="listbox"></ul>' +
    '</div>';
  document.body.appendChild(veil);

  const input = veil.querySelector('input');
  const list = veil.querySelector('ul');
  let shown = [];
  let cursor = 0;
  let opener = null;

  function draw(q) {
    const needle = q.trim().toLowerCase();
    shown = needle
      ? entries.filter(e => (e.name + ' ' + e.meta).toLowerCase().includes(needle)).slice(0, 40)
      : entries.slice(0, 40);
    cursor = 0;
    list.textContent = '';
    if (!shown.length) {
      const empty = document.createElement('li');
      empty.className = 'f-empty';
      empty.textContent = 'nothing by that name';
      list.appendChild(empty);
      return;
    }
    shown.forEach((e, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === 0));
      const nm = document.createElement('span');
      nm.textContent = e.name;
      const mt = document.createElement('span');
      mt.className = 'f-meta';
      mt.textContent = e.meta;
      li.append(nm, mt);
      li.addEventListener('click', () => go(i));
      list.appendChild(li);
    });
  }

  function move(step) {
    if (!shown.length) return;
    const items = list.querySelectorAll('li[role="option"]');
    items[cursor].setAttribute('aria-selected', 'false');
    cursor = (cursor + step + shown.length) % shown.length;
    items[cursor].setAttribute('aria-selected', 'true');
    items[cursor].scrollIntoView({ block: 'nearest' });
  }

  function go(i) {
    const e = shown[i];
    if (e) location.href = e.href;
  }

  function open() {
    if (veil.classList.contains('open')) return;
    opener = document.activeElement;
    veil.classList.add('open');
    input.value = '';
    draw('');
    input.focus();
  }

  function close() {
    if (!veil.classList.contains('open')) return;
    veil.classList.remove('open');
    if (opener && opener.focus) opener.focus();
  }

  btn.addEventListener('click', open);
  veil.addEventListener('mousedown', e => { if (e.target === veil) close(); });
  input.addEventListener('input', () => draw(input.value));

  veil.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(cursor); }
    else if (e.key === 'Tab') { e.preventDefault(); input.focus(); }  /* trap */
  });

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); open(); }
    else if (k === '/' && !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) {
      e.preventDefault(); open();
    }
  });
}

/* Where a project card actually goes. Documented projects route to their atlas
   entry; the rest go to the live app or the repo. Nothing → null, and the
   caller renders an honest closed row instead of a dead link. */
export function destination(p, root) {
  if (p.tier === 'full' && p.slug) return root + 'atlas/?p=' + encodeURIComponent(p.slug);
  if (p.url) return p.url;
  if (p.repo) return p.repo;
  return null;
}
