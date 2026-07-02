// ==========================================================================
// QUIZ — "See it → name it" MCQ. A drawn signal + 4 plausible choices (from
// quizgen). Instant feedback: right = green pulse; wrong = reveal the correct
// indication + its teaching note. Running score, then an end card with the
// misses and a retry. Records every answer to spaced-repetition progress.
// Reused for Family drill (arg = family key) and Review (arg = 'review').
// ==========================================================================

import { buildQuiz, makeQuestion, shuffle } from './quizgen.js';
import { get, byFamily, FAMILIES } from './data.js';
import { go } from './router.js';
import * as prog from './progress.js';
import * as audio from './audio.js';
import { esc, reduced } from './util.js';

let S = null; // { questions, idx, answered, correct, missed[], scope, title }

function scopeTitle(arg) {
  if (arg === 'review') return 'Review — due aspects';
  const f = FAMILIES.find((x) => x.key === arg);
  return f ? `${f.label} drill` : 'Quiz — all families';
}

// ---- setup screen: pick a length ----
function setup(view, arg) {
  const isReview = arg === 'review';
  const max = isReview ? prog.dueIds().length || byFamily('all').length : byFamily(arg && FAMILIES.some((f) => f.key === arg) ? arg : 'all').length;
  const opts = [10, 20, max].filter((n, i, a) => n <= max && a.indexOf(n) === i);
  view.innerHTML = `
    <section class="quiz-setup">
      <button class="back" data-back>← Home</button>
      <h1>${esc(scopeTitle(arg))}</h1>
      <p class="sub">${isReview ? 'Drill the aspects your spaced-repetition schedule says are due.' : 'See a signal, name the indication. Wrong answers explain themselves.'}</p>
      <div class="len-picker">
        ${opts.map((n) => `<button class="btn btn-primary len" data-len="${n}">${n === max && n !== 10 && n !== 20 ? `All ${n}` : `${n} questions`}</button>`).join('')}
      </div>
    </section>`;
  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelectorAll('[data-len]').forEach((b) => b.addEventListener('click', () => begin(view, arg, +b.getAttribute('data-len'))));
}

function begin(view, arg, count) {
  let questions;
  if (arg === 'review') {
    const due = prog.dueIds().map(get).filter(Boolean);
    questions = shuffle(due).slice(0, count).map(makeQuestion);
    if (!questions.length) questions = buildQuiz({ family: 'all', count });
  } else {
    const family = FAMILIES.some((f) => f.key === arg) ? arg : 'all';
    // favour weaker aspects (lower Leitner box) so practice targets gaps
    questions = buildQuiz({ family, count, weight: (a) => 6 - prog.box(a.id) });
  }
  S = { questions, idx: 0, answered: false, correct: 0, missed: [], title: scopeTitle(arg), arg };
  question(view);
}

// ---- one question ----
function question(view) {
  const q = S.questions[S.idx];
  view.innerHTML = `
    <section class="quiz">
      <div class="quiz-top">
        <button class="back" data-quit>✕</button>
        <div class="quiz-bar"><span style="width:${(S.idx / S.questions.length) * 100}%"></span></div>
        <span class="quiz-score">${S.idx + 1}/${S.questions.length} · ${S.correct}✓</span>
      </div>
      <p class="quiz-ask">What is this indication?</p>
      <div class="quiz-art">${q.svg}</div>
      <div class="quiz-opts">
        ${q.options.map((o) => `<button class="opt" data-id="${esc(o.id)}">${esc(o.title)}</button>`).join('')}
      </div>
      <div class="quiz-feed" hidden></div>
      <button class="btn btn-primary quiz-next" data-next hidden>${S.idx === S.questions.length - 1 ? 'See results' : 'Next →'}</button>
    </section>`;

  view.querySelector('[data-quit]').addEventListener('click', () => go(''));
  view.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(view, b.getAttribute('data-id'))));
  view.querySelector('[data-next]').addEventListener('click', () => next(view));
}

function answer(view, chosenId) {
  if (S.answered) return;
  S.answered = true;
  const q = S.questions[S.idx];
  const correctAspect = get(q.answerId);
  const right = chosenId === q.answerId;
  if (right) S.correct++; else S.missed.push(q.answerId);
  prog.record(q.answerId, right);
  audio.cue(right);

  view.querySelectorAll('.opt').forEach((b) => {
    b.disabled = true;
    const id = b.getAttribute('data-id');
    if (id === q.answerId) b.classList.add('is-correct');
    else if (id === chosenId) b.classList.add('is-wrong');
  });
  if (right && !reduced) view.querySelector('.quiz-art').classList.add('pulse-ok');

  const feed = view.querySelector('.quiz-feed');
  feed.hidden = false;
  feed.classList.add(right ? 'feed-ok' : 'feed-no');
  feed.innerHTML = `
    <p class="feed-line">${right ? '✓ Correct' : '✗ Not quite'} — <b>${esc(correctAspect.title)}</b> <span class="feed-rule">(${esc(correctAspect.ref)})</span></p>
    <p class="feed-mean">${esc(correctAspect.body)}</p>
    ${correctAspect.detail ? `<p class="feed-note">${esc(correctAspect.detail)}</p>` : ''}`;
  const nxt = view.querySelector('[data-next]');
  nxt.hidden = false; nxt.focus();
}

function next(view) {
  S.idx++; S.answered = false;
  if (S.idx >= S.questions.length) results(view); else question(view);
}

// ---- results ----
function results(view) {
  const n = S.questions.length, pct = Math.round((S.correct / n) * 100);
  const missed = [...new Set(S.missed)].map(get).filter(Boolean);
  view.innerHTML = `
    <section class="results">
      <button class="back" data-back>← Home</button>
      <div class="results-score ${pct >= 80 ? 'good' : pct >= 60 ? 'ok' : 'low'}">
        <span class="results-pct">${pct}%</span>
        <span class="results-sub">${S.correct} of ${n} correct</span>
      </div>
      ${missed.length ? `
        <h2>Review your misses</h2>
        <ul class="miss-list">${missed.map((a) => `<li><b>${esc(a.title)}</b> <span class="feed-rule">${esc(a.ref)}</span><br><span class="miss-mean">${esc(a.body)}</span></li>`).join('')}</ul>
      ` : `<p class="results-clean">Clean sweep — every one correct. 🟢</p>`}
      <div class="results-actions">
        ${missed.length ? `<button class="btn btn-primary" data-retry>Retry the ${missed.length} you missed</button>` : ''}
        <button class="btn btn-ghost" data-again>New quiz</button>
        <button class="btn btn-ghost" data-back2>Home</button>
      </div>
    </section>`;

  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelector('[data-back2]').addEventListener('click', () => go(''));
  view.querySelector('[data-again]').addEventListener('click', () => go('quiz/' + (S.arg || '')));
  const retry = view.querySelector('[data-retry]');
  if (retry) retry.addEventListener('click', () => { S = { questions: shuffle(missed).map(makeQuestion), idx: 0, answered: false, correct: 0, missed: [], title: S.title, arg: S.arg }; question(view); });
}

export function show(view, arg) { setup(view, arg || ''); }
