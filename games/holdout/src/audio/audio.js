// audio.js — pure WebAudio synthesis, no asset files. Consumes state.events read-only
// each frame (main.js clears the array after render+audio have seen it).
// Seam pinned by ARCHITECTURE.md: initAudio(state) + updateAudio(state).
// AudioContext is created lazily on the first user gesture (browser autoplay policy).

let ctx = null;
let master = null;
const lastAt = { shot: 0, coreHit: 0, essence: 0, alienTech: 0 }; // rate limiters
const MIN_GAP = { shot: 0.125, coreHit: 0.4, essence: 0.09, alienTech: 0.09 };
const MASTER_GAIN = 0.25;

export function initAudio(state) {
  const arm = () => {
    ensureCtx();
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
  };
  window.addEventListener('pointerdown', arm);
  window.addEventListener('keydown', arm);
}

export function updateAudio(state) {
  if (!ctx) return;
  master.gain.value = state.muted ? 0 : MASTER_GAIN;
  if (state.muted) return;
  for (const ev of state.events) play(ev.type); // read-only — never spliced here
}

function play(type) {
  if (MIN_GAP[type] != null) {
    const now = ctx.currentTime;
    if (now - lastAt[type] < MIN_GAP[type]) return;
    lastAt[type] = now;
  }
  switch (type) {
    case 'shot': // short filtered tick
      tone({ f0: 900, f1: 300, dur: 0.05, type: 'square', gain: 0.07, filterHz: 1400 });
      break;
    case 'hit': // soft thump
      tone({ f0: 150, f1: 90, dur: 0.08, type: 'sine', gain: 0.1 });
      break;
    case 'die': // downward squelch
      tone({ f0: 280, f1: 50, dur: 0.22, type: 'sawtooth', gain: 0.12, filterHz: 900 });
      break;
    case 'place': // thunk
      tone({ f0: 140, f1: 65, dur: 0.12, type: 'triangle', gain: 0.18 });
      break;
    case 'upgrade': // two-note rise
      tone({ f0: 392, dur: 0.09, type: 'triangle', gain: 0.12 });
      tone({ f0: 587, dur: 0.12, type: 'triangle', gain: 0.12, delay: 0.1 });
      break;
    case 'tech': // small chord
      chord([523.25, 659.25, 783.99], 0.35, 'triangle', 0.06);
      break;
    case 'wave': // low horn
      tone({ f0: 98, dur: 0.6, type: 'sawtooth', gain: 0.16, filterHz: 420 });
      break;
    case 'boss': // big dissonant horn
      chord([98, 103.8, 146.8], 1.2, 'sawtooth', 0.09, 500);
      break;
    case 'coreHit': // alarm blip ×2
      tone({ f0: 880, dur: 0.07, type: 'square', gain: 0.1 });
      tone({ f0: 880, dur: 0.07, type: 'square', gain: 0.1, delay: 0.1 });
      break;
    case 'win': // resolved chord
      chord([261.63, 329.63, 392, 523.25], 1.4, 'triangle', 0.07);
      break;
    case 'lose': // slow descend
      tone({ f0: 196, f1: 49, dur: 1.5, type: 'sawtooth', gain: 0.16, filterHz: 700 });
      break;
    case 'essence': // pickup chirps, typed by resource
      tone({ f0: 660, f1: 880, dur: 0.07, type: 'triangle', gain: 0.07 });
      break;
    case 'alienTech':
      tone({ f0: 740, f1: 1100, dur: 0.09, type: 'triangle', gain: 0.07 });
      break;
  }
}

// One oscillator with an exponential gain envelope; optional pitch ramp + lowpass.
function tone(o) {
  const t0 = ctx.currentTime + (o.delay || 0);
  const dur = o.dur;
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(Math.max(o.f0, 1), t0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain || 0.1, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let head = osc;
  if (o.filterHz) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filterHz;
    osc.connect(f);
    head = f;
  }
  head.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function chord(freqs, dur, type, gain, filterHz) {
  for (const f0 of freqs) tone({ f0, dur, type, gain, filterHz });
}

function ensureCtx() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // no WebAudio — the game stays silent rather than faking it
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
}
