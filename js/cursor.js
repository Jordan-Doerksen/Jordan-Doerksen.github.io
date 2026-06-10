// ==========================================================================
// CURSOR — custom dot + trailing gold ring.
// Only activates on devices with a fine pointer (mouse/trackpad),
// and never under prefers-reduced-motion.
// ==========================================================================

export function initCursor() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(pointer: fine)').matches) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor');

  let x = innerWidth / 2, y = innerHeight / 2; // pointer position
  let rx = x, ry = y;                          // ring position (lags behind)

  addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    document.body.classList.remove('cursor-hidden');
  });

  // Grow the ring over anything interactive
  const HOVERABLE = 'a, button, .chip, input, textarea, [data-fx]';
  addEventListener('mouseover', (e) => {
    ring.classList.toggle('is-hover', !!e.target.closest(HOVERABLE));
  });

  document.addEventListener('mouseleave', () =>
    document.body.classList.add('cursor-hidden')
  );

  (function follow() {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  })();
}
