// audio.js — procedural WebAudio (DECISIONS 4.2). Short synth blips per game event + a thin ambient
// pad for music, each on its own gain and its own mute toggle. Off-by-default-safe: the AudioContext
// is created lazily on the first user gesture (browser autoplay policy), so nothing sounds until the
// player clicks CLOCK IN. No samples, no assets — every noise is oscillators, so it costs nothing to ship.

export function createAudio(config) {
  const A = (config && config.audio) || { master: 0.5, musicGain: 0.15 };
  let ctx = null, master = null, musicBus = null, music = null;
  let sfxOn = true, musicOn = true;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = A.master; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? A.musicGain : 0; musicBus.connect(master);
    return true;
  }

  // resume() is called from the first click; unlocks a context that autoplay-suspended.
  function resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }

  // one enveloped voice: freq → optional glide, with an attack/decay gain shape.
  function voice(freq, dur, type, vol, glideTo) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // A tiny noise burst (hits/kills) — one buffer, short-lived, band-limited by a lowpass.
  function noise(dur, vol, cutoff) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff || 2600;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  const sfx = (name) => {
    if (!sfxOn || !ensure()) return;
    switch (name) {
      case 'fire':    voice(680, 0.05, 'square', 0.05, 520); break;
      case 'hit':     noise(0.04, 0.05, 3200); break;
      case 'kill':    voice(300, 0.11, 'triangle', 0.10, 150); noise(0.06, 0.06, 2200); break;
      case 'champ':   voice(160, 0.22, 'sawtooth', 0.12, 90); noise(0.12, 0.09, 1600); break;
      case 'pip':     voice(220, 0.16, 'sawtooth', 0.16, 70); noise(0.10, 0.10, 1200); break;
      case 'hurt':    voice(360, 0.07, 'square', 0.07, 240); break;
      case 'level':   voice(523, 0.10, 'triangle', 0.12); setTimeout(() => voice(784, 0.16, 'triangle', 0.12), 90); break;
      case 'ui':      voice(880, 0.06, 'triangle', 0.08); break;
      case 'boss':    voice(110, 0.55, 'sawtooth', 0.16, 70); setTimeout(() => voice(146, 0.5, 'sawtooth', 0.13, 90), 120); break;
      case 'bossdown':voice(392, 0.14, 'triangle', 0.14); setTimeout(() => voice(587, 0.16, 'triangle', 0.14), 110); setTimeout(() => voice(784, 0.3, 'triangle', 0.13), 240); break;
      case 'death':   voice(240, 0.7, 'sawtooth', 0.18, 40); noise(0.5, 0.10, 900); break;
      default: break;
    }
  };

  // ---- ambient pad: a low drone + a fifth through a slow lowpass, gently tremolo'd. Deliberately
  // dull and non-melodic (it's a corporate HVAC hum, not a soundtrack). Gated by musicBus gain.
  function startMusic() {
    if (!ensure() || music) return;
    const t = ctx.currentTime;
    const mk = (freq, detune) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = freq; o.detune.value = detune;
      return o;
    };
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6;
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.28;
    lfo.connect(lfoG); lfoG.connect(trem.gain);
    const o1 = mk(55, -4), o2 = mk(82.4, +5), o3 = mk(110, -8); // A1, ~E2, A2
    o1.connect(lp); o2.connect(lp); o3.connect(lp);
    lp.connect(trem); trem.connect(musicBus);
    o1.start(t); o2.start(t); o3.start(t); lfo.start(t);
    music = { nodes: [o1, o2, o3, lfo], trem, lp };
  }
  function stopMusic() {
    if (!music) return;
    const t = ctx ? ctx.currentTime : 0;
    for (const o of music.nodes) { try { o.stop(t + 0.05); } catch (e) { /* already stopped */ } }
    music = null;
  }

  function setSfx(on) { sfxOn = !!on; }
  function setMusic(on) {
    musicOn = !!on;
    if (musicBus) musicBus.gain.value = musicOn ? A.musicGain : 0;
    if (musicOn) startMusic(); // ok to call while playing; the gain gate does the muting
  }

  return {
    resume, sfx, startMusic, stopMusic, setSfx, setMusic,
    isSfx: () => sfxOn, isMusic: () => musicOn,
  };
}
