// systems/reveal.js — light and memory. The night's core rule (Decision 1.1):
// beam cones + expanding sonar rings + a small nightsight halo set each entity's `lit`
// (bright, fades fast); anything ever lit keeps `seen` (faint permanent chart ink).
// Entity-based visibility — no pixel buffers, cheap and deterministic.

export function createReveal(cfg, scene) {
  const SN = cfg.sonar;
  const pings = []; // {x, y, r, ph} expanding rings
  let pingTimer = 0;

  function reset() { pings.length = 0; pingTimer = 0.4; }

  function ping(x, y) { pings.push({ x, y, r: 0, ph: Math.random() * 6.28 }); }

  // advances rings + the auto-ping clock; returns true on the frame a ping fires
  function update(dt, ship, mods) {
    const DPR = scene.DPR;
    let fired = false;
    pingTimer -= dt;
    if (pingTimer <= 0) {
      pingTimer = SN.interval / mods.pingRate;
      ping(ship.p.x, ship.p.y);
      fired = true;
    }
    const maxR = SN.maxRadius * mods.pingRadius * DPR;
    for (let i = pings.length - 1; i >= 0; i--) {
      pings[i].r += SN.ringSpeed * DPR * dt;
      if (pings[i].r > maxR) pings.splice(i, 1);
    }
    return fired;
  }

  // brightness 0..1 of light falling on a point right now
  function litAt(x, y, beams, ship, mods) {
    const DPR = scene.DPR;
    let lit = 0;
    // nightsight halo around the hull
    const dShip = Math.hypot(x - ship.p.x, y - ship.p.y);
    const nightR = cfg.lamp.nightsightRadius * DPR;
    if (dShip < nightR) lit = Math.max(lit, 0.55 * (1 - dShip / nightR));
    // beam cones
    for (const b of beams) {
      const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
      if (d > b.range) continue;
      let da = Math.atan2(dy, dx) - b.heading;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const half = b.arc / 2;
      if (Math.abs(da) > half) continue;
      const edge = 1 - Math.abs(da) / half;
      const falloff = 1 - d / b.range;
      lit = Math.max(lit, b.power * Math.min(1, edge * 2) * (0.35 + 0.65 * falloff));
    }
    // sonar ring fronts
    const w = SN.ringRevealWidth * DPR;
    for (const p of pings) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (Math.abs(d - p.r) < w) lit = Math.max(lit, 0.9 * (1 - Math.abs(d - p.r) / w));
    }
    return lit;
  }

  // update each entity's lit (decays) and seen (sticks) from current light
  function applyTo(entities, beams, ship, mods, dt) {
    const hold = SN.revealHold;
    for (const e of entities) {
      const now = litAt(e.x, e.y, beams, ship, mods);
      if (now > e.lit) {
        e.lit = now;
        // Daymark synergy: beam-lit things decay far slower
        e._linger = mods.beamLinger;
      } else {
        e.lit = Math.max(0, e.lit - dt / (hold * (e._linger || 1)));
      }
      if (e.lit > 0.25) e.seen = 1;
    }
  }

  return { pings, reset, ping, update, litAt, applyTo };
}
