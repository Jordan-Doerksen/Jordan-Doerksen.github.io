// core/loop.js — the requestAnimationFrame loop with delta-time + big-gap clamp.
// Domain-agnostic: hand it update(dt) and draw(dt); it decides when to call them
// based on the state phase. This is the only rAF in the game.
// One bad frame must never kill the night: update/draw are trapped, the error is
// logged + surfaced once as a banner, and the loop keeps scheduling.

export function startLoop({ state, update, draw }) {
  let last = performance.now();
  let reported = false;

  function trap(fn, dt, label) {
    try { fn(dt); } catch (e) {
      if (!reported) {
        reported = true;
        console.error(`first-light ${label} error:`, e);
        const b = document.createElement('div');
        b.style.cssText = 'position:fixed;bottom:44px;left:50%;transform:translateX(-50%);z-index:99;' +
          'font:11px/1.5 ui-monospace,monospace;letter-spacing:.08em;color:#ff6b35;' +
          'background:rgba(8,14,26,.9);border:1px solid rgba(255,107,53,.4);border-radius:8px;padding:8px 14px;max-width:80vw';
        b.textContent = `something broke below decks — ${label}: ${e.message} (F12 has the rest)`;
        document.body.appendChild(b);
      }
    }
  }

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp big gaps (tab switches) so nothing tunnels
    if (dt < 0) dt = 0; // rAF's first timestamp can precede the load-time clock baseline
    if (state.phase === 'playing') trap(update, dt, 'update');
    if (state.phase !== 'paused') trap(draw, dt, 'draw');
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // exposed so the state machine can reset `last` when un-pausing
  return { resetClock: () => { last = performance.now(); } };
}
