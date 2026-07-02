// ==========================================================================
// STUDY (L4) — the adaptive home: "study next" off the spaced-repetition
// scheduler, plus a scored mock exam. One tap builds the right session and
// hands it to the drill runner. Reads the progress model; the runner writes
// results back, which reschedules everything for next time.
// ==========================================================================

import { all } from './data.js';
import { studyStats, studyQueue } from './progress.js';
import { runEntries } from './drills.js';

const EXAM_N = 30;
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtSoon = (ms) => {
  if (!isFinite(ms)) return null;
  const d = Math.max(0, ms - Date.now());
  if (d < 3600000) return 'within the hour';
  if (d < 86400000) return `in ${Math.round(d / 3600000)} h`;
  return `in ${Math.round(d / 86400000)} d`;
};

// coverage-aware exam: round-robin across domains so every area is represented,
// auto-graded formats only (no self-graded flashcards in a scored exam).
function examSet(n = EXAM_N) {
  const byDom = {};
  for (const e of all()) (byDom[e.domain] ||= []).push(e);
  const piles = Object.values(byDom).map((p) => shuffle(p));
  const out = [];
  let progress = true;
  while (out.length < n && progress) {
    progress = false;
    for (const pile of piles) { if (out.length >= n) break; if (pile.length) { out.push(pile.pop()); progress = true; } }
  }
  return shuffle(out);
}

export function renderStudy(view) {
  const s = studyStats();
  const seen = s.total - s.fresh;
  const ready = s.due > 0 || s.fresh > 0;
  const soon = fmtSoon(s.soonest);

  view.innerHTML = `
    <div class="drill-setup">
      <h1 class="drill-h">Study</h1>
      <p class="drill-tag">Spaced repetition picks what you're about to forget and folds in new material — one tap builds the session.</p>

      <div class="study-counts">
        <div class="sc-cell sc-due"><span class="sc-n">${s.due}</span><span class="sc-l">due now</span></div>
        <div class="sc-cell sc-new"><span class="sc-n">${s.fresh}</span><span class="sc-l">new</span></div>
        <div class="sc-cell"><span class="sc-n">${seen}</span><span class="sc-l">in rotation</span></div>
      </div>

      <div class="ds-start">
        ${ready
          ? `<button class="dbtn dbtn-go" data-study>Study now · ${Math.min(15, s.due + s.fresh)} cards</button>`
          : `<button class="dbtn" disabled>All caught up${soon ? ` · next review ${soon}` : ''}</button>`}
        <button class="dbtn" data-exam>Mock exam · ${EXAM_N} Q</button>
      </div>

      <div class="study-exam-note">
        The <b>mock exam</b> is ${EXAM_N} auto-graded questions across every domain, no peeking —
        ${Math.round(0.8 * 100)}% to pass, with a report of what to review.
      </div>
    </div>`;

  const study = view.querySelector('[data-study]');
  if (study) study.onclick = () => runEntries(view, studyQueue(15), { mode: 'study', label: 'study' });
  view.querySelector('[data-exam]').onclick = () =>
    runEntries(view, examSet(), { mode: 'exam', exam: true, label: 'exam', formats: ['mcq', 'rulenum'] });
}
