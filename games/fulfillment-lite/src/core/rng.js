// rng.js — the ONE seeded gameplay stream (mulberry32). Determinism law: every gameplay
// random draw goes through world.rng(); same seed ⇒ same run. Cosmetic-only randomness
// (starfield, particle jitter) may use Math.random and must never touch this stream.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience wrappers bound to a stream.
export function makeRng(seed) {
  const r = mulberry32(seed);
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.angle = () => r() * Math.PI * 2;
  return r;
}

export function randomSeed() {
  // seed source is allowed to be non-deterministic — it PICKS the run.
  return (Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
}

export function seedToHex(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function seedFromHash() {
  const h = (location.hash || '').replace(/^#/, '').trim();
  if (!h) return null;
  const n = parseInt(h, 16);
  return Number.isFinite(n) ? (n >>> 0) : null;
}

export function writeSeedToHash(seed) {
  try { history.replaceState(null, '', '#' + seedToHex(seed)); } catch (e) { /* file:// may block */ }
}
