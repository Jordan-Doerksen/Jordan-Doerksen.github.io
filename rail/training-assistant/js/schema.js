// ==========================================================================
// SCHEMA — the single shape every piece of rail knowledge takes. Pure data, no
// DOM: it imports cleanly in the browser AND in Node (tools/validate.mjs uses
// this exact file). Lock this; every feature (reference, drills, progress,
// assistant) reads entries of this shape, so features are additive — the
// foundation never gets re-poured.
//
//   entry = {
//     id        unique kebab id            "def-engine"
//     domain    defs | signals | switching | operating
//     ref       the citation               "CROR 113.5(a)"  | "CROR — Definitions"
//     source    where ref lives            "Canadian Rail Operating Rules — Jan 28, 2025"
//     trust     rulebook | S.I. | SME      (rulebook text · special instruction · SME/firsthand)
//     title     short name
//     body      the text / digest
//     tags?     string[]                   for filtering + drills
//     related?  id[]                       cross-links
//     smeNote?  string                     SME caveat shown apart from the rule
//     aspect?   {}                         signals only — feeds the SVG renderer (L1)
//     drill?    { override?, suppress? }   drills are DERIVED by default (L2)
//   }
// ==========================================================================

export const DOMAINS = ['defs', 'signals', 'switching', 'operating'];
export const TRUST = ['rulebook', 'S.I.', 'SME'];
export const REQUIRED = ['id', 'domain', 'ref', 'source', 'trust', 'title', 'body'];

export function validateEntry(e) {
  const errs = [];
  for (const k of REQUIRED) if (e[k] == null || e[k] === '') errs.push(`missing "${k}"`);
  if (e.domain && !DOMAINS.includes(e.domain)) errs.push(`bad domain "${e.domain}"`);
  if (e.trust && !TRUST.includes(e.trust)) errs.push(`bad trust "${e.trust}"`);
  if (e.tags && !Array.isArray(e.tags)) errs.push('"tags" must be an array');
  if (e.related && !Array.isArray(e.related)) errs.push('"related" must be an array');
  return errs;
}
