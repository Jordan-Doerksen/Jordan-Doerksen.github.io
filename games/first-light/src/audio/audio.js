// audio/audio.js — generated WebAudio, no files, ever. One lazy AudioContext (born on
// the Begin click), one master gain, one echo bus (the sea answering back); every public
// call is a no-op before ensure() and can never throw. Tuning lives in config.audio.

export function createAudio(cfg) {
  const A = cfg.audio;
  let ctx = null, master = null, echoIn = null, noiseBuf = null;
  let rumbleGain = null;
  let muted = false; // remembered pre-init, applied on ensure()

  // Wrap a voice so a WebAudio hiccup never takes the game down with it.
  const safe = fn => (...args) => { try { if (ctx) fn(...args); } catch (e) {} };

  function ensure() {
    try {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      // the echo bus — a damped feedback delay; chirps route here and the sea answers
      echoIn = ctx.createGain();
      const delay = ctx.createDelay(Math.max(1, A.echoDelay));
      delay.delayTime.value = A.echoDelay;
      const fb = ctx.createGain(); fb.gain.value = A.echoFeedback;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass'; damp.frequency.value = A.echoDampHz ?? 2200;
      echoIn.connect(master);              // dry
      echoIn.connect(delay);               // wet
      delay.connect(damp); damp.connect(fb); fb.connect(delay);
      damp.connect(master);

      // the ambient drone — a low sine breathing under everything (Star Charter trick)
      const drone = ctx.createOscillator(); drone.frequency.value = A.droneHz;
      const dg = ctx.createGain(); dg.gain.value = A.droneGain;
      const lfo = ctx.createOscillator(); lfo.frequency.value = A.droneLfoHz ?? 0.07;
      const lg = ctx.createGain(); lg.gain.value = A.droneGain * 0.45;
      lfo.connect(lg); lg.connect(dg.gain);
      drone.connect(dg); dg.connect(master);
      drone.start(); lfo.start();

      // the rumble — persistent triangle, gain steered every frame by rumble(level)
      const ro = ctx.createOscillator();
      ro.type = 'triangle'; ro.frequency.value = A.rumbleHz;
      rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
      ro.connect(rumbleGain); rumbleGain.connect(master);
      ro.start();
    } catch (e) {}
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
  function noise(dur, peak, filterType, hz0, hz1, t0) {
    if (!noiseBuf) { // one shared second of white noise, generated once
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType;
    f.frequency.setValueAtTime(hz0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, hz1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
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
    voice('sine', f * 0.998, 0.035, 0.75, master, t);
    voice('sine', f * 1.004, 0.028, 0.75, master, t);
    voice('triangle', f * 2.76, 0.02, 0.05, master, t); // the strike
    const send = ctx.createGain(); send.gain.value = 0.03; // faint echo-bus send
    voice('sine', f, 1, 0.35, send, t); send.connect(echoIn);
  });

  const thud = safe(() => { // low hit — sine drop + a short noise burst
    const t = ctx.currentTime;
    const o = voice('sine', A.thudHz, 0.09, 0.3, master, t);
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
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }
  });

  const dive = safe(() => { // the leviathan breaking off — a descending whoosh
    const t = ctx.currentTime;
    noise(0.8, 0.05, 'bandpass', 1200, 150, t);
    const o = voice('sine', A.rumbleHz * 8, 0.035, 0.8, master, t);
    o.frequency.exponentialRampToValueAtTime(A.rumbleHz * 2, t + 0.75);
  });

  const dawnChime = safe(() => { // the win — a soft rising arpeggio off the bell scale
    const t = ctx.currentTime;
    [0, 2, 4, 7].forEach((step, n) => {
      const f = A.bellScale[Math.min(step, A.bellScale.length - 1)];
      voice('sine', f, 0.03, 1.3, master, t + n * 0.38);
      voice('sine', f * 2, 0.012, 1.3, master, t + n * 0.38); // warm octave shimmer
    });
  });

  const rumble = safe(level => { // called every frame — smooth follow, never a click
    if (!rumbleGain) return;
    const v = Math.max(0, Math.min(1, level || 0)) * 0.06;
    rumbleGain.gain.setTargetAtTime(v, ctx.currentTime, 0.08);
  });

  return { ensure, setMuted, chirp, bell, thud, horn, dive, dawnChime, rumble };
}
