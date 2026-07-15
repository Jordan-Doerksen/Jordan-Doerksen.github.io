// enemies.js — per-tick enemy behavior. Cheap on purpose (the alive-cap is the budget): seekers
// drive straight at the ship; the spitter strafes to hold its standoff range and lobs ordnance at
// your position. Chill (slow) scales movement; knockback is a decaying impulse. Death, damage, and
// player-contact all live in combat.js — this file only moves things.

export function fireSpit(world, e) {
  const p = world.player;
  let dx = p.x - e.x, dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const s = world.eshots.spawn();
  s.x = e.x; s.y = e.y;
  s.vx = (dx / d) * e.spec.projSpeed; s.vy = (dy / d) * e.spec.projSpeed;
  s.life = e.spec.projLife; s.dmg = e.spec.projDmg; s.radius = 5; s.element = e.element; s.kind = 'spit'; s.invuln = 0;
}

export function stepEnemies(world, dt) {
  const pool = world.enemies, p = world.player;
  const kbDecay = world.config.ship.kbDecay, slowFactor = world.config.procs.slowFactor;
  for (let i = 0; i < pool.items.length; i++) {
    const e = pool.items[i];
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.slow > 0) e.slow -= dt;
    const spd = e.speed * (e.slow > 0 ? slowFactor : 1);

    let dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;

    if (e.behavior === 'strafe' && e.spec) {
      const range = e.spec.range;
      let tx, ty;
      if (dist > range * 1.05) { tx = nx; ty = ny; }
      else if (dist < range * 0.8) { tx = -nx; ty = -ny; }
      else { tx = -ny; ty = nx; }
      e.x += tx * spd * dt; e.y += ty * spd * dt;
      e.fireCd -= dt;
      if (e.fireCd <= 0 && dist < range * 1.35 && p.alive) { fireSpit(world, e); e.fireCd = e.spec.fireCd; }
    } else {
      e.x += nx * spd * dt; e.y += ny * spd * dt;
    }

    // knockback impulse (decays fast)
    if (e.kbx !== 0 || e.kby !== 0) {
      e.x += e.kbx * dt; e.y += e.kby * dt;
      e.kbx *= kbDecay; e.kby *= kbDecay;
      if (Math.abs(e.kbx) < 1) e.kbx = 0;
      if (Math.abs(e.kby) < 1) e.kby = 0;
    }
    e.spin += dt;
  }
}
