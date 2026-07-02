// ==========================================================================
// PROGRESS VIEW (L3) — the "#/progress" page: overall mastery, a bar per
// domain, your weakest entries (linked to their cited reference), and a reset.
// Reads only the progress model; writes nothing.
// ==========================================================================

import { summary, reset, hasData } from './progress.js';

const DOMAIN_LABEL = { defs: 'Definitions', signals: 'Signals', switching: 'Switching', operating: 'Operating' };
const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (f) => Math.round(f * 100);

function bar(label, agg) {
  return `
    <div class="pg-row">
      <div class="pg-row-head"><span class="pg-name">${esc(label)}</span>
        <span class="pg-meta">${agg.seen}/${agg.total} seen · ${pct(agg.mastery)}%</span></div>
      <div class="pg-bar"><span style="width:${pct(agg.mastery)}%"></span></div>
    </div>`;
}

export function renderProgress(view) {
  if (!hasData()) {
    view.innerHTML = `
      <div class="drill-setup">
        <h1 class="drill-h">Progress</h1>
        <p class="drill-tag">Nothing tracked yet. Run a few <a class="dlink" href="#/drills">drills</a> and your
        mastery by domain — and the rules you keep missing — will show up here.</p>
      </div>`;
    return;
  }
  const { overall, domains, weakest } = summary();
  const b = overall.buckets;
  view.innerHTML = `
    <div class="drill-setup">
      <h1 class="drill-h">Progress</h1>
      <p class="drill-tag">${overall.seen} of ${overall.total} entries drilled · ${pct(overall.mastery)}% mastery on what you've seen.</p>

      <div class="pg-buckets">
        <span class="pg-pill pg-mastered">${b.mastered} mastered</span>
        <span class="pg-pill pg-strong">${b.strong} strong</span>
        <span class="pg-pill pg-learning">${b.learning} learning</span>
        <span class="pg-pill pg-weak">${b.weak} weak</span>
        <span class="pg-pill pg-unseen">${b.unseen} unseen</span>
      </div>

      <div class="ds-group">
        <span class="ds-label">By domain</span>
        ${Object.keys(DOMAIN_LABEL).filter((d) => domains[d]).map((d) => bar(DOMAIN_LABEL[d], domains[d])).join('')}
      </div>

      ${weakest.length ? `
        <section class="related">
          <h2>Weakest — review these</h2>
          <ul>${weakest.map(({ entry, rec }) => `
            <li><a href="#/e/${encodeURIComponent(entry.id)}">
              <span>${esc(entry.title)}</span>
              <span class="pg-tally">${rec.correct}✓ ${rec.wrong}✗</span>
              <span class="card-ref">${esc(entry.ref)}</span></a></li>`).join('')}</ul>
        </section>` : ''}

      <div class="ds-start">
        <a class="dbtn dbtn-go" href="#/drills">Drill weak spots</a>
        <button class="dbtn" data-reset>Reset progress</button>
      </div>
    </div>`;

  const rb = view.querySelector('[data-reset]');
  if (rb) rb.onclick = () => {
    if (rb.dataset.armed) { reset(); renderProgress(view); }
    else { rb.dataset.armed = '1'; rb.textContent = 'Tap again to wipe'; rb.classList.add('dbtn-miss'); }
  };
}
