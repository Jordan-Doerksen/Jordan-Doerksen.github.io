// render.js — draw the whole yard from the model each frame. Fresh rail-ops look:
// charcoal schematic, steel rail, YELLOW diverging target (CROR yard convention),
// signal-style accents. SPEC §9, §11.

import {
  W, H, LEAD_Y, LEAD_LEFT, FOOT, NTRACK, TRACK_IDS, switchPos, trackY,
  TRACK_RIGHT, MAIN_OUT, ENGLEN, CLEAR, SPOT_CLEAR, LEAD_ROUTE, THROUGH_ROUTE, restS, polyAt, TYPES, carLen,
} from './geometry.js';

const C = {
  bg: '#0f1216', panel: '#161a20',
  rail: '#7d8794', railDim: '#4a525c', tie: '#2a2f37',
  normal: '#39b58a',           // switch lined normal (through the ladder)
  reverse: '#f2b134',          // switch lined reverse (diverging into a body track)
  clear: '#e2574c',            // clearance / foul tick
  car: '#aeb6c0', carEdge: '#5b636e', carText: '#1b1f26',
  loco: '#2d333c', locoEdge: '#11a3c4', head: '#ffd27a',
  label: '#cfd6df', dim: '#7b8590', main: '#9aa3ad',
};

export function render(ctx, state, puzzle, opts = {}) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

  // securing (CROR 112) surfaces once securing/kicking is active in the puzzle
  const showSecured = !!(puzzle.rules && (puzzle.rules.includes('secure') || puzzle.rules.includes('kick')));

  drawRoutes(ctx);
  for (let i = 0; i < NTRACK; i++) drawClearTick(ctx, i);
  for (let i = 0; i < NTRACK; i++) drawSwitch(ctx, i, state.lined[TRACK_IDS[i]]);
  drawTrackLabels(ctx, state, showSecured);

  // standing cars. During the inbound cinematic, the not-yet-delivered set-out cars
  // ride on the inbound train, so hide them from their track until delivered.
  const cine = opts.cine || null;
  const shove = opts.anim ? opts.anim.shove : null;
  // arrive: set-out cars ride the inbound. setout: they slide onto the track (drawSetout).
  // depart on: they're normal standing cars. So hide them from the track until `depart`.
  const hide = cine && cine.phase !== 'depart' ? new Set(cine.setoutCars) : null;
  for (let i = 0; i < NTRACK; i++) drawStandingCars(ctx, state, i, shove, hide);

  if (cine) {
    if (cine.phase === 'setout') drawSetout(ctx, state, cine);   // the cars being shoved into the track
    drawInboundTrain(ctx, state, cine);                          // road train; your power is off-scene
  } else {
    // the engine + its cut: animated train if a move is playing, else at rest
    const cutLen = state.engine.reduce((a, c) => a + carLen(state.type[c]), 0);
    if (opts.anim) drawTrain(ctx, opts.anim.route, opts.anim.engS, opts.anim.cut, state);
    else drawTrain(ctx, LEAD_ROUTE, restS(cutLen), state.engine, state);
  }
}

// The inbound road train (loco + ~12 cars) on the through route, for the arrival
// cinematic. Carries the real set-out cars until they're delivered to the track.
function drawInboundTrain(ctx, state, cine) {
  const loco = polyAt(THROUGH_ROUTE, cine.introS);
  carRect(ctx, loco.x, loco.y, loco.angle, ENGLEN, null, 'loco');
  const cars = [];
  for (let k = 0; k < 6; k++) cars.push({ len: 42, type: k % 2 ? 'hopper' : 'box' });
  if (cine.phase === 'arrive') for (const m of cine.setoutCars) cars.push({ len: carLen(state.type[m]), type: state.type[m], loaded: state.loaded[m], mark: m });
  for (let k = 0; k < 5; k++) cars.push({ len: 42, type: k % 2 ? 'box' : 'hopper' });
  let s = cine.introS - ENGLEN / 2;
  for (const c of cars) { const p = polyAt(THROUGH_ROUTE, s - c.len / 2); carRect(ctx, p.x, p.y, p.angle, c.len, c.mark || null, 'car', c.type, c.loaded); s -= c.len; }
}

// The set-out cars sliding into their track from the throat — the inbound spotting
// them in (cine.spotProg 0→1), instead of teleporting onto the track.
function drawSetout(ctx, state, cine) {
  const i = TRACK_IDS.indexOf(cine.to), sx = switchPos(i).x, y = trackY(i);
  const cars = state.tracks[cine.to], P = state.pos[cine.to];
  const idx = []; for (let k = 0; k < cars.length; k++) if (cine.setoutCars.includes(cars[k])) idx.push(k);
  if (!idx.length) return;
  const shift = (P[idx[0]] - SPOT_CLEAR) * (1 - cine.spotProg);   // start bunched at the throat, slide deep
  for (const k of idx) {
    const ne = P[k] - shift, w = carLen(state.type[cars[k]]);
    carRect(ctx, sx + ne + w / 2, y, 0, w, cars[k], 'car', state.type[cars[k]], state.loaded[cars[k]]);
  }
}

