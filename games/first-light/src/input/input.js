// input/input.js — pointer/touch + keyboard. The ship follows the pointer (Star Charter
// Pro's direct-follow); FOCUS is held Shift / right-mouse / a second finger. P/Esc pause,
// M mutes. Mobile-first: pointer events, no text selection, context menu suppressed.

export function createInput({ scene, onPause, onMute }) {
  const pointer = { x: 0, y: 0, active: false }; // active = has moved at least once this run
  const state = { focusKey: false, focusMouse: false, touches: 0 };
  const input = { pointer };
  Object.defineProperty(input, 'focus', {
    get: () => state.focusKey || state.focusMouse || state.touches >= 2,
  });

  const cvs = scene.cvs;
  const track = e => { pointer.x = e.clientX * scene.DPR; pointer.y = e.clientY * scene.DPR; pointer.active = true; };

  cvs.addEventListener('pointermove', track);
  cvs.addEventListener('pointerdown', e => {
    track(e);
    if (e.pointerType === 'touch') state.touches++;
    if (e.button === 2) state.focusMouse = true;
  });
  addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') state.touches = Math.max(0, state.touches - 1);
    if (e.button === 2) state.focusMouse = false;
  });
  addEventListener('pointercancel', () => { state.touches = 0; state.focusMouse = false; });
  cvs.addEventListener('contextmenu', e => e.preventDefault());

  addEventListener('keydown', e => {
    if (e.key === 'Shift') state.focusKey = true;
    if (e.code === 'KeyP' || e.code === 'Escape') onPause();
    if (e.code === 'KeyM') onMute();
  });
  addEventListener('keyup', e => { if (e.key === 'Shift') state.focusKey = false; });

  input.resetRun = () => { pointer.active = false; };
  return input;
}
