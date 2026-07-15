// loop.js — the fixed-step accumulator (DECISIONS 2.1). 60 Hz sim, decoupled render.
// Anti-death-spiral: cap catch-up steps per frame and DROP the leftover debt (fmod) so a
// transient hitch can never compound into permanent slow-motion. A big-gap dt clamp guards
// tab-switches. The sim advances in whole 1/60 steps only; render runs once per rAF frame.

export function startLoop({ hz, maxCatchup, dtClamp }, step, render, watchdog) {
  const dtFixed = 1 / hz;
  let acc = 0;
  let last = 0;
  let running = true;
  let raf = 0;

  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > dtClamp) dt = dtClamp;      // tab-switch / stall guard
    acc += dt;

    let steps = 0;
    try {
      while (acc >= dtFixed && steps < maxCatchup) {
        step(dtFixed);
        acc -= dtFixed;
        steps++;
      }
      // DEBT DROP: if we hit the catch-up cap and time is still owed, throw it away
      // rather than banking it (banking = a spike becomes a permanent slowdown).
      if (steps >= maxCatchup && acc > dtFixed) acc = acc % dtFixed;
      render(dt);
    } catch (err) {
      if (watchdog) watchdog.trap(err);
      else throw err;
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return {
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
