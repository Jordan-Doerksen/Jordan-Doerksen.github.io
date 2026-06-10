// ==========================================================================
// TRIFORCE — the hidden door.
// Click the hero's three invisible hotspots in order:
//   top → bottom-left → bottom-right (Triforce geometry).
// Success opens the full-screen temple modal and renders data/oot-essay.md.
// Clicking the wrong spot, or waiting more than 4s between clicks, resets.
// ==========================================================================

import { setupModal } from '../modal.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP_TIMEOUT = 4000;

export function initTriforce() {
  const spots = [...document.querySelectorAll('.tri-spot')];
  const modalEl = document.getElementById('oot-modal');
  const contentEl = document.getElementById('oot-content');
  if (spots.length !== 3 || !modalEl || !contentEl) return;

  const modal = setupModal(modalEl);
  let progress = 0; // how many correct clicks so far
  let resetTimer = null;
  let essayLoaded = false;

  spots.forEach((spot) => {
    spot.addEventListener('click', (e) => {
      e.stopPropagation();
      const step = Number(spot.dataset.tri);

      if (step === progress + 1) {
        progress = step;
        clearTimeout(resetTimer);
        if (progress === 3) return unlock();
        resetTimer = setTimeout(() => (progress = 0), STEP_TIMEOUT);
      } else {
        progress = step === 1 ? 1 : 0; // a fresh click on spot 1 restarts the sequence
        clearTimeout(resetTimer);
        if (progress === 1) resetTimer = setTimeout(() => (progress = 0), STEP_TIMEOUT);
      }
    });
  });

  async function unlock() {
    progress = 0;
    chime();
    if (!essayLoaded) {
      try {
        const md = await (await fetch('data/oot-essay.md')).text();
        contentEl.innerHTML = renderMarkdown(md);
        essayLoaded = true;
      } catch {
        contentEl.innerHTML = '<p>The temple is sealed — <code>data/oot-essay.md</code> could not be loaded.</p>';
      }
    }
    modal.open();
  }

  // --- Soft two-note chime (created on user gesture, so browsers allow it) ---
  function chime() {
    if (reduced) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 0.02 + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.1 + i * 0.18);
        osc.connect(gain).connect(ac.destination);
        osc.start(ac.currentTime + i * 0.18);
        osc.stop(ac.currentTime + 1.3 + i * 0.18);
      });
    } catch { /* audio blocked — no problem */ }
  }

  // --- Ultra-faint shimmer on the hotspots after 30s of idling on the page ---
  if (!reduced) {
    let idleTimer = setTimeout(showHint, 30000);
    const resetIdle = () => {
      clearTimeout(idleTimer);
      spots.forEach((s) => s.classList.remove('tri-hint'));
      idleTimer = setTimeout(showHint, 30000);
    };
    function showHint() {
      spots.forEach((s) => s.classList.add('tri-hint'));
    }
    ['pointerdown', 'keydown', 'scroll'].forEach((ev) =>
      addEventListener(ev, resetIdle, { passive: true })
    );
  }
}

// --- Tiny markdown renderer: headings, bold/italic, blockquotes, lists, hr ---
function renderMarkdown(md) {
  const esc = (s) =>
    s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = md.split(/\r?\n/);
  const out = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line === '---') { flushPara(); flushList(); out.push('<hr />'); continue; }
    if (line.startsWith('### ')) { flushPara(); flushList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## '))  { flushPara(); flushList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# '))   { flushPara(); flushList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('> '))   { flushPara(); flushList(); out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`); continue; }
    if (line.startsWith('- '))   { flushPara(); list.push(line.slice(2)); continue; }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join('\n');
}
