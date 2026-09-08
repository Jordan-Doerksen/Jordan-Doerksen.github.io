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

  /* The mesh is ONE diagram shared by every tour, and what it has lit persists
   * across tour switches on purpose: running a second path draws its joins to
   * parts the first path already placed. That accumulation is the whole point,
   * so `lit` lives here rather than inside a stage. */
  var mesh = null;
  var lit = Object.create(null);
  var finale = null;
  var panels = null;
  var ran = Object.create(null);   // which paths actually completed

  function radios() {
    return Array.prototype.slice.call(document.querySelectorAll('input[name="tour"]'));
  }

  /* A finished path used to leave an empty panel on screen, which reads as the
   * page having broken rather than having finished. Chain to the next path, and
   * when the last one is done show the finale instead of nothing. */
  function advanceOrFinish() {
    var rs = radios();
    var i = rs.findIndex(function (r) { return r.checked; });
    if (i > -1) ran[rs[i].id] = true;
    if (i > -1 && i < rs.length - 1) {
      rs[i + 1].checked = true;
      rs[i + 1].dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (!finale) return;

    // Report what actually happened, not the totals. Running only the last path
    // and stopping there must not print "every part reached" over a mesh that is
    // mostly dark - the same absent-is-not-zero rule the badges follow.
    var totalNodes = mesh ? mesh.querySelectorAll(".mnode").length : 0;
    var totalWires = mesh ? mesh.querySelectorAll(".mlink").length : 0;
    var litNodes = mesh ? mesh.querySelectorAll(".mnode.on").length : 0;
    var litWires = mesh ? mesh.querySelectorAll(".mlink.on").length : 0;
    var ranCount = Object.keys(ran).length;
    var totalTours = rs.length;
    var whole = litNodes >= totalNodes && litWires >= totalWires;

    var head = finale.querySelector(".f-head");
    var body = finale.querySelector(".f-body");
    if (head) {
      head.textContent = ranCount >= totalTours
        ? "All " + totalTours + " paths run."
        : ranCount + " of " + totalTours + " paths run.";
    }
    if (body) {
      body.textContent = whole
        ? "Every part has been reached and every connection between them drawn: "
          + totalNodes + " parts, " + totalWires + " connections."
        : litNodes + " of " + totalNodes + " parts reached, "
          + litWires + " of " + totalWires + " connections drawn. "
          + "The rest belong to paths that have not been run.";
    }

    finale.hidden = false;
    if (panels) panels.hidden = true;
  }

  function restartAll() {
    if (finale) finale.hidden = true;
    if (panels) panels.hidden = false;
    lit = Object.create(null);
    ran = Object.create(null);
    if (mesh) {
      Array.prototype.forEach.call(mesh.querySelectorAll(".on"), function (el) {
        el.classList.remove("on");
        el.style.removeProperty("--len");
      });
    }
    document.dispatchEvent(new CustomEvent("stage:resetall"));
    var rs = radios();
    if (rs.length) {
      rs[0].checked = true;
      rs[0].dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function litUp(nodeId) {
    if (!mesh || !nodeId || lit[nodeId]) return;
    lit[nodeId] = true;
    var g = mesh.querySelector('#n-' + CSS.escape(nodeId));
    if (g) g.classList.add("on");
    // A wire appears only when BOTH its ends are lit.
    Array.prototype.forEach.call(mesh.querySelectorAll(".mlink"), function (p) {
      if (p.classList.contains("on")) return;
      if (lit[p.dataset.a] && lit[p.dataset.b]) {
        try { p.style.setProperty("--len", p.getTotalLength().toFixed(1)); } catch (e) {}
        p.classList.add("on");
      }
    });
  }

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
      loop: stage.dataset.loop === "true",
      chain: stage.dataset.chain === "true"
    };

    var slots = stage.querySelector(".slots");
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
    var fileTimer = null;   // owned by fileDown; clear() must not touch it
    var filing = false;
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

    // A pending file-down gets its OWN timer, like the file-down itself. It used
    // to be scheduled on the shared one, so anything calling stop() during the
    // hold cancelled it - and the last batch of a path is handed off by exactly
    // that callback. The run ended with cards still on the stage, "6 of 6", and
    // the chain to the next path never fired.
    function scheduleFileDown(ms) {
      if (fileTimer || filing) return;
      fileTimer = setTimeout(function () { fileTimer = null; fileDown(); }, ms);
    }

    // A file-down owns its OWN timer and is never cancelled by clear().
    // It used to share `timer`, so a Step click (or a pause) during the 700ms
    // hand-off killed the callback that lights the mesh - the batch vanished
    // from the stage and never arrived. Rapid stepping lost 6 of 9 parts.
    function fileDown() {
      if (filing) return;
      filing = true;
      var batch = onStage.slice();
      onStage = [];
      batch.forEach(function (card) { card.classList.add("filing"); });

      fileTimer = setTimeout(function () {
        fileTimer = null;
        filing = false;
        batch.forEach(function (card) {
          card.classList.remove("in", "filing");
          card.removeAttribute("data-slot");
          litUp(card.dataset.node);
        });
        if (i >= cards.length) {
          if (cfg.loop) { reset(); play(); return; }
          stop(true);
          // This path is done. Hand off to the next one, or finish the run.
          if (cfg.chain && onScreen()) advanceOrFinish();
          return;
        }
        if (playing) step();
      }, cfg.filedown);
    }

    // Reveal exactly one card. Used by both autoplay and the Step button.
    function step() {
      // A hand-off is in flight; let it finish rather than racing it.
      if (filing) return;
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
      if (last) { scheduleFileDown(cfg.batchHold); return; }
      if (full) { scheduleFileDown(cfg.batchHold); return; }
      after(cfg.hold + cfg.enter + cfg.draw, step);
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
      if (fileTimer) { clearTimeout(fileTimer); fileTimer = null; }
      filing = false;
      playing = false;
      i = 0;
      onStage = [];
      cards.forEach(function (c) {
        c.classList.remove("in", "filing");
        c.style.removeProperty("--slot");
      });
      // Reset clears THIS stage only. The mesh keeps what it has lit, because
      // accumulation across tours is the point of it (see litUp).
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

    function onScreen() {
      var tour = stage.closest(".tour");
      return !tour || getComputedStyle(tour).display !== "none";
    }

    // Every tour has its own stage, and all of them boot. Without this check all
    // five would autoplay at once, so the mesh would fill from four stages
    // nobody is watching - which destroys the reveal the mesh exists for: you
    // run a second path and SEE it join the parts the first one placed.
    // A stage therefore runs only while its tour is on screen, and starts when
    // it is switched to.
    document.addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "tour") return;
      if (onScreen()) {
        if (cfg.autoplay && !playing) play();
      } else {
        stop(false);
        reset();
      }
    });

    // "Run all again" clears the mesh and every stage, not just the visible one.
    document.addEventListener("stage:resetall", reset);

    label();
    if (cfg.autoplay && onScreen()) play();
  }

  function boot() {
    mesh = document.querySelector(".mesh");
    finale = document.querySelector(".finale");
    panels = document.querySelector(".panels");
    var again = finale && finale.querySelector(".btn-again");
    if (again) again.addEventListener("click", restartAll);
    // Under reduced motion the mesh is left exactly as it ships: the complete
    // diagram, fully visible, nothing to wait for. Only arm the dark-then-light
    // behaviour when motion is welcome.
    if (mesh && !reduced) mesh.dataset.js = "on";

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
