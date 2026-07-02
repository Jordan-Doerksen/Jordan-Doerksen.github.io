// ==========================================================================
// DATA — loads the content registry and indexes it. Every view reads through
// here, never the raw files. (Indexing is trivial now; this is where a heavier
// search index would live if the corpus grows.)
// ==========================================================================

import { ENTRIES } from '../content/index.js';

const byId = new Map(ENTRIES.map((e) => [e.id, e]));

export function all() { return ENTRIES; }
export function get(id) { return byId.get(id); }
export function domains() { return [...new Set(ENTRIES.map((e) => e.domain))]; }
