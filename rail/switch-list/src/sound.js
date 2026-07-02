// sound.js — synthesized Web Audio sfx (no asset files). Lazy context resumed on
// first gesture; mute persisted in localStorage. SPEC §9.

let ctx = null;
let muted = localStorage.getItem('sl_muted') === '1';

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  localStorage.setItem('sl_muted', muted ? '1' : '0');
  return muted;
}
export function resume() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function blip(freq, dur, type = 'sine', gain = 0.18) {
  if (muted || !ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur);
}

export const sfx = {
  points() { blip(880, 0.05, 'square', 0.08); },        // switch target click
  couple() { blip(150, 0.12, 'triangle', 0.25); blip(90, 0.18, 'sine', 0.2); }, // clunk
  roll() { blip(320, 0.25, 'sawtooth', 0.05); },
  refuse() { blip(140, 0.18, 'sawtooth', 0.12); },
  win() { [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => blip(f, 0.22, 'triangle', 0.18), k * 90)); },
};
