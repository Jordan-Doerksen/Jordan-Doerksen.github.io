/* desk.js — Tool Desk entry point.
   Fetches registry.json + desk.json, merges with window.IT_TOOLKIT,
   renders both tables + pins, wires search/filters/copy.
   Graceful: if desk.json fails we render from the registry alone
   (no pins, no ports/paths — nothing false). */

import { buildModel, render } from './render.js';
import { initSearch } from './search.js';
import { initCopy } from './copy.js';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function main() {
  let registry;
  try {
    registry = await fetchJson('data/registry.json');
  } catch (err) {
    // Without the registry there is no desk — say so quietly, show nothing false.
    document.getElementById('counts').textContent = 'registry unavailable';
    console.error(err);
    return;
  }

  let desk = { pinned: [], mine: {}, toolkit: {} };
  try {
    desk = Object.assign(desk, await fetchJson('data/desk.json'));
  } catch (err) {
    console.warn('desk.json unavailable — rendering from registry alone', err);
  }

  const toolkit = window.IT_TOOLKIT || { categories: [], tools: [] };

  const model = buildModel(registry, desk, toolkit);
  render(model);

  // topbar counts
  const building = model.mine.filter(r => r.status === 'active' || r.status === 'building').length;
  document.getElementById('counts').innerHTML =
    `<b>${model.mine.length}</b> mine · <b>${model.toolkit.length}</b> toolkit · <b>${building}</b> building`;

  initSearch(model);
  initCopy();
}

main();
