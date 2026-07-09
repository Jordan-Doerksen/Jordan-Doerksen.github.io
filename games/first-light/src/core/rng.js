// core/rng.js — deterministic seeded randomness (the Glass Atlas pattern).
// Same seed = same night: world gen and draft draws pull from seeded streams;
// cosmetics use their own stream so juice never desyncs the world.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// distinct stream per (seed, label) — sectors, drafts, cosmetics each get their own
export function stream(seed, label) {
  let h = seed >>> 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 2654435761);
  }
  return mulberry32(h >>> 0);
}

export function randomSeed() {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}

export function seedFromHash() {
  const h = location.hash.replace('#', '');
  if (/^[0-9a-z]+$/.test(h)) {
    const n = parseInt(h, 36);
    if (Number.isFinite(n) && n > 0) return n >>> 0;
  }
  return null;
}

export function writeSeedToHash(seed) {
  try { history.replaceState(null, '', '#' + (seed >>> 0).toString(36)); } catch (e) {}
}

export function seedToHex(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
