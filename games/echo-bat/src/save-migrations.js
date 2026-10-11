/*
  Echo Bat save migrations (GAME-17 clause 2). One step per version below the current one.
  Version 0 is the shipped, unversioned save under the same key: { best, bestLevel, muted }.
  A plain script that assigns one global, so it loads from disk and a Node test can read it.
*/
window.EB_MIGRATIONS = {
  /* 0 -> 1: the same fields, kept as they are; the step exists so the version is written. */
  0: function (old) {
    return {
      best: typeof old.best === 'number' ? old.best : 0,
      bestLevel: typeof old.bestLevel === 'number' ? old.bestLevel : 0,
      muted: !!old.muted
    };
  }
};
