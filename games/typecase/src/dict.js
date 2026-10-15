// dict.js -- the word Set + validation + rack-findables enumeration. DOM-free.
//
// window.WORDS (data/words.js) is one newline-joined string; init() splits it
// into a Set once. findables() answers "every word spellable from this rack":
// a single O(dictionary) scan per rack against the rack's letter counts.
// (The build pipeline needs the signature trick because it checks ~51k racks;
// in play there is exactly ONE rack at a time, so a ~80k-word linear scan runs
// in a few milliseconds and skips the memory cost of a signature map --
// deviation from the sub-multiset sketch noted in ARCHITECTURE.md.)
"use strict";
(function () {

  var wordSet = null;

  function init() {
    if (wordSet) return;
    wordSet = new Set(window.WORDS.split("\n"));
  }

  // letter counts for a string -> 26-slot array
  function counts(str) {
    var c = new Array(26).fill(0);
    for (var i = 0; i < str.length; i++) c[str.charCodeAt(i) - 97]++;
    return c;
  }

  window.DICT = {
    init: init,
    size: function () { init(); return wordSet.size; },
    has: function (w) { init(); return wordSet.has(w); },

    // all 3+-letter dictionary words formable from rackLetters (string or array)
    findables: function (rackLetters) {
      init();
      var rack = Array.isArray(rackLetters) ? rackLetters.join("") : rackLetters;
      var rc = counts(rack.toLowerCase());
      var maxLen = rack.length;
      var out = [];
      wordSet.forEach(function (w) {
        if (w.length > maxLen) return;
        var need = rc.slice();
        for (var i = 0; i < w.length; i++) {
          if (--need[w.charCodeAt(i) - 97] < 0) return;
        }
        out.push(w);
      });
      return out;
    }
  };
})();
