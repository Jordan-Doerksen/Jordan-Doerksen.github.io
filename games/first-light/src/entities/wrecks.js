// entities/wrecks.js — the survey targets. Seeded placement per sector (deterministic),
// spaced apart, kept off the ship's entry point (diablo-act1's safe-spawn rule).
// A wreck is charted by the survey system; its silhouette points are seeded too.

export function createWrecks(cfg, scene) {
  const W = cfg.wrecks;
  const list = [];

  // rejection-sampled placement: apart from each other, outside the safe radius
  function place(rng, count, safe) {
    list.length = 0;
    const DPR = scene.DPR, m = W.edgeMargin * DPR;
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, ok = false;
      for (let tries = 0; tries < 80 && !ok; tries++) {
        x = m + rng() * (scene.W - m * 2);
        y = m + rng() * (scene.H - m * 2);
        ok = Math.hypot(x - safe.x, y - safe.y) > cfg.hazards.safeClearRadius * DPR
          && list.every(w => Math.hypot(x - w.x, y - w.y) > W.minDistApart * DPR);
      }
      // seeded silhouette: a broken hull of jagged radial points
      const pts = [];
      const n = 7 + Math.floor(rng() * 4);
      for (let k = 0; k < n; k++) {
        pts.push({ a: (k / n) * Math.PI * 2, r: 0.55 + rng() * 0.5 });
      }
      list.push({
        x, y, r: W.radius * DPR, pts,
        tilt: (rng() - 0.5) * 0.9, ph: rng() * 6.28,
        progress: 0, charted: false, lit: 0, seen: 0,
      });
    }
  }

  return { list, place };
}
