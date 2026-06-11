// ==========================================================================
// STAR-CHART NAV — wires the desktop star rail, the mobile star-map
// overlay, and the "which section am I in" highlighting for both.
// ==========================================================================

export function initStarChart() {
  const rail = document.querySelector('.star-rail');
  const map = document.getElementById('star-map');
  const toggle = document.querySelector('.chart-toggle');
  const closeBtn = map?.querySelector('.map-close');

  // --- Mobile star-map overlay ---
  if (map && toggle) {
    const open = () => {
      map.classList.add('is-open');
      map.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    };
    const close = () => {
      map.classList.remove('is-open');
      map.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      toggle.focus();
    };

    toggle.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    map.addEventListener('click', (e) => {
      // close after picking a destination, or when tapping the backdrop
      if (e.target.closest('a') || e.target === map) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && map.classList.contains('is-open')) close();
    });
  }

  // --- Active-star highlighting (rail + map share hrefs) ---
  const links = [
    ...document.querySelectorAll('.star-rail a[href^="#"], .star-map a[href^="#"]'),
  ];
  const ids = [...new Set(links.map((a) => a.getAttribute('href')))];
  const sections = ids.map((id) => document.querySelector(id)).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // back at the hero: no station is current
          const id = entry.target.classList.contains('hero') ? '' : `#${entry.target.id}`;
          links.forEach((a) =>
            a.classList.toggle('is-active', a.getAttribute('href') === id)
          );
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    const hero = document.querySelector('.hero');
    if (hero) io.observe(hero);
  }
}
