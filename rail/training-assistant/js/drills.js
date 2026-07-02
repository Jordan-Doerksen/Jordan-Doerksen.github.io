// ==========================================================================
// DRILLS (L2) — quiz questions DERIVED from the same ENTRIES (single source,
// zero duplicate content). Three formats: flashcard recall (self-graded),
// multiple choice (auto), and rule-number match (auto). Scope a session by
// domain + tag. No persistence yet — L3 adds progress/gap tracking.
// ==========================================================================

import { all, get } from './data.js';
import { record, orderByWeakness, weakSpots } from './progress.js';

const DOMAIN_LABEL = { defs: 'Definitions', signals: 'Signals', switching: 'Switching', operating: 'Operating' };
const FORMATS = {
  flashcard: 'Flashcard recall',
  mcq: 'Multiple choice',
  rulenum: 'Rule-number match',
};
const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const refNum = (e) => { const m = (e.ref || '').match(/CROR\s+([0-9][0-9.]*(?:\([a-z0-9]+\))?)/i); return m ? m[1] : null; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const state = {
  screen: 'setup',
  formats: new Set(['flashcard', 'mcq', 'rulenum']),
  domain: 'all', tag: 'all', count: 10, focus: false,
  queue: [], i: 0, results: [], revealed: false, picked: null,
  mode: 'manual', exam: false, label: '',           // mode: manual | study | exam
};
const PASS = 0.8;

let host = null;

// ----- the working pool for the current setup selections -----
function pool() {
  let p = all();
  if (state.domain !== 'all') p = p.filter((e) => e.domain === state.domain);
  if (state.tag !== 'all') p = p.filter((e) => (e.tags || []).includes(state.tag));
  return p;
}
function tagsFor() {
  let p = all();
  if (state.domain !== 'all') p = p.filter((e) => e.domain === state.domain);
  return [...new Set(p.flatMap((e) => e.tags || []))].sort();
}

// ----- question construction -----
function distractors(e, n) {
  const sameDom = all().filter((x) => x.domain === e.domain && x.id !== e.id && x.title !== e.title);
  let picks = shuffle(sameDom).slice(0, n);
  if (picks.length < n) {                                  // top up from the whole corpus if a domain is thin
    const more = shuffle(all().filter((x) => x.id !== e.id && !picks.includes(x) && x.title !== e.title));
    picks = picks.concat(more).slice(0, n);
  }
  return picks;
}
function makeQuestion(e, formats) {
  // pick a format that actually fits this entry
  const fit = formats.filter((f) => f !== 'rulenum' || refNum(e));
  const type = fit[Math.floor(Math.random() * fit.length)] || 'flashcard';
  if (type === 'flashcard') {
    return { type, id: e.id, front: `${e.title}`, sub: e.ref, back: e.body };
  }
  const opts = shuffle([e, ...distractors(e, 3)]);
  if (type === 'rulenum') {
    return { type, id: e.id, stem: `CROR ${refNum(e)}`, lead: 'Which rule is this?',
      options: opts.map((o) => ({ id: o.id, label: o.title })) };
  }
  // mcq: show the meaning / body, pick the rule or term
  return { type, id: e.id, stem: e.body, lead: 'Which one is this?',
    options: opts.map((o) => ({ id: o.id, label: o.title, sub: o.ref })) };
}
function build() {
  const formats = [...state.formats];
  if (!formats.length) formats.push('flashcard');
  const src = state.focus ? orderByWeakness(pool()) : shuffle(pool());
  const take = state.count === 0 ? src.length : Math.min(state.count, src.length);
  state.mode = 'manual'; state.exam = false; state.label = '';
  state.queue = src.slice(0, take).map((e) => makeQuestion(e, formats));
  state.i = 0; state.results = []; state.revealed = false; state.picked = null;
}

// build + start a session from an externally chosen entry list (study / exam).
export function runEntries(view, entries, opts = {}) {
  host = view;
  const formats = opts.formats || ['flashcard', 'mcq', 'rulenum'];
  state.mode = opts.mode || 'study';
  state.exam = !!opts.exam;
  state.label = opts.label || '';
  state.queue = entries.map((e) => makeQuestion(e, formats));
  state.i = 0; state.results = []; state.revealed = false; state.picked = null;
  state.screen = entries.length ? 'run' : 'setup';
  render();
}

// ----- rendering -----
function render() {
  if (!host) return;
  if (state.screen === 'setup') host.innerHTML = setupHTML();
  else if (state.screen === 'run') host.innerHTML = runHTML();
  else host.innerHTML = doneHTML();
  wire();
}

function weakPanelHTML() {
  const w = weakSpots(5);
  if (!w.length) return '';
  return `
    <div class="ds-weak">
      <span class="ds-label">You keep missing</span>
      <ul class="ds-weak-list">${w.map((e) =>
        `<li><a href="#/e/${encodeURIComponent(e.id)}"><span>${esc(e.title)}</span><span class="card-ref">${esc(e.ref)}</span></a></li>`).join('')}</ul>
    </div>`;
}

function setupHTML() {
  const doms = ['all', ...Object.keys(DOMAIN_LABEL).filter((d) => all().some((e) => e.domain === d))];
  const tagList = tagsFor();
  const n = pool().length;
  return `
    <div class="drill-setup">
      <h1 class="drill-h">Drills</h1>
      <p class="drill-tag">Questions are generated straight from the reference — every answer links back to its cited entry.</p>

      <div class="ds-group">
        <span class="ds-label">Formats</span>
        <div class="ds-chips">${Object.entries(FORMATS).map(([k, v]) =>
          `<button class="dchip${state.formats.has(k) ? ' is-on' : ''}" data-fmt="${k}">${esc(v)}</button>`).join('')}</div>
      </div>

      <div class="ds-group">
        <span class="ds-label">Domain</span>
        <div class="ds-chips">${doms.map((d) =>
          `<button class="dchip${state.domain === d ? ' is-on' : ''}" data-ddom="${d}">${d === 'all' ? 'All' : DOMAIN_LABEL[d]}</button>`).join('')}</div>
      </div>

      <div class="ds-group">
        <span class="ds-label">Tag</span>
        <select class="ds-select" data-dtag>
          <option value="all"${state.tag === 'all' ? ' selected' : ''}>Any tag</option>
          ${tagList.map((t) => `<option value="${esc(t)}"${state.tag === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
      </div>

      <div class="ds-group">
        <span class="ds-label">Length</span>
        <div class="ds-chips">${[10, 20, 0].map((c) =>
          `<button class="dchip${state.count === c ? ' is-on' : ''}" data-dcount="${c}">${c === 0 ? 'All' : c}</button>`).join('')}</div>
      </div>

      <div class="ds-group">
        <span class="ds-label">Order</span>
        <div class="ds-chips">
          <button class="dchip${!state.focus ? ' is-on' : ''}" data-dfocus="0">Shuffle</button>
          <button class="dchip${state.focus ? ' is-on' : ''}" data-dfocus="1">Focus weak spots</button>
        </div>
      </div>

      ${weakPanelHTML()}

      <div class="ds-start">
        <button class="dbtn dbtn-go" data-start ${n === 0 ? 'disabled' : ''}>Start · ${state.count === 0 ? n : Math.min(state.count, n)} question${(state.count === 0 ? n : Math.min(state.count, n)) === 1 ? '' : 's'}</button>
        <span class="ds-pool">${n} entr${n === 1 ? 'y' : 'ies'} in scope</span>
      </div>
    </div>`;
}

function runHTML() {
  const q = state.queue[state.i];
  const backLink = state.mode === 'manual'
    ? `<a class="back" href="#/drills" data-quit>← drills</a>`
    : `<a class="back" href="#/study">← ${esc(state.label || 'study')}</a>`;
  const head = `
    <div class="drill-top">
      ${backLink}
      <div class="drill-prog"><span>${state.i + 1} / ${state.queue.length}</span>
        ${state.exam ? '' : `<span class="drill-score">${state.results.filter((r) => r.correct).length} correct</span>`}</div>
    </div>
    <div class="drill-bar"><span style="width:${(state.i / state.queue.length) * 100}%"></span></div>`;

  if (q.type === 'flashcard') {
    return `${head}
      <div class="card-q">
        <span class="q-kind">Recall</span>
        <h2 class="q-front">${esc(q.front)}</h2>
        <p class="q-sub">${esc(q.sub)}</p>
        ${state.revealed
          ? `<div class="q-back">${esc(q.back)}</div>
             <div class="q-grade"><button class="dbtn dbtn-miss" data-grade="0">Missed it</button>
               <button class="dbtn dbtn-got" data-grade="1">Got it</button></div>`
          : `<button class="dbtn dbtn-reveal" data-reveal>Show answer</button>`}
      </div>`;
  }
  // mcq / rulenum
  const kind = q.type === 'rulenum' ? 'Rule number' : 'Multiple choice';
  return `${head}
    <div class="card-q">
      <span class="q-kind">${kind}</span>
      <p class="q-lead">${esc(q.lead)}</p>
      <div class="q-stem${q.type === 'rulenum' ? ' q-stem-num' : ''}">${esc(q.stem)}</div>
      <div class="q-opts">${q.options.map((o) => {
        let cls = 'q-opt';
        if (state.picked) {
          if (o.id === q.id) cls += ' is-correct';
          else if (o.id === state.picked) cls += ' is-wrong';
          else cls += ' is-dim';
        }
        return `<button class="${cls}" data-pick="${esc(o.id)}"${state.picked ? ' disabled' : ''}>
          <span class="q-opt-label">${esc(o.label)}</span>${o.sub ? `<span class="card-ref">${esc(o.sub)}</span>` : ''}</button>`;
      }).join('')}</div>
      ${state.picked ? `<div class="q-next"><a class="dlink" href="#/e/${encodeURIComponent(q.id)}">Open this entry →</a>
        <button class="dbtn dbtn-go" data-next>${state.i + 1 < state.queue.length ? 'Next' : 'See results'}</button></div>` : ''}
    </div>`;
}

function doneHTML() {
  const correct = state.results.filter((r) => r.correct).length;
  const total = state.results.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const missed = state.results.filter((r) => !r.correct).map((r) => get(r.id)).filter(Boolean);
  const passed = pct >= PASS * 100;
  const banner = state.exam
    ? `<div class="exam-result ${passed ? 'is-pass' : 'is-fail'}">${passed ? 'PASS' : 'NOT YET'}
         <span>${Math.round(PASS * 100)}% to pass</span></div>`
    : '';
  const buttons = state.mode === 'manual'
    ? `<button class="dbtn dbtn-go" data-again>Run again</button><button class="dbtn" data-new>New quiz</button>`
    : `<a class="dbtn dbtn-go" href="#/study">Back to study</a>`;
  return `
    <div class="drill-done">
      ${banner}
      <h1 class="drill-h">${correct} / ${total}</h1>
      <p class="drill-tag">${pct}% · ${state.exam ? (passed ? 'ready.' : 'keep drilling the gaps below.') : (pct >= 80 ? 'sharp.' : pct >= 50 ? 'getting there.' : 'worth another pass.')}</p>
      ${missed.length ? `
        <section class="related">
          <h2>Review these (${missed.length})</h2>
          <ul>${missed.map((e) => `<li><a href="#/e/${encodeURIComponent(e.id)}"><span>${esc(e.title)}</span><span class="card-ref">${esc(e.ref)}</span></a></li>`).join('')}</ul>
        </section>` : `<p class="drill-clean">No misses. Nothing to review.</p>`}
      <div class="ds-start">${buttons}</div>
    </div>`;
}

// ----- interactions (re-bound every render; nodes are replaced each step) -----
function answer(correct, picked) {
  const id = state.queue[state.i].id;
  state.results.push({ id, correct, type: state.queue[state.i].type });
  record(id, correct);                                    // persist to the progress model (L3)
  if (picked !== undefined) state.picked = picked;
}
function advance() {
  state.i++; state.revealed = false; state.picked = null;
  if (state.i >= state.queue.length) state.screen = 'done';
  render();
}
function wire() {
  const $ = (s) => host.querySelector(s);
  const $$ = (s) => [...host.querySelectorAll(s)];

  // setup
  $$('[data-fmt]').forEach((b) => b.onclick = () => {
    const k = b.dataset.fmt;
    if (state.formats.has(k)) { if (state.formats.size > 1) state.formats.delete(k); } else state.formats.add(k);
    render();
  });
  $$('[data-ddom]').forEach((b) => b.onclick = () => { state.domain = b.dataset.ddom; state.tag = 'all'; render(); });
  const sel = $('[data-dtag]'); if (sel) sel.onchange = () => { state.tag = sel.value; render(); };
  $$('[data-dcount]').forEach((b) => b.onclick = () => { state.count = +b.dataset.dcount; render(); });
  $$('[data-dfocus]').forEach((b) => b.onclick = () => { state.focus = b.dataset.dfocus === '1'; render(); });
  const start = $('[data-start]'); if (start) start.onclick = () => { build(); state.screen = 'run'; render(); };

  // run — flashcard
  const rv = $('[data-reveal]'); if (rv) rv.onclick = () => { state.revealed = true; render(); };
  $$('[data-grade]').forEach((b) => b.onclick = () => { answer(b.dataset.grade === '1'); advance(); });

  // run — mcq / rulenum
  $$('[data-pick]').forEach((b) => b.onclick = () => {
    const q = state.queue[state.i];
    answer(b.dataset.pick === q.id, b.dataset.pick);
    render();
  });
  const nx = $('[data-next]'); if (nx) nx.onclick = advance;
  const quit = $('[data-quit]'); if (quit) quit.onclick = (e) => { e.preventDefault(); state.screen = 'setup'; render(); };

  // done
  const again = $('[data-again]'); if (again) again.onclick = () => { build(); state.screen = 'run'; render(); };
  const nw = $('[data-new]'); if (nw) nw.onclick = () => { state.screen = 'setup'; render(); };
}

// ----- entry point (called by the router) -----
export function renderDrills(view) {
  host = view;
  // entering via the nav always lands on setup; only an active run is resumed.
  if (!(state.screen === 'run' && state.queue.length && state.i < state.queue.length)) state.screen = 'setup';
  render();
}
