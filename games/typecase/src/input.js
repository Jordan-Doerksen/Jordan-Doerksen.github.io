// input.js -- physical keyboard first-class, full click/tap parity, and boot.
// Loaded last; wires the DOM to RACK/GAME/UI and starts the game shell.
"use strict";
(function () {

  var CFG = window.GAME_CONFIG;
  var GAME = window.GAME;
  var RACK = window.RACK;
  var AUDIO = window.AUDIO;
  var SETTINGS = window.SETTINGS;
  var UI = window.UI;
  var S = GAME.state;

  var $ = function (id) { return document.getElementById(id); };

  function playing() { return S.mode === "playing" && !S.paused; }

  // ---- actions ----
  function typeChar(ch) {
    if (!playing()) return;
    if (RACK.typeChar(ch) >= 0) {
      AUDIO.sfx.click();
      UI.refreshRack(true);
    }
  }
  function backspace() {
    if (!playing()) return;
    if (RACK.backspace() >= 0) {
      AUDIO.sfx.back();
      UI.refreshRack();
    }
  }
  function clearAnswer() {
    if (!playing()) return;
    RACK.clear();
    AUDIO.sfx.back();
    UI.refreshRack();
  }
  function shuffle() {
    if (!playing()) return;
    RACK.shuffle();
    AUDIO.sfx.shuffle();
    UI.refreshRack();
  }
  function submit() {
    if (!playing()) return;
    GAME.submit();
  }
  function togglePause() {
    if (S.mode !== "playing") return;
    if (S.paused) GAME.resume(); else GAME.pause();
  }
  function toggleMute() { // M and ♪: everything off, then back to what it was
    SETTINGS.toggleAll();
    UI.syncSettings();
    AUDIO.syncMusic();
  }
  function setOption(k, on) {
    SETTINGS.set(k, on);
    UI.syncSettings();
    if (k === "music") AUDIO.syncMusic();
    if (k === "sound" && on) AUDIO.sfx.click(); // the player hears what they turned on
  }
  function closeSettings() {
    UI.showTitle();
    $("settingsBtn").focus();
  }
  function advance() { // Enter outside play: title -> start, roundend -> next, over -> again
    if (S.mode === "title") GAME.newGame();
    else if (S.mode === "roundend") GAME.nextRound();
    else if (S.mode === "over") GAME.newGame();
  }

  // ---- keyboard ----
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var k = e.key.toLowerCase();

    // a focused tile is a real <button>: hands off Enter/Space so native
    // activation fires its click (the tray/answer handlers take it from there)
    if (e.target.closest && e.target.closest(".tile") &&
        (k === "enter" || e.key === CFG.keys.shuffle)) return;

    if (playing()) {
      // letters outrank shortcuts mid-play -- a rack can hold P or M.
      // Native key repeat stays for typing and backspace (text-entry feel);
      // everything discrete below ignores it. Esc is the in-play pause key.
      if (k.length === 1 && k >= "a" && k <= "z") { typeChar(k); return; }
      if (k === "backspace") { e.preventDefault(); backspace(); return; }
      if (e.repeat) return;
      if (CFG.keys.pause.indexOf(k) >= 0) { e.preventDefault(); togglePause(); return; }
      if (k === "enter") { e.preventDefault(); submit(); return; }
      if (k === "delete") { e.preventDefault(); clearAnswer(); return; }
      if (e.key === CFG.keys.shuffle) { e.preventDefault(); shuffle(); return; }
      if (k === CFG.keys.mute) { toggleMute(); return; }
      return;
    }

    // outside active play (title, paused, roundend, over): shortcuts rule
    if (e.repeat) return;
    if (k === CFG.keys.mute) { toggleMute(); return; }
    // a focused control outside play (Settings link, toggles, Back) owns its own
    // Enter and Space: native activation fires its click. Without this, Enter on
    // the Settings link would fall through to advance() and start a game.
    if (e.target.closest && e.target.closest("button") && (k === "enter" || e.key === " ")) return;
    if (UI.settingsOpen()) {
      if (k === "escape") { e.preventDefault(); closeSettings(); }
      return; // nothing else reaches the game from the settings panel
    }
    if (CFG.keys.pause.indexOf(k) >= 0) { e.preventDefault(); togglePause(); return; }
    if (k === "enter") { e.preventDefault(); advance(); return; }
  });

  // ---- pointer: tap parity on the tiles themselves ----
  $("tray").addEventListener("click", function (e) {
    if (!playing()) return;
    var t = e.target.closest(".tile");
    if (!t || t.classList.contains("socket")) return;
    if (RACK.claim(Number(t.dataset.id))) {
      AUDIO.sfx.click();
      UI.refreshRack(true);
    }
  });
  $("answerRow").addEventListener("click", function (e) {
    if (!playing()) return;
    var t = e.target.closest(".tile");
    if (!t) return;
    if (RACK.release(Number(t.dataset.id))) {
      AUDIO.sfx.back();
      UI.refreshRack();
    }
  });

  // ---- buttons ----
  $("shuffleBtn").addEventListener("click", shuffle);
  $("clearBtn").addEventListener("click", clearAnswer);
  $("submitBtn").addEventListener("click", submit);
  $("pauseBtn").addEventListener("click", togglePause);
  $("muteBtn").addEventListener("click", toggleMute);
  $("startBtn").addEventListener("click", function () { GAME.newGame(); });
  $("nextRoundBtn").addEventListener("click", function () { GAME.nextRound(); });
  $("againBtn").addEventListener("click", function () { GAME.newGame(); });
  $("resumeBtn").addEventListener("click", function () { GAME.resume(); });
  $("settingsBtn").addEventListener("click", function () { UI.showSettings(); });
  $("settingsBackBtn").addEventListener("click", closeSettings);
  document.querySelectorAll("#ovSettings .seg button").forEach(function (b) {
    b.addEventListener("click", function () { setOption(b.dataset.k, b.dataset.v === "1"); });
  });

  // ---- audio unlock on the first real gesture (autoplay law) ----
  function unlockOnce() {
    AUDIO.unlock();
    document.removeEventListener("pointerdown", unlockOnce);
    document.removeEventListener("keydown", unlockOnce);
  }
  document.addEventListener("pointerdown", unlockOnce);
  document.addEventListener("keydown", unlockOnce);

  // ---- boot ----
  UI.syncSettings();
  UI.init();
})();
