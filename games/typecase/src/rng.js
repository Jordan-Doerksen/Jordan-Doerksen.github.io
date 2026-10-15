// rng.js -- seeded RNG (mulberry32) + helpers. DOM-free.
// Seedable so a daily-seed mode (V1.1, see DECISIONS.md Open Questions) can
// drop in later; for V1 every game seeds from Math.random.
"use strict";
(function () {

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var fn = mulberry32((Math.random() * 4294967296) >>> 0);

  window.RNG = {
    mulberry32: mulberry32,

    // reseed the shared stream (daily mode will call this with a date hash)
    seed: function (s) { fn = mulberry32(s >>> 0); },

    rand: function () { return fn(); },
    rr: function (a, b) { return a + (b - a) * fn(); },                 // real in [a,b)
    ri: function (a, b) { return Math.floor(a + (b - a + 1) * fn()); }, // int in [a,b]
    pick: function (arr) { return arr[Math.floor(fn() * arr.length)]; },

    // Fisher-Yates, in place; returns the array
    shuffle: function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(fn() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  };
})();
