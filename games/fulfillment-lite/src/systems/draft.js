// draft.js — the level-up requisition (DECISIONS 3.2/3.4). Builds the offered cards and applies the
// pick. If any owned weapon has hit Mk III and has an evolution, the draft becomes a LEGENDARY FORK
// (choose a final form) — the game's marquee moment — otherwise it's a normal PICK ONE from installs,
// Mk level-ups, and augments, each rolled for rarity (rarity scales weapon quality / augment magnitude).

import { findWeapon, installOrLevel, applyEvolution, bayCount } from './weapons.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const roman = (n) => ROMAN[n] || String(n);

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}

function elName(world, el) { return world.content.elements[el].name; }

export function rollRarity(world) {
  const d = world.config.draft, r = world.rng();
  const rareP = (d.rarityRarePct / 100) * Math.min(1, world.time / d.rareRampTime);
  if (r < rareP) return 'rare';
  if (r < rareP + d.rarityUncommonPct / 100) return 'uncommon';
  return 'common';
}

function qualityOf(world, rarity) {
  const d = world.config.draft;
  return rarity === 'rare' ? d.qualityRare : rarity === 'uncommon' ? d.qualityUncommon : 1;
}
function magScale(world, rarity) {
  const d = world.config.draft;
  return rarity === 'rare' ? d.magRare : rarity === 'uncommon' ? d.magUncommon : 1;
}

function forkCandidates(world) {
  const out = [];
  const max = world.config.weaponTiers.maxLevel;
  for (const w of world.weapons) {
    if (w.isProw || w.evolved) continue;
    if (w.level < max) continue;
    const evo = world.content.evolutions.find((e) => e.from === w.def.id);
    if (evo) out.push({ w, evo });
  }
  return out;
}

function upgradeText(world, up, rarity) {
  const amt = up.mag * (up.once ? 1 : magScale(world, rarity));
  switch (up.stat) {
    case 'moveMult': return `+${Math.round(amt * 100)}% flight speed`;
    case 'dmgMult': return `+${Math.round(amt * 100)}% ordnance damage`;
    case 'fireMult': return `+${Math.round(amt * 100)}% fire rate`;
    case 'magnetMult': return `+${Math.round(amt * 100)}% salvage reach`;
    case 'rangeMult': return `+${Math.round(amt * 100)}% weapon reach`;
    case 'boostMult': return `+${Math.round(amt * 100)}% boost capacity`;
    case 'xpMult': return `+${Math.round(amt * 100)}% grade accrual`;
    case 'shieldMax': return `+${Math.round(amt)} shield`;
    case 'shieldRegen': return `+${Math.round(amt)} shield regen`;
    case 'hullPip': return `+${amt} hull pip`;
    default: return '';
  }
}

function decorate(world, c) {
  const d = world.content;
  if (c.kind === 'install') {
    const w = d.weapons.find((x) => x.id === c.wid); const rarity = rollRarity(world);
    return { kind: 'install', wid: c.wid, rarity, name: w.name, flavor: w.desc, effect: 'New instrument · Mk I',
      element: w.element, tierText: 'Mk I', lane: elName(world, w.element) };
  }
  if (c.kind === 'level') {
    const inst = findWeapon(world, c.wid), w = inst.def, nl = inst.level + 1, rarity = rollRarity(world);
    const t = world.config.weaponTiers;
    let extra = '';
    if (nl === t.procUnlockLevel && w.element > 0) extra = ' · unlocks its effect';
    if (nl === t.maxLevel) extra = ' · unlocks ' + (w.signame || 'signature');
    return { kind: 'level', wid: c.wid, rarity, name: w.name, flavor: w.desc,
      effect: `Mk ${roman(inst.level)} → Mk ${roman(nl)}${extra}`, element: w.element, tierText: `Mk ${roman(nl)}`, lane: elName(world, w.element) };
  }
  const up = d.upgrades.find((x) => x.id === c.uid), rarity = up.once ? 'common' : rollRarity(world);
  return { kind: 'upgrade', uid: c.uid, rarity, name: up.name, flavor: up.desc,
    effect: upgradeText(world, up, rarity), element: 0, tierText: 'Augment', lane: 'Augment' };
}

export function buildDraft(world) {
  const forks = forkCandidates(world);
  if (forks.length) {
    world.draftKind = 'fork';
    return forks.slice(0, world.config.draft.options).map((f) => ({
      kind: 'evo', evoId: f.evo.id, wid: f.evo.from, rarity: 'fork', name: f.evo.name, flavor: f.evo.desc,
      effect: 'Final form', element: f.w.element, tierText: 'Mk ★', lane: 'Legendary',
    }));
  }
  world.draftKind = 'pick';
  const owned = new Set(world.weapons.filter((w) => !w.isProw).map((w) => w.def.id));
  const t = world.config.weaponTiers;
  const cands = [];
  if (bayCount(world) < 6) for (const w of world.content.weapons) if (!owned.has(w.id)) cands.push({ kind: 'install', wid: w.id });
  for (const inst of world.weapons) if (!inst.isProw && !inst.evolved && inst.level < t.maxLevel) cands.push({ kind: 'level', wid: inst.def.id });
  for (const up of world.content.upgrades) {
    if (up.once && world.takenOnce && world.takenOnce.has(up.id)) continue;
    cands.push({ kind: 'upgrade', uid: up.id });
  }
  shuffle(cands, world.rng);
  const offers = cands.slice(0, world.config.draft.options).map((c) => decorate(world, c));
  // guarantee at least one offer (fallback augment) so a draft never renders empty
  if (offers.length === 0) offers.push(decorate(world, { kind: 'upgrade', uid: 'bulk_rounds' }));
  return offers;
}

function applyUpgrade(world, uid, rarity) {
  const up = world.content.upgrades.find((x) => x.id === uid);
  const m = world.mods, p = world.player;
  const amt = up.mag * (up.once ? 1 : magScale(world, rarity));
  switch (up.stat) {
    case 'moveMult': m.moveMult += amt; break;
    case 'dmgMult': m.dmgMult += amt; break;
    case 'fireMult': m.fireMult += amt; break;
    case 'magnetMult': m.magnetMult += amt; break;
    case 'rangeMult': m.rangeMult += amt; break;
    case 'boostMult': m.boostMult += amt; break;
    case 'xpMult': m.xpMult += amt; break;
    case 'shieldMax': m.shieldMaxAdd += amt; p.shield += amt; break;
    case 'shieldRegen': m.shieldRegenAdd += amt; break;
    case 'hullPip': p.pipsMax += up.mag; p.pips += up.mag; m.hullPipAdd += up.mag; break;
  }
  if (up.once) { if (!world.takenOnce) world.takenOnce = new Set(); world.takenOnce.add(uid); }
}

export function applyDraft(world, offer) {
  if (!offer) return;
  if (offer.kind === 'evo') { applyEvolution(world, world.content.evolutions.find((e) => e.id === offer.evoId)); return; }
  if (offer.kind === 'install' || offer.kind === 'level') {
    installOrLevel(world, world.content.weapons.find((x) => x.id === offer.wid), qualityOf(world, offer.rarity));
    return;
  }
  if (offer.kind === 'upgrade') applyUpgrade(world, offer.uid, offer.rarity);
}
