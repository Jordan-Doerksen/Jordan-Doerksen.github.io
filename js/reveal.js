// ==========================================================================
// REVEAL — fades sections in as you scroll, and highlights the nav link
// for whichever section you're currently reading.
// ==========================================================================

export function initReveal() {
  const items = document.querySelectorAll('.reveal');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
  }

  // --- Nav highlighting ---
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const navIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((a) =>
            a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`)
          );
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => navIo.observe(s));
  }
}
