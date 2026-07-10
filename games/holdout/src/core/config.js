// src/core/config.js — browser config loader. All tunables live in /config/*.json;
// headless tools (scripts/verify.mjs) load the same files with fs instead of this.

const NAMES = ['game', 'map', 'roster', 'tech'];

export async function loadConfig() {
  const jsons = await Promise.all(NAMES.map(async (name) => {
    const res = await fetch(`config/${name}.json`);
    if (!res.ok) throw new Error(`config/${name}.json failed to load (HTTP ${res.status})`);
    return res.json();
  }));
  const cfg = {};
  NAMES.forEach((name, i) => { cfg[name] = jsons[i]; });
  return cfg; // { game, map, roster, tech }
}
