// ==========================================================================
// UTIL — the few helpers shared across views. Kept tiny on purpose.
// ==========================================================================

export const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "Stop and Proceed" -> the indication name only (drop the "CROR 4xx" ref noise if present)
export const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
