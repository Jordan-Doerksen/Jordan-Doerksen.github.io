// weapons.js — the auto-fire heart (DECISIONS 3.1/3.2). The player never aims a gun: each installed
// weapon acquires a target (nearest enemy in reach, or the cursor while focus-firing), sweeps its aim
// toward it at a fixed turn rate, and fires on a per-weapon cooldown. Tiers "deepen" (more damage,
// faster); procs unlock at Mk II; a weapon's signature turns on at Mk III; a Mk★ legendary fork swaps
// in an evolution behavior. All stats derive from content.json + config.weaponTiers — nothing hardcoded.

function normAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

function lerpAngle(cur, target, maxStep) {
  const d = normAngle(target - cur);
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}

function recycleSoonest(world) {
  const items = world.bullets.items;
  if (!items.length) return;
  let mi = 0, ml = items[0].life;
  for (let i = 1; i < items.length; i++) if (items[i].life < ml) { ml = items[i].life; mi = i; }
  world.bullets.removeAt(mi);
}

// ---- resolve a weapon instance to its live firing stats ----
export function effStats(world, w) {
  const t = world.config.weaponTiers, m = world.mods;
  const base = w.evolved ? Object.assign({}, w.def, w.evoDef) : w.def;
  const lvl = w.evolved ? t.maxLevel : w.level;
  const deepen = 1 + t.deepenDmg * (lvl - 1);
  const rate = Math.pow(t.deepenRate, lvl - 1);
  const life = base.plife * t.rangeMult * m.rangeMult;

  const id = w.def.id;
  const sig = (w.level >= t.maxLevel) || w.evolved;
  let pellets = base.pellets || 1, pierce = base.pierce || 0;
  let bounces = 0, wildfire = false, shatter = false, overload = false, collapse = false;
  if (sig && !w.evolved) {
    if (id === 'pulse') bounces = 1;
    else if (id === 'flak') { pellets += 2; pierce += 1; }
    else if (id === 'rail') pierce = 999;
    else if (id === 'needler') pierce += 1;
    else if (id === 'flame') wildfire = true;
    else if (id === 'cryo') shatter = true;
    else if (id === 'tesla') overload = true;
    else if (id === 'voidbolt') collapse = true;
  }

  return {
    dmg: base.damage * deepen * w.quality,
    fire: base.fire * rate,
    pspeed: base.pspeed, pradius: base.pradius, kb: base.kb || 20,
    element: base.element, pellets, spread: base.spread || 0, pierce,
    life, reach: Math.min(base.pspeed * life, 1000),
    special: base.special || null, blastRadius: base.blastRadius || 0, blastFrac: base.blastFrac || 0,
    wellRadius: base.wellRadius || 0, wellForce: base.wellForce || 0, wellLife: base.wellLife || 0,
    proc: (w.evolved || w.level >= t.procUnlockLevel) && base.element > 0,
    bounces, wildfire, shatter, overload, collapse,
  };
}

function fire(world, w, eff, dirAng) {
  const p = world.player, cap = world.config.perf.projectileCap, r = world.rng;
  for (let k = 0; k < eff.pellets; k++) {
    if (world.bullets.count >= cap) recycleSoonest(world);
    let off = 0;
    if (eff.pellets > 1) off = eff.spread * (k / (eff.pellets - 1) - 0.5);
    else if (eff.spread > 0) off = (r() - 0.5) * eff.spread;
    const a = dirAng + off;
    const b = world.bullets.spawn();
    b.x = p.x + Math.cos(dirAng) * p.radius; b.y = p.y + Math.sin(dirAng) * p.radius;
    b.vx = Math.cos(a) * eff.pspeed; b.vy = Math.sin(a) * eff.pspeed;
    b.life = eff.special === 'well' ? eff.wellLife : eff.life;
    b.dmg = eff.dmg; b.element = eff.element; b.kb = eff.kb; b.radius = eff.pradius;
    b.pierce = eff.pierce; b.hitSet = null; b.ang = a;
    b.special = eff.special; b.blastRadius = eff.blastRadius; b.blastFrac = eff.blastFrac;
    b.wellRadius = eff.wellRadius; b.wellForce = eff.wellForce;
    b.proc = eff.proc; b.wid = w.def.id;   // wid + special ARE the render identity (no glyph field)
    b.bounces = eff.bounces; b.wildfire = eff.wildfire; b.shatter = eff.shatter; b.overload = eff.overload; b.collapse = eff.collapse;
  }
  p.muzzle = 1;
  // cosmetic muzzle chips — a capped fx event the renderer drains (one-way law holds; no rng used,
  // so determinism is untouched). ang lets the renderer spray the chips along the firing line.
  const fxa = world.fx.sparks;
  if (fxa.length < world.config.perf.fxParticleCap) {
    fxa.push({
      x: p.x + Math.cos(dirAng) * (p.radius + 3), y: p.y + Math.sin(dirAng) * (p.radius + 3),
      color: world.content.elements[eff.element].color, n: 2, ang: dirAng, spread: 0.7, spd: 240,
    });
  }
}

export function stepWeapons(world, dt) {
  const p = world.player; if (!p.alive) return;
  const acquire = world.config.weaponTiers.acquireSpeed, fireMult = world.mods.fireMult;
  const focus = world.input.focus;
  for (let i = 0; i < world.weapons.length; i++) {
    const w = world.weapons[i];
    const eff = effStats(world, w);
    let dirTarget, hasTarget = false;
    if (focus && !w.isProw) {
      dirTarget = Math.atan2(p.aimwy - p.y, p.aimwx - p.x); hasTarget = true;
    } else {
      const t = world.grid.nearest(p.x, p.y, eff.reach, (o) => !o.dead);
      if (t) { dirTarget = Math.atan2(t.y - p.y, t.x - p.x); hasTarget = true; }
    }
    if (hasTarget) w.aim = lerpAngle(w.aim, dirTarget, acquire * dt);
    w.cd -= dt;
    if (w.cd <= 0 && hasTarget) {
      fire(world, w, eff, w.aim);
      w.cd = eff.fire / fireMult;
    } else if (w.cd < -1) {
      w.cd = 0;   // don't bank idle time
    }
  }
}

// ---- loadout construction + draft applies ----
function makeInstance(def, isProw) {
  return { def, id: def.id, element: def.element, level: 1, quality: 1, evolved: false, evoDef: null,
    isProw: !!isProw, aim: -Math.PI / 2, cd: 0 };
}

export function initLoadout(world) {
  world.weapons.length = 0;
  world.weapons.push(makeInstance(world.content.prow, true));
  const pulse = world.content.weapons.find((x) => x.id === 'pulse');
  world.weapons.push(makeInstance(pulse, false));
}

export function findWeapon(world, id) { return world.weapons.find((w) => w.def.id === id && !w.isProw); }

export function installOrLevel(world, def, quality) {
  const existing = findWeapon(world, def.id);
  if (existing) {
    existing.level = Math.min(world.config.weaponTiers.maxLevel, existing.level + 1);
    existing.quality = Math.max(existing.quality, quality);
    return existing;
  }
  const inst = makeInstance(def, false);
  inst.quality = quality;
  world.weapons.push(inst);
  return inst;
}

export function applyEvolution(world, evoDef) {
  const w = findWeapon(world, evoDef.from);
  if (!w) return;
  w.evolved = true; w.evoDef = evoDef;
}

// How many non-prow weapon bays are filled / the cap (used by the draft to gate new installs).
export function bayCount(world) { return world.weapons.filter((w) => !w.isProw).length; }
