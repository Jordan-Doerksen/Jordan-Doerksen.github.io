// projectiles.js — motion + lifetime for BOTH ordnance pools. Player bullets (world.bullets) move
// straight, tick their 'well' special (Event Horizon pulls enemies each frame), and expire; hit
// detection against enemies lives in combat.js. Enemy ordnance (world.eshots) moves, expires, and
// collides with the ship here (calling hurtPlayer). Off-screen culling keeps the pools bounded.

import { hurtPlayer } from './player.js';

export function stepBullets(world, dt) {
  const pool = world.bullets, cull = world.config.perf.cullRadius;
  const px = world.player.x, py = world.player.y;
  const pr = world.config.procs;
  for (let i = pool.items.length - 1; i >= 0; i--) {
    const b = pool.items[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;

    // Event Horizon: a moving singularity that drags nearby enemies inward each tick.
    if (b.special === 'well') {
      world.grid.query(b.x, b.y, b.wellRadius, (e) => {
        if (e.dead || e.boss) return;
        let dx = b.x - e.x, dy = b.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > b.wellRadius) return;
        const f = b.wellForce * (1 - d / b.wellRadius) * dt;
        e.vx += (dx / d) * f; e.vy += (dy / d) * f;
      });
    }

    const dx = b.x - px, dy = b.y - py;
    if (b.life <= 0 || (dx * dx + dy * dy) > cull * cull) pool.removeAt(i);
  }
}

export function stepShots(world, dt) {
  const pool = world.eshots, cull = world.config.perf.cullRadius;
  const p = world.player;
  const pr2 = (p.radius) * (p.radius);
  for (let i = pool.items.length - 1; i >= 0; i--) {
    const s = pool.items[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.life -= dt;
    if (s.invuln > 0) s.invuln -= dt;

    // collide with the ship
    if (p.alive) {
      const dx = s.x - p.x, dy = s.y - p.y;
      const rr = (s.radius + p.radius);
      if (dx * dx + dy * dy <= rr * rr) {
        hurtPlayer(world, s.dmg, s.x, s.y);
        pool.removeAt(i);
        continue;
      }
    }

    const ddx = s.x - p.x, ddy = s.y - p.y;
    if (s.life <= 0 || (ddx * ddx + ddy * ddy) > cull * cull) pool.removeAt(i);
  }
}
