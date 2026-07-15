// progression.js — scrap gems, the magnet, XP, and the level-up trigger. Gems drift, then home once
// inside the (upgradeable) magnet radius; anything past the salvage radius is auto-collected so the
// infinite plane never costs a drop. Crossing the XP threshold raises your grade and queues a draft;
// the actual freeze + card requisition is owned by main.js (the freeze is free — the sim just stops).

function nextXp(world) {
  const pr = world.config.progression;
  let n = pr.xpBase * Math.pow(pr.xpGrowth, world.level - 1);
  if (pr.xpSpikeLevels.includes(world.level)) n *= pr.xpSpikeMult;
  return Math.ceil(n);
}

export function stepProgression(world, dt) {
  const pr = world.config.progression, p = world.player, m = world.mods;
  const magR = pr.magnetRadius * m.magnetMult;
  const pool = world.gems;

  for (let i = pool.items.length - 1; i >= 0; i--) {
    const g = pool.items[i];
    g.life -= dt;
    const dx = p.x - g.x, dy = p.y - g.y;
    const d2 = dx * dx + dy * dy;

    if (d2 > pr.salvageRadius * pr.salvageRadius) {   // far gem: auto-salvage (never lost)
      world.xp += g.value * m.xpMult; pool.removeAt(i); continue;
    }

    const d = Math.sqrt(d2) || 1;
    if (g.seeking || d < magR) {
      g.seeking = true;
      const pull = pr.magnetPull;
      g.vx += (dx / d) * pull * dt; g.vy += (dy / d) * pull * dt;
      g.vx *= 0.9; g.vy *= 0.9;
    } else {
      g.vx *= 0.96; g.vy *= 0.96;
    }
    g.x += g.vx * dt; g.y += g.vy * dt;

    if (d < pr.collectRadius + p.radius) { world.xp += g.value * m.xpMult; pool.removeAt(i); continue; }
    if (g.life <= 0) pool.removeAt(i);
  }

  // resolve level-ups (may bank several; main serves them one at a time)
  let leveled = false;
  while (world.xp >= world.xpToNext) {
    world.xp -= world.xpToNext;
    world.level++;
    world.xpToNext = nextXp(world);
    world.pendingLevels = (world.pendingLevels || 0) + 1;
    leveled = true;
  }
  if (leveled) world.draftPending = true;
}
