// ==========================================================================
// LEARN — two ways to browse the full set:
//   • By indication — one flip-card per CROR indication (tap to flip, tap the
//     back to open detail). Detail shows EVERY hardware form of that indication.
//   • All variants  — a flat wall of every distinct drawn form (~68), each a
//     card; tap to open its indication's detail.
// Filter both by family. Mark known/learning feeds spaced-repetition progress.
// ==========================================================================

import { drawn, byFamily, familyCount, familyOf, FAMILIES, get, formsOf, allForms, formLabel } from './data.js';
import { drawSignal } from './signal.js';
import { go } from './router.js';
import * as prog from './progress.js';
import { esc } from './util.js';

const state = { family: 'all', mode: 'ind' };

function toggle() {
  return `<div class="learn-toggle">
    <button class="ltog${state.mode === 'ind' ? ' is-on' : ''}" data-mode="ind">By indication <span>${drawn().length}</span></button>
    <button class="ltog${state.mode === 'all' ? ' is-on' : ''}" data-mode="all">All variants <span>${allForms().length}</span></button>
  </div>`;
}

function filterBar() {
  const fams = [{ key: 'all', label: 'All' }, ...FAMILIES.filter((f) => familyCount(f.key))];
  return `<div class="filters">${fams.map((f) => {
    const n = f.key === 'all' ? drawn().length : familyCount(f.key);
    return `<button class="fchip${state.family === f.key ? ' is-on' : ''}" data-fam="${f.key}">${esc(f.label)} <span class="fn">${n}</span></button>`;
  }).join('')}</div>`;
}

function badge(id) { return prog.box(id) >= 5 ? '<span class="card-badge" title="Mastered">✓</span>' : ''; }

function indCard(a) {
  const nForms = formsOf(a).length;
  return `
    <button class="sig-card" data-id="${esc(a.id)}" aria-label="${esc(a.title)}">
      ${badge(a.id)}
      <span class="sig-inner">
        <span class="sig-face sig-front">
          <span class="sig-draw">${drawSignal(a.aspect)}</span>
          <span class="sig-rule">${esc(a.ref)}</span>
          ${nForms > 1 ? `<span class="form-count">${nForms} forms</span>` : ''}
        </span>
        <span class="sig-face sig-back">
          <span class="sig-name">${esc(a.title)}</span>
          <span class="sig-meaning">${esc(a.body)}</span>
          <span class="sig-rule sig-rule-back">tap again for detail →</span>
        </span>
      </span>
    </button>`;
}

function flatCard(f) {
  return `<button class="flat-card" data-id="${esc(f.rec.id)}" aria-label="${esc(f.rec.title)}">
    <span class="flat-draw">${drawSignal(f.spec)}</span>
    <span class="flat-rule">${esc(f.rec.ref)}</span>
    <span class="flat-tag">${esc(formLabel(f.spec))}</span>
  </button>`;
}

function grid(view) {
  const isAll = state.mode === 'all';
  const list = isAll ? allForms(state.family) : byFamily(state.family);
  view.innerHTML = `
    <div class="learn-head">
      <h1>Learn the signals</h1>
      <p class="sub">${isAll ? 'Every distinct form, drawn. Tap one to open its indication.' : 'One card per indication — tap to flip, tap the back for every form.'}</p>
    </div>
    ${toggle()}
    ${filterBar()}
    <p class="count">${list.length} ${isAll ? 'forms' : 'indications'}</p>
    <div class="${isAll ? 'flat-grid' : 'sig-grid'}">${(isAll ? list.map(flatCard) : list.map(indCard)).join('')}</div>`;

  view.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.getAttribute('data-mode'); grid(view); }));
  view.querySelectorAll('[data-fam]').forEach((b) => b.addEventListener('click', () => { state.family = b.getAttribute('data-fam'); grid(view); }));
  if (isAll) {
    view.querySelectorAll('.flat-card').forEach((c) => c.addEventListener('click', () => go('learn/' + c.getAttribute('data-id'))));
  } else {
    view.querySelectorAll('.sig-card').forEach((c) => c.addEventListener('click', () => {
      if (c.classList.contains('is-flipped')) go('learn/' + c.getAttribute('data-id'));
      else c.classList.add('is-flipped');
    }));
  }
}

function detail(view, id) {
  const seq = byFamily(state.family).some((a) => a.id === id) ? byFamily(state.family) : drawn();
  const i = seq.findIndex((a) => a.id === id);
  const a = seq[i] || get(id);
  if (!a) { go('learn'); return; }
  const fam = familyOf(a);
  const forms = formsOf(a);
  const known = prog.box(a.id) >= 5;
  const prev = seq[(i - 1 + seq.length) % seq.length];
  const next = seq[(i + 1) % seq.length];

  view.innerHTML = `
    <div class="detail">
      <button class="back" data-back>← All signals</button>
      <div class="detail-card">
        <div class="detail-art">${drawSignal(a.aspect)}</div>
        <div class="detail-body">
          <p class="detail-rule">${esc(a.ref)}</p>
          <h1 class="detail-name">${esc(a.title)}</h1>
          <p class="detail-meaning">${esc(a.body)}</p>
          ${a.detail ? `<p class="detail-note">${esc(a.detail)}</p>` : ''}
          <div class="detail-actions">
            <button class="btn ${known ? 'btn-ghost' : 'btn-primary'}" data-mark="${known ? '0' : '1'}">${known ? '✓ Known — mark as still learning' : 'I know this one'}</button>
            <button class="btn btn-ghost" data-go="drill/${fam}">Drill the ${esc((FAMILIES.find((f) => f.key === fam) || {}).label || 'family')} family</button>
          </div>
        </div>
      </div>

      ${forms.length > 1 ? `
      <div class="forms">
        <h2 class="forms-h">Every form it can take <span>${forms.length}</span></h2>
        <p class="forms-sub">The same indication, drawn the different ways it appears in the field.</p>
        <div class="forms-grid">
          ${forms.map((s, k) => `<div class="form-cell${k === 0 ? ' is-primary' : ''}">
            <span class="form-draw">${drawSignal(s)}</span>
            <span class="flat-tag">${esc(formLabel(s))}${k === 0 ? ' · primary' : ''}</span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="detail-nav">
        <button class="btn btn-ghost" data-go="learn/${esc(prev.id)}">← ${esc(prev.title)}</button>
        <button class="btn btn-ghost" data-go="learn/${esc(next.id)}">${esc(next.title)} →</button>
      </div>
    </div>`;

  view.querySelector('[data-back]').addEventListener('click', () => go('learn'));
  view.querySelector('[data-mark]').addEventListener('click', (e) => { prog.mark(a.id, e.currentTarget.getAttribute('data-mark') === '1'); detail(view, id); });
  view.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.getAttribute('data-go'))));
}

export function show(view, arg) {
  if (arg) detail(view, arg); else grid(view);
}
