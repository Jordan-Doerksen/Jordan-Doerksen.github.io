/* copy.js — Tool Desk: click-to-copy on any .copy element.
   Delegated so rows re-rendered later still work. Visual confirm =
   a brief .copied flash (desk.css kills the transition under
   prefers-reduced-motion; the color change itself still confirms). */

export function initCopy() {
  document.addEventListener('click', async e => {
    const el = e.target.closest('.copy');
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.textContent);
    } catch {
      return; // clipboard blocked (e.g. file://) — don't fake a confirm
    }
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 500);
  });

  // affordance
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('.copy');
    if (el && !el.title) el.title = 'click to copy';
  });
}
