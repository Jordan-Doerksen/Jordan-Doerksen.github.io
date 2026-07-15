// status.js — per-tick damage-over-time. Burn (Blaze proc) chips shell/hp each tick; a burn kill
// routes through the same killEnemy path so gems/scrip/fx stay unified. Slow decays in enemies.js.
// Kept separate so the DoT ordering is explicit and cheap (one pass, no allocation).

import { killEnemy } from './combat.js';

export function stepStatus(world, dt) {
  const pool = world.enemies;
  for (let i = 0; i < pool.items.length; i++) {
    const e = pool.items[i];
    if (e.dead || e.burn <= 0) continue;
    e.burn -= dt;
    const amt = e.burnDps * dt;
    if (e.shell > 0) { e.shell -= amt; if (e.shell < 0) e.shell = 0; }
    else {
      e.hp -= amt;
      if (e.hp <= 0) killEnemy(world, e, 1, null);
    }
  }
  // boss burn
  const b = world.boss;
  if (b && !b.dead && b.burn > 0) {
    b.burn -= dt;
    if (b.shell > 0) { b.shell -= b.burnDps * dt; if (b.shell <= 0) { b.shell = 0; b.phase2 = true; } }
    else { b.hp -= b.burnDps * dt; if (b.hp <= 0) b.dead = true; }
  }
}
