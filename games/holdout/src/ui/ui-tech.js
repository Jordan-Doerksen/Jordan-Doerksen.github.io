// ui-tech.js — the tech terminal panel. Bug/Essence tree live; Alien terminal
// renders OFFLINE with the config note verbatim (never faked — DECISIONS.md).
// Copy (names, blurbs, costs) comes straight from config/tech.json.
import { el, setText, setClass } from './dom.js';

export function buildTech(root, state, actions, cfg) {
  const tree = cfg.tech.trees.bug;
  const panel = el('div', 'tech-panel');
  panel.appendChild(el('h2', null, 'Tech Terminal'));

  const close = el('button', 'btn close', '×');
  close.addEventListener('click', () => { state.ui.techOpen = false; });
  panel.appendChild(close);

  panel.appendChild(el('h2', null, `${tree.name} tree`));

  // Root card.
  const root_ = cardShell(tree.root.name, null, tree.root.blurb, tree.root.cost);
  root_.btn.addEventListener('click', () => actions.buyTechRoot('bug'));
  root_.card.classList.add('root');
  panel.appendChild(root_.card);

  // Three tiers, A and B side by side.
  const tiers = tree.tiers.map((tier, i) => {
    const row = el('div', 'tech-tier');
    const cards = {};
    for (const branch of ['A', 'B']) {
      const def = tier[branch];
      const c = cardShell(def.name, def.pillar, def.blurb, tier.cost);
      c.btn.addEventListener('click', () => actions.buyTech('bug', i, branch));
      row.appendChild(c.card);
      cards[branch] = c;
    }
    panel.appendChild(row);
    return cards;
  });

  // Alien terminal — dark, disabled, honest.
  const alien = el('div', 'tech-alien');
  alien.appendChild(el('div', 't-name', cfg.tech.trees.alien.name));
  alien.appendChild(el('div', null, cfg.tech.trees.alien.offlineNote));
  panel.appendChild(alien);

  root.appendChild(panel);
  return { panel, root: root_, tiers };
}

function cardShell(name, pillar, blurb, cost) {
  const card = el('div', 'tech-card');
  card.appendChild(el('div', 't-name', name));
  if (pillar) card.appendChild(el('div', 't-pillar', pillar));
  card.appendChild(el('div', 't-blurb', blurb));
  card.appendChild(el('div', 't-cost', `${cost} essence`));
  const btn = el('button', 'btn', 'BUY');
  card.appendChild(btn);
  const stateLine = el('div', 't-state', '');
  card.appendChild(stateLine);
  return { card, btn, stateLine };
}

export function updateTech(R, state, cfg) {
  setClass(R.panel, 'open', !!(state.ui && state.ui.techOpen));
  if (!state.ui || !state.ui.techOpen) return; // closed — skip the per-card pass

  const t = state.tech.bug;
  const tree = cfg.tech.trees.bug;
  applyCard(R.root, {
    purchased: t.root,
    forgone: false,
    locked: false,
    affordable: state.essence >= tree.root.cost,
  });
  R.tiers.forEach((cards, i) => {
    const unlocked = t.root && (i === 0 || !!t.tiers[i - 1]);
    const pick = t.tiers[i];
    for (const branch of ['A', 'B']) {
      applyCard(cards[branch], {
        purchased: pick === branch,
        forgone: !!pick && pick !== branch,
        locked: !unlocked,
        affordable: unlocked && !pick && state.essence >= tree.tiers[i].cost,
      });
    }
  });
}

function applyCard(c, s) {
  setClass(c.card, 'purchased', s.purchased);
  setClass(c.card, 'forgone', s.forgone);
  setClass(c.card, 'locked', s.locked);
  const buyable = !s.purchased && !s.forgone && !s.locked;
  setClass(c.btn, 'hidden', !buyable);
  if (buyable && c.btn.disabled !== !s.affordable) c.btn.disabled = !s.affordable;
  setText(c.stateLine, s.purchased ? 'INSTALLED'
    : s.forgone ? 'FORGONE THIS RUN'
    : s.locked ? 'LOCKED'
    : '');
}
