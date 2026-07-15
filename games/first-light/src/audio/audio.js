// audio/audio.js — generated WebAudio, no files, ever. One lazy AudioContext (born on
// the Begin click — the autoplay law), a master gain under the mute button, and two
// buses under it: sfx (one-shots, echo, rumble) and music (drone, pad, wash) gated by
// the settings toggles; every public call is a no-op before ensure() and can never
// throw. Tuning lives in config.audio (music tuning in config.audio.music).

export function createAudio(cfg) {
  const A = cfg.audio;
  const M = A.music || {};
  let ctx = null, master = null, sfxBus = null, musicBus = null, echoIn = null, noiseBuf = null;
  let rumbleGain = null, padVoices = null, padStep = 0;
  let muted = false;                 // remembered pre-init, applied on ensure()
  let sfxOn = true, musicOn = true;  // settings toggles — same pre-init pattern

  // Wrap a voice so a WebAudio hiccup never takes the game down with it.
  const safe = fn => (...args) => { try { if (ctx) fn(...args); } catch (e) {} };

  function ensure() {
    try {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      // two buses under the master: sfx (one-shots, echo, rumble) and music (drone, pad,
      // wash) — the settings toggles gate the buses; the mute button still owns the master
      sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0;
      sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? (M.busGain ?? 1) : 0;
      musicBus.connect(master);

      // the echo bus — a damped feedback delay; chirps route here and the sea answers
      echoIn = ctx.createGain();
      const delay = ctx.createDelay(Math.max(1, A.echoDelay));
      delay.delayTime.value = A.echoDelay;
      const fb = ctx.createGain(); fb.gain.value = A.echoFeedback;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass'; damp.frequency.value = A.echoDampHz ?? 2200;
      echoIn.connect(sfxBus);              // dry
      echoIn.connect(delay);               // wet
      delay.connect(damp); damp.connect(fb); fb.connect(delay);
      damp.connect(sfxBus);

      // the ambient drone — a low sine breathing under everything (Star Charter trick)
      const drone = ctx.createOscillator(); drone.frequency.value = A.droneHz;
      const dg = ctx.createGain(); dg.gain.value = A.droneGain;
      const lfo = ctx.createOscillator(); lfo.frequency.value = A.droneLfoHz ?? 0.07;
      const lg = ctx.createGain(); lg.gain.value = A.droneGain * 0.45;
      lfo.connect(lg); lg.connect(dg.gain);
      drone.connect(dg); dg.connect(musicBus);
      drone.start(); lfo.start();

      // the rumble — persistent triangle, gain steered every frame by rumble(level)
      const ro = ctx.createOscillator();
      ro.type = 'triangle'; ro.frequency.value = A.rumbleHz;
      rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
      ro.connect(rumbleGain); rumbleGain.connect(sfxBus);
      ro.start();

      startMusic();
    } catch (e) {}
  }

  // ----- the night watch — sparse maritime ambience on the music bus -----
  // Two triangle voices drifting through slow parallel fifths under the drone, plus a
  // low noise "wash" breathing at swell pace. Continuous oscillators retuned with long
  // glides — loopable by construction, no seams. All tuning in config.audio.music.
  function startMusic() {
    const padGain = M.padGain ?? 0.016;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = M.padFilterHz ?? 520;
    const pg = ctx.createGain(); pg.gain.value = padGain;
    const lfo = ctx.createOscillator(); lfo.frequency.value = M.padLfoHz ?? 0.03;
    const lg = ctx.createGain(); lg.gain.value = padGain * 0.4;
    lfo.connect(lg); lg.connect(pg.gain); lfo.start();
    lp.connect(pg); pg.connect(musicBus);

    padVoices = (M.padTones || [[110], [164.81]]).map(tones => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = tones[0];
      const d = ctx.createOscillator(); d.type = 'sine';     // detuned shadow — warmth
      d.frequency.value = tones[0] * 1.003;
      const dgn = ctx.createGain(); dgn.gain.value = 0.5;
      o.connect(lp); d.connect(dgn); dgn.connect(lp);
      o.start(); d.start();
      return { o, d, tones };
    });
    padStep = 0;
    setInterval(() => { try { retunePad(); } catch (e) {} }, (M.chordSeconds ?? 14) * 1000);

    // the wash — the sea against the hull, far below everything else
    const src = ctx.createBufferSource(); src.buffer = getNoiseBuf(); src.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass'; wf.frequency.value = M.washHz ?? 420;
    const wg = ctx.createGain(); wg.gain.value = M.washGain ?? 0.012;
    const wlfo = ctx.createOscillator(); wlfo.frequency.value = M.washLfoHz ?? 0.045;
    const wlg = ctx.createGain(); wlg.gain.value = (M.washGain ?? 0.012) * 0.6;
    wlfo.connect(wlg); wlg.connect(wg.gain); wlfo.start();
    src.connect(wf); wf.connect(wg); wg.connect(musicBus);
    src.start();
  }

  function retunePad() {
    if (!ctx || !padVoices) return;
    padStep++;
    const t = ctx.currentTime, glide = M.glideSeconds ?? 3;
    for (const v of padVoices) {
      const f = v.tones[padStep % v.tones.length];
      v.o.frequency.setTargetAtTime(f, t, glide);
      v.d.frequency.setTargetAtTime(f * 1.003, t, glide);
    }
  }

  function setMuted(m) {
    muted = !!m;
    try {
      if (!ctx || !master) return;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.08);
    } catch (e) {}
  }

  function setSfx(on) {
    sfxOn = !!on;
    try {
      if (!ctx || !sfxBus) return;
      const t = ctx.currentTime;
      sfxBus.gain.cancelScheduledValues(t);
      sfxBus.gain.setValueAtTime(sfxBus.gain.value, t);
      sfxBus.gain.linearRampToValueAtTime(sfxOn ? 1 : 0, t + 0.08);
    } catch (e) {}
  }

  function setMusic(on) {
    musicOn = !!on;
    try {
      if (!ctx || !musicBus) return;
      const t = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t);
      musicBus.gain.setValueAtTime(musicBus.gain.value, t);
      musicBus.gain.linearRampToValueAtTime(musicOn ? (M.busGain ?? 1) : 0, t + 0.25);
    } catch (e) {}
  }

  // ----- small builders -----
  function voice(type, freq, peak, dur, dest, t0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  function getNoiseBuf() { // one shared second of white noise, generated once
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function noise(dur, peak, filterType, hz0, hz1, t0) {
    const src = ctx.createBufferSource(); src.buffer = getNoiseBuf(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType;
    f.frequency.setValueAtTime(hz0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, hz1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ----- one-shots (the whole mix whispers) -----
  const chirp = safe(() => { // the sonar ping — bright blip, fast downward sweep, echoed
    const t = ctx.currentTime;
    const o = voice('sine', A.chirpHz, 0.04, 0.12, echoIn, t);
    o.frequency.exponentialRampToValueAtTime(A.chirpHz * 0.55, t + 0.09);
  });

  const bell = safe(step => { // a ship's bell — two detuned sines + a strike transient
    const i = Math.max(0, Math.min(Math.floor(step), A.bellScale.length - 1));
    const f = A.bellScale[i], t = ctx.currentTime;
    voice('sine', f * 0.998, 0.035, 0.75, sfxBus, t);
    voice('sine', f * 1.004, 0.028, 0.75, sfxBus, t);
    voice('triangle', f * 2.76, 0.02, 0.05, sfxBus, t); // the strike
    const send = ctx.createGain(); send.gain.value = 0.03; // faint echo-bus send
    voice('sine', f, 1, 0.35, send, t); send.connect(echoIn);
  });

  const thud = safe(() => { // low hit — sine drop + a short noise burst
    const t = ctx.currentTime;
    const o = voice('sine', A.thudHz, 0.09, 0.3, sfxBus, t);
    o.frequency.exponentialRampToValueAtTime(A.thudHz * 0.45, t + 0.25);
    noise(0.1, 0.05, 'lowpass', 900, 200, t);
  });

  const horn = safe(() => { // the foghorn — slow swell, slightly detuned pair, dark and polite
    const t = ctx.currentTime, dur = 1.2;
    for (const det of [1, 1.006]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = A.hornHz * det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = A.hornHz * 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
  });

  const dive = safe(() => { // the leviathan breaking off — a descending whoosh
    const t = ctx.currentTime;
    noise(0.8, 0.05, 'bandpass', 1200, 150, t);
    const o = voice('sine', A.rumbleHz * 8, 0.035, 0.8, sfxBus, t);
    o.frequency.exponentialRampToValueAtTime(A.rumbleHz * 2, t + 0.75);
  });

  const dawnChime = safe(() => { // the win — a soft rising arpeggio off the bell scale
    const t = ctx.currentTime;
    [0, 2, 4, 7].forEach((step, n) => {
      const f = A.bellScale[Math.min(step, A.bellScale.length - 1)];
      voice('sine', f, 0.03, 1.3, sfxBus, t + n * 0.38);
      voice('sine', f * 2, 0.012, 1.3, sfxBus, t + n * 0.38); // warm octave shimmer
    });
  });

  const sweep = safe(() => { // the lamp swinging to focus — a soft rising swish
    noise(0.35, A.sweepGain ?? 0.022, 'bandpass', A.sweepHz0 ?? 260, A.sweepHz1 ?? 1500, ctx.currentTime);
  });

  const rumble = safe(level => { // called every frame — smooth follow, never a click
    if (!rumbleGain) return;
    const v = Math.max(0, Math.min(1, level || 0)) * 0.06;
    rumbleGain.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
  });

  return { ensure, setMuted, setSfx, setMusic, chirp, bell, thud, horn, dive, dawnChime, sweep, rumble };
}
