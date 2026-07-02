// ==========================================================================
// DATA — loads the aspect records and exposes the drawn set + families.
// Every mode (learn, quiz, build, exam) reads through here.
// ==========================================================================

import { aspects } from '../content/aspects.js';
import { VARIANTS } from '../content/variants.js';

// attach the alternate hardware forms (from the 136 shots) to each indication
aspects.forEach((a) => { a.variants = VARIANTS[a.id] || []; });

// the families we group/practise by, in teaching order
export const FAMILIES = [
  { key: 'clear', label: 'Clear' },
  { key: 'medium', label: 'Medium' },
  { key: 'limited', label: 'Limited' },
  { key: 'diverging', label: 'Diverging' },
  { key: 'slow', label: 'Slow' },
  { key: 'adv', label: 'Advance' },
  { key: 'special', label: 'Restricting / Stop' },
];
const FAMILY_KEYS = new Set(FAMILIES.map((f) => f.key));

// family of an aspect = its non-"signals" tag that names a family
export function familyOf(a) {
  return (a.tags || []).find((t) => FAMILY_KEYS.has(t)) || 'special';
}

// only the records that have a drawable aspect (heads); 401–404/440 are prose, skipped here
const DRAWN = aspects.filter((a) => a.aspect && Array.isArray(a.aspect.heads));

export function drawn() { return DRAWN; }
export function byFamily(key) { return key === 'all' ? DRAWN : DRAWN.filter((a) => familyOf(a) === key); }
export function familyCount(key) { return byFamily(key).length; }
export function get(id) { return DRAWN.find((a) => a.id === id); }

// every hardware FORM of an indication: the canonical aspect + its variants
export function formsOf(a) { return a && a.aspect ? [a.aspect, ...(a.variants || [])] : []; }
export function formCount(a) { return formsOf(a).length; }

// flat list of every distinct form across the deck — one entry per form,
// each carrying a back-ref to its indication record. Powers the "All variants" view.
export function allForms(key = 'all') {
  const out = [];
  for (const a of byFamily(key)) formsOf(a).forEach((spec, i) => out.push({ rec: a, spec, i }));
  return out;
}
export function allFormsCount() { return allForms().length; }

// a short human label for a form, derived from its spec (no stored text)
export function formLabel(spec) {
  const n = spec.heads.length;
  const head = n === 1 ? 'single' : n === 2 ? '2-head' : n + '-head';
  const bits = [head, spec.type === 'dwarf' ? 'dwarf' : 'mast'];
  if (spec.stagger) bits.push('staggered');
  if (spec.plaque) bits.push(spec.plaque + ' plate');
  return bits.join(' · ');
}
