/* chrome.js — the persistent chrome's two non-navigation jobs.
   ---------------------------------------------------------------------------
   1. progress()  — orientation. A 1px hairline under the chrome reporting how
      far through the document you are. Under prefers-reduced-motion it is
      hidden by CSS and never wired here, so nothing animates and nothing lies.
   2. entrances() — narrative entrance for chapters. IntersectionObserver, one
      shot per element. Under reduced motion every .enter is resolved to its
      final state immediately: a meaningful static state, not a blank page.

   No ambient loops live here. The bible: "do not animate merely because the
   page is idle." */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function progress() {
  const bar = document.querySelector('.progress');
  if (!bar || REDUCED) return;

  let ticking = false;
  const paint = () => {
    const doc = document.documentElement;
    const span = doc.scrollHeight - doc.clientHeight;
    const pct = span > 0 ? Math.min(1, doc.scrollTop / span) : 0;
    bar.style.transform = `scaleX(${pct})`;
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  paint();
}

/* Call again after any late render (fetched rows, atlas sections) so content
   that arrived after boot still gets an entrance instead of staying invisible. */
export function entrances(root = document) {
  const items = root.querySelectorAll('.enter:not(.in)');
  if (!items.length) return;

  if (REDUCED || !('IntersectionObserver' in window)) {
    items.forEach(n => n.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  items.forEach(n => io.observe(n));
}

/* Marks the chrome link matching this page. Purely an orientation aid — the
   links work identically without it. */
export function markCurrent() {
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.chrome-nav a').forEach(a => {
    const target = new URL(a.getAttribute('href'), location.href).pathname.replace(/index\.html$/, '');
    if (target === here) a.setAttribute('aria-current', 'page');
  });
}
