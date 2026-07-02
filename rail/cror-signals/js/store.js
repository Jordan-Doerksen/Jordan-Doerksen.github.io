// ==========================================================================
// STORE — the only place that touches localStorage. Namespaced get/set over a
// single JSON blob. No accounts, no network: every byte stays on the device.
// Namespaces: 'settings' | 'progress' | 'streak' | 'stats'.
// ==========================================================================

const KEY = 'cror-signals-v1';

let mem = read();
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function flush() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* private mode / quota — run in memory */ } }

export function get(ns) { return mem[ns] || {}; }
export function set(ns, val) { mem[ns] = val; flush(); return val; }
export function patch(ns, partial) { mem[ns] = { ...(mem[ns] || {}), ...partial }; flush(); return mem[ns]; }
export function clearAll() { mem = {}; flush(); }
