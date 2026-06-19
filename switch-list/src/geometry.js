// geometry.js — the schematic yard: routes, arclength helper, layout constants.
// Simplified single-lead teaching ladder (SPEC §3, §11). Logical coordinate
// space is fixed (W×H); the canvas is scaled to the container in CSS.

export const W = 1340, H = 460;

// --- Lead / drill: horizontal, near the bottom; runs off-frame left (departures
//     roll out this way) to the ladder foot where the ladder leaves the lead.
export const LEAD_Y = 372;
export const LEAD_LEFT = -320;          // off-frame bumper / departure direction
export const FOOT = { x: 300, y: LEAD_Y }; // ladder foot

// --- Ladder: straight diagonal rising up-right from the foot. Each body track
//     diverges at a switch; the ladder continues past AS76 as the main line.
const STEP_X = 70, STEP_Y = 52;          // per-track step along the ladder
export const NTRACK = 6;
export const TRACK_IDS = ['AS71', 'AS72', 'AS73', 'AS74', 'AS75', 'AS76'];

// Switch i: i=0 (AS71) nearest the foot/lead; i=5 (AS76) highest.
export function switchPos(i) {
  return { x: FOOT.x + (i + 1) * STEP_X, y: FOOT.y - (i + 1) * STEP_Y };
}
export function trackY(i) { return switchPos(i).y; }
export const TRACK_RIGHT = 1292;         // deep end of every body track


// --- Main line: the ladder continues past AS76 up off the top-right.
const beyond = switchPos(NTRACK - 1);
export const MAIN_OUT = { x: beyond.x + STEP_X * 3, y: beyond.y - STEP_Y * 3 };

// --- Sizes (px). ~0.84 px/ft (SPEC §3/§4). Different car TYPES have real, different
// lengths — that's the point of types: a yard of mixed sizes works differently.
export const CARLEN = 42;                // legacy default = a 50 ft box car
export const ENGLEN = 64;
export const CLEAR = 30;                 // clearance / foul point: this far out from a switch
export const TRACK_HEAD = 120;           // default gap switch → throat car (well clear of the foul point)
export const SPOT_CLEAR = 120;           // where a fresh spot lands — shoved well in, clear of the foul point
                                         // (≫ CLEAR; a crew never leaves a cut crowding the points — CROR 114)
export const LEAD_REST = 120;            // engine's resting x on the lead (empty)

// kick: may this type be kicked? box/hopper yes; tank/autorack/centerbeam NO
// (Jordan's SME call — high COG / dangerous goods / long loads aren't kicked).
export const TYPES = {
  box:        { len: 42, fill: '#aeb6c0', edge: '#5b636e', tag: 'BX', kick: true },   // ~50 ft
  hopper:     { len: 47, fill: '#9fb6a2', edge: '#5a6b5d', tag: 'HP', kick: true },   // ~56 ft covered hopper
  tank:       { len: 50, fill: '#b3a7c4', edge: '#665d77', tag: 'TK', kick: false },  // ~60 ft tank car
  centerbeam: { len: 61, fill: '#c6b88c', edge: '#6f6543', tag: 'CB', kick: false },  // ~73 ft lumber/centerbeam
  autorack:   { len: 75, fill: '#9fb4c6', edge: '#566875', tag: 'AR', kick: false },  // ~89 ft autorack / car carrier
};
export const carLen = (type) => (TYPES[type] || TYPES.box).len;
export const kickableType = (type) => (TYPES[type] || TYPES.box).kick !== false;

// Lead arclength landmarks (the lead is the first segment of every engine route).
export const S_FOOT = Math.abs(FOOT.x - LEAD_LEFT);   // arclength lead-left → ladder foot
export const REST_DEFAULT = LEAD_REST - LEAD_LEFT;    // empty engine's resting arclength
export const LEAD_CLEAR = S_FOOT - CLEAR - ENGLEN / 2; // max cut length the lead holds clear (px, CROR 114)

// Where the engine (with a cut of pixel length `cutLen`) rests on the lead so the
// whole cut stays clear of the ladder foul point. Backs off-frame as the cut grows.
export function restS(cutLen) {
  return Math.min(REST_DEFAULT, S_FOOT - CLEAR - ENGLEN / 2 - cutLen);
}

// Throat point of a body track (near edge of where its first car sits).
export function throatPoint(i, head = TRACK_HEAD) {
  const s = switchPos(i);
  return { x: s.x + head, y: s.y };
}

// Engine route for working track i: lead → foot → up the ladder → into the body
// track. Used to drive the loco + cut in/out (the "watch it" animation).
export function engineRoute(i) {
  return [
    { x: LEAD_LEFT, y: LEAD_Y },
    { x: FOOT.x, y: FOOT.y },
    switchPos(i),
    { x: TRACK_RIGHT, y: trackY(i) },
  ];
}
// The lead-only route the engine rests on between jobs.
export const LEAD_ROUTE = [{ x: LEAD_LEFT, y: LEAD_Y }, { x: FOOT.x + 40, y: LEAD_Y }];

// Through route — the road: in off the main (top-right), down the ladder, out the
// lead (bottom-left). Used for the inbound-arrival cinematic; extrapolates off-frame
// at both ends (start s<0 beyond MAIN_OUT, finish s>len past the lead bumper).
export const THROUGH_ROUTE = [
  MAIN_OUT,
  ...Array.from({ length: NTRACK }, (_, k) => switchPos(NTRACK - 1 - k)),
  { x: FOOT.x, y: FOOT.y },
  { x: LEAD_LEFT, y: LEAD_Y },
];

// polyAt(route, s): point + heading at arclength `s` along a polyline.
// Extrapolates for s<0 and s>length so equipment can sit off-frame (SPEC §3).
export function polyAt(route, s) {
  if (route.length === 1) return { x: route[0].x, y: route[0].y, angle: 0 };
  const segs = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1e-6;
    segs.push({ a, dx, dy, len, ang: Math.atan2(dy, dx) });
  }
  if (s < 0) {
    const f = segs[0];
    return { x: f.a.x + (f.dx / f.len) * s, y: f.a.y + (f.dy / f.len) * s, angle: f.ang };
  }
  let acc = 0;
  for (const seg of segs) {
    if (s <= acc + seg.len) {
      const t = (s - acc) / seg.len;
      return { x: seg.a.x + seg.dx * t, y: seg.a.y + seg.dy * t, angle: seg.ang };
    }
    acc += seg.len;
  }
  const last = segs[segs.length - 1], over = s - acc;
  return {
    x: last.a.x + last.dx + (last.dx / last.len) * over,
    y: last.a.y + last.dy + (last.dy / last.len) * over,
    angle: last.ang,
  };
}

export function routeLength(route) {
  let n = 0;
  for (let i = 0; i < route.length - 1; i++) n += Math.hypot(route[i + 1].x - route[i].x, route[i + 1].y - route[i].y);
  return n;
}
