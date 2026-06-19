// anim.js — a tiny sequential tween driver for the "watch the engineer work it"
// animations. play() runs steps back-to-back; each step gets eased t∈[0,1].

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

let speedFactor = 1;                 // >1 = slower (Watch-optimal slow-mo, later)
export function setSpeed(f) { speedFactor = f; }

// steps: [{ dur, fn(t) }]. onFrame() is called after each fn (to redraw).
// Returns a cancel() handle.
export function play(steps, { onFrame, onDone } = {}) {
  let i = 0, start = null, raf = 0, cancelled = false;
  function frame(now) {
    if (cancelled) return;
    if (start == null) start = now;
    const step = steps[i];
    const dur = Math.max(1, step.dur * speedFactor);
    const t = Math.min(1, (now - start) / dur);
    step.fn(easeInOut(t));
    if (onFrame) onFrame();
    if (t >= 1) {
      i++; start = null;
      if (i >= steps.length) { onDone && onDone(); return; }
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}
