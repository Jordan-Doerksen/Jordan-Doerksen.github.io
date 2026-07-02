// model.js — the rules brain. State + moves (PULL / SPOT), switch lining (CROR
// 104), securing (112), win + grading. Score = MOVES (the goal); JOINTS = couplings.
//
// Cars carry an explicit near-edge position (px from their switch) AND a TYPE with a
// real length — so a yard of mixed sizes (box / hopper / tank / centerbeam / autorack)
// lays out and works correctly, a car only moves when pushed, and tracks can hold
// separated cuts.

import { TRACK_IDS, NTRACK, CARLEN, CLEAR, SPOT_CLEAR, LEAD_CLEAR, TRACK_RIGHT, switchPos, carLen, kickableType } from './geometry.js';

export const lenOf = (state, label) => carLen(state.type[label]);
export const loadedOf = (state, label) => state.loaded[label] !== false;   // default loaded

// puzzle.start[id] is a layout list: a number = a gap in px (a leading number =
// how far off the switch the first car sits); a string = a box car by that mark;
// an [mark, type] pair = a car of that type. e.g.
//   AS72: [200, 'CN 41', ['GATX 90','tank'], ['TTGX 5','autorack']]
function layout(entries) {
  const cars = [], pos = [], types = {}, loads = {};
  let cursor = null;
  for (const e of entries) {
    if (typeof e === 'number') { cursor = cursor == null ? e : cursor + e; continue; }
    const mark = Array.isArray(e) ? e[0] : e;
    const type = Array.isArray(e) ? (e[1] || 'box') : 'box';
    const empty = Array.isArray(e) && (e[2] === 'E' || e[2] === 'empty');   // 3rd entry 'E' = empty
    if (cursor == null) cursor = SPOT_CLEAR;
    cars.push(mark); pos.push(cursor); types[mark] = type; loads[mark] = !empty;
    cursor += carLen(type);
  }
  return { cars, pos, types, loads };
}

export function freshState(puzzle) {
  const tracks = {}, pos = {}, secured = {}, lined = {}, type = {}, loaded = {};
  for (let i = 0; i < NTRACK; i++) {
    const id = TRACK_IDS[i];
    const L = layout((puzzle.start && puzzle.start[id]) || []);
    tracks[id] = L.cars; Object.assign(type, L.types); Object.assign(loaded, L.loads);
    // settle the cut DEEP — shove it to the back of the track, throat left open, keeping the
    // authored gaps between separate cuts (Jordan: cars go near the end if there's room).
    const trackLen = TRACK_RIGHT - switchPos(i).x;
    const dEdge = L.cars.length ? L.pos[L.pos.length - 1] + carLen(L.types[L.cars[L.cars.length - 1]]) : 0;
    const shift = L.cars.length ? Math.max(0, trackLen - dEdge) : 0;
    pos[id] = L.pos.map((p) => p + shift);
    secured[id] = (puzzle.startSecured && puzzle.startSecured[id]) || tracks[id].length >= 2;
    lined[id] = 'normal';
  }
  // kickable tracks are a SPECIAL INSTRUCTION, per puzzle (may be none). The kick
  // count limit is also an S.I. — per puzzle, but the ceiling is always 5 total / 3
  // loaded (a puzzle may be stricter, never looser; Jordan's call).
  const kickable = puzzle.kickable ? puzzle.kickable.slice() : [];
  const kl = puzzle.kickLimit || {};
  const kickLimit = { total: Math.min(5, kl.total ?? 5), loaded: Math.min(3, kl.loaded ?? 3) };
  // engine `out` = sitting on the lead, clear of the tracks. Start out. A SPOT leaves the
  // engine IN (it shoved the cut in and hasn't pulled out yet); the next move pays that
  // pull-out as a +1 "reposition". So a finishing spot never charges its pull-out — that's
  // why a 3-handling job (pull, pull, spot) is 5 engine-moves, not 6.
  return { tracks, pos, type, loaded, engine: [], secured, lined, kickable, kickLimit, goalTrack: puzzle.goal && puzzle.goal.track, out: true, moves: 0, joints: 0, msg: '', won: false };
}

// --- Switch lining / route check (CROR 104) -------------------------------
export function lineSwitch(state, id) {
  state.lined[id] = state.lined[id] === 'reverse' ? 'normal' : 'reverse';
}

export function routeReady(state, id) {
  const i = TRACK_IDS.indexOf(id);
  if (state.lined[id] !== 'reverse')
    return { ok: false, msg: `${id} is lined normal — line its switch reverse for the track (CROR 104).` };
  for (let j = 0; j < i; j++) {
    if (state.lined[TRACK_IDS[j]] === 'reverse')
      return { ok: false, msg: `${TRACK_IDS[j]} is lined reverse — you'd divert into it before reaching ${id}. Line the intermediate switches normal (CROR 104).` };
  }
  return { ok: true, msg: '' };
}

