// ==========================================================================
// REFERENCE — renders the list (search results, with a domain filter) and the
// entry detail. Every surface shows the TRUST chip + citation. Signal entries
// render their aspect via the SVG renderer, with a study notes block.
// ==========================================================================

import { get, all } from './data.js';
import { drawSignal } from './signal.js';

export const refState = { domain: 'all', topic: 'all' };

const DOMAIN_LABEL = { defs: 'Definitions', signals: 'Signals', switching: 'Switching', operating: 'Operating' };

// Curated topic chips, shown only for the active domain (progressive disclosure —
// never a wall). Each maps to one or more tags; chips with no matching entry are hidden.
const TOPICS = {
  defs: [
    { key: 'equipment', label: 'Equipment', tags: ['equipment'] },
    { key: 'track', label: 'Track & territory', tags: ['track', 'yard', 'grade'] },
    { key: 'control', label: 'Control systems', tags: ['control'] },
    { key: 'signals', label: 'Signals & blocks', tags: ['signals'] },
    { key: 'switches', label: 'Switches', tags: ['switch'] },
    { key: 'speed', label: 'Speeds', tags: ['speed'] },
    { key: 'roles', label: 'Roles & bulletins', tags: ['roles', 'bulletins', 'comms', 'operations'] },
  ],
  signals: [
    { key: 'clear', label: 'Clear', tags: ['clear'] },
    { key: 'medium', label: 'Medium', tags: ['medium'] },
    { key: 'limited', label: 'Limited', tags: ['limited'] },
    { key: 'diverging', label: 'Diverging', tags: ['diverging'] },
    { key: 'slow', label: 'Slow', tags: ['slow'] },
    { key: 'adv', label: 'Advance', tags: ['adv'] },
    { key: 'special', label: 'Special', tags: ['special'] },
    { key: 'description', label: 'Description', tags: ['description'] },
  ],
  switching: [
    { key: 'kicking', label: 'Kicking', tags: ['kicking'] },
    { key: 'securing', label: 'Securing', tags: ['securing', 'hand-brakes', 'air-brakes'] },
    { key: 'coupling', label: 'Coupling & shoving', tags: ['coupling', 'shoving', 'fouling'] },
  ],
  operating: [
    { key: 'control', label: 'Control systems', tags: ['ocs', 'ctc', 'abs', 'interlocking', 'scs', 'sct', 'clearance'] },
    { key: 'signals', label: 'Signals', tags: ['signals', 'lights'] },
    { key: 'comms', label: 'Communication', tags: ['radio', 'comms'] },
    { key: 'protection', label: 'Protection', tags: ['protection', 'flagging', 'emergency'] },
    { key: 'authority', label: 'Authority & movement', tags: ['authority', 'movement'] },
    { key: 'switching', label: 'Switching & securing', tags: ['switching', 'securing'] },
    { key: 'admin', label: 'Crews & admin', tags: ['crew', 'time', 'timetable', 'bulletins'] },
  ],
};
const topicTags = (domain, key) => (TOPICS[domain] || []).find((t) => t.key === key)?.tags || null;
const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const chip = (e) => {
  const cls = e.trust === 'rulebook' ? 't-rule' : e.trust === 'S.I.' ? 't-si' : 't-sme';
  const t = e.trust === 'rulebook' ? 'CROR rulebook text' : e.trust === 'S.I.' ? 'Special Instruction' : 'SME — verified firsthand';
  return `<span class="chip ${cls}" title="${esc(t)}">${esc(e.trust)}</span>`;
};
const tags = (e) => ((e.tags || []).length ? `<span class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>` : '');

