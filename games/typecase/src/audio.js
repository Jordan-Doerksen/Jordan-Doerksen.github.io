// audio.js -- lazy WebAudio, tone() helper, the SFX table, and the quiet music
// bed. The context is created on first user gesture (browser autoplay law);
// every sound is generated, nothing loaded, so file:// needs no assets.
// Whether sound and music play is window.SETTINGS (settings.js), not this file.
"use strict";
(function () {

  var actx = null;
  var unlocked = false;
  var SETTINGS = window.SETTINGS;
  var MUSIC = window.GAME_CONFIG.music;

  function ctx() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
    }
    if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) { } }
    return actx;
  }

  function tone(freq, dur, type, vol, glideTo) {
    if (!SETTINGS.get().sound) return;
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + dur);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.15, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }

  var SFX = {
    click:   function () { tone(520, 0.045, "triangle", 0.10); },              // tile lifts
    back:    function () { tone(360, 0.05, "triangle", 0.08); },               // tile returns
    shuffle: function () { tone(300, 0.05, "triangle", 0.07); setTimeout(function () { tone(340, 0.05, "triangle", 0.07); }, 45); },
    thunk:   function () { tone(196, 0.10, "sine", 0.20, 130); },              // submit lands
    tick:    function () { tone(880, 0.035, "square", 0.05); },                // tally per-letter
    reject:  function () { tone(180, 0.14, "sawtooth", 0.09, 120); },
    dup:     function () { tone(440, 0.07, "sine", 0.09, 392); },              // gentle bounce
    fanfare: function () {                                                     // round clear
      tone(523, 0.10, "triangle", 0.14);
      setTimeout(function () { tone(659, 0.10, "triangle", 0.14); }, 90);
      setTimeout(function () { tone(784, 0.18, "triangle", 0.15); }, 180);
    },
    bigfanfare: function () {                                                  // full-rack word
      tone(523, 0.10, "triangle", 0.15);
      setTimeout(function () { tone(659, 0.10, "triangle", 0.15); }, 80);
      setTimeout(function () { tone(784, 0.10, "triangle", 0.15); }, 160);
      setTimeout(function () { tone(1047, 0.30, "triangle", 0.16); }, 240);
      setTimeout(function () { tone(1319, 0.34, "sine", 0.10); }, 260);
    },
    heartbeat: function () {                                                   // clock under 10s
      tone(80, 0.09, "sine", 0.16);
      setTimeout(function () { tone(66, 0.11, "sine", 0.13); }, 130);
    },
    over: function () {                                                        // clock dies
      tone(392, 0.16, "triangle", 0.14, 330);
      setTimeout(function () { tone(294, 0.20, "triangle", 0.13, 240); }, 150);
      setTimeout(function () { tone(196, 0.42, "sine", 0.14, 120); }, 320);
    }
  };

  // ---- the music bed --------------------------------------------------------
  // Four bars, one chord each (config: music.chords). A soft triangle pad holds
  // the chord; sparse sine plucks pick its tones an octave up. A low-pass keeps
  // it under the tile clicks. Scheduled ~0.4 s ahead of the audio clock, so a
  // late timer never gaps the beat.
  var music = null;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function note(m, t, dur, type, vol, attack) {
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(music.lp);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule(t, step) {
    var beat = 60 / MUSIC.bpm;
    var chord = MUSIC.chords[Math.floor(step / 8) % MUSIC.chords.length];
    if (step % 8 === 0) chord.forEach(function (m) { note(m, t, beat * 4.2, "triangle", MUSIC.padVolume, 1.2); });
    if (Math.random() < MUSIC.pluckChance) { // cosmetic randomness only: no game rule reads it
      note(chord[Math.floor(Math.random() * chord.length)] + 12, t, 0.9, "sine", MUSIC.pluckVolume, 0.01);
    }
  }
  function startMusic() {
    var c = ctx(); if (!c || music) return;
    var master = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = MUSIC.lowpassHz;
    master.gain.setValueAtTime(0, c.currentTime);
    master.gain.linearRampToValueAtTime(MUSIC.level, c.currentTime + 1.5);
    lp.connect(master); master.connect(c.destination);
    music = { master: master, lp: lp, next: c.currentTime + 0.1, step: 0, timer: null };
    music.timer = setInterval(function () {
      var half = 30 / MUSIC.bpm; // an eighth note
      while (music && music.next < c.currentTime + 0.4) {
        schedule(music.next, music.step);
        music.next += half; music.step++;
      }
    }, 100);
  }
  function stopMusic() {
    if (!music) return;
    var m = music, t = actx.currentTime;
    music = null;
    clearInterval(m.timer);
    m.master.gain.cancelScheduledValues(t);
    m.master.gain.setValueAtTime(m.master.gain.value, t);
    m.master.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(function () { m.master.disconnect(); }, 800);
  }
  // The bed plays when the player wants it, after the first gesture, and only
  // while the tab is visible (a hidden tab throttles timers and would stutter it).
  function syncMusic() {
    if (unlocked && SETTINGS.get().music && !document.hidden) startMusic();
    else stopMusic();
  }
  document.addEventListener("visibilitychange", syncMusic);

  window.AUDIO = {
    unlock: function () { ctx(); unlocked = true; syncMusic(); }, // call on first gesture
    tone: tone,
    sfx: SFX,
    syncMusic: syncMusic,
    musicPlaying: function () { return music !== null; }
  };
})();
