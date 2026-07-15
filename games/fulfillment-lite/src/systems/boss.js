// boss.js — the SUPERVISOR (DECISIONS 3.3). Scheduled roughly every two minutes; HP climbs without
// bound (the company always wins). One archetype, three TELEGRAPHED patterns — a gapped shard ring
// (the promised dodge lane), an aimed burst, and a warming sweep laser — that harden in phase two
// (shell stripped) and again in OVERTIME if you stall the meeting. Damage TO the boss is resolved in
// combat.js (damageBoss); this file owns the schedule, movement, patterns, and death rewards.

import { dropGems } from './combat.js';

const lerp = (a, b, t) => a + (b - a) * t;

function spawnShard(world, x, y, ang, speed, dmg, element) {
  const s = world.eshots.spawn();
  const c = world.config.boss;
  s.x = x; s.y = y; s.vx = Math.cos(ang) * speed; s.vy = Math.sin(ang) * speed;
  s.life = c.shardLife; s.dmg = dmg; s.radius = c.shardRadius; s.element = element; s.kind = 'shard'; s.invuln = 0;
}

function spawnBoss(world) {
  const c = world.config.boss, p = world.player, r = world.rng;
  const tier = ++world.bossTier;
  const ang = r() * Math.PI * 2, dist = 700;
  const boss = {
    boss: true, dead: false, tier,
    x: p.x + Math.cos(ang) * dist, y: p.y + Math.sin(ang) * dist, vx: 0, vy: 0,
    maxhp: c.hpBase * Math.pow(c.hpGrowth, tier - 1),
    maxshell: c.shellBase * Math.pow(c.shellGrowth, tier - 1),
    radius: c.radius, speed: c.speed, dmg: world.config.ship.contactDamage,
    element: 1 + ((tier - 1) % 4),
    hitFlash: 0, phase2: false, phaseFlash: 0, burn: 0, burnDps: 0,
    spawnedAt: world.time, bannerT: 2.2, spin: 0,
    volleyT: c.firstVolley, burstT: c.firstVolley + 1.2, laserT: c.laserCd * c.laserFirstFrac,
    laser: { phase: 'off', t: 0, ang: 0 },
  };
  boss.hp = boss.maxhp; boss.shell = boss.maxshell;
  world.boss = boss; world.bossActive = true;
}

function ringVolley(world, boss, gapMult) {
  const c = world.config.boss, p = world.player;
  const toP = Math.atan2(p.y - boss.y, p.x - boss.x);
  const gap = c.ringGap * gapMult;
  const n = c.volleyCount;
  const step = (Math.PI * 2) / n;
  const dmg = c.shardDmg * (1 + 0.2 * (boss.tier - 1));
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + i * step;
    const rel = Math.abs(Math.atan2(Math.sin(a - toP), Math.cos(a - toP)));
    if (rel < gap) continue;   // leave the promised lane toward the player open
    spawnShard(world, boss.x, boss.y, a, c.shardSpeed, dmg, boss.element);
  }
}

function aimedBurst(world, boss) {
  const c = world.config.boss, p = world.player;
  const toP = Math.atan2(p.y - boss.y, p.x - boss.x);
  const dmg = c.shardDmg * (1 + 0.2 * (boss.tier - 1));
  const n = c.aimBurstCount, sp = c.shardSpeed * c.aimBurstSpeedMult;
  for (let i = 0; i < n; i++) {
    const off = c.aimBurstSpread * (i / (n - 1) - 0.5);
    spawnShard(world, boss.x, boss.y, toP + off, sp, dmg, boss.element);
  }
}

function pointOnBeam(boss, px, py, len) {
  const dx = Math.cos(boss.laser.ang), dy = Math.sin(boss.laser.ang);
  let t = (px - boss.x) * dx + (py - boss.y) * dy;
  t = Math.max(0, Math.min(len, t));
  const cx = boss.x + dx * t, cy = boss.y + dy * t;
  return Math.hypot(px - cx, py - cy);
}

