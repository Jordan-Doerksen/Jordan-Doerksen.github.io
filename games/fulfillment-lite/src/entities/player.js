// player.js — the Courier. WASD sets a heading; velocity lerps toward it (accel, no separate
// drag — releasing input decelerates through the same lerp). Boost is a short fuel dash on a
// hysteresis rhythm (a dry tank re-arms only at a fraction, so there's no hold-stutter). Hull is
// discrete non-regenerating pips with a regenerating shield in front; any hit with the shield
// down costs exactly one pip (the parent's pip model). Aim is twin-stick: the ship faces the mouse.

export function updateAim(world) {
  const p = world.player, v = world.view, inp = world.input;
  if (!v) return;
  const zoom = world.config.camera.zoom;
  const wx = world.camera.x + (inp.sx - v.w / 2) / zoom;
  const wy = world.camera.y + (inp.sy - v.h / 2) / zoom;
  let ax = wx - p.x, ay = wy - p.y;
  const d = Math.hypot(ax, ay) || 1;
  p.aimx = ax / d; p.aimy = ay / d;
  p.aimwx = wx; p.aimwy = wy;
  // Aim is mouse; the HULL is not — it faces travel (set in stepPlayer, the parent's model:
  // Flight.gd "heading follows velocity, used only for drawing the hull"). Turrets do the aiming.
}

export function stepPlayer(world, dt) {
  const p = world.player, inp = world.input, b = world.config.ship, m = world.mods;
  if (!p.alive) return;

  // ---- boost fuel rhythm ----
  const fuelMax = b.boostFuelMax * m.boostMult;
  const regen = b.boostRegen * m.boostMult;
  const moving = (inp.moveX !== 0 || inp.moveY !== 0);
  let boosting = false;
  if (inp.boost && p.boostFuel > 0 && p.boostReady && moving) {
    boosting = true;
    p.boostFuel -= b.boostDrain * dt;
    p.boostRecharge = b.boostRechargeDelay;
    if (p.boostFuel <= 0) { p.boostFuel = 0; p.boostReady = false; }
  } else {
    if (p.boostRecharge > 0) p.boostRecharge -= dt;
    else if (p.boostFuel < fuelMax) p.boostFuel = Math.min(fuelMax, p.boostFuel + regen * dt);
    if (!p.boostReady && p.boostFuel >= fuelMax * b.boostRearmFrac) p.boostReady = true;
  }
  p.boosting = boosting;

  // ---- movement (lerp toward target velocity) ----
  // Snappy arcade + light glide (interview 2026-07-14): throttle-UP uses the fast accel rate;
  // releasing input decays through the gentler decel rate, so the ship answers instantly but
  // still glides a beat before parking. One rate for both was the "weird" feel.
  const speed = b.speed * m.moveMult * (boosting ? b.boostMult : 1);
  const hasInput = (inp.moveX !== 0 || inp.moveY !== 0);
  const tvx = inp.moveX * speed, tvy = inp.moveY * speed;
  const k = Math.min(1, (hasInput ? b.accel : b.decel) * dt);
  p.vx += (tvx - p.vx) * k;
  p.vy += (tvy - p.vy) * k;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // hull faces travel, not the mouse (the parent's Flight.gd model); the velocity lerp above is
  // what smooths the turn, and a parked ship holds its last facing
  if (Math.hypot(p.vx, p.vy) > 1) p.heading = Math.atan2(p.vy, p.vx);
  p.muzzle = Math.max(0, p.muzzle - dt * 6);

  // ---- shield / i-frame timers ----
  if (p.invuln > 0) p.invuln -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;
  const shieldMax = b.shield + m.shieldMaxAdd;
  if (p.shieldTimer > 0) p.shieldTimer -= dt;
  else if (p.shield < shieldMax) p.shield = Math.min(shieldMax, p.shield + (b.shieldRegen + m.shieldRegenAdd) * dt);
}

// The single damage entry point for the ship. Returns 'shield' | 'pip' | 'dead' | null (i-frames).
export function hurtPlayer(world, dmg, srcx, srcy) {
  const p = world.player, b = world.config.ship;
  if (!p.alive || p.invuln > 0) return null;

  let result;
  if (p.shield > 0) { p.shield = Math.max(0, p.shield - dmg); result = 'shield'; }
  else { p.pips -= 1; result = 'pip'; }

  p.shieldTimer = b.shieldRegenDelay;
  p.invuln = b.contactInvuln;
  p.hitFlash = 0.18;

  // knockback away from the source
  if (srcx !== undefined) {
    let kx = p.x - srcx, ky = p.y - srcy;
    const d = Math.hypot(kx, ky) || 1;
    p.vx += (kx / d) * b.contactKnockback;
    p.vy += (ky / d) * b.contactKnockback;
  }

  world.camera.shake = Math.min(world.config.camera.shakeMax, world.camera.shake + (result === 'pip' ? 16 : 8));

  if (p.pips <= 0) { p.pips = 0; p.alive = false; result = 'dead'; }
  return result;
}
