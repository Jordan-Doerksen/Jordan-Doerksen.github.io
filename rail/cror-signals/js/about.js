// ==========================================================================
// ABOUT / SETTINGS — the disclaimer + correctness statement, the sound toggle,
// a reduced-motion note, the tip link, and reset. No data ever leaves the device.
// ==========================================================================

import { go } from './router.js';
import * as store from './store.js';
import * as prog from './progress.js';

const TIP_URL = 'https://ko-fi.com/'; // TODO: Jordan's real Ko-fi / Buy-me-a-coffee handle before launch

export function show(view) {
  const sound = !!store.get('settings').sound;
  view.innerHTML = `
    <section class="about">
      <button class="back" data-back>← Home</button>
      <h1>About &amp; settings</h1>

      <div class="about-block">
        <h2>About CROR Signals</h2>
        <p>An independent study aid — <b>not affiliated with or endorsed by CN</b> or any railway. Every
        indication is drawn from the <b>January 28, 2025 CROR</b>, with names and meanings from the rulebook
        text. (No “A” plate — that’s US practice; Canada uses DV, R, and L.)</p>
      </div>

      <div class="about-block">
        <h2>Settings</h2>
        <label class="setting-row"><span>Sound effects <small>(quiz feedback)</small></span>
          <button class="toggle${sound ? ' is-on' : ''}" data-sound role="switch" aria-checked="${sound}"><span></span></button>
        </label>
        <p class="setting-note">Animations automatically follow your device’s “reduce motion” setting.</p>
        <button class="btn btn-ghost" data-reset>Reset all progress</button>
      </div>

      <div class="about-block">
        <h2>Free — and staying free</h2>
        <p>No ads, no accounts, no tracking. If it helped you pass, you can drop a tip — never required.</p>
        <a class="btn btn-primary" href="${TIP_URL}" target="_blank" rel="noopener">☕ Buy me a coffee</a>
      </div>

      <p class="about-ver">CROR Signals · v1.0 · all data stays on your device</p>
    </section>`;

  view.querySelector('[data-back]').addEventListener('click', () => go(''));
  view.querySelector('[data-sound]').addEventListener('click', (e) => {
    const on = !store.get('settings').sound;
    store.patch('settings', { sound: on });
    const t = e.currentTarget; t.classList.toggle('is-on', on); t.setAttribute('aria-checked', on);
  });
  view.querySelector('[data-reset]').addEventListener('click', () => {
    if (confirm('Reset all progress, streak, and mastery? This cannot be undone.')) { prog.resetAll(); go(''); }
  });
}
