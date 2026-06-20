// ==========================================================================
// SKY MODE · PLAIN — no canvas particles at all.
// For light or not-yet-tuned skins: the CSS backdrop carries the whole vibe,
// the canvas stays clear. `still: true` tells the dispatcher not to animate.
// ==========================================================================

export function makePlain() {
  return {
    still: true,
    resize() {},
    frame() {},
    static() {},
  };
}
