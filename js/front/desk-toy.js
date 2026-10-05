/* Tier-2 desk toy, "Absent is not zero" (DECISIONS.md CR-19).
 *
 * A synthetic ES feed with three switches, and a button that renders the reversal
 * alert the desk would post at that moment, beside what a desk that filled its gaps
 * with zero would have posted.
 *
 * NOTHING HERE IS A COPY OF THE DESK. Every desk string, number format and limit
 * comes from the figure's data attributes, which the build read out of the desk's
 * own code and checked (scripts/tier2_desk_toy.py). If the desk changes a word the
 * build fails; it does not ship this file saying the old one.
 *
 * ENHANCEMENT, NOT DEPENDENCY (display-case law, section 10). Every case this toy
 * can produce is written out in the markup beneath it, and that record is never
 * hidden. This script only REVEALS the live part, by setting data-js="on" once boot
 * has finished. If boot or any later step throws, the flag is removed and the timer
 * cleared, so the page falls back to the record rather than to a half-built toy.
 *
 * THE CLOCK. One demo second per real second, and only while all four hold: motion
 * is welcome, the visitor has not paused it, the toy is on screen, and the tab is
 * visible. Under prefers-reduced-motion no timer is ever created, and "Advance 10 s"
 * is the only clock. That button is shown to everyone, so nobody has to wait out the
 * stale limit to see it.
 */
