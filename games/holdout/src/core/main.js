// src/core/main.js — boot: load configs → create state + actions → init presentation
// modules (sibling-owned; each failure degrades gracefully, the sim keeps running) →
// fixed-step loop. state.events is cleared HERE, once per frame, after render/ui/audio
// have all seen the frame's events.

import { loadConfig } from './config.js';
import { createState } from './state.js';
import { createActions } from '../sim/actions.js';
import { simTick } from '../sim/sim.js';
import { startLoop } from './loop.js';

const cfg = await loadConfig();
const state = createState(cfg);
const actions = createActions(state, cfg);

// prefers-reduced-motion is law
if (cfg.game.reducedMotionRespected && typeof matchMedia === 'function') {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  state.reducedMotion = mq.matches;
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', () => { state.reducedMotion = mq.matches; });
  }
}

// debugging escape hatch (also lets presentation reach the trio if its init signature drifts)
globalThis.__holdout = { state, cfg, actions };

// ---- presentation seam ---------------------------------------------------------------
// Exact pinned signatures from ARCHITECTURE.md ("The Contract"). A module that throws
// at init or mid-frame is logged and dropped — the sim keeps running without it.
const canvas = document.getElementById('game');
const frames = [];

async function wire(path, initFn, frameFn) {
  try {
    const mod = await import(path);
    await initFn(mod);
    if (frameFn) frames.push({ path, fn: (dt) => frameFn(mod, dt) });
  } catch (err) {
    console.error(`[holdout] ${path} failed to init — continuing without it`, err);
  }
}

await wire('../render/render.js', (m) => m.initRender(canvas, cfg, state), (m, dt) => m.render(state, dt));
await wire('../ui/ui.js', (m) => m.initUI(state, actions, cfg), (m) => m.updateUI(state));
await wire('../input/input.js', (m) => m.initInput(canvas, state, actions, cfg), null);
await wire('../audio/audio.js', (m) => m.initAudio(state), (m) => m.updateAudio(state));

startLoop(
  state,
  (dt) => simTick(state, cfg, dt),
  (dt) => {
    for (let i = 0; i < frames.length; i++) {
      try {
        frames[i].fn(dt);
      } catch (err) {
        console.error(`[holdout] ${frames[i].path} failed mid-frame — disabling it`, err);
        frames.splice(i--, 1);
      }
    }
    state.events.length = 0; // cleared once per frame, AFTER all consumers saw them
  }
);
