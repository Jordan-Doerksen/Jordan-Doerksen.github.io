/* 05 regime — the grade dial. One IIFE that registers with the core scheduler (window.AH).
   No timer and no animation frame is created here: the core drives frame() and tick(); under reduced motion
   the core calls static() once and nothing else. Every desk word, both band ladders and the label precedence
   arrive through the root's data-ah-desk attribute; the markup already holds the complete still.
   The score is synthetic: a mean-reverting walk on this piece's own seeded generator (never the core's rng, so the
   shared tape is the same for a seed whatever is live), first placed from the tape's history; the still never draws,
   so it is deterministic. A read with no data parks the needle
   below the scale and prints the precedence word alone: absent is a gap, never a zero. */
(function () {
  "use strict";
  var root = document.getElementById("ah-regime");
  if (!root || !window.AH || typeof window.AH.register !== "function") return;
  try { window.AH.register(build(root)); } catch (e) { /* a piece that throws at load never registers; the markup stays complete */ }

  function build(root) {
    var AH = window.AH;
    // This piece's own generator (mulberry32, the core's algorithm), seeded from the body's seed with a salt of its own.
    // It never draws from AH.rng: a draw between two tape steps would change the shared tape according to which pieces
    // happen to be live, and the same seed must give the same tape.
    var seedAttr = Number(document.body && document.body.getAttribute("data-ah-seed"));
    var seedState = (isFinite(seedAttr) ? (seedAttr | 0) : 1) ^ 0x52454705;
    function rng() {
      seedState = (seedState + 0x6D2B79F5) | 0;
      var t = seedState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var desk = null;
    try { desk = JSON.parse(root.getAttribute("data-ah-desk") || "null"); } catch (e) { desk = null; }
    var text = (desk && desk.text) || {};
    var bands = readBands(desk);
    var precedence = desk && desk.precedence;
    if (!precedence || !precedence.length) throw new Error("precedence missing");
    var NO_DATA = String(precedence[0]);                       // the ladder's first word: no score, no grade
    var JOIN = typeof text.gradeJoin === "string" ? text.gradeJoin : " · ";   // how the regime page joins grade and label

    var CX = 210, CY = 220, R_REGIME = 184, R_GRADE = 160, R_LETTER = 128, R_MIN = 146, TICK_IN = 176, TICK_OUT = 194;
    var PARK = -14;                                            // degrees past the low end: the rest mark
    var OMEGA = 6;                                             // critically damped: settles inside 1.2 s, no overshoot
    var PERIOD = 9, NO_DATA_EVERY = 5;                         // a read every 9 demo seconds; every fifth has no data
    var SPAN = 34, PULL = 0.12, MEAN = 58;                     // the walk: step width, pull toward the mean, the mean

    var needle = q("[data-ah-needle]"), gradeline = q("[data-ah-gradeline]"), score = q("[data-ah-score]"), note = q("[data-ah-note]");
    var gradeNow = root.querySelector("[data-ah-gradenow]");
    if (gradeNow && typeof text.gradeNow === "string") gradeNow.textContent = text.gradeNow;
    var face = {
      regime: elsFor(bands.regime, ".ah-regime-ring-regime path[data-label]", "label"),
      cuts: elsFor(bands.regime, ".ah-regime-cuts line[data-label]", "label"),
      grade: elsFor(bands.grade, ".ah-regime-ring-grade path[data-grade]", "grade"),
      letters: elsFor(bands.grade, ".ah-regime-letters text[data-grade]", "grade"),
      mins: elsFor(bands.grade, ".ah-regime-mins text[data-grade]", "grade")
    };

    var st = { angle: PARK, vel: 0, target: PARK, live: false, reads: 0, lastReadSec: null, walk: null, parked: true, shown: null };

    function q(sel) { var el = root.querySelector(sel); if (!el) throw new Error("missing " + sel); return el; }
    function each(list, fn) { Array.prototype.forEach.call(list, fn); }
    function byMinDesc(a, b) { return b.min - a.min; }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    // The two ladders: the generator's JSON first, else the lists it wrote into the markup. Sorted strongest first.
    function readBands(desk) {
      var b = desk && desk.bands;
      var g = b && (b.grade_bands || b.grade), r = b && (b.regime_bands || b.regime);
      if (!g || !r) {
        g = []; r = [];
        each(root.querySelectorAll(".ah-bands li[data-grade]"), function (li) { g.push({ grade: li.getAttribute("data-grade"), min: Number(li.getAttribute("data-min")) }); });
        each(root.querySelectorAll(".ah-regimes li[data-label]"), function (li) { r.push({ label: li.getAttribute("data-label"), min: Number(li.getAttribute("data-min")) }); });
      }
      g = g.slice().sort(byMinDesc); r = r.slice().sort(byMinDesc);
      if (!g.length || !r.length) throw new Error("bands missing");
      g.concat(r).forEach(function (x) { if (!isFinite(x.min)) throw new Error("band min is not a number"); });
      return { grade: g, regime: r };
    }
    // One drawn element per band, matched by its word; a face that does not match the data never registers.
    function elsFor(list, sel, key) {
      return list.map(function (band) {
        var el = null;
        each(root.querySelectorAll(sel), function (p) { if (p.getAttribute("data-" + key) === String(band[key])) el = p; });
        if (!el) throw new Error("dial face lacks " + band[key]);
        return el;
      });
    }

    // ---- geometry: score 0 sits at the left end, 100 at the right, the arc runs over the top ----
    function pt(s, r) { var ph = Math.PI * (1 - s / 100); return [CX + r * Math.cos(ph), CY - r * Math.sin(ph)]; }
    function f1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
    function arc(s0, s1, r) { var a = pt(s0, r), b = pt(s1, r); return "M " + f1(a[0]) + " " + f1(a[1]) + " A " + r + " " + r + " 0 0 1 " + f1(b[0]) + " " + f1(b[1]); }
    function place(el, s, r) { var p = pt(s, r); el.setAttribute("x", f1(p[0])); el.setAttribute("y", f1(p[1])); }
    function drawFace() {
      var top = 100;
      bands.regime.forEach(function (b, i) {
        face.regime[i].setAttribute("d", arc(b.min, top, R_REGIME));
        var a = pt(b.min, TICK_IN), c = pt(b.min, TICK_OUT), t = face.cuts[i];
        t.setAttribute("x1", f1(a[0])); t.setAttribute("y1", f1(a[1])); t.setAttribute("x2", f1(c[0])); t.setAttribute("y2", f1(c[1]));
        top = b.min;
      });
      top = 100;
      bands.grade.forEach(function (b, i) {
        face.grade[i].setAttribute("d", arc(b.min, top, R_GRADE));
        place(face.letters[i], (b.min + top) / 2, R_LETTER);
        place(face.mins[i], b.min, R_MIN);
        face.mins[i].textContent = String(b.min);
        top = b.min;
      });
    }

    // ---- the synthetic score ----
    function pick(list, s) { for (var i = 0; i < list.length; i++) if (s >= list[i].min) return list[i]; return list[list.length - 1]; }
    function graded(s) { s = Math.round(s * 10) / 10; return { score: s, grade: pick(bands.grade, s).grade, label: pick(bands.regime, s).label }; }
    // Where the newest mid sits inside the window's own range, as a score. No mids is a gap, never zero.
    function tapeScore() {
      var h = (AH.tape && AH.tape.hist) || [], mids = [], last = null;
      for (var i = 0; i < h.length; i++) { var e = h[i]; if (e && typeof e.mid === "number") { mids.push(e.mid); last = e.mid; } }
      if (mids.length < 2 || last === null) return null;
      var lo = Math.min.apply(null, mids), hi = Math.max.apply(null, mids);
      return hi <= lo ? 50 : 20 + 60 * (last - lo) / (hi - lo);
    }
    function nextRead() {
      st.reads += 1;
      if (st.reads % NO_DATA_EVERY === 0) return { score: null };
      if (st.walk === null) { var base = tapeScore(); if (base === null) return { score: null }; st.walk = base; }
      else st.walk = clamp(st.walk + (MEAN - st.walk) * PULL + (rng() - 0.5) * SPAN, 1, 99);
      return graded(st.walk);
    }

    // ---- writing the readout ----
    function setNeedle() { needle.setAttribute("transform", "rotate(" + st.angle.toFixed(2) + " " + CX + " " + CY + ")"); }
    function mark(read) {
      var on = function (els, list, key) {
        els.forEach(function (el, i) { if (read && String(list[i][key]) === String(read[key])) el.setAttribute("data-ah-active", ""); else el.removeAttribute("data-ah-active"); });
      };
      on(face.regime, bands.regime, "label"); on(face.cuts, bands.regime, "label");
      on(face.grade, bands.grade, "grade"); on(face.letters, bands.grade, "grade");
      each(root.querySelectorAll(".ah-bands li[data-grade], .ah-regimes li[data-label]"), function (li) {
        var hit = read && (li.getAttribute("data-grade") === read.grade || li.getAttribute("data-label") === read.label);
        if (hit) li.setAttribute("data-ah-active", ""); else li.removeAttribute("data-ah-active");
      });
    }
    function flash(el) {
      if (!st.live || AH.REDUCED) return;
      el.classList.remove("ah-regime-flash"); void el.offsetWidth; el.classList.add("ah-regime-flash");
    }
    function clock() { try { return AH.clock && typeof AH.clock.et === "function" ? AH.clock.et() : ""; } catch (e) { return ""; } }
    function show(read) {
      st.shown = read;
      if (read.score === null) {
        st.parked = true; st.target = PARK;
        needle.setAttribute("data-ah-parked", "");
        gradeline.textContent = "—" + JOIN + NO_DATA;
        gradeline.removeAttribute("data-grade");
        score.textContent = "—";
        note.textContent = "◌ " + NO_DATA + " — no score on this read, needle parked";
        mark(null);
      } else {
        st.parked = false; st.target = read.score * 1.8;
        needle.removeAttribute("data-ah-parked");
        gradeline.textContent = read.grade + JOIN + read.label;
        gradeline.setAttribute("data-grade", read.grade);
        var at = clock();
        note.textContent = "✓ synthetic read" + (at ? " at " + at : "") + " — letter and label from the real cuts";
        mark(read);
      }
      flash(gradeline); flash(note);
    }
    // The score readout follows the needle while it swings and lands on the read's exact value.
    function showScore() {
      if (st.parked || !st.shown || st.shown.score === null) return;
      var settled = st.angle === st.target;
      score.textContent = settled ? st.shown.score.toFixed(1) : clamp(st.angle / 1.8, 0, 100).toFixed(1);
    }
    function settle() { st.angle = st.target; st.vel = 0; setNeedle(); showScore(); }
    function due(sec) { return st.lastReadSec === null || sec - st.lastReadSec >= PERIOD; }

    return {
      id: "regime", el: root, always: false,
      start: function () {
        st.live = true; drawFace();
        var sec = (AH.clock && AH.clock.sec) || 0;
        if (due(sec)) { st.lastReadSec = sec; show(nextRead()); }
      },
      stop: function () {
        st.live = false;
        each(root.querySelectorAll(".ah-regime-flash"), function (el) { el.classList.remove("ah-regime-flash"); });
        settle();                                              // no half-swing left behind; the words stay
      },
      tick: function (sec) {
        if (due(sec)) { st.lastReadSec = sec; show(nextRead()); }
      },
      frame: function (t, dt) {
        var d = st.target - st.angle;
        if (Math.abs(d) < 0.02 && Math.abs(st.vel) < 0.02) { if (st.angle !== st.target) settle(); return; }
        var acc = OMEGA * OMEGA * d - 2 * OMEGA * st.vel;    // the damped spring, integrated on the core's dt
        st.vel += acc * dt; st.angle += st.vel * dt; setNeedle(); showScore();
      },
      static: function () {
        st.live = false; drawFace();
        var s = tapeScore();
        show(s === null ? { score: null } : graded(s));
        settle();
      }
    };
  }
})();
