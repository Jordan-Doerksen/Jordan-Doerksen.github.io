// ==========================================================================
// EXAM — timed, exam conditions: N random aspects, a countdown, NO per-question
// feedback. Scored at the end against a study pass bar, then a full review
// report (each question, your answer, the correct one, the note). Records to
// progress like everything else. Mirrors the pressure of the real cert test.
// ==========================================================================

import { drawn } from './data.js';
import { makeQuestion, shuffle } from './quizgen.js';
import { drawSignal } from './signal.js';
import { get } from './data.js';
import { go } from './router.js';
import * as prog from './progress.js';
import { esc } from './util.js';

const PASS = 80;            // study pass bar (the app's target, not an official figure)
const SECS_PER_Q = 45;      // total time = questions × this

let E = null, timer = null;
function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function setup(view) {
  stopTimer();
  const max = drawn().length;
  const opts = [20, max].filter((n, idx, a) => n <= max && a.indexOf(n) === idx);
  view.innerHTML = `
    <section class="quiz-setup">
      <button class="back" data-back>← Home</button>
      <h1>Timed exam</h1>
      <p class="sub">Exam conditions: a countdown, no feedback until the end, scored against an ${PASS}% pass bar. ${SECS_PER_Q}s per question.</p>
      <div class="len-picker">
        ${opts.map((n) => `<button class="btn btn-primary len" data-len="${n}">${n === max && n !== 20 ? `Full exam — ${n}` : `${n}-question exam`}</button>`).join('')}
      </div>
    </section>`;
  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelectorAll('[data-len]').forEach((b) => b.addEventListener('click', () => begin(view, +b.getAttribute('data-len'))));
}

function begin(view, count) {
  const qs = shuffle(drawn()).slice(0, count).map(makeQuestion);
  E = { questions: qs, idx: 0, answers: {}, remaining: count * SECS_PER_Q };
  stopTimer();
  timer = setInterval(() => {
    const t = document.getElementById('exam-timer');
    if (!t) { stopTimer(); return; }           // navigated away
    E.remaining--;
    t.textContent = fmt(Math.max(0, E.remaining));
    t.classList.toggle('low', E.remaining <= 30);
    if (E.remaining <= 0) { stopTimer(); finish(view); }
  }, 1000);
  question(view);
}

function question(view) {
  const q = E.questions[E.idx];
  view.innerHTML = `
    <section class="quiz exam">
      <div class="quiz-top">
        <button class="back" data-quit>✕</button>
        <div class="quiz-bar"><span style="width:${(E.idx / E.questions.length) * 100}%"></span></div>
        <span class="quiz-score" id="exam-timer">${fmt(E.remaining)}</span>
      </div>
      <p class="quiz-ask">${E.idx + 1} of ${E.questions.length} — name this indication</p>
      <div class="quiz-art">${q.svg}</div>
      <div class="quiz-opts">
        ${q.options.map((o) => `<button class="opt" data-id="${esc(o.id)}">${esc(o.title)}</button>`).join('')}
      </div>
      <div class="exam-nav">
        ${E.idx > 0 ? `<button class="btn btn-ghost" data-prev>← Back</button>` : '<span></span>'}
        <button class="btn btn-primary" data-skip>${E.idx === E.questions.length - 1 ? 'Finish' : 'Skip →'}</button>
      </div>
    </section>`;

  view.querySelector('[data-quit]').addEventListener('click', () => { stopTimer(); go(''); });
  const prevBtn = view.querySelector('[data-prev]');
  if (prevBtn) prevBtn.addEventListener('click', () => { E.idx--; question(view); });
  view.querySelector('[data-skip]').addEventListener('click', () => advance(view));
  view.querySelectorAll('.opt').forEach((b) => {
    if (E.answers[E.idx] === b.getAttribute('data-id')) b.classList.add('is-chosen');
    b.addEventListener('click', () => { E.answers[E.idx] = b.getAttribute('data-id'); advance(view); });
  });
}

function advance(view) {
  if (E.idx >= E.questions.length - 1) finish(view); else { E.idx++; question(view); }
}

function finish(view) {
  stopTimer();
  let correct = 0;
  E.questions.forEach((q, idx) => {
    const right = E.answers[idx] === q.answerId;
    if (right) correct++;
    prog.record(q.answerId, right);
  });
  const pct = Math.round((correct / E.questions.length) * 100);
  const pass = pct >= PASS;
  view.innerHTML = `
    <section class="results">
      <button class="back" data-back>← Home</button>
      <div class="results-score ${pass ? 'good' : 'low'}">
        <span class="results-pct">${pct}%</span>
        <span class="results-sub">${correct} of ${E.questions.length} · ${pass ? `PASS (≥ ${PASS}%)` : `below ${PASS}% pass bar`}</span>
      </div>
      <h2>Review</h2>
      <ul class="exam-review">
        ${E.questions.map((q, idx) => {
          const ans = get(q.answerId), chosen = E.answers[idx] ? get(E.answers[idx]) : null;
          const right = E.answers[idx] === q.answerId;
          return `<li class="${right ? 'rev-ok' : 'rev-no'}">
            <div class="rev-art">${drawSignal(ans.aspect)}</div>
            <div class="rev-body">
              <p class="rev-head">${right ? '✓' : '✗'} <b>${esc(ans.title)}</b> <span class="feed-rule">${esc(ans.ref)}</span></p>
              ${right ? '' : `<p class="rev-you">You: ${chosen ? esc(chosen.title) : '<i>no answer</i>'}</p>`}
              <p class="rev-mean">${esc(ans.body)}</p>
            </div>
          </li>`;
        }).join('')}
      </ul>
      <div class="results-actions">
        <button class="btn btn-primary" data-again>New exam</button>
        <button class="btn btn-ghost" data-back2>Home</button>
      </div>
    </section>`;
  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelector('[data-back2]').addEventListener('click', () => go(''));
  view.querySelector('[data-again]').addEventListener('click', () => setup(view));
}

export function show(view) { setup(view); }
