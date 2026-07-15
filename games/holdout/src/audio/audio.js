// audio.js — pure WebAudio synthesis, no asset files. Consumes state.events read-only
// each frame (main.js clears the array after render+audio have seen it).
// Seam pinned by ARCHITECTURE.md: initAudio(state, cfg) + updateAudio(state).
// AudioContext is created lazily on the first user gesture (browser autoplay policy);
// the music drone is built then too, but its bus starts at 0 and only ramps up when
// the MUSIC setting allows it. Settings persist under their OWN localStorage key
// (config audio.settingsKey) — never the meta Salvage key.

let ctx = null;
let master = null;   // everything → master → destination; M-mute zeroes this
let musicBus = null; // music drone → musicBus → master; the MUSIC setting gates this
let lastPersisted = ''; // JSON snapshot of the last settings written to storage
const lastAt = { shot: 0, coreHit: 0, essence: 0, alienTech: 0 }; // rate limiters
const MIN_GAP = { shot: 0.125, coreHit: 0.4, essence: 0.09, alienTech: 0.09 };
// Tunables (overridden from config/game.json "audio" at init; these are fallbacks).
const A = {
  settingsKey: 'holdout.settings.v1',
  masterGain: 0.25,
  musicPlayGain: 0.05,   // in-run drone level — deliberately well under the SFX
  musicTitleGain: 0.028, // quieter still on title/end/pause
  musicRampSec: 1.2,     // fade time between music levels (no clicks, no seams)
};

export function initAudio(state, cfg) {
  const a = (cfg && cfg.game && cfg.game.audio) || {};
  for (const k of Object.keys(A)) if (a[k] != null) A[k] = a[k];
  loadSettings(state);
  const arm = () => {
    ensureCtx();
    startMusic();
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
  };
  window.addEventListener('pointerdown', arm);
  window.addEventListener('keydown', arm);
}

export function updateAudio(state) {
  persistIfChanged(state); // before the ctx guard — settings save even with no WebAudio
  if (!ctx) return;
  master.gain.value = state.muted ? 0 : A.masterGain;
  if (musicBus) {
    const on = !state.muted && state.settings && state.settings.music;
    const target = !on ? 0
      : (state.mode === 'playing' && !state.paused) ? A.musicPlayGain
      : A.musicTitleGain;
    musicBus.gain.setTargetAtTime(target, ctx.currentTime, A.musicRampSec / 3);
  }
  if (state.muted || (state.settings && !state.settings.sfx)) return;
  for (const ev of state.events) play(ev.type); // read-only — never spliced here
}

// ---- settings persistence (this module's job — sim only flips the flags) ----------

function loadSettings(state) {
  const s = { sfx: true, music: true }; // defaults: both ON
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(A.settingsKey);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.sfx === 'boolean') s.sfx = v.sfx;
        if (typeof v.music === 'boolean') s.music = v.music;
      }
    }
  } catch { /* blocked/corrupt storage → defaults */ }
  state.settings.sfx = s.sfx;
  state.settings.music = s.music;
  lastPersisted = JSON.stringify(s);
}

function persistIfChanged(state) {
  if (!state.settings) return;
  const now = JSON.stringify({ sfx: !!state.settings.sfx, music: !!state.settings.music });
  if (now === lastPersisted) return;
  lastPersisted = now;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(A.settingsKey, now);
  } catch { /* storage full/blocked: settings just don't persist this session */ }
}

// ---- music — a tense low drone that can sit under all 30 waves --------------------
// Two detuned saws on A1 (the slow beat between them is the tension), a lowpass that
// "breathes" via a very slow LFO, a faint swelling octave, and a filtered-noise wind
// bed. Every source is continuous, so the loop has no seam by construction. The whole
// mix hangs off musicBus, whose level updateAudio ramps per the MUSIC setting.
function startMusic() {
  if (!ctx || musicBus) return;
  musicBus = ctx.createGain();
  musicBus.gain.value = 0; // silent until updateAudio ramps it (autoplay + setting law)
  musicBus.connect(master);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  lp.Q.value = 0.9;
  lp.connect(musicBus);

  // filter breathing: 0.06 Hz sine sweeps the cutoff ±90 Hz (~17 s cycle)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 90;
  lfo.connect(lfoAmt);
  lfoAmt.connect(lp.frequency);
  lfo.start();

  // detuned saw pair on A1
  for (const cents of [-6, 5]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    osc.detune.value = cents;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    osc.connect(g);
    g.connect(lp);
    osc.start();
  }

  // faint octave sine with a slow swell (~9 s cycle)
  const oct = ctx.createOscillator();
  oct.type = 'sine';
  oct.frequency.value = 110;
  const octG = ctx.createGain();
  octG.gain.value = 0.12;
  const trem = ctx.createOscillator();
  trem.frequency.value = 0.11;
  const tremAmt = ctx.createGain();
  tremAmt.gain.value = 0.1;
  trem.connect(tremAmt);
  tremAmt.connect(octG.gain);
  oct.connect(octG);
  octG.connect(musicBus);
  oct.start();
  trem.start();

  // wind bed: looped white noise through a low bandpass, very quiet
  const len = 2 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 320;
  bp.Q.value = 0.7;
  const nG = ctx.createGain();
  nG.gain.value = 0.05;
  noise.connect(bp);
  bp.connect(nG);
  nG.connect(musicBus);
  noise.start();
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
  master.gain.value = A.masterGain;
  master.connect(ctx.destination);
}
