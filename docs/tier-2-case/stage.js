/* Tier-2 stage — the assembly-line animation (DECISIONS.md CR-12).
 *
 * Cards arrive on a screen-wide stage one at a time, a connector drawing to
 * each as it lands. When the stage is full the batch files down into the list
 * below, the stage clears, and the next batch begins.
 *
 * PROGRESSIVE ENHANCEMENT, not a dependency. The markup ships every card in
 * document order and is fully readable with this file absent or broken. This
 * script sets data-js="on" on the stage, and ONLY THEN does the staged CSS
 * apply. If it throws, the page degrades to the static list it already was.
 *
 * Timings come from data attributes the generator wrote out of
 * scripts/tier2_stage.config.json. No fetch, no config parsing at runtime.
 *
 * Reduced motion is honoured before anything else runs: the stage is left
 * static with every card visible, and no timer is ever created.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setup(stage) {
    var cards = Array.prototype.slice.call(stage.querySelectorAll(".card"));
    if (!cards.length) return;

    var cfg = {
      batch: parseInt(stage.dataset.batch, 10) || 3,
      enter: parseInt(stage.dataset.enter, 10) || 600,
      draw: parseInt(stage.dataset.draw, 10) || 480,
      hold: parseInt(stage.dataset.hold, 10) || 1500,
      batchHold: parseInt(stage.dataset.batchhold, 10) || 2200,
      filedown: parseInt(stage.dataset.filedown, 10) || 700,
      autoplay: stage.dataset.autoplay === "true",
      loop: stage.dataset.loop === "true"
    };

    var slots = stage.querySelector(".slots");
    var done = stage.querySelector(".done");
    var controls = stage.querySelector(".controls");
    var btnPlay = stage.querySelector(".btn-play");
    var btnStep = stage.querySelector(".btn-step");
    var btnReset = stage.querySelector(".btn-reset");
    var readout = stage.querySelector(".readout");

    // Reduced motion: show everything, wire nothing, create no timer.
    if (reduced) {
      stage.dataset.js = "static";
      cards.forEach(function (c) { c.classList.add("in"); });
      if (controls) controls.hidden = true;
      return;
    }

    stage.dataset.js = "on";
    if (controls) controls.hidden = false;

    var i = 0;            // next card index to reveal
    var onStage = [];     // cards currently on the stage
    var timer = null;
    var playing = false;

    function label() {
      if (!readout) return;
      readout.textContent = i >= cards.length && !onStage.length
        ? "complete · " + cards.length + " of " + cards.length
        : Math.min(i, cards.length) + " of " + cards.length;
    }

    function clear() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function after(ms, fn) {
      clear();
      timer = setTimeout(function () { timer = null; fn(); }, ms);
    }

    // Move the finished batch into the list, then clear the stage.
    function fileDown() {
      var batch = onStage.slice();
      onStage = [];
      batch.forEach(function (card) { card.classList.add("filing"); });

      after(cfg.filedown, function () {
        batch.forEach(function (card) {
          card.classList.remove("in", "filing");
          var li = document.createElement("li");
          li.textContent = card.dataset.label;
          var badge = card.dataset.badge;
          if (badge) {
            var b = document.createElement("span");
            b.className = "b";
            b.textContent = badge;
            li.appendChild(b);
          }
          done.appendChild(li);
        });
        if (i >= cards.length) {
          if (cfg.loop) { reset(); play(); } else { stop(true); }
          return;
        }
        if (playing) step();
      });
    }

    // Reveal exactly one card. Used by both autoplay and the Step button.
    function step() {
      if (i >= cards.length && !onStage.length) { stop(true); return; }

      if (onStage.length >= cfg.batch) { fileDown(); return; }

      var card = cards[i];
      i += 1;
      card.classList.add("in");
      // Both are needed: the custom property places the card, and the data
      // attribute lets CSS suppress the connector on the last slot of a batch
      // (a rule the generator writes, since only it knows the batch size).
      card.style.setProperty("--slot", String(onStage.length));
      card.dataset.slot = String(onStage.length);
      onStage.push(card);
      label();

      var full = onStage.length >= cfg.batch;
      var last = i >= cards.length;

      if (!playing) return;
      if (last) { after(cfg.batchHold, fileDown); return; }
      after(full ? cfg.batchHold : cfg.hold + cfg.enter + cfg.draw,
            full ? fileDown : step);
    }

    function play() {
      if (i >= cards.length && !onStage.length) reset();
      playing = true;
      stage.dataset.playing = "true";
      if (btnPlay) { btnPlay.textContent = "Pause"; btnPlay.setAttribute("aria-pressed", "true"); }
      step();
    }

    function stop(finished) {
      playing = false;
      clear();
      stage.dataset.playing = "false";
      if (btnPlay) {
        btnPlay.textContent = finished ? "Replay" : "Play";
        btnPlay.setAttribute("aria-pressed", "false");
      }
      label();
    }

    function reset() {
      clear();
      playing = false;
      i = 0;
      onStage = [];
      cards.forEach(function (c) {
        c.classList.remove("in", "filing");
        c.style.removeProperty("--slot");
      });
      while (done.firstChild) done.removeChild(done.firstChild);
      stage.dataset.playing = "false";
      if (btnPlay) { btnPlay.textContent = "Play"; btnPlay.setAttribute("aria-pressed", "false"); }
      label();
    }

    if (btnPlay) btnPlay.addEventListener("click", function () {
      playing ? stop(false) : play();
    });
    if (btnStep) btnStep.addEventListener("click", function () {
      stop(false);
      step();
    });
    if (btnReset) btnReset.addEventListener("click", reset);

    // A tour that is switched away from must not keep running in the dark.
    document.addEventListener("change", function (e) {
      if (e.target && e.target.name === "tour") {
        var visible = stage.closest(".tour");
        if (visible && getComputedStyle(visible).display === "none") { stop(false); reset(); }
      }
    });

    label();
    if (cfg.autoplay) play();
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".stage"), function (s) {
      try { setup(s); } catch (err) {
        // Never leave a half-built stage: fall back to every card visible.
        s.dataset.js = "static";
        Array.prototype.forEach.call(s.querySelectorAll(".card"), function (c) {
          c.classList.add("in");
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
