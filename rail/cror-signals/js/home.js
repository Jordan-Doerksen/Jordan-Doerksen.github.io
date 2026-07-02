// ==========================================================================
// HOME — the hub. Honors the two-door framing: "Learn your signals" and
// "Take the quiz" as hero tiles, the rest of the suite below, plus a status
// strip (mastery + streak) and a "Today's review" callout when work is due.
// ==========================================================================

import { go } from './router.js';
import * as prog from './progress.js';
import { drawSignal } from './signal.js';
import { get } from './data.js';
import { esc } from './util.js';

// little glowing signal used as the home hero mark (Clear)
const HERO = drawSignal({ heads: ['G'], type: 'mast' });

function statusStrip() {
  const m = prog.masteredCount(), t = prog.total(), seen = prog.seenCount(), s = prog.streak();
  if (!seen) return `<p class="home-status home-status-new">New here? Start with <b>Learn your signals</b> — every CROR aspect, drawn.</p>`;
  return `<p class="home-status">
    <span><b>${m}</b> / ${t} aspects mastered</span>
    ${s > 0 ? `<span class="streak">🔥 ${s}-day streak</span>` : ''}
  </p>`;
}

function todayCallout() {
  const due = prog.dueIds().length;
  const weak = prog.weakFamily();
  if (due >= 1) return `<button class="home-review" data-go="quiz/review">📌 <b>${due}</b> aspect${due === 1 ? '' : 's'} due for review — drill them now</button>`;
  if (weak) return `<button class="home-review" data-go="drill/${weak.key}">🎯 Your weak spot: <b>${esc(weak.label)}</b> — drill this family</button>`;
  return '';
}

function tile(go_, cls, title, sub) {
  return `<button class="tile ${cls}" data-go="${go_}">
    <span class="tile-title">${esc(title)}</span>
    <span class="tile-sub">${esc(sub)}</span>
  </button>`;
}

export function show(view) {
  view.innerHTML = `
    <section class="home">
      <div class="home-hero">
        <div class="home-hero-art" aria-hidden="true">${HERO}</div>
        <div class="home-hero-copy">
          <h1>CROR <b>Signals</b></h1>
          <p>Every Canadian Rail Operating Rules signal — drawn. Learn them, then prove it.</p>
          ${statusStrip()}
        </div>
      </div>

      ${todayCallout()}

      <div class="doors">
        ${tile('learn', 'door door-learn', 'Learn your signals', 'Browse every aspect, drawn — flip for the meaning.')}
        ${tile('quiz', 'door door-quiz', 'Take the quiz', 'See a signal, name the indication. Instant feedback.')}
      </div>

      <h2 class="suite-h">More practice</h2>
      <div class="suite">
        ${tile('build', 'tile-sm', 'Build the aspect', 'Assemble the lamp stack from the name.')}
        ${tile('drill', 'tile-sm', 'Family drill', 'Focus one family at a time.')}
        ${tile('exam', 'tile-sm', 'Timed exam', '20 aspects, scored, pass bar.')}
        ${tile('progress', 'tile-sm', 'Progress', 'Mastery, streak, weak spots.')}
      </div>
    </section>`;

  view.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.getAttribute('data-go'))));
}
