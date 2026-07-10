// ui-screens.js — title screen and end screens. Built once; patched per frame.
// Copy is deadpan on purpose. Unbuilt systems say OFFLINE — never faked.
import { el, setText, show } from './dom.js';

export function buildTitle(root, actions, cfg) {
  const scr = el('div', 'screen title-screen hidden');
  const mark = el('div', 'wordmark');
  mark.append('HOLD');
  mark.appendChild(el('span', null, 'OUT'));
  scr.appendChild(mark);
  scr.appendChild(el('div', 'tagline', 'Three lanes. One core. It will probably be fine.'));

  const bank = el('div', 'salvage-readout');
  bank.append('SALVAGE BANK ');
  const bankVal = el('b', null, '0');
  bank.appendChild(bankVal);
  scr.appendChild(bank);

  // Meta shop is unbuilt — labeled honestly, never faked (DECISIONS.md non-negotiable).
  scr.appendChild(el('div', 'depot-note', 'SALVAGE DEPOT — OFFLINE. Spending arrives in a later update.'));

  const start = el('button', 'btn primary', 'START RUN');
  start.addEventListener('click', () => actions.startRun());
  scr.appendChild(start);

  scr.appendChild(el('div', 'controls-note', '1/2/3 build · click slot to place · P pause · M mute'));
  scr.appendChild(el('div', 'colophon', '✦ Jordan Doerksen ✦ MMXXVI'));
  root.appendChild(scr);
  return { scr, bankVal };
}

export function buildEnd(root, actions) {
  const scr = el('div', 'screen end-screen hidden');
  const verdict = el('div', 'verdict', '');
  scr.appendChild(verdict);

  const stats = el('div', 'stats');
  stats.append('WAVES CLEARED ');
  const waves = el('b', null, '0');
  stats.appendChild(waves);
  stats.append(' · KILLS ');
  const kills = el('b', null, '0');
  stats.appendChild(kills);
  scr.appendChild(stats);

  const table = el('div', 'salvage-table');
  const rows = {};
  for (const [key, label] of [
    ['essence', 'ESSENCE ×1'],
    ['alien', 'ALIEN TECH ×2'],
    ['waves', 'WAVES ×2'],
    ['bonus', 'WIN BONUS'],
    ['earned', 'SALVAGE EARNED'],
    ['bank', 'BANK TOTAL'],
  ]) {
    const row = el('div', 'srow' + (key === 'earned' || key === 'bank' ? ' total' : ''));
    row.appendChild(el('span', null, label));
    const val = el('b', null, '0');
    row.appendChild(val);
    table.appendChild(row);
    rows[key] = { row, val };
  }
  scr.appendChild(table);

  const back = el('button', 'btn primary', 'RETURN');
  back.addEventListener('click', () => actions.backToTitle());
  scr.appendChild(back);
  root.appendChild(scr);
  return { scr, verdict, waves, kills, rows };
}

export function updateScreens(R, state, cfg) {
  show(R.title.scr, state.mode === 'title');
  const ended = state.mode === 'won' || state.mode === 'lost';
  show(R.end.scr, ended);
  if (state.mode === 'title') {
    setText(R.title.bankVal, state.meta.salvage);
  }
  if (ended) {
    const won = state.mode === 'won';
    setText(R.end.verdict, won ? 'The core held.' : 'The core did not hold.');
    setText(R.end.waves, state.stats.wavesCleared);
    setText(R.end.kills, state.stats.kills);
    const m = cfg.game.meta;
    const essence = Math.floor(state.essence) * m.salvagePerEssence;
    const alien = Math.floor(state.alienTech) * m.salvagePerAlienTech;
    const waves = state.stats.wavesCleared * m.salvagePerWave;
    const bonus = won ? m.winBonus : 0;
    setText(R.end.rows.essence.val, essence);
    setText(R.end.rows.alien.val, alien);
    setText(R.end.rows.waves.val, waves);
    show(R.end.rows.bonus.row, won);
    setText(R.end.rows.bonus.val, bonus);
    setText(R.end.rows.earned.val, essence + alien + waves + bonus);
    setText(R.end.rows.bank.val, state.meta.salvage);
  }
}
