// ==========================================================================
// DRILL — family picker. Choose a family, then the quiz engine runs scoped to
// it (route → quiz/<familyKey>). Shows per-family mastery so you can see where
// to spend time. arg pre-selects nothing; the picker just routes into quiz.js.
// ==========================================================================

import { FAMILIES, familyCount } from './data.js';
import { go } from './router.js';
import * as prog from './progress.js';
import { esc } from './util.js';

export function show(view) {
  const stats = prog.familyStats();
  view.innerHTML = `
    <section class="drill">
      <button class="back" data-back>← Home</button>
      <h1>Family drill</h1>
      <p class="sub">Pick a family to drill. Names follow the rulebook's teaching order.</p>
      <div class="drill-grid">
        ${FAMILIES.filter((f) => familyCount(f.key)).map((f) => {
          const s = stats.find((x) => x.key === f.key) || { mastered: 0, total: familyCount(f.key) };
          const pct = Math.round((s.mastered / s.total) * 100);
          return `<button class="drill-tile" data-fam="${f.key}">
            <span class="drill-name">${esc(f.label)}</span>
            <span class="drill-meta">${s.mastered}/${s.total} mastered</span>
            <span class="drill-bar"><span style="width:${pct}%"></span></span>
          </button>`;
        }).join('')}
      </div>
    </section>`;
  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelectorAll('[data-fam]').forEach((b) => b.addEventListener('click', () => go('quiz/' + b.getAttribute('data-fam'))));
}
