// entities/hazards.js — reefs (static rock clusters) and drifting sea-mines.
// Seeded per sector; both respect the safe radius around the ship's entry point and
// keep clear of wrecks so a survey circle is never a death sentence.

export function createHazards(cfg, scene) {
  const H = cfg.hazards;
  const reefs = [];
  const mines = [];

  function clearOf(x, y, r, safe, wrecks, DPR) {
    if (Math.hypot(x - safe.x, y - safe.y) < H.safeClearRadius * DPR + r) return false;
    return wrecks.every(w => Math.hypot(x - w.x, y - w.y) > w.r + r + cfg.survey.radius * DPR * 0.9);
  }

  function place(rng, sector, safe, wrecks) {
    const DPR = scene.DPR, m = 60 * DPR;
    reefs.length = 0; mines.length = 0;

    const reefCount = H.reefBase + Math.floor((sector - 1) / 2) * H.reefPerTwoSectors;
    for (let i = 0; i < reefCount; i++) {
      for (let tries = 0; tries < 80; tries++) {
        const x = m + rng() * (scene.W - m * 2);
        const y = m + rng() * (scene.H - m * 2);
        const r = (H.reefRadiusMin + rng() * (H.reefRadiusMax - H.reefRadiusMin)) * DPR;
        if (!clearOf(x, y, r, safe, wrecks, DPR)) continue;
        const pts = [];
        const n = 6 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) pts.push({ a: (k / n) * Math.PI * 2 + rng() * 0.4, r: 0.6 + rng() * 0.4 });
        reefs.push({ x, y, r, pts, lit: 0, seen: 0 });
        break;
      }
    }

    const mineCount = H.minesPerSector[Math.min(sector - 1, H.minesPerSector.length - 1)];
    for (let i = 0; i < mineCount; i++) {
      for (let tries = 0; tries < 80; tries++) {
        const x = m + rng() * (scene.W - m * 2);
        const y = m + rng() * (scene.H - m * 2);
        const r = H.mineRadius * DPR;
        if (!clearOf(x, y, r * 4, safe, wrecks, DPR)) continue;
        const a = rng() * 6.28;
        mines.push({
          x, y, r,
          vx: Math.cos(a) * H.mineDriftSpeed * DPR,
          vy: Math.sin(a) * H.mineDriftSpeed * DPR,
          ph: rng() * 6.28, lit: 0, seen: 0,
        });
        break;
      }
    }
  }

  function update(dt) {
    for (const mn of mines) {
      mn.x += mn.vx * dt; mn.y += mn.vy * dt;
      if (mn.x < mn.r || mn.x > scene.W - mn.r) mn.vx *= -1;
      if (mn.y < mn.r || mn.y > scene.H - mn.r) mn.vy *= -1;
    }
  }

  return { reefs, mines, place, update };
}