// --- Spot planning (pure, length-aware) -----------------------------------
// The cut shoves DEEP: to the end of an empty track, else a car-length GAP short of the
// throat-most standing cut (left as a SEPARATE cut). KICK couples on (the cars roll in and
// join the backstop); a SPOT with no room for a gap also couples rather than crowd the foul
// point. The standing cut never moves — the new cut takes the room ahead of it.
const GAP = CARLEN;                                  // a car-length gap separates distinct cuts
export function spotPlan(state, id, n, couple = false) {
  const trackLen = TRACK_RIGHT - switchPos(TRACK_IDS.indexOf(id)).x;
  const P = state.pos[id], T = state.tracks[id];
  const yourLens = state.engine.slice(state.engine.length - n).map((c) => lenOf(state, c));
  const yourTotal = yourLens.reduce((a, b) => a + b, 0);
  const placeYour = (nearEdge) => { const out = []; let c = nearEdge; for (const L of yourLens) { out.push(c); c += L; } return out; };
  const standingDeepEdge = T.length ? P[T.length - 1] + lenOf(state, T[T.length - 1]) : 0;

  let deepEdge;
  if (T.length === 0) {
    deepEdge = trackLen;                             // empty — shove to the very end
  } else {
    const p0 = P[0];                                 // throat-most standing car's near edge
    // Couple TIGHT onto your own build (the goal track) or a kick backstop — your train is
    // one solid cut. Only a separate, not-yours standing cut gets a car-length gap.
    const mine = couple || id === state.goalTrack;
    deepEdge = (mine || p0 - GAP - yourTotal < CLEAR) ? p0 : p0 - GAP;
  }
  const nearEdge = deepEdge - yourTotal;
  return { yourPos: placeYour(nearEdge), newStanding: P.slice(), shove: false, deepEdge: Math.max(deepEdge, standingDeepEdge), nearEdge };
}

// --- Validators (no mutation) ---------------------------------------------
export function canPull(state, id, n) {
  const r = routeReady(state, id);
  if (!r.ok) return r;
  const have = state.tracks[id].length;
  if (n < 1) return { ok: false, msg: 'Pull at least one car.' };
  if (n > have) return { ok: false, msg: `${id} only has ${have} car${have === 1 ? '' : 's'} to pull.` };
  const cutLen = [...state.engine, ...state.tracks[id].slice(0, n)].reduce((a, c) => a + lenOf(state, c), 0);
  if (cutLen > LEAD_CLEAR)                              // CROR 114 — lead foul (lead dead-ends, can't shove)
    return { ok: false, msg: `That cut is too long for the lead to hold clear of the ladder — won't clear the switch (CROR 114).` };
  return { ok: true, msg: '' };
}

export function canSpot(state, id, n) {
  const r = routeReady(state, id);
  if (!r.ok) return r;
  const have = state.engine.length;
  if (n < 1) return { ok: false, msg: 'Spot at least one car.' };
  if (n > have) return { ok: false, msg: `You're only holding ${have} car${have === 1 ? '' : 's'}.` };
  const plan = spotPlan(state, id, n);
  if (plan.nearEdge < CLEAR)
    return { ok: false, msg: `${id} is too full — no room to spot ${n} more clear of the foul point (CROR 114).` };
  return { ok: true, msg: '' };
}

// --- Moves ----------------------------------------------------------------
export function pull(state, id, n) {
  const v = canPull(state, id, n);
  if (!v.ok) return refuse(state, v.msg);
  const taken = state.tracks[id].splice(0, n);
  state.pos[id].splice(0, n);                          // remaining cars stay put
  state.engine.push(...taken);
  state.joints += 1;
  if (state.tracks[id].length < 2) state.secured[id] = false;
  const cost = (state.out ? 0 : 1) + 2; state.out = true;   // (pull clear if you were spotted in) + back in + pull out
  return commit(state, `Pulled ${n} from ${id}.`, cost);
}

export function spot(state, id, n) {
  const v = canSpot(state, id, n);
  if (!v.ok) return refuse(state, v.msg);
  const onto = state.tracks[id].length > 0;
  const plan = spotPlan(state, id, n);
  const taken = state.engine.splice(state.engine.length - n, n);
  state.tracks[id] = taken.concat(state.tracks[id]);
  state.pos[id] = plan.yourPos.concat(plan.newStanding);
  if (onto) state.joints += 1;
  if (state.tracks[id].length >= 2) state.secured[id] = true;
  const cost = (state.out ? 0 : 1) + 1; state.out = false;  // (pull clear first if needed) + shove in; pull-out deferred until you leave
  return commit(state, `Spotted ${n} to ${id}.`, cost);
}

