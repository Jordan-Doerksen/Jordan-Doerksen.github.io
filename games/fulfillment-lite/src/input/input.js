// input.js — WASD flight + mouse focus-fire + boost (DECISIONS 1.3, keyboard/mouse only).
// Writes into world.input each sampled tick. Raw SCREEN mouse is stored; the flight system
// converts it to a world-space aim using the camera + viewport (world.view), so input needs
// no knowledge of the render transform.

export function createInput(canvas, callbacks) {
  const keys = new Set();
  let mx = 0, my = 0;           // screen-space mouse
  let mouseDown = false;

  const onKey = (down) => (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (down) {
      if (!keys.has(k) && callbacks && callbacks.onPress) callbacks.onPress(k, e);
      keys.add(k);
    } else {
      keys.delete(k);
    }
    // keep the page from scrolling on the movement/action keys
    if (['w', 'a', 's', 'd', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
  };

  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));

  const setMouse = (e) => {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  };
  canvas.addEventListener('mousemove', setMouse);
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { mouseDown = true; setMouse(e); } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // dropping focus (alt-tab) must release everything so the ship doesn't fly off on return
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  return {
    sample(world) {
      let dx = 0, dy = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
      if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
      if (dx !== 0 && dy !== 0) { const inv = 1 / Math.SQRT2; dx *= inv; dy *= inv; }
      const inp = world.input;
      inp.moveX = dx; inp.moveY = dy;
      inp.boost = keys.has('Shift') || keys.has(' ');
      inp.focus = mouseDown;
      inp.sx = mx; inp.sy = my;
    },
    keys,
  };
}
