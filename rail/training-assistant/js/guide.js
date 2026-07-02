// ==========================================================================
// GUIDE — teaches the WORKFLOW, not the rules. A strategy framing (the 4-mode
// learning loop), a worked "a week with the assistant" example with deep links,
// a few sharp tips, and a launcher for the interactive tour. Entry count is
// read live so growing the content can't make this page stale.
// ==========================================================================

import { all } from './data.js';
import { startTour } from './tour.js';

// The tour walks the real UI via STABLE hooks (nav data-nav, button data-attrs).
const TOUR = [
  { title: 'The loop', body: 'Four modes, one cycle: learn it, find your gaps, lock it in, then prove it. Here\'s each stop.' },
  { hash: '#/', sel: '#q', title: '1 · Reference', body: 'Search any rule, signal, or definition. Every answer shows its CROR citation and a trust flag, so you know exactly how solid it is.' },
  { hash: '#/drills', sel: '[data-start]', title: '2 · Drills', body: 'Quiz yourself — flashcards, multiple choice, rule-number recall — scoped to a domain or tag. This is how you find what you don\'t actually know.' },
  { hash: '#/study', sel: '[data-study]', title: '3 · Study', body: 'One tap. Spaced repetition serves what you\'re about to forget plus a little new each time. Trust it daily instead of cramming.' },
  { hash: '#/study', sel: '[data-exam]', title: '4 · Mock exam', body: '30 questions across every domain, no peeking, 80% to pass — with a report of what to review. Prove you\'re ready.' },
  { hash: '#/progress', sel: '[data-nav="progress"]', title: 'Progress', body: 'Watch mastery climb by domain and see your weakest rules. The loop tightens around exactly what you keep missing.' },
];

export function startGuideTour() { startTour(TOUR); }

const step = (n, title, body, href, label) => `
  <li class="gd-step">
    <span class="gd-num">${n}</span>
    <div class="gd-step-b"><h3>${title}</h3><p>${body}</p>
      ${href ? `<a class="dbtn gd-go" href="${href}">${label}</a>` : ''}</div>
  </li>`;

export function renderGuide(view) {
  const count = all().length;
  view.innerHTML = `
    <div class="drill-setup gd">
      <h1 class="drill-h">How to use this</h1>
      <p class="drill-tag">A reference you can drill. ${count} CROR-cited entries and growing — the trick is the loop, not memorizing front to back.</p>

      <button class="dbtn dbtn-go gd-tour" data-tour-start>▶ Take the 1-minute tour</button>

      <div class="ds-group gd-loop">
        <span class="ds-label">The learning loop</span>
        <div class="gd-loop-grid">
          <div class="gd-mode"><b>Reference</b><span>learn it cold — search + read, cited</span></div>
          <div class="gd-arrow">→</div>
          <div class="gd-mode"><b>Drills</b><span>find your gaps — quiz, see what slips</span></div>
          <div class="gd-arrow">→</div>
          <div class="gd-mode"><b>Study</b><span>lock it in — spaced repetition, daily</span></div>
          <div class="gd-arrow">→</div>
          <div class="gd-mode"><b>Exam</b><span>prove it — scored mock, 80% to pass</span></div>
        </div>
      </div>

      <div class="ds-group">
        <span class="ds-label">A week with the assistant</span>
        <ol class="gd-steps">
          ${step('1', 'Skim a domain in Reference', 'Pick one area — say Signals — filter to it and read through it. Don\'t memorize; just meet the material and notice the citations.', '#/', 'Open Reference')}
          ${step('2', 'Drill it to find gaps', 'Run 10 questions scoped to that domain. The ones you miss are the point — they\'re now flagged as weak.', '#/drills', 'Try a drill')}
          ${step('3', 'Let Study schedule the rest', 'Each morning, tap Study now. Spaced repetition brings back what\'s fading and feeds in a little new. Five honest minutes beats an hour of cramming.', '#/study', 'Open Study')}
          ${step('4', 'Check Progress, then focus', 'See which domains lag. Before a shift or session, run a Focus weak spots drill on whatever\'s reddest.', '#/progress', 'See Progress')}
          ${step('5', 'Prove it with a mock exam', 'When the boxes are filling, take the 30-question exam. Pass it twice and you\'re genuinely ready, not just hopeful.', '#/study', 'Mock exam')}
        </ol>
      </div>

      <div class="ds-group">
        <span class="ds-label">Three things that make it work</span>
        <ul class="gd-tips">
          <li><b>Trust the boxes.</b> If nothing\'s due, you\'re done for the day — coming back tomorrow is the whole point of spaced repetition.</li>
          <li><b>Miss on purpose, early.</b> Drilling before you feel ready surfaces gaps faster than re-reading ever will.</li>
          <li><b>It\'s a study aid, not the rulebook.</b> Every entry is cited — when it counts, verify against the CROR itself.</li>
        </ul>
      </div>

      <div class="ds-group">
        <span class="ds-label">When you\'re ready, take it to the yard</span>
        <div class="gd-link-card">
          <div class="gd-link-b">
            <h3>Switch List — the switching sim</h3>
            <p>Read the yard, line the road, call PULL / SPOT / KICK. The companion sim where the switching rules you study here turn into muscle memory — every mechanic cites a CROR rule.</p>
          </div>
          <a class="dbtn dbtn-go gd-go" href="/rail/switch-list/" target="_blank" rel="noopener">Play the sim →</a>
        </div>
      </div>
    </div>`;

  view.querySelector('[data-tour-start]').onclick = startGuideTour;
}
