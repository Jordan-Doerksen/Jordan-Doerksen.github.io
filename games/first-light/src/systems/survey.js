// systems/survey.js — the charting verb (star-charter's chart-don't-kill).
// Hold position inside a wreck's survey ring: progress fills; drift off and it
// decays gently (never resets — patience is rewarded, not demanded).

export function createSurvey(cfg, scene) {
  const SV = cfg.survey;

  // returns the wreck charted this frame, or null; onProgress gets the active wreck
  function update(dt, ship, wrecks, mods, onProgress) {
    const R = SV.radius * mods.surveyRadius * scene.DPR;
    let charted = null;
    for (const w of wrecks) {
      if (w.charted) continue;
      const d = Math.hypot(w.x - ship.p.x, w.y - ship.p.y);
      if (d < R + w.r) {
        w.progress += (dt / SV.seconds) * mods.surveyRate;
        if (onProgress) onProgress(w);
        if (w.progress >= 1) {
          w.progress = 1; w.charted = true; w.seen = 1;
          charted = w;
        }
      } else if (w.progress > 0) {
        w.progress = Math.max(0, w.progress - dt * SV.decayMult / SV.seconds);
      }
    }
    return charted;
  }

  function value(sector, mods) {
    return Math.round((SV.valueBase + (sector - 1) * SV.valuePerSector) * mods.salvageValue);
  }

  return { update, value };
}
