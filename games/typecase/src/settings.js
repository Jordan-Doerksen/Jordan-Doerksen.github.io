// settings.js -- the player's sound and music choices (GAME-16), saved under
// their own key (GAME-17), apart from the best run. DOM-free: smoke.js tests it
// against a fake storage. Loaded after game.js, before audio.js.
"use strict";
(function () {

  var CFG = window.GAME_CONFIG.settings;

  function storage() {
    try { return window.localStorage || null; } catch (e) { return null; } // file:// and private modes may refuse
  }

  // Read order: the settings key; else the old mute key (a player who muted
  // before this panel existed stays silent, music included); else the defaults.
  // A field that is not a boolean falls back to its default.
  function load(st) {
    var out = { sound: CFG.defaults.sound, music: CFG.defaults.music };
    if (!st) return out;
    try {
      var raw = st.getItem(CFG.key);
      if (raw) {
        var o = JSON.parse(raw) || {};
        if (typeof o.sound === "boolean") out.sound = o.sound;
        if (typeof o.music === "boolean") out.music = o.music;
        return out;
      }
      if (st.getItem(CFG.legacyMuteKey) === "1") { out.sound = false; out.music = false; }
    } catch (e) { /* unreadable blob: the defaults stand */ }
    return out;
  }

  var st = storage();
  var cur = load(st);
  var before = null; // what "mute all" turned off, so the next press restores it

  function save() {
    if (!st) return;
    try { st.setItem(CFG.key, JSON.stringify({ sound: cur.sound, music: cur.music })); } catch (e) { }
  }
  function copy() { return { sound: cur.sound, music: cur.music }; }

  window.SETTINGS = {
    get: copy,
    set: function (k, v) {
      if (k !== "sound" && k !== "music") return copy();
      cur[k] = v === true;
      before = null;
      save();
      return copy();
    },
    // M and the ♪ button: everything off; pressed again, back to what it was
    // (or to sound and music on, if nothing is remembered from this session).
    toggleAll: function () {
      if (cur.sound || cur.music) {
        before = copy();
        cur.sound = false; cur.music = false;
      } else {
        var b = before || { sound: true, music: true };
        cur.sound = b.sound; cur.music = b.music;
        before = null;
      }
      save();
      return copy();
    },
    silent: function () { return !cur.sound && !cur.music; },
    _load: load // smoke.js only
  };
})();
