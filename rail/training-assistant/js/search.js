// ==========================================================================
// SEARCH — keyword + rule-number lookup over the entries. AND-matches every
// term; weights title / citation / tag hits higher so the obvious result floats
// up. "113.5", "kick", "block signal" all work.
// ==========================================================================

import { all } from './data.js';

const norm = (s) => (s || '').toLowerCase();

export function search(q) {
  q = norm(q).trim();
  if (!q) return all();
  const terms = q.split(/\s+/);
  const scored = [];
  for (const e of all()) {
    const hay = norm([e.title, e.ref, e.body, (e.tags || []).join(' '), e.id].join(' '));
    let score = 0, ok = true;
    for (const t of terms) {
      if (!hay.includes(t)) { ok = false; break; }
      if (norm(e.title).includes(t)) score += 5;
      if (norm(e.ref).includes(t)) score += 4;
      if ((e.tags || []).some((tag) => norm(tag).includes(t))) score += 2;
      score += 1;
    }
    if (ok) scored.push([score, e]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].title.localeCompare(b[1].title));
  return scored.map((x) => x[1]);
}