function finishBoss(world, boss) {
  const c = world.config.boss, p = world.player;
  dropGems(world, boss.x, boss.y, c.gems, c.gemValue);
  world.scrip += world.config.scrip.boss;
  world.bossesKilled++;
  world.fx.rings.push({ x: boss.x, y: boss.y, r: 160, color: '#FF8066' });
  world.fx.sparks.push({ x: boss.x, y: boss.y, color: '#FF8066', n: 40 });
  world.hitstop = Math.max(world.hitstop, 6);
  world.camera.shake = Math.min(c.arenaRadius, world.camera.shake + 24);
  world.boss = null; world.bossActive = false;
  world.bossTimer = c.interval;
  world.troughUntil = world.time + world.config.spawn.troughTime;
  world.bossDownT = 2.2;
}

export function stepBoss(world, dt) {
  const c = world.config.boss;
  const boss = world.boss;

  if (!boss) {
    if (!world.paused && !world.draftPending && world.started) {
      world.bossTimer -= dt;
      if (world.bossTimer <= 0) spawnBoss(world);
    }
    if (world.bossDownT > 0) world.bossDownT -= dt;
    return;
  }

  if (boss.dead) { finishBoss(world, boss); return; }
  if (boss.bannerT > 0) boss.bannerT -= dt;
  if (boss.hitFlash > 0) boss.hitFlash -= dt;
  if (boss.phaseFlash > 0) boss.phaseFlash -= dt;
  boss.spin += dt;

  // approach the player slowly (contact is dangerous)
  const p = world.player;
  let dx = p.x - boss.x, dy = p.y - boss.y; const d = Math.hypot(dx, dy) || 1;
  boss.x += (dx / d) * boss.speed * dt; boss.y += (dy / d) * boss.speed * dt;

  // cadence multipliers: phase two + overtime enrage
  let cdMult = boss.phase2 ? c.p2CdMult : 1, gapMult = boss.phase2 ? c.p2GapMult : 1;
  const fightT = world.time - boss.spawnedAt;
  if (fightT > c.enrageAfter) {
    const e = Math.min(1, (fightT - c.enrageAfter) / c.enrageRamp);
    cdMult *= lerp(1, c.enrageCdMult, e); gapMult *= lerp(1, c.enrageGapMult, e);
  }

  // patterns
  boss.volleyT -= dt;
  if (boss.volleyT <= 0) { ringVolley(world, boss, gapMult); boss.volleyT = c.volleyCd * cdMult; }
  boss.burstT -= dt;
  if (boss.burstT <= 0) { aimedBurst(world, boss); boss.burstT = c.aimBurstCd * cdMult; }

  // sweep laser (warm telegraph → live sweeping beam)
  const L = boss.laser;
  if (L.phase === 'off') {
    boss.laserT -= dt;
    if (boss.laserT <= 0) { L.phase = 'warm'; L.t = c.laserWarm; L.ang = Math.atan2(p.y - boss.y, p.x - boss.x); }
  } else if (L.phase === 'warm') {
    L.ang = lerp(L.ang, Math.atan2(p.y - boss.y, p.x - boss.x), Math.min(1, 3 * dt));
    L.t -= dt;
    if (L.t <= 0) { L.phase = 'live'; L.t = c.laserDwell; }
  } else if (L.phase === 'live') {
    L.ang += c.laserSweep * dt;
    L.t -= dt;
    if (p.alive && pointOnBeam(boss, p.x, p.y, c.laserLen) < c.laserW + p.radius) {
      if (p.shield > 0) { p.shield = Math.max(0, p.shield - c.laserDps * dt); p.shieldTimer = world.config.ship.shieldRegenDelay; p.hitFlash = 0.15; }
      else if (p.invuln <= 0) {
        p.pips -= 1; p.invuln = world.config.ship.contactInvuln; p.hitFlash = 0.2;
        world.camera.shake = Math.min(c.arenaRadius, world.camera.shake + 14);
        if (p.pips <= 0) { p.pips = 0; p.alive = false; }
      }
    }
    if (L.t <= 0) { L.phase = 'off'; boss.laserT = c.laserCd * cdMult; }
  }
}