(function () {
  "use strict";

  var root = document.getElementById("az");
  if (!root) return;

  var timer = null;

  function fail() {
    if (timer) { clearInterval(timer); timer = null; }
    root.removeAttribute("data-js");
  }

  // Every handler runs through this, so a throw after boot still falls back.
  function guard(fn) {
    return function () {
      try { return fn.apply(this, arguments); } catch (e) { fail(); }
    };
  }

  try { boot(); } catch (e) { fail(); }

  function boot() {
    var desk = JSON.parse(root.getAttribute("data-desk") || "null");
    var REFRESH = Number(root.getAttribute("data-refresh"));
    var STALE = Number(root.getAttribute("data-stale"));
    var CVD_WIN = Number(root.getAttribute("data-cvdwin"));
    if (!desk || !desk.text || !desk.fmt || !(REFRESH > 0) || !(STALE > 0) || !(CVD_WIN > 0)) {
      throw new Error("desk facts missing");
    }
    var T = desk.text, F = desk.fmt;

    var TICK = 0.25;        // ES tick size
    var SPARK = 60;         // seconds of mid on the sparkline
    var STEP = 10;          // what "Advance 10 s" moves the clock by
    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = !!(mq && mq.matches);

    function $(id) {
      var el = document.getElementById(id);
      if (!el) throw new Error("missing #" + id);
      return el;
    }
    var els = {
      clock: $("az-clock"), mid: $("az-mid"), obi: $("az-obi"), vwap: $("az-vwap"),
      cvd: $("az-cvd"), skew: $("az-skew"), skewv: $("az-skewv"), agebar: $("az-agebar"),
      spark: $("az-spark"), fire: $("az-fire"), step: $("az-step"), pause: $("az-pause"),
      said: $("az-said"), card: $("az-card"), notes: $("az-notes"), ghost: $("az-ghostbody")
    };

    // ---- the desk's format strings, filled the way Python fills them ----------
    // Only two cases exist, and the build refuses any other: a +.Nf / .Nf spec, and
    // a bare float, which Python's str() prints with at least one decimal.
    var FIELD = /\{([\w.]+)(?::([^}]*))?\}/g;
    function num(v, spec) {
      if (!spec) return Number.isInteger(v) ? v.toFixed(1) : String(v);
      var m = /^(\+?)\.(\d+)f$/.exec(spec);
      if (!m) throw new Error("unsupported format spec " + spec);
      var s = v.toFixed(Number(m[2]));
      return (m[1] && v >= 0 ? "+" : "") + s;
    }
    function fill(lit, vals) {
      return lit.replace(FIELD, function (_, name, spec) {
        var v = vals[name];
        if (v === undefined || v === null) throw new Error("no value for " + name);
        return typeof v === "number" ? num(v, spec) : String(v);
      });
    }
    function specOf(lit, name) {
      var m = new RegExp("\\{" + name + ":([^}]*)\\}").exec(lit);
      if (!m) throw new Error("no " + name + " in " + lit);
      return m[1];
    }
    var SPEC = {
      px: specOf(F.px, "px"), vwap: specOf(F.px, "vwap"), obi: specOf(F.obi, "obi"),
      cvd: specOf(F.cvd, "cvd"), skew: specOf(F.skew, "skew")
    };

    // ---- the synthetic feed --------------------------------------------------
    var S = { book: "full", prints: "on", chain: "live" };
    var t = 0;                     // demo clock, seconds
    var price = 5412.25;           // the market moves even while a feed is off
    var obi = 0.2;
    var vnum = 0, vden = 0;        // session VWAP accumulator (bars.py)
    var printCount = 0, cvd = 0;   // CvdTracker.tick_count and .cvd (both cumulative)
    var cvdHist = [];              // [t, cvd] over the trailing window (detectors.py)
    var skewTrue = 0.103, cache = null, lastValid = null, computes = 0;
    var mids = [];
    var paused = false, onScreen = true;

    function rnd(a) { return (Math.random() * 2 - 1) * a; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // One desk cycle, one demo second.
    function tick() {
      t += 1;
      price = Math.max(5300, price + Math.round(rnd(3)) * TICK);
      obi = clamp(obi * 0.8 + rnd(0.25), -0.9, 0.9);
      if (S.prints === "on") {
        var n = 2 + Math.floor(Math.random() * 6);
        for (var i = 0; i < n; i++) {
          var size = 1 + Math.floor(Math.random() * 12);
          vnum += (price + Math.round(rnd(1)) * TICK) * size;
          vden += size;
          printCount += 1;
          // A print is signed against the book. With no book it is counted but not
          // classified, so CVD does not move (trackers.py, CvdTracker.update).
          if (S.book !== "off") cvd += (Math.random() < 0.5 + obi * 0.15 ? 1 : -1) * size;
        }
      }
      // detectors.py update(): append, trim to the window, then the slope is read.
      cvdHist.push([t, cvd]);
      while (cvdHist.length && cvdHist[0][0] < t - CVD_WIN) cvdHist.shift();
      // One skew compute each time the clock crosses the refresh interval.
      if (Math.floor(t / REFRESH) > Math.floor((t - 1) / REFRESH)) refreshSkew();
      mids.push(S.book === "off" ? null : price);
      if (mids.length > SPARK) mids.shift();
    }

    function refreshSkew() {
      if (S.chain === "live") {
        // Kept above zero, so once two computes agree the desk's regime is "fear"
        // and stays there (engine.py, SkewSmoother). Boot runs at least two.
        skewTrue = clamp(skewTrue + rnd(0.008), 0.04, 0.2);
        cache = { ok: true, skew: Math.round(skewTrue * 1e4) / 1e4, asof: t };
        lastValid = t;
        computes += 1;
      } else if (S.chain === "none") {
        // compute_skew() finds no usable quotes: "no 0DTE chain". Within the stale
        // limit of the last good compute, the smoother holds that block, marks it
        // not data_ok and NAMES the hold, so the alert prints the reason and no number.
        if (lastValid !== null && t - lastValid <= STALE) {
          cache = { ok: false, held: true, reason: fill(F.hold, {
            age: Math.round((t - lastValid) * 10) / 10, "block.suspect_reason": T.noChain }) };
        } else {
          cache = { ok: false, held: false, reason: T.noChain };
        }
      }
      // "frozen": refreshes stop, and the live connector keeps serving its last
      // block with computed_at unchanged (discord.py, SKEW_STALE_AFTER_S note).
    }

    // The desk reads VWAP n/a and CVD n/a only on a feed that has never had a print
    // (bars.py session_vwap, detectors.py cvd_ok). So this switch restarts the demo
    // feed's prints rather than pausing them.
    function restartPrints() {
      vnum = 0; vden = 0; printCount = 0; cvd = 0; cvdHist = [];
    }

    function readings() {
      var mid = S.book === "off" ? null : price;
      return {
        mid: mid,
        obi: S.book === "full" ? obi : null,
        vwap: vden > 0 ? Math.round(vnum / vden * 100) / 100 : null,
        cvd: (printCount > 0 && cvdHist.length >= 2) ? cvd - cvdHist[0][1] : null,
        blind: printCount === 0
      };
    }

    // ---- the alert, part by part (discord.py _factor_line, _skew_part) --------
    function part(txt, kind) { return { txt: txt, kind: kind || "" }; }

    function skewPart() {
      if (!cache) return part(T.skewNa, "na");
      if (cache.ok) {
        var age = t - cache.asof;
        if (age > STALE) return part(fill(F.stale, { age_s: age }), "na");
        return part(fill(F.skew, { skew: cache.skew }) + " " + T.regime);
      }
      return part(T.skewNa + " (" + cache.reason + ")", "na");
    }

    function factorParts(r) {
      return [
        r.obi === null ? part(T.obiNa, "na") : part(fill(F.obi, { obi: r.obi })),
        (r.mid !== null && r.vwap !== null)
          ? part(fill(F.px, { px: r.mid, vwap: r.vwap })) : part(T.vwapNa, "na"),
        r.cvd === null ? part(T.cvdNa, "na") : part(fill(F.cvd, { cvd: r.cvd })),
        skewPart()
      ];
    }

    function node(tag, cls, text) {
      var el = document.createElement(tag);
      if (cls) el.className = cls;
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function empty(el) { while (el.firstChild) el.removeChild(el.firstChild); }

    function line(parts, extra) {
      var div = node("div", "az-line" + (extra ? " " + extra : ""));
      parts.forEach(function (p, i) {
        if (i) div.appendChild(document.createTextNode(T.sep));
        div.appendChild(p.kind ? node("span", "az-" + p.kind, p.txt) : document.createTextNode(p.txt));
      });
      return div;
    }

    function note(text, ok) {
      els.notes.appendChild(node("li", ok ? "az-ok" : "", text));
    }

    function cardHead(title, small) {
      var h = node("p", "az-cardhead");
      h.appendChild(node("span", "", title));
      h.appendChild(node("small", "", small));
      return h;
    }

    // Which way the leg turned: toward whichever end of the last minute's range the
    // mid sits farthest from. The desk's detector decides this on its own; the button
    // only picks the matching title.
    function turnedUp(mid) {
      var vals = mids.filter(function (v) { return v !== null; }).concat([mid]);
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      return mid - lo >= hi - mid;
    }

    function fire() {
      var r = readings();
      var stamp = "T+" + t + " s";
      empty(els.card); empty(els.notes); empty(els.ghost);

      if (r.mid === null) {
        els.card.className = "az-card az-none";
        els.card.appendChild(cardHead("No alert", stamp));
        els.card.appendChild(node("p", "az-empty", "Nothing was posted."));
        note("No order book, so no mid price. The desk's detector stops before it checks for any signal.");
        els.ghost.appendChild(node("p", "az-empty", "Nothing was posted, so there is nothing to fill."));
        return;
      }

      var up = turnedUp(r.mid);
      var parts = factorParts(r);
      els.card.className = "az-card";
      els.card.appendChild(cardHead(up ? T.titleUp : T.titleDown, "ES" + T.sep + stamp));
      els.card.appendChild(node("p", "az-read", up ? T.readUp : T.readDown));
      els.card.appendChild(line(parts));
      var ice = fill(F.ice, { why: T.noPrints });
      if (r.blind) els.card.appendChild(line([part(ice, "na")]));

      var gap = false;
      if (r.obi === null) {
        gap = true;
        note(T.obiNa + ": top of book only. The imbalance needs the depth levels behind the best bid and ask.");
      }
      if (r.vwap === null) {
        gap = true;
        note(T.vwapNa + " and " + T.cvdNa + ": this feed has had no trade prints, and both are built from them.");
      }
      var sk = parts[3];
      if (cache && cache.ok) {
        var age = t - cache.asof;
        if (age > STALE) {
          gap = true;
          note(sk.txt + ": the chain stopped updating. Past " + STALE + " s the desk stops printing the number.");
        } else if (S.chain === "frozen") {
          note("skew printed: the chain is frozen, but its last reading is " + age + " s old, inside the " + STALE + " s limit.", true);
        } else if (S.chain === "none") {
          note("skew printed: the chain has gone, but the desk has not read it since. Its last reading is " + age + " s old.", true);
        }
      } else if (cache && cache.held) {
        gap = true;
        note(sk.txt + ": the chain came back empty. Until " + STALE + " s after the last good reading, the desk says it is holding that reading and prints no number.");
      } else {
        gap = true;
        note(sk.txt + ": there is no chain to read, and the reason goes on the alert.");
      }
      if (r.blind) {
        note(ice + ": the desk could not look, so it says so. On a reversal, no iceberg line means it looked and found none.");
      }
      if (!gap) note("Every input present. No iceberg line: the desk looked and found none.", true);

      if (!gap) {
        els.ghost.appendChild(node("p", "az-empty", "No gap in this alert, so there is nothing to fill."));
        return;
      }
      // What a desk that filled its gaps with zero would have posted, in the same
      // formats. A fabricated zero looks exactly like a real reading.
      els.ghost.appendChild(line([
        r.obi === null ? part(fill(F.obi, { obi: 0 }), "z") : parts[0],
        r.vwap === null ? part(fill(F.px, { px: r.mid, vwap: 0 }), "z") : parts[1],
        r.cvd === null ? part(fill(F.cvd, { cvd: 0 }), "z") : parts[2],
        sk.kind === "na" ? part(fill(F.skew, { skew: 0 }), "z") : sk
      ]));
      if (r.blind) {
        els.ghost.appendChild(node("p", "", "No iceberg line either, which on a reversal reads as looked, found none."));
      }
    }

    // ---- what the desk sees now ----------------------------------------------
    function cell(el, text, cls) { el.textContent = text; el.className = cls; }

    function paint() {
      var r = readings();
      els.clock.textContent = "T+" + t + " s";
      cell(els.mid, r.mid === null ? "— (no book)" : num(r.mid, SPEC.px), r.mid === null ? "az-v-na" : "az-v-live");
      cell(els.obi, r.obi === null ? (S.book === "top" ? "— (needs depth)" : "— (no book)") : num(r.obi, SPEC.obi),
           r.obi === null ? "az-v-na" : "az-v-live");
      cell(els.vwap, r.vwap === null ? "— (no prints)" : num(r.vwap, SPEC.vwap), r.vwap === null ? "az-v-na" : "az-v-live");
      cell(els.cvd, r.cvd === null ? "— (no prints)" : num(r.cvd, SPEC.cvd), r.cvd === null ? "az-v-na" : "az-v-live");

      if (cache && cache.ok) {
        var age = t - cache.asof, over = age > STALE;
        els.skewv.textContent = num(cache.skew, SPEC.skew) + " " + T.regime + " · " + age + " s old";
        els.skew.className = over ? "az-v-stale" : "az-v-live";
        els.agebar.hidden = false;
        els.agebar.className = "az-age" + (over ? " az-over" : "");
        els.agebar.firstElementChild.style.width = Math.min(100, age / STALE * 100) + "%";
      } else {
        els.skewv.textContent = cache ? "— (" + cache.reason + ")" : "—";
        els.skew.className = "az-v-na";
        els.agebar.hidden = true;
      }
      drawSpark();
    }

    var SVG = "http://www.w3.org/2000/svg";
    function drawSpark() {
      var svg = els.spark;
      empty(svg);
      var vals = mids.filter(function (v) { return v !== null; });
      var lo = vals.length ? Math.min.apply(null, vals) : 0;
      var hi = vals.length ? Math.max.apply(null, vals) : 1;
      if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
      var off = SPARK - mids.length, d = "", pen = false;
      for (var i = 0; i < mids.length; i++) {
        var x = off + i, v = mids[i];
        if (v === null) {
          // No book: a gap in the line, never a drop to zero.
          var gap = document.createElementNS(SVG, "rect");
          gap.setAttribute("x", String(x)); gap.setAttribute("y", "0");
          gap.setAttribute("width", "1"); gap.setAttribute("height", "64");
          svg.appendChild(gap);
          pen = false;
          continue;
        }
        d += (pen ? "L" : "M") + x + " " + (58 - (v - lo) / (hi - lo) * 52).toFixed(1) + " ";
        pen = true;
      }
      if (d) {
        var path = document.createElementNS(SVG, "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
      }
    }

    // ---- the clock -------------------------------------------------------------
    function sync() {
      var run = !reduced && !paused && onScreen && !document.hidden;
      if (run && !timer) {
        timer = setInterval(guard(function () { tick(); paint(); }), 1000);
      } else if (!run && timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    // ---- wire up -----------------------------------------------------------------
    Array.prototype.forEach.call(root.querySelectorAll('input[type="radio"]'), function (inp) {
      inp.addEventListener("change", guard(function () {
        var key = inp.name.replace("az-", "");
        if (!inp.checked || !(key in S)) return;
        var was = S[key];
        S[key] = inp.value;
        if (key === "prints" && was !== inp.value) restartPrints();
        paint();
      }));
    });
    els.fire.addEventListener("click", guard(fire));
    els.step.addEventListener("click", guard(function () {
      for (var i = 0; i < STEP; i++) tick();
      paint();
      els.said.textContent = "Demo clock moved to T+" + t + " s.";
    }));
    els.pause.addEventListener("click", guard(function () {
      paused = !paused;
      els.pause.textContent = paused ? "Resume demo" : "Pause demo";
      els.pause.setAttribute("aria-pressed", String(paused));
      els.said.textContent = paused ? "Demo paused at T+" + t + " s." : "Demo running.";
      sync();
    }));

    // A minute of history, and at least two skew computes so the regime is settled.
    while (t < SPARK || computes < 2) tick();
    paint();

    root.setAttribute("data-js", "on");
    if (!reduced) els.pause.hidden = false;

    if ("IntersectionObserver" in window) {
      onScreen = false;   // until the observer says otherwise: the toy starts far down the page
      new IntersectionObserver(guard(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        sync();
      })).observe(root);
    }
    document.addEventListener("visibilitychange", guard(sync));
    if (mq) {
      var onMotion = guard(function () {
        reduced = mq.matches;
        els.pause.hidden = reduced;
        sync();
      });
      if (mq.addEventListener) mq.addEventListener("change", onMotion);
      else if (mq.addListener) mq.addListener(onMotion);
    }
    sync();
  }
})();
