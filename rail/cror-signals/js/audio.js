// ==========================================================================
// AUDIO — optional, off by default (field-friendly). A single synthesized blip
// for right/wrong via WebAudio — no files, no assets. Gated on settings.sound.
// ==========================================================================

import * as store from './store.js';

let ctx = null;
function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

export function enabled() { return !!store.get('settings').sound; }

export function cue(ok) {
  if (!enabled()) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = ok ? 'sine' : 'sawtooth';
    o.frequency.value = ok ? 880 : 180;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.16, a.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.22);
    o.start(); o.stop(a.currentTime + 0.24);
  } catch { /* no audio context — silently skip */ }
}
