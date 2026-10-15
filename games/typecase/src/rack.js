// rack.js -- seed pick, tile state, answer assembly, shuffle. DOM-free.
//
// Tiles carry stable ids so the answer row survives a shuffle: the tiles
// array order IS the display order; the answer is an ordered list of ids.
"use strict";
(function () {

  var RNG = window.RNG;

  var seedWord = "";
  var tiles = [];   // [{ id, ch, used }] in display order
  var answer = [];  // ordered tile ids composing the current attempt

  function byId(id) {
    for (var i = 0; i < tiles.length; i++) if (tiles[i].id === id) return tiles[i];
    return null;
  }

  window.RACK = {

    // fresh rack from a seed word (random from RACK_WORDS when omitted).
    // The seed's letters, shuffled -- a full-rack word always exists.
    load: function (seed) {
      seedWord = seed || RNG.pick(window.RACK_WORDS);
      tiles = seedWord.split("").map(function (ch, i) {
        return { id: i, ch: ch, used: false };
      });
      RNG.shuffle(tiles);
      answer = [];
      return seedWord;
    },

    seed: function () { return seedWord; },
    letters: function () { return seedWord.split(""); },

    // display-order snapshot for the UI
    tiles: function () {
      return tiles.map(function (t) { return { id: t.id, ch: t.ch, used: t.used }; });
    },

    // rearrange the tray (used flags travel with their tiles)
    shuffle: function () { RNG.shuffle(tiles); },

    // claim the first available tile with this letter -> id, or -1
    typeChar: function (ch) {
      ch = String(ch).toLowerCase();
      for (var i = 0; i < tiles.length; i++) {
        if (!tiles[i].used && tiles[i].ch === ch) {
          tiles[i].used = true;
          answer.push(tiles[i].id);
          return tiles[i].id;
        }
      }
      return -1;
    },

    // claim a specific tile by id (click/tap) -> true if it was available
    claim: function (id) {
      var t = byId(id);
      if (!t || t.used) return false;
      t.used = true;
      answer.push(id);
      return true;
    },

    // return the last tile to the tray -> its id, or -1
    backspace: function () {
      if (!answer.length) return -1;
      var id = answer.pop();
      byId(id).used = false;
      return id;
    },

    // return one specific tile from the answer (click on the answer row)
    release: function (id) {
      var i = answer.indexOf(id);
      if (i < 0) return false;
      answer.splice(i, 1);
      byId(id).used = false;
      return true;
    },

    // return every tile to the tray
    clear: function () {
      answer.length = 0;
      for (var i = 0; i < tiles.length; i++) tiles[i].used = false;
    },

    // the attempt as typed, in order
    word: function () {
      return answer.map(function (id) { return byId(id).ch; }).join("");
    },

    answerIds: function () { return answer.slice(); }
  };
})();
