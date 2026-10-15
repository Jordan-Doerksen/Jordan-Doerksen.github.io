// ui.js -- everything that touches the DOM: tiles, answer row, animated score
// tally, the ledger, overlays, the reveal, and the rAF loop that drives the
// clock. Subscribes to GAME events; game logic itself stays DOM-free.
"use strict";
(function () {

  var CFG = window.GAME_CONFIG;
  var GAME = window.GAME;
  var RACK = window.RACK;
  var AUDIO = window.AUDIO;
  var S = GAME.state;

  var $ = function (id) { return document.getElementById(id); };
  var reducedMq = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUCED = !!(reducedMq && reducedMq.matches);
  // live flag: the OS setting can flip mid-session (reduced motion is law)
  if (reducedMq && reducedMq.addEventListener) {
    reducedMq.addEventListener("change", function (e) {
      REDUCED = e.matches;
      window.UI.REDUCED = e.matches;
    });
  }

  // ------------------------------------------------------------ tiles
  function tileEl(ch, id, socket) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tile" + (socket ? " socket" : "");
    b.dataset.id = id;
    b.setAttribute("aria-label", socket ? "empty compartment" : ch.toUpperCase());
    if (socket) b.disabled = true;
    b.textContent = socket ? "" : ch;
    if (!socket) {
      var v = document.createElement("span");
      v.className = "val";
      v.textContent = CFG.scoring.letterValues[ch] || 0;
      b.appendChild(v);
    }
    return b;
  }

  function renderTray() {
    var tray = $("tray");
    tray.innerHTML = "";
    RACK.tiles().forEach(function (t) {
      tray.appendChild(tileEl(t.ch, t.id, t.used));
    });
  }

  function renderAnswer(popLast) {
    var row = $("answerRow");
    row.innerHTML = "";
    var ids = RACK.answerIds();
    if (!ids.length) {
      var hint = document.createElement("span");
      hint.className = "answer-hint";
      hint.textContent = "type or tap the letters";
      row.appendChild(hint);
      return;
    }
    var tiles = {};
    RACK.tiles().forEach(function (t) { tiles[t.id] = t; });
    ids.forEach(function (id, i) {
      var el = tileEl(tiles[id].ch, id, false);
      el.disabled = false;
      if (popLast && i === ids.length - 1 && !REDUCED) el.classList.add("pop");
      row.appendChild(el);
    });
  }

  function refreshRack(popLast) { renderTray(); renderAnswer(popLast); }

  // ------------------------------------------------------------ HUD
  var dispScore = 0;       // what the score readout currently shows
  var tallyTimer = null;

  function setScoreText(n) { $("score").textContent = Math.round(n).toLocaleString("en-US"); }

  // the animated tally: count up in per-letter steps, a tick per step.
  // Reduced motion: instant total, no ticks -- the number just becomes true.
  function tallyTo(target, steps) {
    if (tallyTimer) { clearInterval(tallyTimer); tallyTimer = null; }
    if (REDUCED || steps < 1) { dispScore = target; setScoreText(target); return; }
    var from = dispScore, i = 0;
    tallyTimer = setInterval(function () {
      i++;
      dispScore = from + (target - from) * (i / steps);
      setScoreText(dispScore);
      AUDIO.sfx.tick();
      if (i >= steps) { clearInterval(tallyTimer); tallyTimer = null; dispScore = target; setScoreText(target); }
    }, CFG.tally.stepMs);
  }

  function floatScore(points) {
    if (REDUCED) return;
    var chip = document.createElement("span");
    chip.className = "score-float go";
    chip.textContent = "+" + points;
    var row = $("answerRow");
    row.style.position = "relative";
    row.appendChild(chip);
    setTimeout(function () { chip.remove(); }, 1100);
  }

  function fmtClock(t) {
    t = Math.max(0, Math.ceil(t));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function renderClock() {
    $("clock").textContent = fmtClock(S.time);
    // fraction of the bankable max, not the starting clock -- time banks to
    // clock.max, and the bar has to keep moving over the whole range
    var frac = Math.max(0, Math.min(1, S.time / CFG.clock.max));
    $("clockFill").style.width = (frac * 100) + "%";
    var urgent = S.mode === "playing" && !S.paused && S.time <= CFG.clock.urgentAt;
    $("clockWrap").classList.toggle("urgent", urgent);
  }

  function renderCounts() {
    $("round").textContent = S.round || "—";
    $("quotaFound").textContent = S.roundFound;
    $("quotaNeed").textContent = S.quota || "—";
    $("foundCount").textContent = S.foundWords.length;
    $("findableCount").textContent = S.findables.length || "—";
  }

  // ------------------------------------------------------------ the ledger
  function renderFound() {
    var box = $("foundList");
    if (!S.foundWords.length) {
      box.innerHTML = '<p class="empty">Nothing set yet.</p>';
      return;
    }
    var byLen = {};
    S.foundWords.forEach(function (fw) {
      (byLen[fw.word.length] = byLen[fw.word.length] || []).push(fw);
    });
    var lens = Object.keys(byLen).map(Number).sort(function (a, b) { return b - a; });
    var rackLen = RACK.seed().length;
    box.innerHTML = "";
    lens.forEach(function (L) {
      var g = document.createElement("div");
      g.className = "fl-group";
      var h = document.createElement("div");
      h.className = "g";
      h.textContent = L + " letters";
      g.appendChild(h);
      byLen[L].forEach(function (fw) {
        var row = document.createElement("div");
        row.className = "fl-word" + (fw.word.length === rackLen ? " full" : "");
        row.innerHTML = '<span class="w"></span><span class="p"></span>';
        row.querySelector(".w").textContent = fw.word;
        row.querySelector(".p").textContent = fw.points;
        g.appendChild(row);
      });
      box.appendChild(g);
    });
  }

  // ------------------------------------------------------------ reject line
  var rejectHideTimer = null;
  function showReject(line, reason) {
    var el = $("rejectLine");
    el.textContent = line;
    el.classList.add("show");
    if (rejectHideTimer) clearTimeout(rejectHideTimer);
    rejectHideTimer = setTimeout(function () { el.classList.remove("show"); }, 1900);
    if (!REDUCED) {
      var row = $("answerRow");
      var cls = reason === "duplicate" ? "bounce" : "shake";
      row.classList.remove("shake", "bounce");
      void row.offsetWidth; // restart the animation
      row.classList.add(cls);
      setTimeout(function () { row.classList.remove(cls); }, 450);
    }
  }

  // ------------------------------------------------------------ overlays
  function hideOverlays() {
    document.querySelectorAll(".overlay").forEach(function (o) { o.classList.remove("show"); });
  }
  function showOverlay(id) { hideOverlays(); $(id).classList.add("show"); }

  // the reveal: the full-rack word + top missed words by score
  function buildReveal(el, fullRackWord, missed, fullRackFound) {
    el.innerHTML = "";
    var full = document.createElement("div");
    full.className = "rv-full";
    full.innerHTML = '<span class="w"></span><span class="k"></span>';
    full.querySelector(".w").textContent = fullRackWord;
    full.querySelector(".k").textContent = fullRackFound
      ? "the full tray — you set it"
      : "the full tray — it was there the whole time";
    el.appendChild(full);

    var head = document.createElement("div");
    head.className = "rv-head";
    head.textContent = "top missed, by score";
    el.appendChild(head);

    if (!missed.length) {
      var none = document.createElement("p");
      none.className = "rv-none";
      none.textContent = "Nothing worth missing was missed. Noted.";
      el.appendChild(none);
      return;
    }
    var grid = document.createElement("div");
    grid.className = "rv-missed";
    missed.forEach(function (m) {
      var span = document.createElement("span");
      span.innerHTML = "<i></i><b></b>";
      span.querySelector("i").style.fontStyle = "normal";
      span.querySelector("i").textContent = m.word;
      span.querySelector("b").textContent = m.points;
      grid.appendChild(span);
    });
    el.appendChild(grid);
  }

  function showTitle() {
    // demo rack: the name itself, gently bobbing (static under reduced motion)
    var demo = $("demoRack");
    if (!demo.childElementCount) {
      "typecase".split("").forEach(function (ch, i) {
        var t = tileEl(ch, "demo" + i, false);
        t.disabled = true;
        t.style.animationDelay = (i * 0.22) + "s";
        demo.appendChild(t);
      });
    }
    var b = S.best;
    $("bestLine").textContent = b.score > 0
      ? "Best " + b.score.toLocaleString("en-US") + " · round " + b.round +
        (b.longestWord ? " · longest " + b.longestWord.toUpperCase() : "")
      : "No best yet. The book is patient.";
    showOverlay("ovTitle");
  }

  // ------------------------------------------------------------ game events
  function wire() {
    GAME.on("start", function () {
      tallyTo(0, 0); // clears any tally still running from the last game
      document.body.classList.remove("paused");
      hideOverlays();
      refreshRack();
      renderFound();
      renderCounts();
      renderClock();
    });

    GAME.on("rack", function () {
      refreshRack();
      renderFound();
      renderCounts();
    });

    GAME.on("round", function () {
      hideOverlays();
      renderCounts();
      renderClock();
    });

    GAME.on("accept", function (r) {
      if (r.fullRack) AUDIO.sfx.bigfanfare(); else AUDIO.sfx.thunk();
      refreshRack(); // rebuilds #answerRow -- the chip has to land after it
      floatScore(r.points);
      tallyTo(S.score, r.word.length);
      renderFound();
      renderCounts();
    });

    GAME.on("reject", function (r) {
      if (r.reason === "duplicate") AUDIO.sfx.dup(); else AUDIO.sfx.reject();
      showReject(r.line, r.reason);
    });

    GAME.on("roundclear", function (d) {
      AUDIO.sfx.fanfare();
      $("roundClearTitle").textContent = "Round " + d.round + ", set.";
      $("rcScore").textContent = d.roundScore.toLocaleString("en-US");
      $("rcWords").textContent = S.roundFound;
      $("rcRefill").textContent = "+" + CFG.clock.roundRefill + "s";
      buildReveal($("rcReveal"), d.fullRackWord, d.missed, S.fullRackFound);
      // let the tally land before the sheet covers it
      setTimeout(function () {
        if (S.mode === "roundend") showOverlay("ovRound");
      }, REDUCED ? 0 : 700);
    });

    GAME.on("over", function (d) {
      AUDIO.sfx.over();
      tallyTo(d.score, 1);
      $("goScore").textContent = d.score.toLocaleString("en-US");
      $("goBestRound").textContent = S.bestRoundScore.toLocaleString("en-US");
      $("goWords").textContent = d.words;
      $("goLongest").textContent = d.longestWord ? d.longestWord.toUpperCase() : "—";
      $("goBestNote").textContent = d.isBest ? "A new best. The ledger notes it." : "";
      buildReveal($("goReveal"), d.fullRackWord, d.missed, S.fullRackFound);
      renderClock();
      showOverlay("ovOver");
    });

    GAME.on("pause", function () {
      document.body.classList.add("paused");
      showOverlay("ovPause");
    });

    GAME.on("resume", function () {
      document.body.classList.remove("paused");
      hideOverlays();
    });

    GAME.on("urgent", function () {
      // heartbeat is an urgency effect -- skipped wholesale under reduced motion
      if (!REDUCED) AUDIO.sfx.heartbeat();
    });
  }

  // ------------------------------------------------------------ clock loop
  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.25, (last ? ts - last : 16) / 1000);
    last = ts;
    if (S.mode === "playing" && !S.paused) {
      GAME.tick(dt);
      renderClock();
    }
  }
  // Tab hidden => rAF suspends => the clock stops. Intended: no burning the
  // clock while the player is elsewhere; the pause overlay is the honest sibling.
  // On return, re-baseline the frame timer so the hidden span isn't charged
  // (the first frame back would otherwise bill up to 0.25s of dt).
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) last = 0;
  });

  window.UI = {
    REDUCED: REDUCED,
    init: function () {
      wire();
      renderClock();
      showTitle();
      requestAnimationFrame(frame);
    },
    refreshRack: refreshRack,
    showTitle: showTitle,
    setMute: function (muted) {
      $("muteBtn").classList.toggle("off", muted);
      $("muteBtn").textContent = muted ? "×" : "♪";
    },
    // ---- settings (GAME-16): the panel mirrors window.SETTINGS, never holds state
    syncSettings: function () {
      var s = window.SETTINGS.get();
      document.querySelectorAll("#ovSettings .seg button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(s[b.dataset.k] === (b.dataset.v === "1")));
      });
      this.setMute(window.SETTINGS.silent());
    },
    showSettings: function () {
      this.syncSettings();
      showOverlay("ovSettings");
      var first = document.querySelector('#ovSettings .seg button[aria-pressed="true"]');
      if (first) first.focus();
    },
    settingsOpen: function () { return $("ovSettings").classList.contains("show"); }
  };
})();
