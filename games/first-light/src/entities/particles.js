// entities/particles.js — pickup bursts. Reduced-motion is LAW: no particles at all
// when the user asked for less motion. All tunables come from config.particles.

import { REDUCED, rand } from '../core/scene.js';

export function createParticles(cfg) {
  const P = cfg.particles;
  const list = [];

  function burst(x, y, col) {
    if (REDUCED) return; // the law
    for (let i = 0; i < P.countPerBurst; i++) {
      const a = Math.random() * 6.28, s = rand(P.minSpeed, P.maxSpeed);
      list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col });
    }
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= P.friction; p.vy *= P.friction;
      p.life -= dt * P.fadeRate;
      if (p.life <= 0) list.splice(i, 1);
    }
  }

  return { list, burst, update };
}
