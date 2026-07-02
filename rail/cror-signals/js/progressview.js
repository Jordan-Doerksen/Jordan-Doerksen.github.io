// ==========================================================================
// PROGRESS VIEW — the dashboard for the spaced-repetition data in progress.js:
// mastery, streak, the Leitner box spread, per-family bars, and a reset.
// ==========================================================================

import { go } from './router.js';
import * as prog from './progress.js';
import { esc } from './util.js';

const BOX_LABEL = ['Unseen', 'Box 1', 'Box 2', 'Box 3', 'Box 4', 'Mastered'];

export function show(view) {
  const m = prog.masteredCount(), t = prog.total(), seen = prog.seenCount(), s = prog.streak();
  const dist = prog.distribution();
  const fams = prog.familyStats();
  const weak = prog.weakFamily();
  const maxFam = Math.max(1, ...fams.map((f) => f.total));

  view.innerHTML = `
    <section class="progress">
      <button class="back" data-back>← Home</button>
      <h1>Your progress</h1>

      <div class="prog-cards">
        <div class="prog-card"><span class="prog-big">${m}/${t}</span><span class="prog-lab">mastered</span></div>
        <div class="prog-card"><span class="prog-big">${seen}</span><span class="prog-lab">seen</span></div>
        <div class="prog-card"><span class="prog-big">${s}🔥</span><span class="prog-lab">day streak</span></div>
      </div>

      <h2>Leitner boxes</h2>
      <p class="sub">Right answers move an aspect up a box; wrong moves it down. Box 5 = mastered.</p>
      <div class="box-spread">
        ${dist.map((n, i) => `<div class="box-col">
          <span class="box-bar" style="height:${Math.round((n / Math.max(1, ...dist)) * 80) + 6}px" data-b="${i}"></span>
          <span class="box-n">${n}</span>
          <span class="box-l">${esc(BOX_LABEL[i])}</span>
        </div>`).join('')}
      </div>

      <h2>By family</h2>
      <div class="fam-bars">
        ${fams.map((f) => `<div class="fam-row${weak && weak.key === f.key ? ' is-weak' : ''}">
          <span class="fam-name">${esc(f.label)}${weak && weak.key === f.key ? ' · weak spot' : ''}</span>
          <span class="fam-track"><span class="fam-fill" style="width:${Math.round((f.mastered / f.total) * 100)}%"></span></span>
          <span class="fam-num">${f.mastered}/${f.total}</span>
        </div>`).join('')}
      </div>

      <div class="results-actions">
        ${weak ? `<button class="btn btn-primary" data-go="drill/${weak.key}">Drill your weak spot</button>` : `<button class="btn btn-primary" data-go="quiz">Take a quiz</button>`}
        <button class="btn btn-ghost" data-reset>Reset progress</button>
      </div>
    </section>`;

  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.getAttribute('data-go'))));
  view.querySelector('[data-reset]').addEventListener('click', () => {
    if (confirm('Reset all progress, streak, and mastery? This cannot be undone.')) { prog.resetAll(); show(view); }
  });
}
