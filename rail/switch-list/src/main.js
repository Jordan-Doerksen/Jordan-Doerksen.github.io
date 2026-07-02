// main.js — wire the yard up: canvas scaling, switch-lining input, the move
// builder (PULL/SPOT/count/track), the two counters, rule chips, win + reset.
// Command-and-watch: you line the road and call the move; the engine works it.

import { W, H, NTRACK, TRACK_IDS, switchPos, engineRoute, ENGLEN, restS, carLen, LEAD_ROUTE, THROUGH_ROUTE, routeLength } from './geometry.js';
import { freshState, lineSwitch, canPull, canSpot, canKick, spotPlan, pull, spot, kick, checkWin, grade } from './model.js';
import { render } from './render.js';
import { play, setSpeed } from './anim.js';
import { sfx, resume, toggleMute, isMuted } from './sound.js';
import { PUZZLES, RULES } from './puzzles.js';

const canvas = document.getElementById('yard');
const ctx = canvas.getContext('2d');
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);

let puzzle, state, anim = null, busy = false, watching = false;
let gen = 0, stopAnim = null;       // gen invalidates in-flight loops on (re)load; stopAnim aborts the live tween
let ordered = true;                 // is the switch list verified? (true when there's no list to check)
const flagged = new Set();          // indices the player has flagged as wrong
let cine = null, cineCancel = null, cineTimer = null;   // inbound-arrival cinematic state

const $ = (id) => document.getElementById(id);

function cancelCine() {
  if (cineCancel) cineCancel();
  if (cineTimer) clearTimeout(cineTimer);
  cineCancel = cineTimer = null; cine = null;
}

function load(p) {
  gen++;                              // invalidate any in-flight move / watch-optimal loop
  if (stopAnim) stopAnim();          // abort the live tween (mid-move, depart, etc.)
  stopAnim = null;
  cancelCine();
  puzzle = p; state = freshState(p); anim = null; busy = false; watching = false; setSpeed(1);
  ordered = !p.listed; flagged.clear();
  const dep = $('depart'); dep.style.display = p.goal.depart ? '' : 'none'; dep.disabled = true;
  renderRules(); renderOrder(); syncBuilder(); paint(); banner('', '');
  $('readout').textContent = `Moves 0 / par ${p.par} · Joints 0`;
  arrivalCinematic();
}

function paint() { render(ctx, state, puzzle, { anim, cine }); }

// Inbound road train (only on `inbound` puzzles): in off the main, STOP, set out a
// few cars onto the set-out track, then DEPART out the lead — your power is off-scene
// the whole time. Self-finishes even if rAF is throttled, so the puzzle always
// becomes playable (the cars are already on the track in the model).
function arrivalCinematic() {
  cancelCine();
  if (!puzzle.inbound) { paint(); return; }
  const lenR = routeLength(THROUGH_ROUTE), stopS = lenR - 110;
  cine = { introS: -220, setoutCars: puzzle.inbound.cars, to: puzzle.inbound.to, phase: 'arrive', spotProg: 0 };
  const finish = () => { cancelCine(); paint(); };
  cineCancel = play([
    { dur: 2200, fn: (t) => { if (cine) { cine.phase = 'arrive'; cine.introS = -220 + (stopS + 220) * t; } } },   // arrive & stop
    { dur: 1100, fn: (t) => { if (cine) { cine.phase = 'setout'; cine.spotProg = t; } } },                        // spot the cars in
    { dur: 1700, fn: (t) => { if (cine) { cine.phase = 'depart'; cine.introS = stopS + (lenR + 420 - stopS) * t; } } }, // depart out the lead
  ], { onFrame: paint, onDone: finish });
  cineTimer = setTimeout(finish, 5800);
}

// --- input: line a switch by clicking its target -------------------------
canvas.addEventListener('click', (e) => {
  if (busy || cine) return;
  resume();
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  let best = -1, bd = 18;
  for (let i = 0; i < NTRACK; i++) {
    const s = switchPos(i), d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0) { lineSwitch(state, TRACK_IDS[best]); sfx.points(); paint(); }
});

