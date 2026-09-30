/* 08 guards - the sabotage terminal: a category wall and one live case. A piece for the core scheduler
   (window.AH): it owns no timer and no animation frame. The core calls frame(t, dt) while the piece is
   live, stop() when it leaves (the pass pauses where it is and resumes on the next start()), and static()
   under reduced motion, where the markup is already the still: the family tiles with their counts and
   the first example cases. The pass is staged from the published case list the generator embedded in
   the stage's data-ah-pass attribute; nothing runs here, and no word claims a run. */
(function () {
  "use strict";
  var root = document.getElementById("ah-guards");
  if (!root || !window.AH || typeof window.AH.register !== "function") return;
  try {
    var AH = window.AH;
    var stage = root.querySelector(".ah-g-stage");
    var spec = null;
    try { spec = JSON.parse(stage ? stage.getAttribute("data-ah-pass") : ""); } catch (e) { spec = null; }
    var ok = !!(spec && spec.cases && spec.cases.length && spec.reveal > 0 && spec.stamp > spec.reveal &&
                spec.sec > spec.stamp && spec.hold > 0);
    // Without the generated pass (a raw part, a bad build) the markup is the whole piece.
    if (!ok) { AH.register({ id: "guards", el: root, always: false, static: function () {} }); return; }

    var CASES = spec.cases;
    var SEC = +spec.sec, REVEAL = +spec.reveal, STAMP = +spec.stamp, HOLD = +spec.hold;   // seconds, from the config
    var FLASH = 0.9;    // seconds a tile keeps its hit flag: the length of its flash keyframe in guards.css
    var WAIT = "◌", CHECK = "✓";
    var status = root.querySelector(".ah-g-status");
    var caughtEl = root.querySelector("[data-ah-g-caught]");

    var tiles = {};     // family key -> { li, pass (its per-pass tally), label, n }
    var lis = root.querySelectorAll(".ah-g-fam[data-family]");
    for (var i = 0; i < lis.length; i++) {
      var label = lis[i].querySelector(".ah-g-fam-label");
      tiles[lis[i].getAttribute("data-family")] = { li: lis[i], pass: lis[i].querySelector("[data-ah-g-pass]"),
                                                    label: label ? label.textContent : "", n: 0 };
    }

    var player = null, f = null;   // the card's one case element and its fields
    var idx = -1, acc = 0, phase = "idle", paused = "", caught = 0;
    var hitTile = null, hitLeft = 0, onTile = null, measuredW = -1, started = false;

    function takeOver() {   // once: the first example becomes the player, the other examples leave the stage
      var arts = stage.querySelectorAll(".ah-g-case");
      if (!arts.length) return false;
      var p = arts[0];
      var fields = { fam: p.querySelector(".ah-g-case-fam"), where: p.querySelector(".ah-g-where"),
                     mut: p.querySelector(".ah-g-mut"), test: p.querySelector(".ah-g-test"),
                     stamp: p.querySelector(".ah-g-stamp") };
      if (!fields.fam || !fields.where || !fields.mut || !fields.test || !fields.stamp) return false;
      for (var j = arts.length - 1; j >= 1; j--) stage.removeChild(arts[j]);
      player = p; f = fields;
      return true;
    }

    function setTest(name) {
      f.test.textContent = "";
      if (!name) { f.test.textContent = WAIT; f.test.setAttribute("data-state", "waiting"); return; }
      var bits = name.split("_");   // a break chance after each underscore, as the generator writes it
      for (var i = 0; i < bits.length; i++) {
        f.test.appendChild(document.createTextNode(bits[i] + (i < bits.length - 1 ? "_" : "")));
        if (i < bits.length - 1) f.test.appendChild(document.createElement("wbr"));
      }
      f.test.removeAttribute("data-state");
    }
    function setStamp(on) {   // glyph and word both change: colour is never the only carrier
      var g = document.createElement("span");
      g.className = on ? "ah-g-ok" : "ah-g-wait";
      g.setAttribute("aria-hidden", "true");
      g.textContent = on ? CHECK : WAIT;
      f.stamp.textContent = "";
      f.stamp.appendChild(g);
      f.stamp.appendChild(document.createTextNode(on ? " CAUGHT" : " waiting"));
      f.stamp.setAttribute("data-state", on ? "caught" : "waiting");
    }
    function fill(c, test, stamped) {
      f.fam.textContent = tiles[c.f] ? tiles[c.f].label : "";
      player.setAttribute("data-family", c.f);
      f.where.textContent = c.w;
      f.mut.textContent = c.m;
      setTest(test ? c.t : null);
      setStamp(stamped);
    }
    function redraw() {       // the current case, in the current phase
      var i = Math.max(0, Math.min(idx, CASES.length - 1));
      var ph = phase === "idle" ? paused : phase;
      var done = idx < 0 || ph === "caught" || ph === "end";
      fill(CASES[i], done || ph === "by", done);
    }
    function measure() {      // reserve the tallest case at this width, so the card never jumps between cases
      player.style.minHeight = "";
      var max = 0;
      for (var i = 0; i < CASES.length; i++) {
        fill(CASES[i], true, true);
        if (player.offsetHeight > max) max = player.offsetHeight;
      }
      player.style.minHeight = max + "px";
      measuredW = stage.clientWidth;
      redraw();
    }

    function setStatus(state, text) {
      if (!status) return;
      status.textContent = text;
      status.setAttribute("data-state", state);
    }
    function playing() { setStatus("playing", "case " + (idx + 1) + " of " + CASES.length); }
    // The end reads as complete, on the staged count the tally also prints (the build
    // checks the two agree): never a total of published guards, which read as a miss.
    // No longer than "case 36 of 36", so the bar never gains a line when the pass ends.
    function ended() { setStatus("ended", "all " + CASES.length + " shown"); }
    function setOn(key) {     // the tile whose case is on the card
      if (onTile) onTile.li.removeAttribute("data-ah-g-on");
      onTile = key ? tiles[key] || null : null;
      if (onTile) onTile.li.setAttribute("data-ah-g-on", "");
    }
    function clearHit() {
      if (hitTile) hitTile.li.removeAttribute("data-ah-g");
      hitTile = null; hitLeft = 0;
    }
    function setCount(el, n) { if (el) el.textContent = String(n); }

    function resetPass() {
      caught = 0; setCount(caughtEl, 0);
      for (var k in tiles) {
        if (Object.prototype.hasOwnProperty.call(tiles, k)) { tiles[k].n = 0; setCount(tiles[k].pass, 0); }
      }
      idx = -1;
    }
    function next() {
      idx += 1; acc = 0;
      if (idx >= CASES.length) {   // the pass ends on the last case, complete; then it starts again
        idx = CASES.length - 1; phase = "end";
        setOn(null); ended();
        player.removeAttribute("data-phase");
        return;
      }
      if (stage.clientWidth !== measuredW) measure();
      phase = "broke";
      fill(CASES[idx], false, false);
      player.setAttribute("data-phase", "broke");
      setOn(CASES[idx].f);
      playing();
    }
    function catchIt() {
      var t = tiles[CASES[idx].f];
      setStamp(true);
      player.setAttribute("data-phase", "caught");
      caught += 1; setCount(caughtEl, caught);
      if (t) {
        t.n += 1; setCount(t.pass, t.n);
        clearHit(); hitTile = t; hitLeft = FLASH;
        t.li.setAttribute("data-ah-g", "hit");
      }
    }

    function frame(t, dt) {
      var over;
      if (phase === "idle") return;
      acc += dt;
      if (hitTile) { hitLeft -= dt; if (hitLeft <= 0) clearHit(); }
      if (phase === "broke" && acc >= REVEAL) {
        phase = "by"; setTest(CASES[idx].t); player.setAttribute("data-phase", "by");
      } else if (phase === "by" && acc >= STAMP) {
        phase = "caught"; catchIt();
      } else if (phase === "caught" && acc >= SEC) {
        over = acc - SEC; next(); acc = over;     // carry the frame's overshoot: the cadence does not drift
      } else if (phase === "end" && acc >= HOLD) {
        over = acc - HOLD; resetPass(); next(); acc = over;
      }
    }
    function start() {
      if (!player) return;
      if (!started) { started = true; measure(); resetPass(); next(); return; }
      phase = paused || "broke"; paused = "";      // resume where the pass paused
      if (stage.clientWidth !== measuredW) measure();
      if (phase === "end") ended(); else { setOn(CASES[idx].f); playing(); }
    }
    function stop() {         // pause: the card keeps its case, readable; flashes and highlights clear
      if (phase !== "idle") { paused = phase; phase = "idle"; }
      clearHit(); setOn(null);
      if (started) setStatus("paused", "paused");
    }

    // Motion on: the card becomes the one-case player now, before the first paint, so it does not
    // shrink as it scrolls in. Reduced motion: nothing is touched; the markup is the still.
    if (!AH.REDUCED && takeOver()) {
      fill(CASES[0], true, true);
      setStatus("still", "ready");
    }

    AH.register({ id: "guards", el: root, always: false, start: start, stop: stop, frame: frame,
                  static: function () {} });
  } catch (e) { /* the markup is the complete still; a throw here leaves it untouched */ }
})();
