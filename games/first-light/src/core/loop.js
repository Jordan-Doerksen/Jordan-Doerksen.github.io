// core/loop.js — the requestAnimationFrame loop with delta-time + big-gap clamp.
// Domain-agnostic: hand it update(dt) and draw(dt); it decides when to call them
// based on the state phase. This is the only rAF in the game.

export function startLoop({ state, update, draw }) {
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab switches) so nothing tunnels
    if (state.phase === 'playing') update(dt);
    if (state.phase !== 'paused') draw(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // exposed so the state machine can reset `last` when un-pausing
  return { resetClock: () => { last = performance.now(); } };
}
