/* 06 skew: the 0DTE sky.
 *
 * A 60 s sparkline of the shared synthetic tape's skew, one column a second, a second with no
 * read drawn as a shaded band and never as a drop to zero; the regime word painted the way the
 * cockpit's skew card paints it (the engine's word in capitals, gold for fear, red for
 * inverted, grey SUSPECT with no number for a held or absent read); a stale bar filling toward
 * the desk's stale limit. Stands for the options skew engine.
 *
 * Every desk word and both limits arrive in this root's data-ah-desk; the typed words in the
 * markup are the still for a page with no script and are never read here. The line lifts the
 * tier-2 toy's drawSpark onto the path element already in the markup, so no namespace string is
 * needed. Each run of seconds with no read is ONE band element (core.css .ah-gapband) on the
 * layer over the svg, from the last point drawn to the next; inside it a tag names the reason
 * per stretch (held inside the stale limit, then past the limit, then no chain), each tag only
 * where it fits whole. The reason for a past second is worked out the way 03 works it out: the
 * tape stamps the last good read's second in skew.asof for the current run; for an earlier run
 * it is the refresh the last drawn point belongs to.
 * No timer or frame request is created here: core calls tick(sec) once a demo second and
 * frame(t, dt) while this piece is live; static() draws the complete still under reduced
 * motion. A throw at load leaves the markup complete and this piece unregistered.
 *
 * The tape's skew block: { ok, value, asof, regime, reason }. ok with a regime word is a live
 * read; ok false carries a reason code — "held" (the chain came back empty inside the stale
 * limit: the last good read is held, suspect, no number), "stale" (older than the limit) or
 * "none" (no chain). asof is the last good read's second when there was one. */