function filterBar() {
  const counts = { all: all().length };
  for (const e of all()) counts[e.domain] = (counts[e.domain] || 0) + 1;
  const doms = ['all', ...Object.keys(DOMAIN_LABEL).filter((d) => counts[d])];
  const domainRow = `<div class="filters">${doms.map((d) => {
    const on = refState.domain === d ? ' is-on' : '';
    const label = d === 'all' ? 'All' : DOMAIN_LABEL[d];
    return `<button class="fchip${on}" data-domain="${d}">${esc(label)} <span class="fn">${counts[d] || 0}</span></button>`;
  }).join('')}</div>`;

  // contextual topic row — only for the active domain, only topics with entries
  const d = refState.domain;
  let topicRow = '';
  if (d !== 'all' && TOPICS[d]) {
    const domEntries = all().filter((e) => e.domain === d);
    const chips = TOPICS[d]
      .map((t) => ({ t, n: domEntries.filter((e) => (e.tags || []).some((x) => t.tags.includes(x))).length }))
      .filter((c) => c.n);
    if (chips.length) {
      topicRow = `<div class="subfilters"><span class="sf-label">topic</span>` +
        `<button class="sfchip${refState.topic === 'all' ? ' is-on' : ''}" data-topic="all">All</button>` +
        chips.map(({ t, n }) =>
          `<button class="sfchip${refState.topic === t.key ? ' is-on' : ''}" data-topic="${t.key}">${esc(t.label)} <span class="fn">${n}</span></button>`).join('') +
        `</div>`;
    }
  }
  return domainRow + topicRow;
}

export function renderList(view, results, q) {
  if (refState.domain !== 'all') results = results.filter((e) => e.domain === refState.domain);
  const tt = refState.domain !== 'all' && refState.topic !== 'all' ? topicTags(refState.domain, refState.topic) : null;
  if (tt) results = results.filter((e) => (e.tags || []).some((x) => tt.includes(x)));
  const scope = refState.domain === 'all' ? 'All entries'
    : DOMAIN_LABEL[refState.domain] + (refState.topic !== 'all'
      ? ' · ' + ((TOPICS[refState.domain] || []).find((t) => t.key === refState.topic)?.label || '') : '');
  view.innerHTML = `
    ${filterBar()}
    <div class="list-top">
      <p class="count">${results.length} ${results.length === 1 ? 'entry' : 'entries'}${q ? ` · “${esc(q)}”` : ''}</p>
      ${results.length ? `<button class="print-btn" data-print title="Print this selection as a cheat-sheet">⎙ Print cheat-sheet</button>` : ''}
    </div>
    <div class="print-head">CROR cheat-sheet — ${esc(scope)}${q ? ` · “${esc(q)}”` : ''} · ${results.length} ${results.length === 1 ? 'entry' : 'entries'} · study aid, not the official rulebook</div>
    ${refState.domain === 'switching' ? `<a class="xlink-note" href="/rail/switch-list/" target="_blank" rel="noopener">Practice these live in <b>Switch List</b>, the switching sim →</a>` : ''}
    <ul class="list">${results.map((e) => `
      <li><a class="card" href="#/e/${encodeURIComponent(e.id)}">
        <span class="card-head"><span class="card-title">${esc(e.title)}</span>${chip(e)}</span>
        <span class="card-ref">${esc(e.ref)}</span>
        <span class="card-body">${esc(e.body)}</span>
        ${tags(e)}
      </a></li>`).join('')}</ul>
    ${results.length === 0 ? '<p class="empty">No match. Try a rule number, a signal name, or a keyword.</p>' : ''}`;
}

export function renderEntry(view, id) {
  const e = get(id);
  if (!e) { view.innerHTML = `<p class="count">Not found. <a href="#/">← all entries</a></p>`; return; }
  const rel = (e.related || []).map(get).filter(Boolean);
  view.innerHTML = `
    <a class="back" href="#/">← all entries</a>
    <article class="entry">
      <header class="entry-head"><h1>${esc(e.title)}</h1>${chip(e)}</header>
      <p class="entry-ref"><span class="ref-num">${esc(e.ref)}</span><span class="src">${esc(e.source)}</span></p>
      ${e.aspect ? `<figure class="aspect">${drawSignal(e.aspect)}<figcaption>Aspect reproduced from a study source &amp; cross-checked vs the CROR — the rulebook governs.</figcaption></figure>` : ''}
      <p class="entry-body">${esc(e.body)}</p>
      ${e.detail ? `<div class="detail"><h2>Notes</h2><p>${esc(e.detail)}</p></div>` : ''}
      ${e.smeNote ? `<p class="sme"><b>SME</b> — ${esc(e.smeNote)}</p>` : ''}
      ${tags(e)}
      ${rel.length ? `<section class="related"><h2>Related</h2><ul>${rel.map((r) => `<li><a href="#/e/${encodeURIComponent(r.id)}"><span>${esc(r.title)}</span><span class="card-ref">${esc(r.ref)}</span></a></li>`).join('')}</ul></section>` : ''}
    </article>`;
}
