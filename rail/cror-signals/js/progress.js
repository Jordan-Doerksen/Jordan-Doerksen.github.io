// ==========================================================================
// PROGRESS — Leitner spaced-repetition (boxes 1–5), daily streak, mastery, and
// weak-family detection. Pure logic over store.js; every mode records through
// record(). "Mastered" = box 5. Due = box's review interval has elapsed.
// ==========================================================================

import * as store from './store.js';
import { drawn, FAMILIES, familyOf } from './data.js';

const MAX_BOX = 5;
const INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 }; // days until a box is due again

const dayNum = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000) + (d.getFullYear() - 2000) * 366;
const todayStr = () => new Date().toISOString().slice(0, 10);

// ---- per-aspect recording ----
export function record(id, correct) {
  const p = store.get('progress');
  const cur = p[id] || { box: 1, seen: 0, correct: 0, wrong: 0 };
  cur.seen++;
  if (correct) { cur.correct++; cur.box = Math.min(MAX_BOX, cur.box + 1); }
  else { cur.wrong++; cur.box = Math.max(1, cur.box - 1); }
  cur.lastDay = dayNum();
  p[id] = cur;
  store.set('progress', p);
  bumpStreak();
  return cur;
}

// explicit user marking from the Learn screen ("I know this" / "still learning")
export function mark(id, known) {
  const p = store.get('progress');
  const cur = p[id] || { box: 1, seen: 0, correct: 0, wrong: 0 };
  cur.box = known ? MAX_BOX : 1;
  cur.lastDay = dayNum();
  cur.marked = !!known;
  p[id] = cur;
  store.set('progress', p);
  return cur;
}

export function entry(id) { return store.get('progress')[id] || null; }
export function box(id) { return (store.get('progress')[id] || {}).box || 0; }

// ---- aggregates for the Home status strip + Progress screen ----
export function masteredCount() { return drawn().filter((a) => box(a.id) >= MAX_BOX).length; }
export function seenCount() { const p = store.get('progress'); return drawn().filter((a) => p[a.id]).length; }
export function total() { return drawn().length; }

// box distribution across the whole deck (index 0 = unseen)
export function distribution() {
  const dist = [0, 0, 0, 0, 0, 0];
  drawn().forEach((a) => { dist[box(a.id)]++; });
  return dist;
}

// per-family mastery, teaching order; ratio = mastered / total in family
export function familyStats() {
  return FAMILIES.map((f) => {
    const list = drawn().filter((a) => familyOf(a) === f.key);
    const mastered = list.filter((a) => box(a.id) >= MAX_BOX).length;
    const seen = list.filter((a) => entry(a.id)).length;
    const avgBox = seen ? list.reduce((s, a) => s + box(a.id), 0) / list.length : 0;
    return { ...f, total: list.length, mastered, seen, avgBox };
  }).filter((f) => f.total);
}

// the family most in need of work: seen-but-not-mastered, lowest average box
export function weakFamily() {
  const cand = familyStats().filter((f) => f.seen && f.mastered < f.total);
  if (!cand.length) return null;
  cand.sort((a, b) => a.avgBox - b.avgBox);
  return cand[0];
}

// aspects whose Leitner interval has elapsed (or never seen) — the review queue
export function dueIds() {
  const p = store.get('progress');
  const now = dayNum();
  return drawn().filter((a) => {
    const e = p[a.id];
    if (!e) return false; // unseen isn't "due" — it's new; weakFamily/learn handle those
    return now - (e.lastDay || 0) >= (INTERVAL_DAYS[e.box] || 0);
  }).map((a) => a.id);
}

// ---- daily streak ----
export function bumpStreak() {
  const s = store.get('streak');
  const t = todayStr();
  if (s.last === t) return s.count || 1;
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const count = s.last === yest ? (s.count || 0) + 1 : 1;
  store.set('streak', { last: t, count });
  return count;
}
export function streak() {
  const s = store.get('streak');
  if (!s.last) return 0;
  const t = todayStr();
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return (s.last === t || s.last === yest) ? (s.count || 0) : 0; // a missed day breaks it
}

export function resetAll() { store.clearAll(); }
