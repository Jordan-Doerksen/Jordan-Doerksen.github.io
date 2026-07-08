/* search.js — Tool Desk: global live search + "/" shortcut + filter chips.
   Chips: scope (everything | mine | toolkit) — exclusive;
          status (registry statuses) — toggles, apply to Mine rows only;
          categories (from BOTH datasets) — toggles;
          ★ daily — pinned/starred rows only.
   A row shows only if it passes search text AND every active filter. */

const state = { q: '', scope: 'everything', statuses: new Set(), cats: new Set(), daily: false };

function chip(label, cls = '') {
  const el = document.createElement('span');
  el.className = 'chip' + (cls ? ' ' + cls : '');
  el.textContent = label;
  return el;
}

function sep() {
  const el = document.createElement('span');
  el.className = 'sep';
  el.textContent = '|';
  return el;
}

function rowVisible(tr) {
  const kind = tr.dataset.kind;
  if (state.scope !== 'everything' && kind !== state.scope) return false;
  if (state.statuses.size && (kind !== 'mine' || !state.statuses.has(tr.dataset.status))) return false;
  if (state.cats.size && !state.cats.has(tr.dataset.cat)) return false;
  if (state.daily && tr.dataset.star !== '1') return false;
  if (state.q && !tr.dataset.text.includes(state.q)) return false;
  return true;
}

function apply() {
  for (const table of document.querySelectorAll('#mine, #toolkit')) {
    let shown = 0;
    table.querySelectorAll('tbody tr:not(.empty)').forEach(tr => {
      const ok = rowVisible(tr);
      tr.hidden = !ok;
      if (ok) shown++;
    });
    table.querySelector('tr.empty').hidden = shown > 0;
  }
  // pins follow the search text only (they're shortcuts, not data rows)
  document.querySelectorAll('#pins .pin').forEach(p => {
    p.hidden = !!state.q && !p.textContent.toLowerCase().includes(state.q);
  });
}

export function initSearch(model) {
  const bar = document.getElementById('filters');

  // scope chips (exclusive)
  const scopes = [['everything', 'everything'], ['mine', 'mine'], ['toolkit', 'toolkit']];
  const scopeEls = scopes.map(([label, val]) => {
    const el = chip(label);
    if (val === state.scope) el.classList.add('on');
    el.addEventListener('click', () => {
      state.scope = val;
      scopeEls.forEach(e => e.classList.remove('on'));
      el.classList.add('on');
      apply();
    });
    bar.appendChild(el);
    return el;
  });

  bar.appendChild(sep());

  // status chips (from the data actually present, in table order)
  const statuses = [...new Set(model.mine.map(r => r.status))];
  statuses.forEach(s => {
    const el = chip(s);
    el.addEventListener('click', () => {
      el.classList.toggle('on') ? state.statuses.add(s) : state.statuses.delete(s);
      apply();
    });
    bar.appendChild(el);
  });

  bar.appendChild(sep());

  // category chips from BOTH datasets
  const cats = [...new Set([...model.registryCats, ...model.toolkitCats])];
  cats.forEach(c => {
    const el = chip(c);
    el.addEventListener('click', () => {
      el.classList.toggle('on') ? state.cats.add(c) : state.cats.delete(c);
      apply();
    });
    bar.appendChild(el);
  });

  // ★ daily
  const daily = chip('★ daily');
  daily.addEventListener('click', () => {
    state.daily = daily.classList.toggle('on');
    apply();
  });
  bar.appendChild(daily);

  // live search + "/" shortcut
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    state.q = q.value.trim().toLowerCase();
    apply();
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q &&
        !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      q.focus();
    }
    if (e.key === 'Escape' && document.activeElement === q) {
      q.value = ''; state.q = ''; apply(); q.blur();
    }
  });
}