// --- the move builder ----------------------------------------------------
$('work').addEventListener('click', () => {
  resume();
  const kind = $('act').value, id = $('track').value, n = +$('count').value;
  doMove(kind, id, n);
});
$('optimal').addEventListener('click', () => { resume(); watchOptimal(); });
$('depart').addEventListener('click', () => { resume(); departOut(); });
$('reset').addEventListener('click', () => { if (!busy) load(puzzle); });
$('mute').addEventListener('click', () => { $('mute').textContent = toggleMute() ? '🔇' : '🔊'; });

// Full validation up front (lining + count + foul/clearance) so a fouling move is
// refused before the engine ever moves.
function precheck(kind, id, n) {
  return kind === 'pull' ? canPull(state, id, n) : kind === 'kick' ? canKick(state, id, n) : canSpot(state, id, n);
}

function animateMove(kind, id, n) {
  return new Promise((resolve) => {
    const i = TRACK_IDS.indexOf(id);
    const route = engineRoute(i);
    const sw = sSwitch(i);
    const heldLen = state.engine.reduce((a, c) => a + carLen(state.type[c]), 0);
    // where the cut's deepest car comes to rest on the track — the loco stops here,
    // never driving past it into standing cars.
    let coupleFar, shoveBase = null;
    if (kind === 'pull') {
      coupleFar = sw + state.pos[id][0];                       // the throat car's near edge
    } else {
      const plan = spotPlan(state, id, n);
      const deepCar = state.engine[state.engine.length - 1];   // deepest spotted car
      coupleFar = sw + plan.yourPos[plan.yourPos.length - 1] + carLen(state.type[deepCar]);
      if (plan.shove) shoveBase = { id, from: state.pos[id].slice(), to: plan.newStanding, oldThroat: state.pos[id][0] };
    }
    const engIn = coupleFar - ENGLEN / 2 - heldLen;
    const restStart = restS(heldLen);
    const cutFarStart = restStart + ENGLEN / 2 + heldLen;
    // the standing cut only starts moving once the loco's cut actually reaches it
    const contactF = shoveBase && coupleFar !== cutFarStart
      ? Math.min(0.92, Math.max(0, (sw + shoveBase.oldThroat - cutFarStart) / (coupleFar - cutFarStart)))
      : 0;
    const lerp = (a, b, t) => a + (b - a) * t;
    let cut = state.engine.slice();        // what the loco carries on the way in
    let committed = false, restEnd = restStart;
    const commitOnce = () => {
      if (committed) return;
      committed = true;
      const onto = kind === 'spot' && state.tracks[id].length > 0;
      (kind === 'pull' ? pull : kind === 'kick' ? kick : spot)(state, id, n);
      if (kind === 'kick') sfx.roll(); else if (kind === 'pull' || onto) sfx.couple(); else sfx.roll();
      cut = state.engine.slice();          // what it carries on the way out
      restEnd = restS(state.engine.reduce((a, c) => a + carLen(state.type[c]), 0));
    };
    const phases = [
      {
        dur: 600, fn: (t) => {
          const shove = shoveBase
            ? { id: shoveBase.id, from: shoveBase.from, to: shoveBase.to, prog: Math.min(1, Math.max(0, (t - contactF) / (1 - contactF))) }
            : null;
          anim = { route, engS: lerp(restStart, engIn, t), cut, shove };
        },
      },
    ];
    // CROR 113.2 — after coupling, the engineer STRETCHES the joint to confirm the knuckles
    // are locked before pulling. PULL only (you've just coupled on). A subtle tug toward the
    // lead to take up the slack, then settle — flavour, not a gate; the move is already committed.
    if (kind === 'pull') {
      phases.push({
        dur: 280, fn: (t) => {
          commitOnce();                                  // cars are now on the loco
          anim = { route, engS: engIn - 6 * Math.sin(t * Math.PI), cut, shove: null };
        },
      });
    }
    phases.push({
      dur: 600, fn: (t) => {
        commitOnce();
        anim = { route, engS: lerp(engIn, restEnd, t), cut, shove: null };
      },
    });
    const cancel = play(phases, { onFrame: paint, onDone: () => { stopAnim = null; anim = null; resolve(); } });
    stopAnim = () => { cancel(); resolve(); };          // load() can abort this move mid-flight
  });
}

