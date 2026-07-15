// elements.js — the 5-element wheel (DECISIONS 1.2). Kinetic(0) is neutral both ways. The ring
// Blaze(1)→Frost(2)→Shock(3)→Void(4)→Blaze: each element is STRONG (×1.5) vs the NEXT in the ring
// and WEAK (×0.66) vs the one that beats it; everything else is ×1.0. The five hexes are the whole
// visual language, so the matrix is deliberately tiny and load-bearing.

const STRONG = 1.5, WEAK = 0.66;

function next(e) { return e === 4 ? 1 : e + 1; }

export function elementMult(attacker, defender) {
  if (attacker === 0 || defender === 0) return 1.0;
  if (defender === next(attacker)) return STRONG;   // attacker beats defender
  if (attacker === next(defender)) return WEAK;     // defender beats attacker
  return 1.0;
}

// Verdict tag for the floating damage number (▲ strong / ▼ weak / null neutral).
export function matchTag(attacker, defender) {
  const m = elementMult(attacker, defender);
  return m > 1 ? 'strong' : (m < 1 ? 'weak' : null);
}
