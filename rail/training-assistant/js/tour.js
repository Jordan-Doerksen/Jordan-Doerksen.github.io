// ==========================================================================
// TOUR — a lightweight guided walkthrough. Each step optionally navigates to a
// hash, then spotlights an element (by a STABLE selector) and shows a tooltip.
// Built to degrade gracefully: a missing element just centers the tooltip, so
// cosmetic UI changes can't hard-break the tour.
// ==========================================================================

let steps = [], idx = 0, els = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function startTour(s) {
  steps = s || []; idx = 0;
  if (!steps.length) return;
  build();
  show();
}

function build() {
  if (els.root) return;
  const root = document.createElement('div');
  root.className = 'tour-root';
  root.innerHTML = `
    <div class="tour-backdrop"></div>
    <div class="tour-spot" hidden></div>
    <div class="tour-pop" role="dialog" aria-modal="true">
      <span class="tour-step"></span>
      <h3 class="tour-title"></h3>
      <p class="tour-body"></p>
      <div class="tour-ctrl">
        <button class="tour-skip" type="button">Skip</button>
        <span class="tour-grow"></span>
        <button class="tour-prev" type="button">Back</button>
        <button class="tour-next dbtn-go" type="button">Next</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  els = {
    root, backdrop: root.querySelector('.tour-backdrop'), spot: root.querySelector('.tour-spot'),
    pop: root.querySelector('.tour-pop'), step: root.querySelector('.tour-step'),
    title: root.querySelector('.tour-title'), body: root.querySelector('.tour-body'),
    prev: root.querySelector('.tour-prev'), next: root.querySelector('.tour-next'), skip: root.querySelector('.tour-skip'),
  };
  els.skip.onclick = end;
  els.prev.onclick = () => { if (idx > 0) { idx--; show(); } };
  els.next.onclick = () => { if (idx < steps.length - 1) { idx++; show(); } else end(); };
  addEventListener('keydown', onKey);
  addEventListener('resize', position);
}

function onKey(e) {
  if (!els.root) return;
  if (e.key === 'Escape') end();
  else if (e.key === 'ArrowRight') els.next.click();
  else if (e.key === 'ArrowLeft') els.prev.click();
}

async function show() {
  const s = steps[idx];
  if (s.hash !== undefined && location.hash !== s.hash) { location.hash = s.hash; await wait(200); }
  els.step.textContent = `${idx + 1} of ${steps.length}`;
  els.title.textContent = s.title;
  els.body.textContent = s.body;
  els.prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
  els.next.textContent = idx === steps.length - 1 ? 'Got it' : 'Next';
  position();
  els.next.focus();                                        // keyboard lands on the primary action
}

function position() {
  if (!els.root) return;
  const s = steps[idx];
  const t = s.sel ? document.querySelector(s.sel) : null;
  if (t) {
    t.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = t.getBoundingClientRect(), pad = 6;
    els.spot.hidden = false;
    Object.assign(els.spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    els.pop.classList.remove('tour-center');
    const popW = Math.min(360, innerWidth - 24), popH = els.pop.offsetHeight || 180;
    const below = r.bottom + 14;
    els.pop.style.top = (innerHeight - r.bottom > popH + 24) ? `${below}px` : `${Math.max(12, r.top - popH - 14)}px`;
    els.pop.style.left = `${Math.min(Math.max(12, r.left), innerWidth - popW - 12)}px`;
  } else {
    els.spot.hidden = true;
    els.pop.classList.add('tour-center');
    els.pop.style.top = ''; els.pop.style.left = '';
  }
}

function end() {
  try { localStorage.setItem('cror-seen-guide', '1'); } catch { /* ignore */ }
  removeEventListener('keydown', onKey);
  removeEventListener('resize', position);
  if (els.root) els.root.remove();
  els = {}; steps = []; idx = 0;
}
