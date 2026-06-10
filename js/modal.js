// ==========================================================================
// MODAL — shared open/close logic with focus trapping.
// Used by the Library quote modal and the hidden OoT temple.
// ==========================================================================

export function setupModal(modalEl) {
  let lastFocused = null;

  const focusables = () =>
    [...modalEl.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.hasAttribute('disabled'));

  function onKeydown(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    // Keep Tab cycling inside the modal
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open() {
    lastFocused = document.activeElement;
    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    const items = focusables();
    (items[0] || modalEl).focus();
  }

  function close() {
    modalEl.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  // Anything with [data-close] inside the modal closes it (backdrop + ✕)
  modalEl.querySelectorAll('[data-close]').forEach((el) =>
    el.addEventListener('click', close)
  );

  return { open, close };
}
