// ==========================================================================
// PROGRESS (L3) — remembers drill results in localStorage and models mastery
// with a Leitner box per entry (0 = new/missed … 5 = mastered). Correct answers
// promote a box and grow a streak; a miss drops it back to 0. This is the gap
// layer the drills write to and the Progress page reads from; L4's adaptive
// "study next" will schedule off these same boxes.
// ==========================================================================

import { all } from './data.js';

const KEY = 'cror-progress-v1';
const MAX_BOX = 5;
const DAY = 86400000;
const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];  // wait per Leitner box
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let store = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private mode / full — drills still work, just unsaved */ } }

// ----- writing -----
export function record(id, correct) {
  const r = store[id] || { box: 0, streak: 0, seen: 0, correct: 0, wrong: 0, last: 0 };
  r.seen++;
  if (correct) { r.box = Math.min(r.box + 1, MAX_BOX); r.streak++; r.correct++; }
  else { r.box = 0; r.streak = 0; r.wrong++; }
  r.lastCorrect = !!correct;
  r.last = Date.now();
  store[id] = r;
  save();
}
export function reset() { store = {}; save(); }

// ----- reading -----
export function getRec(id) { return store[id] || null; }

export function level(rec) {
  if (!rec || !rec.seen) return 'unseen';
  if (rec.box >= 5) return 'mastered';
  if (rec.box >= 4) return 'strong';
  if (rec.box >= 2) return 'learning';
  return 'weak';
}

// weakness priority for "focus weak spots": actual misses first (box 0, seen),
// then never-seen, then climbing boxes. Lower number = drill me sooner.
function priority(id) {
  const r = store[id];
  if (!r || !r.seen) return 0.5;          // unseen — after fresh misses, before known
  return r.box;                            // 0 (missed) … 5 (mastered)
}
export function orderByWeakness(entries) {
  return entries.slice().sort((a, b) =>
    priority(a.id) - priority(b.id) ||
    ((store[b.id]?.wrong || 0) - (store[a.id]?.wrong || 0)) ||
    Math.random() - 0.5);
}

// per-entry mastery fraction (0..1) for bars
const frac = (r) => (r && r.seen ? r.box / MAX_BOX : 0);

// aggregate over a set of entries
function aggregate(entries) {
  const seen = entries.filter((e) => store[e.id]?.seen);
  const buckets = { unseen: 0, weak: 0, learning: 0, strong: 0, mastered: 0 };
  let boxSum = 0;
  for (const e of entries) { const lv = level(store[e.id]); buckets[lv]++; if (store[e.id]?.seen) boxSum += frac(store[e.id]); }
  return {
    total: entries.length,
    seen: seen.length,
    mastery: seen.length ? boxSum / seen.length : 0,    // avg box of SEEN entries, 0..1
    buckets,
  };
}

export function summary() {
  const entries = all();
  const overall = aggregate(entries);
  const domains = {};
  for (const d of [...new Set(entries.map((e) => e.domain))]) domains[d] = aggregate(entries.filter((e) => e.domain === d));
  // weakest seen entries (box asc, then most-missed)
  const weakest = entries
    .filter((e) => store[e.id]?.seen)
    .sort((a, b) => store[a.id].box - store[b.id].box || store[b.id].wrong - store[a.id].wrong)
    .slice(0, 12)
    .map((e) => ({ entry: e, rec: store[e.id] }));
  return { overall, domains, weakest };
}

// a tiny "you keep missing these" list for the drill setup panel
export function weakSpots(n = 5) {
  return all()
    .filter((e) => store[e.id]?.seen && store[e.id].box <= 1)
    .sort((a, b) => store[a.id].box - store[b.id].box || store[b.id].wrong - store[a.id].wrong)
    .slice(0, n);
}
export function hasData() { return Object.keys(store).length > 0; }

// ----- spaced repetition (L4) -----
// A seen entry is "due" once it has waited the interval for its box. Unseen
// entries are "new" (available to introduce, counted separately from due).
export function isDue(id) {
  const r = store[id];
  if (!r || !r.seen) return false;
  return Date.now() - r.last >= INTERVALS[Math.min(r.box, MAX_BOX)];
}
export function dueAt(id) {
  const r = store[id];
  if (!r || !r.seen) return Infinity;
  return r.last + INTERVALS[Math.min(r.box, MAX_BOX)];
}

export function studyStats() {
  const entries = all();
  let due = 0, fresh = 0, learning = 0, soonest = Infinity;
  for (const e of entries) {
    const r = store[e.id];
    if (!r || !r.seen) { fresh++; continue; }
    if (isDue(e.id)) due++;
    else soonest = Math.min(soonest, dueAt(e.id));
    if (r.box > 0 && r.box < MAX_BOX) learning++;
  }
  return { due, fresh, learning, soonest, total: entries.length };
}

// the adaptive session: everything due (most overdue first), then a capped
// number of new entries to introduce, topped up by weakest if still short.
export function studyQueue(limit = 15, maxNew = 8) {
  const entries = all();
  const due = entries.filter((e) => isDue(e.id)).sort((a, b) => dueAt(a.id) - dueAt(b.id));
  const fresh = shuffle(entries.filter((e) => !store[e.id]?.seen));
  const out = [];
  for (const e of due) { if (out.length >= limit) break; out.push(e); }
  let added = 0;
  for (const e of fresh) { if (out.length >= limit || added >= maxNew) break; out.push(e); added++; }
  if (out.length < limit) {
    const seen = new Set(out);
    for (const e of orderByWeakness(entries.filter((x) => !seen.has(x)))) { if (out.length >= limit) break; out.push(e); }
  }
  return out;
}
