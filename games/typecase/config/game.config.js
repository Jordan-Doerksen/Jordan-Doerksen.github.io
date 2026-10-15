// game.config.js -- every tunable value in typecase lives here, nothing hardcoded.
//
// DEVIATION NOTE (see DECISIONS.md): config ships as .js assigning window.GAME_CONFIG
// instead of .json, because the launcher opens index.html from file:// where
// browsers block fetch(). A <script src> tag is the only zero-server way in.
"use strict";
window.GAME_CONFIG = {

  clock: {
    start: 120,        // seconds on a fresh game
    roundRefill: 30,   // added when a round's quota is cleared
    max: 240,          // hard cap -- time bonuses never bank past this
    urgentAt: 10       // heartbeat + pulse when the clock drops below this
  },

  // seconds added per found word, by word length
  timeBonus: { "3": 1, "4": 2, "5": 4, "6": 7, "7": 10, "8": 15 },

  scoring: {
    // standard Scrabble letter values
    letterValues: {
      a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5,
      l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4,
      w: 4, x: 8, y: 4, z: 10
    },
    // sum of letter values x this, by word length (7+ shares the top tier)
    lengthMultiplier: { "3": 1, "4": 1, "5": 1.5, "6": 2, "7": 3, "8": 3 },
    fullRackBonus: 100 // flat bonus on top of the word's own score
  },

  quota: {
    base: 4,      // words needed to clear round 1
    perRound: 1   // each later round needs this many more
  },

  reveal: {
    missedCount: 8 // top missed words (by score) shown at round end / game over
  },

  // rotating rejection lines -- the dictionary's entire customer-service dept
  rejections: [
    "Not in the book.",
    "The book disagrees.",
    "No record of it.",
    "The compositor declines.",
    "Not a word. Confident, though.",
    "The dictionary was consulted. It said no."
  ],
  duplicateLine: "Already set.",
  tooShortLine: "Three letters, minimum.",

  keys: {
    shuffle: " ",   // Space rearranges the rack
    pause: ["p", "escape"],
    mute: "m"
  },

  tally: {
    stepMs: 90      // per-letter tick interval in the animated score count-up
  },

  // the player's sound and music choices (GAME-16), saved under their own key,
  // apart from the best run (GAME-17). See DECISIONS.md D14.
  settings: {
    key: "typecase.settings",
    legacyMuteKey: "typecase.muted", // read once: a player who muted before stays silent
    defaults: { sound: true, music: true }
  },

  // the quiet music bed (CR-1): generated WebAudio, no audio files
  music: {
    level: 0.05,        // master gain, share of full scale: quiet by design
    bpm: 72,
    lowpassHz: 1600,    // keeps the bed under the tile clicks
    // four bars, one chord each, as MIDI notes: A maj7, F#m7, D maj7, E
    chords: [[45, 52, 56, 61], [42, 49, 52, 57], [50, 57, 61, 66], [40, 47, 52, 56]],
    padVolume: 0.22,    // the held chord
    pluckVolume: 0.28,  // the sparse notes an octave up
    pluckChance: 0.55   // share of eighth notes that carry a pluck
  }
};
