// FULFILLMENT manual renderer — fetches data/codex.json (exported straight from the game's data files
// by tools/export_codex.gd in the game repo) and builds every section, so the public manual can never
// drift from the shipped product. Also wires the itch.io JS API: buy buttons + live pricing.
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── itch.io: buy buttons + live price (graceful if the API script is blocked) ──
  const ITCH = { user: 'jordan-doerksen', game: 'fulfillment' };
  const fallback = () => { for (const id of ['buy-btn', 'buy-btn-2']) { const b = $(id); if (b) b.onclick = () => location.href = `https://${ITCH.user}.itch.io/${ITCH.game}`; } };
  if (typeof Itch !== 'undefined') {
    try {
      Itch.attachBuyButton($('buy-btn'), { user: ITCH.user, game: ITCH.game, width: 680, height: 440 });
      Itch.attachBuyButton($('buy-btn-2'), { user: ITCH.user, game: ITCH.game, width: 680, height: 440 });
      Itch.getGameData({ user: ITCH.user, game: ITCH.game, onComplete: (data) => {
        const p = $('price-line'); if (!p || !data) return;
        if (data.price) p.textContent = data.sale ? `${data.price} · ON SALE −${data.sale.rate}%` : data.price;
      }});
    } catch (e) { fallback(); }
  } else { fallback(); }

  // ── the manual ──
  fetch('data/codex.json').then(r => r.json()).then(C => {
    // WEAPONS
    const wg = $('weapons');
    for (const w of C.weapons) {
      const card = el('div', 'card');
      card.appendChild(el('h3', null, esc(w.name)));
      const chips = el('div');
      chips.appendChild(el('span', 'chip el-' + w.element, w.element));
      chips.appendChild(el('span', 'chip', esc(w.behavior).toUpperCase()));
      if (w.pellets > 1) chips.appendChild(el('span', 'chip', '×' + w.pellets + ' PELLETS'));
      if (w.mag > 1) chips.appendChild(el('span', 'chip', 'MAG ' + w.mag));
      card.appendChild(chips);
      card.appendChild(el('p', 'flavor', esc(w.desc)));
      const t = el('table', 'mks', '<tr><th>MK</th><th>DMG</th><th>ROF</th></tr>' +
        w.mks.map(m => `<tr><td>${['I','II','III','IV','V'][m.mk-1]}</td><td>${m.dmg}</td><td>${m.rof ? m.rof + '/s' : '—'}</td></tr>`).join(''));
      card.appendChild(t);
      card.appendChild(el('p', 'sig', '✦ ' + esc(w.signame).toUpperCase() + ' — ' + esc(w.sigdesc)));
      if (w.elite_perk && w.elite_perk.name)
        card.appendChild(el('p', 'perk', '★ ELITE · ' + esc(w.elite_perk.name).toUpperCase() + ' — ' + esc(w.elite_perk.desc)));
      if (w.forks.length)
        card.appendChild(el('div', 'forks', w.forks.map(f => `<b>Mk★ ${esc(f.name)}</b> — ${esc(f.desc)}`).join('<br>')));
      wg.appendChild(card);
    }
    // MERGERS
    const fg = $('fusions');
    for (const f of C.fusions) {
      const card = el('div', 'card');
      card.appendChild(el('h3', null, esc(f.name)));
      card.appendChild(el('p', 'needs', 'REQUIRES: ' + f.needs.map(esc).join(' + ')));
      card.appendChild(el('p', 'stat', esc(f.stat)));
      card.appendChild(el('p', 'flavor', esc(f.desc)));
      fg.appendChild(card);
    }
    // BOSSES
    const bg = $('bosses');
    const LKIND = ['NO LASER', 'SWEEP LASER', 'SNAP LASER', 'TWIN SPOKES'];
    for (const b of C.bosses) {
      const d = el('div', 'boss');
      d.appendChild(el('div', 't', 'TIER ' + b.tier));
      d.appendChild(el('h3', null, esc(b.title)));
      d.appendChild(el('p', 'sub', '“' + esc(b.subtitle) + '”'));
      d.appendChild(el('p', 'n', b.hp.toLocaleString() + ' HP · ' + b.shell + ' SHELL'));
      const bits = [];
      if (b.melee) bits.push('MELEE DASHES'); if (b.rings) bits.push(b.rings + ' RING VOLLEYS');
      bits.push(LKIND[b.laser]); if (b.aimed) bits.push('AIMED BURSTS');
      if (b.deputies) bits.push(b.deputies + ' DEPUT' + (b.deputies > 1 ? 'IES' : 'Y'));
      if (b.tier >= 5) bits.push('SHOCKWAVE · BLACK HOLE');
      d.appendChild(el('p', 'kitline', bits.join(' · ')));
      bg.appendChild(d);
    }
    // PACT
    const mg = $('modifiers');
    for (const m of C.modifiers) mg.appendChild(el('div', 'row', `<b>${esc(m.name)}</b> <span class="pay">+${m.scrip}% SCRIP · +${m.rare}% RARE</span><span>${esc(m.desc)}</span>`));
    const dg = $('directives');
    for (const d of C.directives) dg.appendChild(el('div', 'row', `<b>${esc(d.name)}</b><span>${esc(d.desc)}</span><span class="un">UNLOCK: ${esc(d.unlock)}</span>`));
    // DEPOT
    const dep = $('depot-list');
    for (const r of C.depot) dep.appendChild(el('div', 'rider', `<b>${esc(r.name)} <i>×${r.max}</i></b><span>${esc(r.desc)}</span>`));
    // HULLS
    const hg = $('hulls');
    for (const h of C.hulls) {
      const card = el('div', 'card');
      card.appendChild(el('h3', null, esc(h.name) + ' <span class="chip">' + esc(h.tag) + '</span>'));
      card.appendChild(el('p', 'flavor', esc(h.desc)));
      card.appendChild(el('p', null, `<span class="chip">BAYS ${h.bays}</span><span class="chip">PIPS ${h.pips}</span><span class="chip">SHIELD ${h.shield}</span><span class="chip">SPEED ${h.speed}</span>`));
      card.appendChild(el('p', null, esc(h.philosophy)));
      hg.appendChild(card);
    }
    // FINE PRINT
    for (const [id, arr, fmt] of [
      ['passives', C.passives, (x) => `<b>${esc(x.name)}</b><span>${esc(x.desc)}</span>`],
      ['systems', C.systems, (x) => `<b>${esc(x.name)}</b><span>${esc(x.desc)}</span>`],
      ['synergies', C.synergies, (x) => `<b>${esc(x.name)}</b> <span class="pay">${esc(x.stat)}</span><span>${esc(x.desc)}</span>`],
      ['boons', C.boons, (x) => `<b>${esc(x.name)}</b> <span class="pay">${esc(x.stat)}</span><span>${esc(x.desc)}</span>`],
    ]) { const box = $(id); for (const x of arr) box.appendChild(el('div', 'row', fmt(x))); }
  }).catch(err => {
    const wg = $('weapons');
    if (wg) wg.appendChild(el('p', 'flavor', 'The manual failed to load. The company denies responsibility. (' + esc(err.message) + ')'));
  });
})();