(function () {
  "use strict";

  var root = document.getElementById("ah-skew");
  if (!root || !window.AH) return;
  try { AH.register(build(root)); } catch (e) { /* the still stands */ }

  function build(root) {
    var desk = JSON.parse(root.getAttribute("data-ah-desk") || "null");
    if (!desk || !desk.text) throw new Error("desk words missing");
    var T = desk.text, L = desk.lim || {};
    var body = document.body;
    var REFRESH = Number(L.refresh !== undefined ? L.refresh : body.getAttribute("data-ah-refresh"));
    var STALE = Number(L.stale !== undefined ? L.stale : body.getAttribute("data-ah-stale"));
    if (!(REFRESH > 0) || !(STALE > 0)) throw new Error("skew limits missing");
    ["FEAR", "INVERTED", "SUSPECT", "neutral"].forEach(function (k) {
      if (typeof T[k] !== "string" || !T[k]) throw new Error("desk word missing: " + k);
    });
    // The chip word per engine regime: the cockpit prints the engine's word upper-cased.
    var WORD = { fear: T.FEAR, inverted: T.INVERTED, neutral: T.neutral.toUpperCase(), suspect: T.SUSPECT };

    function $(sel) {
      var el = root.querySelector(sel);
      if (!el) throw new Error("missing " + sel);
      return el;
    }
    var els = {
      plot: $(".ah-skew-plot"), gaps: $(".ah-skew-gaps"), line: $(".ah-skew-line"),
      zero: $(".ah-skew-zero"), now: $(".ah-skew-now"),
      glyph: $("[data-sk=glyph]"), value: $("[data-sk=value]"), word: $("[data-sk=word]"),
      state: $("[data-sk=state]"), bar: $("[data-sk=bar]"), age: $("[data-sk=age]"),
      stale: $("[data-sk=stale]")
    };

    var SPARK = (AH.tape && AH.tape.SPARK) || 60;   // columns, the toy's minute
    // The tag words per reason: the page's own, as the state line prints them, unless the
    // generator hands this piece the desk's (text noChain, and the hold format's leading words).
    var HOLD = desk.fmt && typeof desk.fmt.hold === "string" ? desk.fmt.hold.split(" (")[0] : "";
    var TAGS = {
      held: (HOLD ? [HOLD] : []).concat(["held"]),
      stale: ["past the limit", "n/a"],
      none: (typeof T.noChain === "string" && T.noChain ? [T.noChain] : []).concat(["no chain", "n/a"]),
      na: ["n/a"]
    };
    var TAG_MIN = 28, TAG_CH = 6.2, TAG_PAD = 10;  // px: least stretch for a tag; 10 px mono at .02em a character
    var memo = {};                                  // second -> reason, kept once worked out from a known last read
    var SPAN_MIN = 0.02;                            // least y-span, skew_norm scale
    var last = { value: null, regime: null };       // for the glow and the flip
    var tickAt = 0;                                 // clock.t at the last tick, for the slide

    // A retriggerable one-shot class; animationend takes it off, so no timer is needed.
    ["value", "word"].forEach(function (k) {
      els[k].addEventListener("animationend", function () {
        els[k].classList.remove("is-tick"); els[k].classList.remove("is-flip");
      });
    });
    function pulse(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

    function num(v) {
      if (AH.fmt && typeof AH.fmt.num === "function") return AH.fmt.num(v, "+.3f");
      return (v >= 0 ? "+" : "") + v.toFixed(3);
    }

    // What the sky can say about the tape's skew block right now.
    function read() {
      var sk = (AH.tape && AH.tape.skew) || {};
      var sec = AH.tape ? AH.tape.sec : 0;
      var age = typeof sk.asof === "number" ? Math.max(0, sec - sk.asof) : null;
      var key = String(sk.regime || "").toLowerCase();
      var live = !!sk.ok && typeof sk.value === "number" && age !== null && age <= STALE
        && (key === "fear" || key === "inverted" || key === "neutral");
      // A hold is honoured only inside the stale limit: the engine re-checks the hold every cycle
      // and blanks it past the limit, while the tape re-reads only at each refresh.
      var code = live ? "live" : sk.reason === "held" && age !== null && age <= STALE ? "held"
        : sk.reason === "none" || !sk.reason ? "none" : "stale";
      return { code: code, value: live ? sk.value : null, age: age, regime: live ? key : "suspect" };
    }

    function paint(r) {
      var live = r.code === "live", held = r.code === "held";
      var ageTxt = r.age === null ? "—" : String(Math.round(r.age));
      els.word.textContent = WORD[r.regime];
      els.word.setAttribute("data-regime", r.regime);
      els.value.textContent = live ? num(r.value) : "—";
      els.value.setAttribute("data-state", live ? "live" : "na");
      els.glyph.textContent = live ? "✓" : held ? "◌" : "—";
      els.glyph.setAttribute("data-state", live ? "live" : held ? "held" : "na");
      if (live) els.state.textContent = "read " + ageTxt + " s ago";
      else if (held) els.state.textContent = "held · chain empty · last good read " + ageTxt + " s ago, inside the limit";
      else if (r.code === "stale") els.state.textContent = "n/a · last read " + ageTxt + " s ago, past the limit";
      else els.state.textContent = "n/a · no chain" + (r.age === null ? "" : " · last good read " + ageTxt + " s ago");
      var pct = r.age === null ? 0 : Math.min(100, r.age / STALE * 100);
      els.bar.firstElementChild.style.width = pct + "%";
      els.bar.setAttribute("data-state", live ? "fresh" : held ? "held" : r.age === null ? "none" : "over");
      els.age.textContent = ageTxt;
      els.stale.textContent = String(STALE);
    }

    // The reason a second had no read, the tape's rules replayed: inside the stale limit of the
    // last good read it was held; past it, "none" once a refresh has found the chain gone past the
    // limit, else a hold that aged out before the next refresh. No last good read at all is none.
    function reasonAt(sec, asof) {
      if (asof === null) return "none";
      if (sec - asof <= STALE) return "held";
      return Math.floor(sec / REFRESH) * REFRESH - asof > STALE ? "none" : "stale";
    }

    // The toy's drawSpark for the line (the pen lifts at a gap, never a drop to zero), then one
    // band per run of missing seconds. `shift` slides the plot and the band layer together by a
    // fraction of a column between ticks, so the minute moves instead of jumping.
    function draw(shift) {
      var hist = (AH.tape && AH.tape.hist) || [];
      var n = Math.min(hist.length, SPARK), off = SPARK - n, base = hist.length - n;
      var vals = [], i, h, v;
      for (i = base; i < hist.length; i++) {
        h = hist[i];
        if (h && typeof h.skew === "number") vals.push(h.skew);
      }
      var lo = vals.length ? Math.min.apply(null, vals) : 0;
      var hi = vals.length ? Math.max.apply(null, vals) : 1;
      if (hi - lo < SPAN_MIN) { var mid = (hi + lo) / 2; hi = mid + SPAN_MIN / 2; lo = mid - SPAN_MIN / 2; }
      function y(val) { return (58 - (val - lo) / (hi - lo) * 52).toFixed(2); }

      var d = "", pen = false, lastY = null, x = 0, runs = [], run = null;
      for (i = 0; i < n; i++) {
        h = hist[base + i];
        x = off + i;
        v = h && typeof h.skew === "number" ? h.skew : null;
        if (v === null) {
          if (run) run.b = i; else run = { a: i, b: i };
          pen = false; lastY = null;
          continue;
        }
        if (run) { runs.push(run); run = null; }
        lastY = y(v);
        d += (pen ? "L" : "M") + x + " " + lastY;
        pen = true;
      }
      if (run) runs.push(run);
      // One flat column past the newest read, so the slide never shows a blank edge.
      if (n && lastY !== null) d += "L" + (x + 1) + " " + lastY;
      els.line.setAttribute("d", d);
      bands(hist, base, n, off, runs);

      var zeroIn = vals.length && lo <= 0 && hi >= 0;
      els.zero.setAttribute("visibility", zeroIn ? "visible" : "hidden");
      if (zeroIn) { els.zero.setAttribute("y1", y(0)); els.zero.setAttribute("y2", y(0)); }
      els.now.setAttribute("visibility", n ? "visible" : "hidden");
      els.now.setAttribute("x1", String(x + 0.5)); els.now.setAttribute("x2", String(x + 0.5));
      slide(shift);
    }

    // One element per run, from the last point drawn to the next (the current run reaches past the
    // right edge, under the slide). Inside it the run is cut where the reason changes, and each
    // stretch gets the longest of its words that fits whole, or none.
    function bands(hist, base, n, off, runs) {
      var layer = els.gaps, W = SPARK;
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      var first = n ? hist[base].sec : 0;
      for (var key in memo) if (Number(key) < first) delete memo[key];
      if (!runs.length) return;
      var boxW = layer.clientWidth || 0, sk = (AH.tape && AH.tape.skew) || {};
      for (var r = 0; r < runs.length; r++) {
        var a = runs[r].a, b = runs[r].b, current = b === n - 1;
        var asof = undefined;                              // undefined: not known from this window
        if (current && !sk.ok) asof = typeof sk.asof === "number" ? sk.asof : null;
        else if (a > 0) asof = Math.floor(hist[base + a - 1].sec / REFRESH) * REFRESH;
        var x0 = a > 0 ? off + a - 1 : off + a;
        var x1 = current ? off + n + 1 : off + b + 1;
        var band = document.createElement("div");
        band.className = "ah-gapband";
        band.style.left = (x0 / W * 100).toFixed(3) + "%";
        band.style.width = ((x1 - x0) / W * 100).toFixed(3) + "%";
        // stretches of one reason, in columns
        var segs = [], seg = null;
        for (var i = a; i <= b; i++) {
          var sec = hist[base + i].sec;
          var why = asof === undefined ? (memo[sec] || "na") : (memo[sec] = reasonAt(sec, asof));
          if (seg && seg.why === why) seg.to = i;
          else { if (seg) segs.push(seg); seg = { why: why, from: i, to: i }; }
        }
        segs.push(seg);
        var span = x1 - x0, pxPer = boxW / W, seen = Math.min(span, W - x0);   // the part left of the edge
        for (var j = 0; j < segs.length; j++) {
          var s0 = j === 0 ? 0 : off + segs[j].from - 0.5 - x0;
          var s1 = j === segs.length - 1 ? seen : off + segs[j].to + 0.5 - x0;
          if (j > 0) {
            var cut = document.createElement("i");
            cut.style.left = (s0 / span * 100).toFixed(3) + "%";
            band.appendChild(cut);
          }
          var word = fit(TAGS[segs[j].why] || TAGS.na, (s1 - s0) * pxPer);
          if (!word) continue;
          var tag = document.createElement("span");
          tag.style.left = ((s0 + s1) / 2 / span * 100).toFixed(3) + "%";
          tag.textContent = word;
          band.appendChild(tag);
        }
        layer.appendChild(band);
      }
    }
    function fit(words, px) {
      if (!(px >= TAG_MIN)) return "";
      for (var i = 0; i < words.length; i++) if (words[i].length * TAG_CH + TAG_PAD <= px) return words[i];
      return "";
    }

    function slide(shift) {
      els.plot.setAttribute("transform", shift ? "translate(" + (-shift).toFixed(3) + " 0)" : "");
      els.gaps.style.transform = shift ? "translateX(" + (-shift / SPARK * 100).toFixed(4) + "%)" : "";
    }

    function tick() {
      var r = read();
      paint(r);
      draw(0);
      tickAt = AH.clock ? AH.clock.t : 0;
      if (r.code === "live" && r.value !== last.value) pulse(els.value, "is-tick");
      if (r.regime !== last.regime) pulse(els.word, "is-flip");
      last.value = r.value; last.regime = r.regime;
    }

    // The still is drawn once; a tag fits the width it was drawn at, so a resize re-lays the
    // bands from the same history (a listener, not a timer: nothing runs unless the size changes).
    window.addEventListener("resize", function () {
      if (root.getAttribute("data-ah") !== "static") return;
      try { draw(0); } catch (e) { /* the drawn still stands */ }
    });

    return {
      id: "skew", el: root, always: false,
      start: function () { last.value = null; last.regime = null; tick(); },
      stop: function () {
        els.value.classList.remove("is-tick"); els.word.classList.remove("is-flip");
        slide(0);
      },
      tick: function () { tick(); },
      frame: function (t) { slide(Math.max(0, Math.min(1, t - tickAt))); },
      static: function () { paint(read()); draw(0); }
    };
  }
})();
