// src/core/loop.js — requestAnimationFrame with a fixed-step 60 Hz accumulator.
// Sim steps only while mode==='playing' && !paused; the frame callback (render/ui/
// audio + event clearing) always runs.

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 8; // spiral-of-death guard: after a long stall (tab switch),
                               // drop the backlog instead of freezing trying to catch up
const MAX_FRAME_DT = 0.25;

export function startLoop(state, sim, frame) {
  let last = performance.now();
  let acc = 0;
  function onFrame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    acc += dt;
    let steps = 0;
    while (acc >= STEP) {
      if (state.mode === 'playing' && !state.paused) sim(STEP);
      acc -= STEP;
      if (++steps >= MAX_STEPS_PER_FRAME) { acc = 0; break; }
    }
    frame(dt);
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);
}
