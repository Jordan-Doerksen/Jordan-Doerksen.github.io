// spawn.js — the wave director (DECISIONS 2.2). Difficulty is a bounded CONCURRENT-ALIVE CAP, not
// a spawn rate: read cap/cadence/batch from the time table, and only ever top the field up TO the
// cap. Cheap archetypes are re-specced UPWARD by hp/dmg/speed ramp multipliers over time instead of
// adding new types. Enemies appear on a fixed world RING in every direction, biased ahead of travel
// when you're moving fast; parking shrinks the ring (idle heat). The cap is also the frame budget.

function tableAt(table, t) {
  let row = table[0];
  for (let i = 0; i < table.length; i++) { if (t >= table[i].t) row = table[i]; }
  return row;
}

function rampAt(world) {
  const s = world.config.spawn, min = world.time / 60;
  return {
    hp: Math.min(s.rampCap, 1 + s.hpRampPerMin * min),
    dmg: Math.min(s.rampCap, 1 + s.dmgRampPerMin * min),
    spd: Math.min(s.rampCap, 1 + s.spdRampPerMin * min),
  };
}

function chooseArch(world) {
  const c = world.content.enemies, t = world.time, r = world.rng;
  // weighted pool of unlocked archetypes
  let total = 0; const bag = [];
  for (const a of c) {
    if (a.after && t < a.after) continue;
    let w = a.id === 'drone' ? 5 : a.id === 'dart' ? 3 : a.id === 'bruiser' ? 1.4 : 1.1;
    bag.push([a, w]); total += w;
  }
  let roll = r() * total;
  for (const [a, w] of bag) { roll -= w; if (roll <= 0) return a; }
  return bag[0][0];
}

export function spawnEnemy(world, arch, x, y, champ) {
  const cfg = world.config, r = world.rng, ramp = rampAt(world);
  const e = world.enemies.spawn();
  e.dead = false;
  e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.kbx = 0; e.kby = 0;
  e.corners = arch.corners; e.color = arch.color; e.behavior = arch.behavior;
  e.radius = arch.radius; e.spin = r() * 6.28;
  e.maxhp = arch.hp * ramp.hp; e.hp = e.maxhp;
  e.speed = arch.speed * ramp.spd;
  e.dmg = cfg.ship.contactDamage * ramp.dmg * (arch.id === 'bruiser' ? 1.3 : 1);
  e.maxshell = arch.shell || 0; e.shell = e.maxshell;
  e.spec = arch.behavior === 'strafe' ? arch : null;
  e.fireCd = arch.fireCd ? arch.fireCd * (0.4 + r() * 0.6) : 0;
  e.element = 0; e.resist = -1; e.champion = false;
  e.burn = 0; e.slow = 0; e.hitFlash = 0; e.chainMark = 0; e.boss = false;

  if (champ) {
    const ch = cfg.champions;
    e.champion = true;
    e.maxhp *= ch.hpMult; e.hp = e.maxhp;
    e.radius *= ch.sizeMult;
    e.speed *= ch.speedMult;
    e.dmg *= 1.3;
    e.element = 1 + Math.floor(r() * 4);   // champions carry an element (the wheel starts to matter)
    e.resist = e.element;
    e.maxshell = ch.shell; e.shell = ch.shell;
  }
  return e;
}

export function stepSpawn(world, dt) {
  const cfg = world.config, s = cfg.spawn, r = world.rng, p = world.player;

  // idle heat
  const pspeed = Math.hypot(p.vx, p.vy);
  if (pspeed < 40) world.idleTimer += dt; else world.idleTimer = 0;
  const idle = world.idleTimer > s.idleAfter;

  const row = tableAt(s.table, world.time);
  let cadence = row.cadence;
  if (world.time < world.troughUntil) cadence *= s.troughMult;

  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;
  world.spawnTimer = cadence;

  const alive = world.enemies.count;
  if (alive >= cfg.perf.maxAlive || alive >= row.cap) return;

  // champion odds (ramped, gated)
  let champChance = 0;
  const ch = cfg.champions;
  if (world.time >= ch.after) champChance = Math.min(ch.chanceMax, ch.chance + ch.ramp * world.time);

  const batch = Math.min(row.batch, row.cap - alive, cfg.perf.maxAlive - alive);
  const moving = pspeed > s.containSpeed;
  const travel = Math.atan2(p.vy, p.vx);
  const ringScale = idle ? s.idleRingMult : 1;

  for (let n = 0; n < batch; n++) {
    let ang;
    if (moving && r() < s.containBias) ang = travel + (r() - 0.5) * 2 * s.containArc;   // land ahead
    else ang = r() * Math.PI * 2;
    const rad = (s.ringMin + r() * (s.ringMax - s.ringMin)) * ringScale;
    const x = p.x + Math.cos(ang) * rad;
    const y = p.y + Math.sin(ang) * rad;
    const arch = chooseArch(world);
    const champ = r() < champChance;
    spawnEnemy(world, arch, x, y, champ);
  }
}
