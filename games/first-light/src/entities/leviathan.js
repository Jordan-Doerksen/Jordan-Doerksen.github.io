// entities/leviathan.js — the thing that follows you. Always telegraphed: self-luminous
// amber eyes (echo-bat's owl pattern) and a rumble that swells with proximity. It closes
// when unlit; in your beam it slows, its fear meter fills, and it dives when fear breaks.
// Contact costs one heart, then it dives — never a double-tap. Pressure scales per sector.

export function createLeviathan(cfg, scene) {
  const L = cfg.leviathan;
  const p = { x: 0, y: 0, vx: 0, vy: 0, r: L.radius };
  const lev = {
    p, active: false,
    state: 'dormant', // dormant | waiting | stalking | diving
    fear: 0, timer: 0, blink: 0,
  };

  lev.reset = (sector, rng) => {
    lev.fear = 0; lev.blink = 0;
    p.r = L.radius * scene.DPR;
    if (sector < L.firstSector) { lev.active = false; lev.state = 'dormant'; return; }
    lev.active = true;
    lev.state = 'waiting';
    lev.timer = L.entryDelaySeconds * (0.8 + rng() * 0.5);
    lev.edgeSpot(rng);
  };

  lev.edgeSpot = (rng) => {
    const side = Math.floor(rng() * 4);
    const t = rng();
    if (side === 0) { p.x = t * scene.W; p.y = -p.r * 2; }
    if (side === 1) { p.x = scene.W + p.r * 2; p.y = t * scene.H; }
    if (side === 2) { p.x = t * scene.W; p.y = scene.H + p.r * 2; }
    if (side === 3) { p.x = -p.r * 2; p.y = t * scene.H; }
    p.vx = 0; p.vy = 0;
  };

  // returns 'hit' the frame it reaches the ship, else null
  lev.update = (dt, ship, inBeam, sector, rng, focus) => {
    if (!lev.active) return null;
    lev.blink += dt;

    if (lev.state === 'waiting' || lev.state === 'diving') {
      lev.timer -= dt;
      if (lev.timer <= 0) { lev.state = 'stalking'; lev.fear = 0; lev.edgeSpot(rng); }
      return null;
    }

    // stalking
    const speed = (L.speedBase + (sector - 1) * L.speedPerSector) * scene.DPR;
    const dx = ship.p.x - p.x, dy = ship.p.y - p.y, d = Math.hypot(dx, dy) || 1;

    if (inBeam) {
      lev.fear += (L.fearPerSecond + (focus ? L.fearFocusBonus : 0)) * dt;
      const v = speed * L.repelSpeedMult; // negative = backing away
      p.vx = (dx / d) * v; p.vy = (dy / d) * v;
      if (lev.fear >= 1) {
        lev.state = 'diving';
        lev.timer = L.diveSecondsMin + rng() * (L.diveSecondsMax - L.diveSecondsMin);
        return 'dove';
      }
    } else {
      lev.fear = Math.max(0, lev.fear - L.fearDecayPerSecond * dt);
      p.vx = (dx / d) * speed; p.vy = (dy / d) * speed;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;

    if (d < p.r + ship.p.r) {
      lev.state = 'diving';
      lev.timer = L.diveSecondsMin + rng() * (L.diveSecondsMax - L.diveSecondsMin);
      return 'hit';
    }
    return null;
  };

  // 0..1 how close it is, for the rumble bed
  lev.menace = (ship) => {
    if (!lev.active || lev.state !== 'stalking') return 0;
    const d = Math.hypot(ship.p.x - p.x, ship.p.y - p.y);
    return Math.max(0, 1 - d / (L.rumbleRadius * scene.DPR));
  };

  return lev;
}