// KICK n to T — shove and cut away; the cars coast onto a SECURED standing 2+ cut on
// a KICKABLE track. Same landing physics as SPOT but 0 joints (the efficiency win).
// Legal only where the rules allow it (CROR 113.4/113.5 + the yard's special instruction).
export function canKick(state, id, n) {
  const r = routeReady(state, id);
  if (!r.ok) return r;
  const have = state.engine.length;
  if (n < 1) return { ok: false, msg: 'Kick at least one car.' };
  if (n > have) return { ok: false, msg: `You're only holding ${have} car${have === 1 ? '' : 's'}.` };
  if (!state.kickable.includes(id))
    return { ok: false, msg: `${id} isn't a kickable track here — kicking is only allowed where the special instruction says (CROR 113.4).` };
  if (state.tracks[id].length < 2 || !state.secured[id])
    return { ok: false, msg: `You can only kick onto a secured standing cut of 2+ cars — ${id} isn't tied down (CROR 113.4/113.5).` };
  const kicked = state.engine.slice(state.engine.length - n);
  const bad = kicked.find((c) => !kickableType(state.type[c]));
  if (bad)
    return { ok: false, msg: `${bad} can't be kicked — that car type isn't kicked here (CROR 113.4 + special instruction).` };
  if (n > state.kickLimit.total)
    return { ok: false, msg: `Too many to kick at once — the limit here is ${state.kickLimit.total} (special instruction, CROR 113.5(a)(v)).` };
  if (kicked.filter((c) => loadedOf(state, c)).length > state.kickLimit.loaded)
    return { ok: false, msg: `Too many LOADED cars in one kick — at most ${state.kickLimit.loaded} loaded (special instruction).` };
  if (!loadedOf(state, state.tracks[id][0]) && kicked.some((c) => loadedOf(state, c)))
    return { ok: false, msg: `Don't kick a loaded car onto an empty cut — ${id}'s standing car is empty (special instruction).` };
  const plan = spotPlan(state, id, n, true);
  if (plan.nearEdge < CLEAR)
    return { ok: false, msg: `${id} is too full to take ${n} more.` };
  return { ok: true, msg: '' };
}

export function kick(state, id, n) {
  const v = canKick(state, id, n);
  if (!v.ok) return refuse(state, v.msg);
  const plan = spotPlan(state, id, n, true);
  const taken = state.engine.splice(state.engine.length - n, n);
  state.tracks[id] = taken.concat(state.tracks[id]);
  state.pos[id] = plan.yourPos.concat(plan.newStanding);
  // no joint — the kicked cars coast on by themselves (that's the win vs spotting)
  state.secured[id] = true;                            // still a standing 2+ cut
  const cost = (state.out ? 0 : 1) + 1; state.out = true;   // (pull clear first if needed) + one shove, cars coast — no pull-out
  return commit(state, `Kicked ${n} to ${id}.`, cost);
}

function refuse(state, msg) { state.msg = msg; return { ok: false, msg }; }
// MOVES = engine direction-moves (legs). Each op's cost is computed in pull/spot/kick from
// the engine's `out` state: a PULL is back-in + pull-out (2); a SPOT is just the shove-in (1),
// deferring its pull-out — paid as +1 the next time the engine moves; a KICK is one shove (1).
// Net: a finishing spot stays 1 (no next move to pay the pull-out), which is why pull,pull,spot
// is 5 — and kicking saves the deferred pull-out mid-job.
function commit(state, msg, cost = 1) { state.moves += cost; state.msg = msg; return { ok: true, msg }; }

// --- Win + grade ----------------------------------------------------------
const sameSet = (a, b) => { const x = a.slice().sort(), y = b.slice().sort(); return x.length === y.length && x.every((c, k) => c === y[k]); };
const sameOrder = (a, b) => a.length === b.length && a.every((c, k) => c === b[k]);

// "Complete":
//  • DEPART goal — the outbound rides on the ENGINE (you leave with it coupled, no
//    final spot). Engine holds the consist (in manifest order if `ordered`).
//  • otherwise — the consist is built on the goal track and the loco is empty.
// goal.ordered ⇒ exact order (manifest / blocking); else set. The Depart call is UI.
export function checkWin(state, puzzle) {
  const g = puzzle.goal;
  if (g.depart) return g.ordered ? sameOrder(state.engine, g.cars) : sameSet(state.engine, g.cars);
  if (state.engine.length > 0) return false;
  const have = state.tracks[g.track];
  return g.ordered ? sameOrder(have, g.cars) : sameSet(have, g.cars);
}

export function grade(state, puzzle) {
  const par = puzzle.par;
  const m = state.moves, j = state.joints;
  const head = m <= par ? `Par! ${m} move${m === 1 ? '' : 's'}` : `${m} moves — par ${par}`;
  const bonus = `${j} coupling${j === 1 ? '' : 's'}`;
  return { head, bonus, beatPar: m <= par };
}
