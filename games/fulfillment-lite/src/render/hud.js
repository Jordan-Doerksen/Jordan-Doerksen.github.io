// hud.js — the cockpit readout (DOM over canvas). One-way like the renderer: it READS world and
// writes textContent/style only when a value actually changed (a cache guards every node), so the
// steady state is near-zero DOM work. The bay row reserves a fixed set of slots up front so adding
// a weapon never reflows the panel (the "lock to max size" rule). Numbers only — no game logic here.

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const BAY_SLOTS = 7; // prow + up to 6 drafted bays; reserved so the row never grows

function fmtClock(t) {
  const s = Math.max(0, Math.floor(t));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function createHud(world) {
  const $ = (id) => document.getElementById(id);
  const el = {
    pips: $('pips'), shieldFill: $('shieldFill'), fuelFill: $('fuelFill'),
    clock: $('uiClock'), swarm: $('uiSwarm'), level: $('uiLevel'), scrip: $('uiScrip'), xp: $('xpFill'),
    bays: $('bays'), bossBand: $('bossBand'), bossBar: document.querySelector('#bossBar > i'),
    bossName: $('bossName'),
  };
  const content = world.content;
  const cache = {};
  let pipNodes = [], bayNodes = [];

  function buildPips(n) {
    el.pips.innerHTML = '';
    pipNodes = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'pip';
      el.pips.appendChild(d); pipNodes.push(d);
    }
    cache.pipsMax = n; cache.pips = -1;
  }
  function buildBays() {
    el.bays.innerHTML = '';
    bayNodes = [];
    for (let i = 0; i < BAY_SLOTS; i++) {
      const b = document.createElement('div'); b.className = 'bay';
      const g = document.createElement('span'); g.className = 'g';
      const mk = document.createElement('span'); mk.className = 'mk';
      b.appendChild(g); b.appendChild(mk); el.bays.appendChild(b); bayNodes.push({ b, g, mk });
    }
    cache.baySig = '';
  }

  // Full reset on a new run (pip count / bays may differ from the last shift).
  function reset() {
    buildPips(world.player.pipsMax);
    buildBays();
    for (const k in cache) if (k !== 'pipsMax' && k !== 'baySig') delete cache[k];
    update();
  }

  function set(node, prop, key, val) { if (cache[key] !== val) { node[prop] = val; cache[key] = val; } }

  function update() {
    const p = world.player, cfg = world.config, m = world.mods;

    // hull pips (rebuild if the max changed — Field Rivets adds one)
    if (cache.pipsMax !== p.pipsMax) buildPips(p.pipsMax);
    if (cache.pips !== p.pips) {
      for (let i = 0; i < pipNodes.length; i++) pipNodes[i].classList.toggle('spent', i >= p.pips);
      cache.pips = p.pips;
    }

    // shield + fuel bars
    const shieldMax = cfg.ship.shield + m.shieldMaxAdd;
    const fuelMax = cfg.ship.boostFuelMax * m.boostMult;
    const sw = Math.round(Math.max(0, Math.min(1, p.shield / shieldMax)) * 100);
    const fw = Math.round(Math.max(0, Math.min(1, p.boostFuel / fuelMax)) * 100);
    if (cache.sw !== sw) { el.shieldFill.style.width = sw + '%'; cache.sw = sw; }
    if (cache.fw !== fw) { el.fuelFill.style.width = fw + '%'; cache.fw = fw; }
    // boost hysteresis made visible: a dry tank won't re-arm until it refills a fraction, so the
    // bar dims while boost is locked out — otherwise "boost won't fire" reads as a bug
    if (cache.rearm !== p.boostReady) { el.fuelFill.classList.toggle('rearm', !p.boostReady); cache.rearm = p.boostReady; }

    // top-right stats
    set(el.clock, 'textContent', 'clock', fmtClock(world.time));
    set(el.swarm, 'textContent', 'swarm', String(world.enemies.count));
    if (cache.level !== undefined && String(world.level) !== cache.level) {
      // retrigger the promotion pulse (remove → reflow → add re-runs the CSS animation)
      el.level.classList.remove('pulse'); void el.level.offsetWidth; el.level.classList.add('pulse');
    }
    set(el.level, 'textContent', 'level', String(world.level));
    set(el.scrip, 'textContent', 'scrip', String(world.scrip));
    const xw = Math.round(Math.max(0, Math.min(1, world.xp / world.xpToNext)) * 100);
    if (cache.xw !== xw) { el.xp.style.width = xw + '%'; cache.xw = xw; }

    // weapon bays (bayNodes are built by reset(); guard in case update() is ever called first)
    const ws = world.weapons;
    let sig = '';
    for (const w of ws) sig += w.def.id + (w.evolved ? '*' : w.level) + '|';
    if (bayNodes.length && cache.baySig !== sig) {
      for (let i = 0; i < BAY_SLOTS; i++) {
        const slot = bayNodes[i], w = ws[i];
        if (!w) { slot.b.classList.remove('on'); slot.g.textContent = ''; slot.mk.textContent = ''; continue; }
        slot.b.classList.add('on');
        slot.g.textContent = w.def.name.charAt(0).toUpperCase();
        slot.g.style.color = content.elements[w.def.element].color;
        slot.mk.textContent = w.isProw ? '·' : (w.evolved ? '★' : ROMAN[w.level] || w.level);
      }
      cache.baySig = sig;
    }

    // boss band
    const boss = world.boss;
    const showBand = !!(boss && !boss.dead && (boss.bannerT || 0) <= 0.05); // hold until the banner clears
    if (cache.band !== showBand) { el.bossBand.hidden = !showBand; cache.band = showBand; }
    if (showBand) {
      const frac = Math.max(0, boss.hp / boss.maxhp);
      const bw = Math.round(frac * 100);
      if (cache.bw !== bw) { el.bossBar.style.width = bw + '%'; cache.bw = bw; }
      // shell up → tint the bar toward the boss element so the player reads "strip the shell first"
      const col = boss.shell > 0 ? content.elements[boss.element].color : '';
      if (cache.bcol !== col) { el.bossBar.style.filter = col ? `drop-shadow(0 0 6px ${col})` : ''; cache.bcol = col; }
    }
  }

  return { update, reset };
}
