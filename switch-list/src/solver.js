// solver.js — the move-first solver, shared by the Node harness (tools/solve.mjs)
// and the browser (compute par + optimal line for a freshly-generated yard).
// Dijkstra over states, cost = (moves, then joints). It applies the REAL engine
// moves, so solver and game can never disagree. Lining is auto-satisfied per move.

import { freshState, pull, spot, kick, checkWin } from './model.js';
import { TRACK_IDS } from './geometry.js';

function clone(s) {
  const tracks = {}, pos = {}, secured = {}, lined = {};
  for (const t of TRACK_IDS) { tracks[t] = s.tracks[t].slice(); pos[t] = s.pos[t].slice(); secured[t] = s.secured[t]; lined[t] = s.lined[t]; }
  return { tracks, pos, type: s.type, loaded: s.loaded, kickable: s.kickable, kickLimit: s.kickLimit, goalTrack: s.goalTrack, engine: s.engine.slice(), secured, lined, out: s.out, moves: s.moves, joints: s.joints, msg: '', won: s.won };
}
function autoLine(s, id) { for (const t of TRACK_IDS) s.lined[t] = (t === id) ? 'reverse' : 'normal'; }
// `out` is part of the state — two otherwise-equal positions cost differently next move
// (a spotted-in engine must pull clear), so they may not be merged away.
function key(s) { return TRACK_IDS.map((t) => s.tracks[t].join(',') + '@' + s.pos[t].join(',')).join(';') + '#' + s.engine.join(',') + (s.out ? '>' : '<'); }

// binary min-heap on (moves, then joints) — move-first scoring; joints (couplings) break ties.
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  _lt(x, y) { const a = x.s, b = y.s; if (a.moves !== b.moves) return a.moves < b.moves; return a.joints < b.joints; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this._lt(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this._lt(a[l], a[m])) m = l; if (r < a.length && this._lt(a[r], a[m])) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; }
}

// Returns { par, joints, opt, explored } for the fewest-moves (then fewest-joints)
// line, or null if unsolvable within the caps (caller can re-seed).
// Sound prune for BUILD-A-TRACK goals (collect a set onto the goal track, possibly
// CLEARING blockers off it and stashing them on scratch tracks):
//   • PULL only from a track that holds a goal car, or the goal track when it still
//     holds a non-goal car (a blocker to clear).
//   • SPOT to the goal track always; to any other track only while the engine holds a
//     non-goal car (i.e. you're stashing a blocker). Pure gathers stay tiny; clearing
//     puzzles open up just enough. (Distractor-only tracks are never pulled.)
export function solve(puzzle, { maxMoves = 28, maxStates = 150000 } = {}) {
  const goalTrack = puzzle.goal.track;
  const goalCars = new Set(puzzle.goal.cars);
  const depart = !!puzzle.goal.depart;          // DEPART: the consist rides on the engine, not a track
  const start = freshState(puzzle);
  const h = new Heap(); h.push({ s: start, path: [] });
  const best = new Map([[key(start), [0, 0]]]);
  let explored = 0;
  while (h.size) {
    const cur = h.pop();
    if (++explored > maxStates) return null;
    if (checkWin(cur.s, puzzle)) return { par: cur.s.moves, joints: cur.s.joints, opt: cur.path, explored };
    if (cur.s.moves >= maxMoves) continue;

    for (const T of TRACK_IDS) {
      const hasGoalCar = cur.s.tracks[T].some((c) => goalCars.has(c));
      const goalHasBlocker = !depart && T === goalTrack && cur.s.tracks[T].some((c) => !goalCars.has(c));
      if (hasGoalCar || goalHasBlocker)
        for (let n = 1; n <= cur.s.tracks[T].length; n++) step(cur, 'pull', T, n, h, best);
    }
    const stashing = cur.s.engine.some((c) => !goalCars.has(c));
    for (const D of TRACK_IDS) {
      // build on the goal track (non-depart), or stash a non-goal car anywhere
      if ((!depart && D === goalTrack) || stashing)
        for (let n = 1; n <= cur.s.engine.length; n++) step(cur, 'spot', D, n, h, best);
    }
    // KICK onto the goal (non-depart only; same moves as a spot but 0 joints, so the
    // solver picks it for the cleaner line). DEPART builds on the engine — no kick.
    if (!depart) for (let n = 1; n <= cur.s.engine.length; n++) step(cur, 'kick', goalTrack, n, h, best);
    // NOTE: the solver does NOT use the lead/drill. Lead-staging is a player tool, trained on
    // hand-crafted puzzles with authored solutions (Jordan's call) — never solver-driven.
  }
  return null;
}
const MOVE_FN = { pull, spot, kick };
function step(cur, act, T, n, h, best) {
  const s = clone(cur.s); autoLine(s, T);
  if (!MOVE_FN[act](s, T, n).ok) return;
  const k = key(s), c = [s.moves, s.joints], b = best.get(k);
  const better = !b || c[0] < b[0] || (c[0] === b[0] && c[1] < b[1]);
  if (better) { best.set(k, c); h.push({ s, path: cur.path.concat([[act, T, n]]) }); }
}

// Replay a line through a fresh engine; report whether it wins and in how many moves.
export function replay(puzzle, line) {
  const s = freshState(puzzle);
  for (const [act, T, n] of line) {
    autoLine(s, T);
    const r = MOVE_FN[act](s, T, n);
    if (!r.ok) return { ok: false, where: `${act} ${T} ${n}`, msg: r.msg };
  }
  return { ok: checkWin(s, puzzle), moves: s.moves, joints: s.joints };
}
