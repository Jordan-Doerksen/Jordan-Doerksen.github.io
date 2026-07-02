// ==========================================================================
// ONBOARDING — first-run only (settings.onboardingDone). Three light cards,
// each with a live drawn signal so the value lands instantly. Always skippable.
// On finish it flags the setting and hands control back to the router (onDone).
// ==========================================================================

import { drawSignal } from './signal.js';
import * as store from './store.js';

const CARDS = [
  { art: drawSignal({ heads: ['G'], type: 'mast' }), h: 'Every CROR signal — drawn.', p: 'Not described in words — actually drawn, lamp for lamp, the way you read them on the rail.' },
  { art: drawSignal({ heads: ['Y', 'R'], type: 'mast' }), h: 'Learn them. Then prove it.', p: 'Browse and flip every aspect, then quiz yourself, build them from memory, and sit a timed exam.' },
  { art: drawSignal({ heads: ['R', 'R'], type: 'mast', stagger: true, plaque: 'R' }), h: 'Free, and yours to keep.', p: 'Built straight from the Jan 2025 CROR — no ads, no sign-up. Learn at your own pace and track your progress.' },
];

export function show(view, onDone) {
  let i = 0;
  const finish = () => { store.patch('settings', { onboardingDone: true }); onDone(); };

  function render() {
    const c = CARDS[i];
    view.innerHTML = `
      <section class="onb">
        <button class="onb-skip" data-skip>Skip</button>
        <div class="onb-card">
          <div class="onb-art" aria-hidden="true">${c.art}</div>
          <h1>${c.h}</h1>
          <p>${c.p}</p>
        </div>
        <div class="onb-dots">${CARDS.map((_, k) => `<span class="onb-dot${k === i ? ' is-on' : ''}"></span>`).join('')}</div>
        <button class="btn btn-primary onb-next" data-next>${i === CARDS.length - 1 ? 'Start' : 'Next'}</button>
      </section>`;
    view.querySelector('[data-skip]').addEventListener('click', finish);
    view.querySelector('[data-next]').addEventListener('click', () => { if (i === CARDS.length - 1) finish(); else { i++; render(); } });
  }
  render();
}
