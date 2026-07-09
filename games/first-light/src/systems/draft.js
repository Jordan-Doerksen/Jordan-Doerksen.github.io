// systems/draft.js — the chandler's skiff. One 3-card draw per sector (rule 3).
// Six slots cap breadth (rule 1); one card per draw is guaranteed on-build (rule 2);
// every effect sums into the single mods bag (rule 4). Synergies are discoverable:
// they enter the pool only once both ingredients are owned (Fulfillment's pattern)
// and are never listed anywhere beforehand.

export function createDraft(cfg, state) {
  const CARDS = cfg.cards;
  const SYN = cfg.synergies;
  const owned = {};   // id -> tier owned
  const synergiesTaken = {};

  function reset() {
    for (const k in owned) delete owned[k];
    for (const k in synergiesTaken) delete synergiesTaken[k];
  }

  const slotsUsed = () => Object.keys(owned).length;
  const lanesOwned = () => new Set(Object.keys(owned).map(id => CARDS[id].lane));

  function eligible() {
    const slotOpen = slotsUsed() < cfg.draft.slots;
    const pool = [];
    for (const id in CARDS) {
      const have = owned[id] || 0;
      if (have >= CARDS[id].tiers) continue;       // maxed
      if (have === 0 && !slotOpen) continue;       // no slot left for a new line
      pool.push({ id, kind: 'card' });
    }
    for (const id in SYN) {
      if (synergiesTaken[id]) continue;
      if (SYN[id].needs.every(n => owned[n])) pool.push({ id, kind: 'synergy' });
    }
    return pool;
  }

  function describe(entry) {
    if (entry.kind === 'synergy') {
      const s = SYN[entry.id];
      return {
        id: entry.id, kind: 'synergy', lane: 'synergy', name: s.name,
        tierLabel: '✦ discovered', flavor: s.flavor,
        effect: effectLine(s.mod, s.value, 0),
      };
    }
    const c = CARDS[entry.id];
    const nextTier = (owned[entry.id] || 0) + 1;
    return {
      id: entry.id, kind: 'card', lane: c.lane, name: c.name,
      tierLabel: 'I I I'.split(' ').slice(0, nextTier).join('') || 'I',
      tier: nextTier, flavor: c.flavor,
      effect: effectLine(c.mod, c.perTier, owned[entry.id] || 0),
    };
  }

  function effectLine(mod, val, have) {
    const pct = v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
    switch (mod) {
      case 'beamArc': return `beam width ${pct(val)}`;
      case 'beamRange': return `beam reach ${pct(val)}`;
      case 'sternLamp': return 'adds a rear beam';
      case 'pingRate': return `ping rate ${pct(val)}`;
      case 'pingRadius': return `ping reach ${pct(val)}`;
      case 'inkAlpha': return 'chart ink glows brighter';
      case 'hearts': return '+1 hull';
      case 'speed': return `hull speed ${pct(val)}`;
      case 'iframes': return `grace after a hit ${pct(val)}`;
      case 'surveyRadius': return `survey ring ${pct(val)}`;
      case 'surveyRate': return `survey speed ${pct(val)}`;
      case 'salvageValue': return `salvage worth ${pct(val)}`;
      case 'beamLinger': return 'beam-light lingers 3×';
      case 'autoChart': return 'wrecks pre-chart each sector';
      default: return '';
    }
  }

  // 3 cards: synergies (rare, delightful) jump the queue; then one guaranteed
  // owned-lane card if any exists (deepen > new toy); rest random without repeats.
  function roll(rng) {
    const pool = eligible();
    const picks = [];
    const take = (entry) => {
      picks.push(describe(entry));
      pool.splice(pool.indexOf(entry), 1);
    };

    const syn = pool.filter(p => p.kind === 'synergy');
    if (syn.length && rng() < 0.65) take(syn[Math.floor(rng() * syn.length)]);

    const lanes = lanesOwned();
    const onBuild = pool.filter(p => p.kind === 'card' && lanes.has(CARDS[p.id].lane));
    if (onBuild.length) take(onBuild[Math.floor(rng() * onBuild.length)]);

    while (picks.length < cfg.draft.cardsPerDraw && pool.length) {
      take(pool[Math.floor(rng() * pool.length)]);
    }
    return picks;
  }

  // apply a pick into the one mods bag (additive — rule 4)
  function take(card, ship) {
    const mods = state.mods;
    if (card.kind === 'synergy') {
      const s = SYN[card.id];
      synergiesTaken[card.id] = true;
      if (s.mod === 'beamLinger') mods.beamLinger = s.value;
      if (s.mod === 'autoChart') mods.autoChart = s.value;
      return;
    }
    const c = CARDS[card.id];
    owned[card.id] = (owned[card.id] || 0) + 1;
    switch (c.mod) {
      case 'hearts':
        mods.hearts += c.perTier;
        state.hearts = Math.min(state.hearts + c.perTier, cfg.ship.hearts + mods.hearts, cfg.ship.maxHearts);
        break;
      case 'sternLamp': mods.sternLamp = 1; break;
      case 'inkAlpha': mods.inkAlpha += c.perTier; break;
      default: mods[c.mod] += c.perTier; // multiplier-style mods sum additively onto 1
    }
  }

  return { reset, roll, take, owned, slotsUsed };
}