function doMove(kind, id, n) {
  if (busy || cine) return;
  if (!ordered) { sfx.refuse(); banner('Verify the switch list first — flag the bad lines and certify the order.', 'bad'); return; }
  const chk = precheck(kind, id, n);
  if (!chk.ok) { sfx.refuse(); banner(chk.msg, 'bad'); return; }
  busy = true;
  const g = gen;
  animateMove(kind, id, n).then(() => { if (gen !== g) return; busy = false; afterMove(); });
}

// Auto-line the ladder for the route to `id`: its switch reverse, all others normal.
function autoLine(id) { for (const t of TRACK_IDS) state.lined[t] = (t === id) ? 'reverse' : 'normal'; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ▶ Watch optimal — reset, then auto-line + play the fewest-moves line in slow-mo.
async function watchOptimal() {
  if (busy || cine || !puzzle.opt) return;
  load(puzzle);
  const myGen = gen;                 // if the puzzle is switched mid-demo, bail out cleanly
  cancelCine();                      // skip the arrival cinematic for the demo
  if (!ordered) {                                   // auto-certify the list for the demo
    puzzle.listed.forEach((e, i) => { if (e.error) flagged.add(i); });
    ordered = true; renderOrder();
  }
  busy = true; watching = true; setSpeed(1.7);
  banner(`▶ Watching the optimal line — par ${puzzle.par} move${puzzle.par === 1 ? '' : 's'}`, 'ok');
  for (const [act, trk, n] of puzzle.opt) {
    if (gen !== myGen) return;
    autoLine(trk); sfx.points(); paint(); await sleep(520);
    if (gen !== myGen) return;
    await animateMove(act, trk, n);
    if (gen !== myGen) return;
    $('readout').textContent = `Moves ${state.moves} / par ${puzzle.par} · Joints ${state.joints}`;
    await sleep(320);
  }
  if (gen !== myGen) return;
  setSpeed(1); busy = false; watching = false;
  afterMove();
  if (puzzle.goal.depart && checkWin(state, puzzle)) departOut();   // finish the demo by departing
}

function afterMove() {
  $('readout').textContent = `Moves ${state.moves} / par ${puzzle.par} · Joints ${state.joints}`;
  banner(state.msg, 'ok');
  syncBuilder(); paint();
  const done = checkWin(state, puzzle);
  if (done && puzzle.goal.depart) {
    $('depart').disabled = false;                    // built in order — let them depart
    banner(`✓ Outbound built${puzzle.goal.ordered ? ' in order' : ''} — call Depart ▸ to leave.`, 'win');
  } else {
    $('depart').disabled = true;
    if (done) winBanner();
  }
}

function winBanner() {
  const g = grade(state, puzzle);
  sfx.win();
  const clean = state.joints <= bestJoints() ? ` — ${g.bonus}, clean` : ` · ${g.bonus}`;
  banner(`${g.beatPar ? '✓ ' : ''}${g.head}${clean}`, g.beatPar ? 'win' : 'ok');
}

// Depart — the deliberate final call once the outbound is assembled (P6). The
// consist is already coupled to the loco; it leaves out the lead, off-frame.
function departOut() {
  if (busy || !puzzle.goal.depart || !checkWin(state, puzzle)) return;
  const g = grade(state, puzzle);
  sfx.win();
  const clean = state.joints <= bestJoints() ? ` — ${g.bonus}, clean` : ` · ${g.bonus}`;
  banner(`✓ Departed out the lead — ${g.head}${clean}`, g.beatPar ? 'win' : 'ok');   // win registered now
  $('depart').disabled = true;
  // flavor: pull the whole train out the lead, off-frame left
  busy = true;
  const cutLen = state.engine.reduce((a, c) => a + carLen(state.type[c]), 0);
  const startS = restS(cutLen), endS = -(cutLen + ENGLEN + 220);
  const cut = state.engine.slice();
  stopAnim = play([{ dur: 1300, fn: (t) => { anim = { route: LEAD_ROUTE, engS: startS + (endS - startS) * t, cut }; } }],
    { onFrame: paint, onDone: () => { stopAnim = null; anim = null; busy = false; paint(); } });
}

// rough "clean" benchmark until the solver owns it
function bestJoints() { return Math.max(1, Math.ceil(puzzle.par / 2)); }

function syncBuilder() {
  // keep the count cap sensible for the chosen action
  const kind = $('act').value, id = $('track').value;
  const max = kind === 'pull' ? (state.tracks[id]?.length || 1) : Math.max(1, state.engine.length);
  const cnt = $('count'); const cur = +cnt.value;
  cnt.innerHTML = '';
  for (let k = 1; k <= Math.max(1, max); k++) {
    const o = document.createElement('option'); o.value = k; o.textContent = k; cnt.appendChild(o);
  }
  cnt.value = Math.min(cur || 1, Math.max(1, max));
}
['act', 'track'].forEach((id) => $(id).addEventListener('change', syncBuilder));

function renderRules() {
  const box = $('rules'); box.innerHTML = '';
  for (const key of puzzle.rules) {
    const r = RULES[key]; if (!r) continue;
    const chip = document.createElement('div');
    chip.className = `chip ${r.kind}`;
    chip.innerHTML = `<b>${r.cite}</b><span>${r.label}</span>`;
    box.appendChild(chip);
  }
}

// Route the work-order panel: a normal order, the interactive switch-list check
// (#7), or the verified/corrected order once certified.
function renderOrder() {
  if (!puzzle.listed) { renderWorkOrder(); return; }
  if (ordered) { renderVerifiedOrder(); return; }

  const rows = puzzle.listed.map((e, i) =>
    `<div class="ord-row${flagged.has(i) ? ' flagged' : ''}" data-i="${i}">`
    + `<span class="ord-flag">${flagged.has(i) ? '⚑' : '▢'}</span>`
    + `<span class="ord-mark">${e.listedMark}</span><span class="ord-arrow">→</span><span class="ord-trk">${e.listedTrack}</span>`
    + `</div>`).join('');
  $('workorder').innerHTML =
    `<div class="wo-top"><span class="wo-tag si">SWITCH LIST</span> <span class="wo-id">${puzzle.id.toUpperCase()}</span> · the list can be wrong</div>`
    + `<div class="wo-job">Build <b>${puzzle.goal.track}</b> from these cars. Check each line against the yard — tap any that <b>don't match</b>, then certify.</div>`
    + `<div class="ord-list">${rows}</div>`
    + `<button class="go" id="certify">Certify order ▸</button>`
    + `<div class="wo-meta"><span class="wo-tip">${puzzle.hint}</span></div>`;
  $('workorder').querySelectorAll('.ord-row').forEach((row) => row.addEventListener('click', () => {
    const i = +row.dataset.i; flagged.has(i) ? flagged.delete(i) : flagged.add(i); sfx.points(); renderOrder();
  }));
  $('certify').addEventListener('click', certify);
}

function certify() {
  resume();
  const errs = new Set(puzzle.listed.map((e, i) => (e.error ? i : -1)).filter((i) => i >= 0));
  const ok = flagged.size === errs.size && [...flagged].every((i) => errs.has(i));
  if (ok) {
    ordered = true; sfx.couple();
    renderOrder(); syncBuilder();
    banner(`✓ Order verified — now work the real cars onto ${puzzle.goal.track}.`, 'win');
    return;
  }
  sfx.refuse();
  const missed = [...errs].find((i) => !flagged.has(i));
  const over = [...flagged].find((i) => !errs.has(i));
  let why;
  if (missed != null) {
    const e = puzzle.listed[missed];
    why = e.error === 'location'
      ? `${e.listedTrack} has no ${e.listedMark} — that car isn't where the list says.`
      : `read ${e.listedTrack} again — the number on the ground isn't ${e.listedMark}.`;
  } else {
    const e = puzzle.listed[over];
    why = `${e.listedMark} on ${e.listedTrack} checks out — don't flag a good line.`;
  }
  banner(`Not so fast — ${why}`, 'bad');
}

function renderVerifiedOrder() {
  const g = puzzle.goal;
  const lines = puzzle.listed
    .map((e) => `<b>${e.trueMark}</b> → ${e.trueTrack}${e.error ? ' <span class="ord-fix">(list was wrong)</span>' : ''}`)
    .join(' · ');
  $('workorder').innerHTML =
    `<div class="wo-top"><span class="wo-tag">WORK ORDER ✓</span> <span class="wo-id">${g.track}</span> · verified</div>`
    + `<div class="wo-job">Build <b>${g.track}</b>: ${lines}.</div>`
    + `<div class="wo-meta">Target <b>${puzzle.par} move${puzzle.par === 1 ? '' : 's'}</b> (par) — fewest moves wins.</div>`;
}

// The job, stated like a switch list — derived from the puzzle goal.
function renderWorkOrder() {
  const g = puzzle.goal;
  const src = {};
  for (const [trk, entries] of Object.entries(puzzle.start || {}))
    for (const e of entries) { const m = Array.isArray(e) ? e[0] : e; if (typeof m === 'string') src[m] = trk; }
  const from = [...new Set(g.cars.map((c) => src[c]).filter(Boolean))];
  const nums = g.cars.map((c) => c.split(' ').pop());
  const head = `<div class="wo-top"><span class="wo-tag">WORK ORDER</span> <span class="wo-id">${puzzle.id.toUpperCase()}</span> · ${puzzle.title}</div>`;
  const meta = `<div class="wo-meta">Target <b>${puzzle.par} move${puzzle.par === 1 ? '' : 's'}</b> (par) — fewest moves wins.<span class="wo-tip">${puzzle.hint}</span></div>`;
  const job = g.depart
    ? `<div class="wo-job">Build the outbound${g.ordered ? ' in order' : ''} — gather <b>${nums.join(' · ')}</b> onto your train${from.length ? ` <span class="wo-from">(set out on ${from.join(', ')})</span>` : ''}, then <b>Depart ▸</b>.</div>`
    : `<div class="wo-job">Build <b>${g.track}</b> — gather <b>${nums.join(' · ')}</b> onto it${from.length ? ` <span class="wo-from">(now on ${from.join(', ')})</span>` : ''}.</div>`;
  $('workorder').innerHTML = head + job + meta;
}

function banner(text, tone) {
  const el = $('msg');
  el.textContent = text || '';
  el.className = `banner ${tone || ''}`;
}

// arclength from the lead bumper to track i's switch, along its engine route
function sSwitch(i) {
  const r = engineRoute(i);
  return Math.hypot(r[1].x - r[0].x, r[1].y - r[0].y) + Math.hypot(r[2].x - r[1].x, r[2].y - r[1].y);
}

// --- track dropdown (kept in sync with geometry) -------------------------
const trackSel = $('track');
TRACK_IDS.forEach((id) => { const o = document.createElement('option'); o.value = id; o.textContent = id; trackSel.appendChild(o); });

// --- puzzle picker -------------------------------------------------------
const picker = $('picker');
PUZZLES.forEach((p, k) => {
  const o = document.createElement('option'); o.value = k; o.textContent = `${k + 1}. ${p.title}`;
  picker.appendChild(o);
});
picker.addEventListener('change', () => load(PUZZLES[+picker.value]));

$('mute').textContent = isMuted() ? '🔇' : '🔊';
load(PUZZLES[0]);
