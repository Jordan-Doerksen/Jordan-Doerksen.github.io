// ==========================================================================
// SKINS — reskin the whole site (data-skin on <html>) from a topbar picker.
// Same DOM/layout; only token values + the sky colours change. Remembered in
// localStorage; fires a "skinchange" event so the sky canvas re-reads its hues.
// ==========================================================================

const KEY = 'obs-skin';
const SKINS = [
  { id: 'observatory', name: 'Observatory' },
  { id: 'sentinel', name: 'Sentinel' },
  { id: 'daybreak', name: 'Daybreak' },
  { id: 'military', name: 'Military' },
  { id: 'angelic', name: 'Angelic' },
  { id: 'demonic', name: 'Demonic' },
];

export function initSkins() {
  let current = document.documentElement.dataset.skin;
  if (!current) { try { current = localStorage.getItem(KEY); } catch (e) { /* ignore */ } }
  if (!SKINS.some((s) => s.id === current)) current = 'observatory';

  const picker = document.createElement('div');
  picker.className = 'skin-picker';
  picker.innerHTML =
    '<button class="skin-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Change skin">' +
      '<span class="skin-star" aria-hidden="true">✦</span>' +
      '<span class="skin-current"></span>' +
      '<span class="skin-caret" aria-hidden="true">▾</span>' +
    '</button>' +
    '<ul class="skin-menu" role="menu" hidden>' +
      SKINS.map((s) => `<li><button role="menuitemradio" data-skin="${s.id}">${s.name}</button></li>`).join('') +
    '</ul>';
  document.body.appendChild(picker);

  const toggle = picker.querySelector('.skin-toggle');
  const menu = picker.querySelector('.skin-menu');
  const label = picker.querySelector('.skin-current');

  function apply(id, persist) {
    current = id;
    document.documentElement.dataset.skin = id;
    if (persist) { try { localStorage.setItem(KEY, id); } catch (e) { /* ignore */ } }
    label.textContent = SKINS.find((s) => s.id === id).name;
    menu.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.skin === id)));
    window.dispatchEvent(new CustomEvent('skinchange', { detail: id }));
  }
  function open(o) { menu.hidden = !o; toggle.setAttribute('aria-expanded', String(o)); }

  toggle.addEventListener('click', (e) => { e.stopPropagation(); open(menu.hidden); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-skin]');
    if (b) { apply(b.dataset.skin, true); open(false); }
  });
  document.addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });

  apply(current, false);   // sync label + selection + fire the initial skinchange
}
