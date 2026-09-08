/* Tier-3 arcade floor (DECISIONS.md CR-13, display-case-law.md).
 *
 * Same grammar as the tier-2 stage, different execution. Cabinets arrive one at
 * a time and each one is a REAL GAME running its own attract screen in an
 * iframe. When a row has run, it powers down onto the floor below and the next
 * row arrives. Every arrival is a state you can pause on.
 *
 * Why iframes are added by script and not shipped in the markup: eleven canvas
 * games in the document would all start their animation loops at once. Only
 * `liveSlots` ever run.
 *
 * PROGRESSIVE ENHANCEMENT. The markup ships every game as a real link with its
 * name and description. With this file absent, blocked or throwing, the page is
 * a plain index of eleven playable games and every one of them still works -
 * they are ordinary pages at their own URLs. The floor is the enhancement.
 *
 * Under prefers-reduced-motion nothing auto-runs: no iframe is created, no timer
 * is started, and the list stands as shipped.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setup(floor) {
    var items = Array.prototype.slice.call(floor.querySelectorAll(".cab"));
    if (!items.length) return;

    var cfg = {
      slots: parseInt(floor.dataset.slots, 10) || 3,
      powerOn: parseInt(floor.dataset.poweron, 10) || 900,
      run: parseInt(floor.dataset.run, 10) || 7000,
      powerDown: parseInt(floor.dataset.powerdown, 10) || 700,
      capture: floor.dataset.capture === "true",
      autoplay: floor.dataset.autoplay === "true",
      loop: floor.dataset.loop === "true"
    };

    var stage = floor.querySelector(".floor-stage");
    var shelf = floor.querySelector(".shelf");
    var controls = floor.querySelector(".floor-controls");
    var btnPlay = floor.querySelector(".btn-play");
    var btnNext = floor.querySelector(".btn-next");
    var btnReset = floor.querySelector(".btn-reset");
    var readout = floor.querySelector(".readout");
    var finale = floor.querySelector(".floor-finale");

    if (reduced) {
      floor.dataset.js = "static";
      if (controls) controls.hidden = true;
      return;
    }

    floor.dataset.js = "on";
    if (controls) controls.hidden = false;

    var i = 0;
    var onStage = [];
    var timer = null;
    var downTimer = null;
    var powering = false;
    var playing = false;

    function label() {
      if (!readout) return;
      readout.textContent = (i >= items.length && !onStage.length)
        ? "floor complete · " + items.length + " of " + items.length
        : Math.min(i, items.length) + " of " + items.length;
    }

    function clear() { if (timer) { clearTimeout(timer); timer = null; } }
    function after(ms, fn) {
      clear();
      timer = setTimeout(function () { timer = null; fn(); }, ms);
    }
    // Its own timer, for the same reason the tier-2 file-down has one: a pause
    // during the hand-off must not cancel the thing that advances the run.
    function scheduleDown(ms) {
      if (downTimer || powering) return;
      downTimer = setTimeout(function () { downTimer = null; powerDown(); }, ms);
    }

    /* Read a real frame off the running game. Same-origin, so this is allowed.
     * There are no screenshots of these games anywhere - this makes one from the
     * game actually running. Any failure falls back to type, never a blank box. */
    function grabFrame(cab) {
      if (!cfg.capture) return null;
      try {
        var doc = cab.frame && cab.frame.contentDocument;
        if (!doc) return null;
        var canvases = doc.querySelectorAll("canvas");
        var best = null;
        Array.prototype.forEach.call(canvases, function (c) {
          if (!best || c.width * c.height > best.width * best.height) best = c;
        });
        if (!best || !best.width) return null;

        // A capture must PROVE it caught something. A WebGL canvas without
        // preserveDrawingBuffer reads back solid black, and a game that has not
        // painted yet reads back empty - measured here, six of ten plates were
        // the identical all-black PNG. Sample the frame and reject a flat one.
        // A typed plate is honest; a black rectangle is a lie with a border.
        var probe = document.createElement("canvas");
        probe.width = 48;
        probe.height = 36;
        var px = probe.getContext("2d");
        px.drawImage(best, 0, 0, 48, 36);
        var data = px.getImageData(0, 0, 48, 36).data;
        var min = 255, max = 0;
        for (var k = 0; k < data.length; k += 4) {
          var v = (data[k] + data[k + 1] + data[k + 2]) / 3;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min < 12) return null;   // flat frame: nothing was painted

        return best.toDataURL("image/png");
      } catch (e) {
        return null;      // cross-origin, tainted, or no canvas: type it is.
      }
    }

    function powerDown() {
      if (powering) return;
      powering = true;
      var batch = onStage.slice();
      onStage = [];

      batch.forEach(function (cab) {
        var shot = grabFrame(cab);
        if (shot) {
          var img = new Image();
          img.src = shot;
          img.alt = "A frame from " + cab.name + ", captured while it was running";
          img.loading = "lazy";
          cab.plate.insertBefore(img, cab.plate.firstChild);
          cab.plate.classList.add("has-shot");
        }
        cab.el.classList.add("powering-down");
      });

      downTimer = setTimeout(function () {
        downTimer = null;
        powering = false;
        batch.forEach(function (cab) {
          // Dropping src stops the game's loop. This is the CPU budget working.
          if (cab.frame) { cab.frame.src = "about:blank"; cab.frame.remove(); cab.frame = null; }
          cab.el.classList.remove("live", "powering-down");
          shelf.appendChild(cab.plate);
          if (cab.el.parentNode === stage) stage.removeChild(cab.el);
        });
        if (i >= items.length) {
          if (cfg.loop) { reset(); play(); return; }
          stop(true);
          showFinale();
          return;
        }
        if (playing) step();
      }, cfg.powerDown);
    }

    function step() {
      if (powering) return;
      if (i >= items.length && !onStage.length) { stop(true); showFinale(); return; }
      if (onStage.length >= cfg.slots) { powerDown(); return; }

      var el = items[i];
      i += 1;

      var cab = {
        el: el,
        name: el.dataset.name,
        url: el.dataset.url,
        plate: el.querySelector(".plate"),
        frame: null
      };

      var frame = document.createElement("iframe");
      frame.src = cab.url;
      frame.title = cab.name + " running its attract screen";
      frame.loading = "lazy";
      frame.setAttribute("scrolling", "no");
      frame.tabIndex = -1;          // the frame is a display; Play is the way in
      el.querySelector(".screen").appendChild(frame);
      cab.frame = frame;

      // The cabinet ships inside .shelf so the no-JS page is a plain index.
      // Going live MOVES it onto the stage; its plate returns to the shelf when
      // it powers down. Without the move the grid rule has nothing to place.
      stage.appendChild(el);
      el.classList.add("live");
      el.style.setProperty("--slot", String(onStage.length));
      onStage.push(cab);
      label();

      if (!playing) return;
      var full = onStage.length >= cfg.slots;
      var last = i >= items.length;
      if (full || last) { scheduleDown(cfg.run); return; }
      after(cfg.powerOn + cfg.run / 2, step);
    }

    function showFinale() {
      if (!finale) return;
      var shots = shelf.querySelectorAll(".plate.has-shot").length;
      var total = items.length;
      var head = finale.querySelector(".f-head");
      var body = finale.querySelector(".f-body");
      if (head) head.textContent = "The floor is lit.";
      if (body) {
        body.textContent = total + " games, all playable in the browser right now. "
          + (shots
              ? shots + " of the plates below are real frames, captured off each game while it ran."
              : "The plates below are typed, because no frame could be read from these games.");
      }
      finale.hidden = false;
    }

    function play() {
      if (i >= items.length && !onStage.length) reset();
      playing = true;
      floor.dataset.playing = "true";
      if (btnPlay) { btnPlay.textContent = "Pause"; btnPlay.setAttribute("aria-pressed", "true"); }
      step();
    }

    function stop(done) {
      playing = false;
      clear();
      floor.dataset.playing = "false";
      if (btnPlay) {
        btnPlay.textContent = done ? "Run again" : "Play";
        btnPlay.setAttribute("aria-pressed", "false");
      }
      label();
    }

    function reset() {
      clear();
      if (downTimer) { clearTimeout(downTimer); downTimer = null; }
      powering = false;
      playing = false;
      i = 0;
      onStage = [];
      if (finale) finale.hidden = true;
      items.forEach(function (el) {
        el.classList.remove("live", "powering-down");
        el.style.removeProperty("--slot");
        var f = el.querySelector("iframe");
        if (f) { f.src = "about:blank"; f.remove(); }
        var plate = el.querySelector(".plate");
        if (plate) {
          var img = plate.querySelector("img");
          if (img) img.remove();
          plate.classList.remove("has-shot");
          el.appendChild(plate);
        }
        shelf.appendChild(el);
      });
      floor.dataset.playing = "false";
      if (btnPlay) { btnPlay.textContent = "Play"; btnPlay.setAttribute("aria-pressed", "false"); }
      label();
    }

    if (btnPlay) btnPlay.addEventListener("click", function () {
      playing ? stop(false) : play();
    });
    if (btnNext) btnNext.addEventListener("click", function () { stop(false); step(); });
    if (btnReset) btnReset.addEventListener("click", reset);

    label();
    if (cfg.autoplay) play();
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".floor"), function (f) {
      try { setup(f); } catch (err) {
        // Never a half-built floor: fall back to the shipped index of games.
        f.dataset.js = "static";
        var c = f.querySelector(".floor-controls");
        if (c) c.hidden = true;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
