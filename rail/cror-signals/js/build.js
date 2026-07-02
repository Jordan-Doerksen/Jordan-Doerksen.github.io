// ==========================================================================
// BUILD — the reverse quiz. Given an indication NAME, assemble the lamp stack:
// head count, each lamp (+flash), mast/dwarf, stagger, plate. Live preview via
// the same drawSignal() renderer; Check compares against the aspect's own spec
// (which is the answer key). The strongest mode for cementing the rules.
// ==========================================================================

import { drawn } from './data.js';
import { drawSignal } from './signal.js';
import { shuffle } from './quizgen.js';
import { go } from './router.js';
import * as prog from './progress.js';
import { esc } from './util.js';

const LAMPS = [['G', 'Green'], ['R', 'Red'], ['Y', 'Yellow'], ['L', 'Lunar'], ['D', 'Dark']];
const PLATES = [['', 'No plate'], ['DV', 'DV'], ['R', 'R'], ['L', 'L']];

let Q = null; // queue of target aspects
let i = 0, solved = 0;
let b = null; // current build: { heads:[{c,f}], type, stagger, plaque }

function freshBuild() { return { heads: [{ c: 'R', f: false }], type: 'mast', stagger: false, plaque: '' }; }
function spec(build) {
  return { heads: build.heads.map((h) => h.c + (h.f ? 'f' : '')), type: build.type, stagger: build.stagger, plaque: build.plaque || null };
}
function normalize(a) {
  return JSON.stringify({ heads: a.heads, type: a.type || 'mast', stagger: !!a.stagger, plaque: a.plaque || null });
}

function start(view) {
  Q = shuffle(drawn()); i = 0; solved = 0; b = freshBuild();
  render(view);
}

function render(view, feedback) {
  const target = Q[i];
  view.innerHTML = `
    <section class="build">
      <div class="quiz-top">
        <button class="back" data-quit>✕</button>
        <span class="quiz-score">Built ${solved}</span>
      </div>
      <p class="build-ask">Build this indication</p>
      <h1 class="build-name">${esc(target.title)}</h1>
      <p class="build-mean">${esc(target.body)}</p>

      <div class="build-stage">
        <div class="build-preview">${drawSignal(spec(b))}</div>
        <div class="build-controls">
          <div class="ctl-row"><span class="ctl-lab">Heads</span>
            ${[1, 2, 3].map((n) => `<button class="seg${b.heads.length === n ? ' is-on' : ''}" data-heads="${n}">${n}</button>`).join('')}
          </div>
          ${b.heads.map((h, hi) => `
            <div class="ctl-row ctl-head"><span class="ctl-lab">${hi + 1}</span>
              ${LAMPS.map(([c, name]) => `<button class="seg lamp-${c}${h.c === c ? ' is-on' : ''}" data-head="${hi}" data-lamp="${c}" title="${name}">${c}</button>`).join('')}
              <button class="seg flash${h.f ? ' is-on' : ''}" data-flash="${hi}" title="Flashing">⚡</button>
            </div>`).join('')}
          <div class="ctl-row"><span class="ctl-lab">Type</span>
            <button class="seg${b.type === 'mast' ? ' is-on' : ''}" data-type="mast">Mast</button>
            <button class="seg${b.type === 'dwarf' ? ' is-on' : ''}" data-type="dwarf">Dwarf</button>
            <button class="seg${b.stagger ? ' is-on' : ''}" data-stagger>Staggered</button>
          </div>
          <div class="ctl-row"><span class="ctl-lab">Plate</span>
            ${PLATES.map(([p, name]) => `<button class="seg${(b.plaque || '') === p ? ' is-on' : ''}" data-plaque="${p}">${name}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="quiz-feed ${feedback ? (feedback.ok ? 'feed-ok' : 'feed-no') : ''}" ${feedback ? '' : 'hidden'}>
        ${feedback ? `<p class="feed-line">${feedback.ok ? '✓ That\'s it' : '✗ Not yet'} — <b>${esc(target.title)}</b></p>
        ${feedback.ok ? (target.detail ? `<p class="feed-note">${esc(target.detail)}</p>` : '') : `<p class="feed-mean">Correct stack: ${esc(answerText(target))}</p>`}` : ''}
      </div>

      <div class="build-actions">
        ${feedback && feedback.ok ? `<button class="btn btn-primary" data-next>${i >= Q.length - 1 ? 'Done' : 'Next →'}</button>`
      : `<button class="btn btn-primary" data-check>Check</button>${feedback ? `<button class="btn btn-ghost" data-skip>Skip — show me</button>` : ''}`}
      </div>
    </section>`;

  const on = (sel, fn) => view.querySelectorAll(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
  view.querySelector('[data-quit]').addEventListener('click', () => go(''));
  on('[data-heads]', (el) => { const n = +el.getAttribute('data-heads'); while (b.heads.length < n) b.heads.push({ c: 'R', f: false }); b.heads.length = n; render(view); });
  on('[data-head]', (el) => { b.heads[+el.getAttribute('data-head')].c = el.getAttribute('data-lamp'); render(view); });
  on('[data-flash]', (el) => { const h = b.heads[+el.getAttribute('data-flash')]; h.f = !h.f; render(view); });
  on('[data-type]', (el) => { b.type = el.getAttribute('data-type'); render(view); });
  view.querySelectorAll('[data-stagger]').forEach((el) => el.addEventListener('click', () => { b.stagger = !b.stagger; render(view); }));
  on('[data-plaque]', (el) => { b.plaque = el.getAttribute('data-plaque'); render(view); });

  const check = view.querySelector('[data-check]');
  if (check) check.addEventListener('click', () => {
    const ok = normalize(spec(b)) === normalize(target.aspect);
    prog.record(target.id, ok);
    if (ok) solved++;
    render(view, { ok });
  });
  const skip = view.querySelector('[data-skip]');
  if (skip) skip.addEventListener('click', () => { b = { ...freshBuild(), ...JSON.parse(JSON.stringify({ heads: target.aspect.heads.map((s) => ({ c: s.replace('f', ''), f: s.endsWith('f') })), type: target.aspect.type || 'mast', stagger: !!target.aspect.stagger, plaque: target.aspect.plaque || '' })) }; render(view, { ok: true }); });
  const next = view.querySelector('[data-next]');
  if (next) next.addEventListener('click', () => { i++; b = freshBuild(); if (i >= Q.length) start(view); else render(view); });
}

function answerText(t) {
  const a = t.aspect;
  const heads = a.heads.map((h) => h.replace('f', h.endsWith('f') ? ' (flashing)' : '')).join(' over ');
  return `${heads}, ${a.type || 'mast'}${a.stagger ? ', staggered' : ''}${a.plaque ? `, ${a.plaque} plate` : ''}`;
}

export function show(view) { start(view); }
