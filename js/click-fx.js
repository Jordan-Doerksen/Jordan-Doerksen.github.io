// ==========================================================================
// CLICK FX — a small burst of gold sparks when clicking interactive things.
// Skipped under prefers-reduced-motion.
// ==========================================================================

export function initClickFx() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const TARGETS = 'a, button, .chip, [data-fx]';

  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest(TARGETS)) return;
    burst(e.clientX, e.clientY);
  });

  function burst(x, y) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      document.body.appendChild(spark);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 22 + Math.random() * 26;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      spark
        .animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 },
          ],
          { duration: 420 + Math.random() * 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        )
        .addEventListener('finish', () => spark.remove());
    }
  }
}
