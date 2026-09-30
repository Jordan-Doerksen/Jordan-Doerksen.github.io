/* 07 heartbeat: the operator's ring.
 *
 * Four programs mind the desk: the doctor, the watchdog, the tape backup and the launcher's
 * update. One demo cycle is one watchdog loop (the limit in data-ah-desk). Inside it the doctor
 * reads each segment in turn, then the verdict resolves; the hand sweeps the loop.
 *
 * Every word this can show is already printed in the markup, keyed by data-ah-text; the build
 * fills data-ah-desk from the desk and this script repaints from that JSON, then only chooses
 * which word is lit. No timer, no rAF: the core scheduler calls tick() once per demo second and
 * frame() per animation frame while the piece is live, and static() paints one complete still
 * when motion is off. Words only, never a count.
 */
(function () {
  "use strict";
  var root = document.getElementById("ah-heartbeat");
  if (!root || !window.AH || typeof window.AH.register !== "function") return;
  try { window.AH.register(build(root)); } catch (e) { /* the markup stays complete */ }

  function build(el) {
    var AH = window.AH;
    var desk = null;
    try { desk = JSON.parse(el.getAttribute("data-ah-desk") || "null"); } catch (e) { desk = null; }
    var TEXT = (desk && desk.text) || {};
    // Owner, 2026-09-29: "speed this up". A pass used to last the watchdog's real sleep (desk.lim.watchdog,
    // 30 s), so the ring sat still for 21 s after its verdict. The pass is now staged compressed: one row
    // a second, the verdict, a short hold. Nothing on the card states a duration, so this claims nothing
    // false; the real figure still travels in data-ah-desk for the build's check.
    var W = 8;

    // ---- words: the markup carries them; the desk JSON wins when present ----------------
    var wordEl = {};
    var nodes = el.querySelectorAll("[data-ah-text]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-ah-text");
      if (typeof TEXT[key] === "string" && TEXT[key] !== nodes[i].textContent) nodes[i].textContent = TEXT[key];
      if (!wordEl[key]) wordEl[key] = nodes[i];
    }
    function word(key) { return wordEl[key] ? wordEl[key].textContent : "—"; }

    // ---- the parts of the drawing ---------------------------------------------------------
    var hand = el.querySelector(".ah-hb-hand");
    var progress = el.querySelector(".ah-hb-progress");
    var verdictBox = el.querySelector(".ah-hb-verdict");
    var vword = el.querySelector(".ah-hb-vword");
    var segs = {}, order = [];
    var lis = el.querySelectorAll(".ah-hb-seg");
    for (var s = 0; s < lis.length; s++) {
      var k = lis[s].getAttribute("data-seg");
      segs[k] = {
        li: lis[s], head: lis[s].querySelector(".ah-hb-seghead"), glyph: lis[s].querySelector(".ah-hb-glyph"),
        words: lis[s].querySelectorAll(".ah-hb-word"), arc: el.querySelector('.ah-hb-arc[data-seg="' + k + '"]')
      };
      order.push(k);
    }
    if (!hand || !progress || !verdictBox || !vword || !order.length) throw new Error("heartbeat markup incomplete");

    // The arcs share the ring by the number of segments present (three when the launcher's
    // segment was removed at build), a small gap between them; the markup's four-way split is
    // the still for a page with no script, where a missing segment stays a gap.
    (function layoutArcs() {
      var n = order.length, span = 360 / n, gap = 6;
      for (var a = 0; a < n; a++) {
        var arc = segs[order[a]].arc;
        if (!arc) continue;
        arc.setAttribute("stroke-dasharray", (span - gap).toFixed(1) + " 360");
        arc.setAttribute("stroke-dashoffset", (-(a * span + gap / 2)).toFixed(1));
      }
    })();

    // ---- tones and glyphs: colour is never the only carrier -------------------------------
    var TONE = {
      stHealthy: "up", stStopped: "hold", vDown: "down", standingDown: "hold", notAnswering: "down",
      stFresh: "up", stUnpushed: "warn", stStale: "warn", regression: "down",
      upToDate: "up", updateAvailable: "warn", localAhead: "warn", diverged: "down", dirty: "warn",
      noUpstream: "warn", unknown: "warn", vOk: "up", vDegraded: "warn"
    };
    var GLYPH = { up: "✓", hold: "◌", warn: "!", down: "✗", none: "—" };
    var RANK = { vOk: 0, vDegraded: 1, vDown: 2 };

    // ---- the staged passes: weight, server row, watchdog line (null = a quiet pass), backup row
    var KINDS = [
      [40, "stHealthy", null, "stFresh"],
      [14, "stStopped", "standingDown", "stFresh"],
      [10, "stHealthy", null, "stUnpushed"],
      [8, "stHealthy", null, "stStale"],
      [5, "stHealthy", null, "regression"],
      [8, "vDown", "notAnswering", "stFresh"],
      [6, "stStopped", "standingDown", "stUnpushed"]
    ];
    var UPDATES = [[70, "upToDate"], [10, "updateAvailable"], [6, "localAhead"], [5, "dirty"], [4, "noUpstream"], [3, "unknown"], [2, "diverged"]];

    // This piece's own generator (mulberry32, the core's algorithm), seeded from the body's seed.
    // It never draws from AH.rng: a draw between two tape steps would change the shared tape
    // according to which pieces happen to be live, and the same seed must give the same tape.
    var seedAttr = Number(document.body && document.body.getAttribute("data-ah-seed"));
    var seedState = (isFinite(seedAttr) ? (seedAttr | 0) : 1) ^ 0x48420007;
    function rng() {
      seedState = (seedState + 0x6D2B79F5) | 0;
      var t = seedState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function pick(table) {
      var total = 0, n;
      for (n = 0; n < table.length; n++) total += table[n][0];
      var r = rng() * total;
      for (n = 0; n < table.length; n++) { r -= table[n][0]; if (r < 0) return table[n]; }
      return table[table.length - 1];
    }
    // The doctor's own precedence: a deliberate stop is not a fault; tapes not leaving the
    // machine degrade even a stopped desk; a dead server is DOWN whatever else holds. The
    // launcher's DIRTY is the same git fact the doctor lists as "not happening", so it degrades too.
    function verdict(st) {
      var exit = 0;
      if (st.server === "vDown") exit = 2;
      if (st.backup === "stUnpushed" || st.backup === "stStale" || st.backup === "regression") exit = Math.max(exit, 1);
      if (st.update === "dirty") exit = Math.max(exit, 1);
      return exit === 0 ? "vOk" : exit === 1 ? "vDegraded" : "vDown";
    }
    var recover = false;
    function roll() {
      var st;
      if (recover) { st = { server: "stHealthy", watchdog: null, backup: "stFresh" }; recover = false; }
      else { var kind = pick(KINDS); st = { server: kind[1], watchdog: kind[2], backup: kind[3] }; recover = st.server === "vDown"; }
      if (segs.update) st.update = pick(UPDATES)[1];
      st.verdict = verdict(st);
      return st;
    }

    // ---- painting ---------------------------------------------------------------------------
    var pending = [];   // [element, className, dropAtSec]: one-shot classes, dropped by tick, never by timer
    function oneShot(node, cls, sec, life) { node.classList.add(cls); pending.push([node, cls, sec + life]); }
    function dropDue(sec) {
      var keep = [];
      for (var p = 0; p < pending.length; p++) {
        if (pending[p][2] <= sec) pending[p][0].classList.remove(pending[p][1]); else keep.push(pending[p]);
      }
      pending = keep;
    }
    function dropAll() {
      for (var p = 0; p < pending.length; p++) pending[p][0].classList.remove(pending[p][1]);
      pending = [];
      hand.classList.remove("is-beat-a", "is-beat-b");
    }
    function light(segKey, wordKey, sec) {
      var seg = segs[segKey];
      if (!seg) return;
      var tone = wordKey ? TONE[wordKey] : "up";
      seg.li.setAttribute("data-tone", tone);
      if (seg.arc) seg.arc.setAttribute("data-tone", tone);
      seg.glyph.textContent = GLYPH[tone];
      for (var w = 0; w < seg.words.length; w++) {
        var on = !!wordKey && seg.words[w].getAttribute("data-word") === wordKey;
        seg.words[w].classList.toggle("is-lit", on);
        if (on) seg.words[w].setAttribute("aria-current", "true"); else seg.words[w].removeAttribute("aria-current");
      }
      if (sec !== null && seg.head) oneShot(seg.head, "is-flash", sec, 1);
    }
    var prevVerdict = null;
    function showVerdict(key, sec) {
      vword.textContent = word(key);
      verdictBox.setAttribute("data-tone", TONE[key]);
      if (sec !== null) {
        if (prevVerdict && prevVerdict !== key) oneShot(vword, RANK[key] < RANK[prevVerdict] ? "is-up" : "is-down", sec, 1);
        oneShot(verdictBox, "is-pulse", sec, 2);
      }
      prevVerdict = key;
    }
    function setHand(frac) {
      var deg = (frac * 360) % 360;
      hand.setAttribute("transform", "rotate(" + deg.toFixed(1) + " 130 130)");
      progress.setAttribute("stroke-dasharray", (frac * 360).toFixed(1) + " 360");
    }

    // ---- the pass -----------------------------------------------------------------------------
    var pass = -1, state = null, resolved = 0, verdictShown = false, beatFlip = false;
    var tickSec = 0, tickAt = 0, lastDeg = -1;
    function stepAt(n) { return 1 + n; }            // segment n resolves at this second of the pass
    var verdictAt = stepAt(order.length);
    function sync(sec, animate) {
      var p = Math.floor(sec / W), c = sec - p * W;
      if (p !== pass) { pass = p; state = roll(); resolved = 0; verdictShown = false; }
      var at = animate ? sec : null;
      while (resolved < order.length && c >= stepAt(resolved)) { light(order[resolved], state[order[resolved]], at); resolved++; }
      if (!verdictShown && c >= verdictAt) { showVerdict(state.verdict, at); verdictShown = true; }
    }

    return {
      id: "heartbeat", el: el, always: false,
      start: function () {
        if (AH.REDUCED) { this.static(); return; }   // core never starts a piece under reduced motion; the still stands
        var sec = (AH.clock && AH.clock.sec) | 0;
        tickSec = sec; tickAt = AH.clock ? Number(AH.clock.t) || 0 : 0;
        sync(sec, false);
      },
      stop: function () { dropAll(); },
      tick: function (sec) {
        tickSec = sec; tickAt = AH.clock ? Number(AH.clock.t) || 0 : 0;
        dropDue(sec);
        beatFlip = !beatFlip;
        hand.classList.toggle("is-beat-a", beatFlip);
        hand.classList.toggle("is-beat-b", !beatFlip);
        sync(sec, true);
      },
      frame: function (t) {
        var now = typeof t === "number" ? t : (AH.clock ? Number(AH.clock.t) || 0 : 0);
        var within = Math.min(1, Math.max(0, now - tickAt));
        var frac = ((tickSec % W) + within) / W;
        var deg = Math.round(frac * 3600) / 10;
        if (deg !== lastDeg) { lastDeg = deg; setHand(frac); }
      },
      // The complete still: every segment lit on a word, the verdict shown, the hand just past
      // the verdict. A stopped desk with a tape waiting: the doctor's own DEGRADED case.
      static: function () {
        pass = 0; resolved = order.length; verdictShown = true;
        state = { server: "stStopped", watchdog: "standingDown", backup: "stUnpushed" };
        if (segs.update) state.update = "upToDate";
        state.verdict = verdict(state);
        for (var n = 0; n < order.length; n++) light(order[n], state[order[n]], null);
        showVerdict(state.verdict, null);
        setHand((verdictAt + 1) / W);
      }
    };
  }
})();