function drawRoutes(ctx) {
  // main line continuing off top-right
  rail(ctx, switchPos(NTRACK - 1), MAIN_OUT, C.railDim, 3);
  // ladder spine: foot → up through every switch
  let prev = FOOT;
  for (let i = 0; i < NTRACK; i++) { rail(ctx, prev, switchPos(i), C.railDim, 3); prev = switchPos(i); }
  // lead / drill
  rail(ctx, { x: LEAD_LEFT, y: LEAD_Y }, { x: FOOT.x, y: FOOT.y }, C.rail, 4);
  // body tracks
  for (let i = 0; i < NTRACK; i++) rail(ctx, switchPos(i), { x: TRACK_RIGHT, y: trackY(i) }, C.rail, 4);

  // chrome labels — each on a dark pill so nothing on the canvas obscures them
  tag(ctx, '◄ DEPARTURE · LEAD / DRILL', 10, LEAD_Y - 24, 'left', C.dim);
  tag(ctx, 'MAIN LINE → the road', 840, 18, 'left', C.main);
  tag(ctx, '15 MPH · REDUCED (CROR 105)', W - 10, 18, 'right', C.main);
}

// a label on a translucent dark pill (legible over any rail/car behind it)
function tag(ctx, text, x, y, align = 'left', color = C.label, font = '700 12px ui-monospace, monospace') {
  ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width, padX = 6, h = 17;
  const tx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(10,13,17,0.8)';
  roundRect(ctx, tx - padX, y - h / 2, w + padX * 2, h, 5); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, tx, y + 0.5);
}

function rail(ctx, a, b, color, w) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function drawSwitch(ctx, i, lined) {
  const p = switchPos(i);
  const on = lined === 'reverse';
  ctx.save();
  ctx.translate(p.x, p.y);
  // target diamond
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = on ? C.reverse : C.normal;
  ctx.strokeStyle = '#0c0e11'; ctx.lineWidth = 2;
  const r = 7; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.strokeRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  // glow when reverse (lined for the track)
  if (on) {
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = C.reverse;
    ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function drawClearTick(ctx, i) {
  const y = trackY(i), x = switchPos(i).x + CLEAR;
  ctx.strokeStyle = C.clear; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.stroke();
}

function drawTrackLabels(ctx, state, showSecured) {
  for (let i = 0; i < NTRACK; i++) {
    const id = TRACK_IDS[i], y = trackY(i);
    tag(ctx, id, TRACK_RIGHT + 10, y, 'left', C.label, '700 13px ui-monospace, monospace');
    let sub = y + 16;
    if (showSecured && state.secured[id]) { tag(ctx, 'TIED', TRACK_RIGHT + 10, sub, 'left', C.reverse, '700 10px ui-monospace, monospace'); sub += 13; }
    if (state.kickable && state.kickable.includes(id)) tag(ctx, '⚡ KICKABLE', TRACK_RIGHT + 10, sub, 'left', C.reverse, '700 9px ui-monospace, monospace');
  }
}

function carRect(ctx, x, y, angle, len, label, kind, type, loaded) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  const h = 20;
  if (kind === 'loco') {
    ctx.fillStyle = C.loco; ctx.strokeStyle = C.locoEdge; ctx.lineWidth = 2;
    roundRect(ctx, -len / 2, -h / 2 - 2, len, h + 4, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.head;                                  // headlight
    ctx.beginPath(); ctx.arc(-len / 2 + 5, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  } else {
    const ty = TYPES[type] || TYPES.box, empty = loaded === false;
    // loaded = solid/filled body; empty = hollow/dark with a type-coloured outline
    ctx.fillStyle = empty ? '#10141a' : ty.fill; ctx.strokeStyle = empty ? ty.fill : ty.edge; ctx.lineWidth = 1.5;
    roundRect(ctx, -len / 2, -h / 2, len, h, 3); ctx.fill(); ctx.stroke();
    if (label) {
      const disp = label.split(' ').pop();   // the car number — how it's actually called
      ctx.fillStyle = empty ? ty.fill : C.carText; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = 9; ctx.font = `700 ${fs}px ui-monospace, monospace`;
      while (ctx.measureText(disp).width > len - 8 && fs > 6) { fs -= 0.5; ctx.font = `700 ${fs}px ui-monospace, monospace`; }
      ctx.fillText(disp, 0, 0.5);
      // tiny type tag at the throat end (helps tell sizes/types apart)
      ctx.fillStyle = empty ? 'rgba(255,255,255,0.3)' : 'rgba(20,24,30,0.55)'; ctx.font = '700 6.5px ui-monospace, monospace';
      ctx.textAlign = 'left'; ctx.fillText(ty.tag, -len / 2 + 3, -h / 2 + 5);
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawStandingCars(ctx, state, i, shove, hide) {
  const id = TRACK_IDS[i];
  const cars = state.tracks[id], P = state.pos[id];
  const sx = switchPos(i).x, y = trackY(i);
  const shoving = shove && shove.id === id;                // this cut is being pushed
  for (let k = 0; k < cars.length; k++) {
    if (hide && hide.has(cars[k])) continue;               // still on the inbound — not yet set out
    const nearEdge = shoving ? shove.from[k] + (shove.to[k] - shove.from[k]) * shove.prog : P[k];
    const w = carLen(state.type[cars[k]]);
    carRect(ctx, sx + nearEdge + w / 2, y, 0, w, cars[k], 'car', state.type[cars[k]], state.loaded[cars[k]]);
  }
}

// Draw the loco at arclength engS along `route`, with `cut` trailing toward the
// track (increasing s). cut[0] is nearest the loco.
function drawTrain(ctx, route, engS, cut, state) {
  const loco = polyAt(route, engS);
  carRect(ctx, loco.x, loco.y, loco.angle, ENGLEN, null, 'loco');
  let s = engS + ENGLEN / 2;
  for (const label of cut) {
    const w = carLen(state.type[label]);
    const p = polyAt(route, s + w / 2);
    carRect(ctx, p.x, p.y, p.angle, w, label, 'car', state.type[label], state.loaded[label]);
    s += w;
  }
}

