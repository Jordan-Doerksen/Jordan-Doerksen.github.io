/* 01 board — the cockpit wakes.
   A piece for the page's one scheduler (window.AH, js/core.js). It owns no timer and no rAF: the core
   calls tick(sec) once per demo second after the shared tape steps, start()/stop() as the piece enters
   and leaves the live set, and static() once under reduced motion. The markup is complete before this
   file runs; the script only fills readouts and toggles the classes the sheet animates.
   Behaviour is the desk cockpit's (web/live/app.js): number → text, null → "—", a directional glow on a
   real price move, a row flip on a vote CHANGE to bull/bear, a chip flash on a verdict change and the
   conviction ring when all three factors agree. Votes follow server/sentinel/core/indicators.py. */
(function () {
  "use strict";
  var root = document.getElementById("ah-board");
  if (!root) return;

  var EMDASH = "—";
  var TICK = 0.25;
  /* the desk's vote thresholds (server/sentinel/core/indicators.py:30-31). Internal to the vote,
     never printed. The generator may hand them over as lim.obiVote and lim.vwapTicks; these are
     the typed fallbacks so the still stands before it runs. */
  var OBI_VOTE = 0.30, VWAP_TICKS = 1;

  /* Typed from the worktree at the commit the design names: web/live/app.js:205,222-225;
     web/index.html:306,308; server/sentinel/alerting/detectors.py:608. The generator's JSON wins. */
  var DEF = {
    highBull: "HIGH BULL", highBear: "HIGH BEAR", building: "BUILDING", mixed: "MIXED",
    agree: "of 3 agree", noConsensus: "no consensus", aligned: "all three aligned", tps: " t/s",
    ro: "READ-ONLY", roNote: "observes & displays only — never places an order",
    convHigh: "High", convBuilding: "Building", convStandard: "Standard"
  };

  /* the generator's {"text":{},"fmt":{},"lim":{}} on the root; before it runs the attribute is its token */
  function readDesk() {
    try {
      var raw = root.getAttribute("data-ah-desk") || "";
      if (raw.charAt(0) !== "{") return null;
      var j = JSON.parse(raw);
      return (j && typeof j === "object") ? j : null;
    } catch (e) { return null; }
  }
  var J = readDesk();
  var desk = (J && J.text && typeof J.text === "object") ? J.text : null;
  var lim = (J && J.lim && typeof J.lim === "object") ? J.lim : null;
  var T = {}, k;
  for (k in DEF) if (Object.prototype.hasOwnProperty.call(DEF, k)) T[k] = DEF[k];
  if (desk) for (k in desk) if (typeof desk[k] === "string") T[k] = desk[k];
  if (lim) {
    if (typeof lim.obiVote === "number" && isFinite(lim.obiVote) && lim.obiVote > 0) OBI_VOTE = lim.obiVote;
    if (typeof lim.vwapTicks === "number" && isFinite(lim.vwapTicks) && lim.vwapTicks > 0) VWAP_TICKS = lim.vwapTicks;
  }

  /* every word element shows the desk's word: JSON first, then the generator-filled attribute */
  function syncWords() {
    var nodes = root.querySelectorAll("[data-ah-key]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-ah-key");
      var word = (desk && typeof desk[key] === "string") ? desk[key] : nodes[i].getAttribute("data-ah-word");
      if (typeof word === "string" && word.indexOf("%AH_") !== 0) nodes[i].textContent = word;
    }
  }

  function $(name) {
    var el = root.querySelector('[data-bd="' + name + '"]');
    if (!el) throw new Error("board: missing " + name);
    return el;
  }
  var els = {
    rate: $("rate"), abs: $("abs"), absBid: $("absBid"), absAsk: $("absAsk"), clock: $("clock"),
    sym: $("sym"), sym2: $("sym2"), price: $("price"), bid: $("bid"), ask: $("ask"), spr: $("spr"),
    vbadge: $("vbadge"), vtxt: $("vtxt"), vsub: $("vsub"), conv: $("conv"),
    fObi: $("fObi"), fVwap: $("fVwap"), fCvd: $("fCvd"),
    obiN: $("obiN"), obiV: $("obiV"), vwapN: $("vwapN"), vwapV: $("vwapV"), cvdN: $("cvdN"), cvdV: $("cvdV"),
    spkObi: $("spkObi"), spkVwap: $("spkVwap"), spkCvd: $("spkCvd"),
    gapObi: $("gapObi"), gapVwap: $("gapVwap"), gapCvd: $("gapCvd")
  };

  /* ── formatters, the cockpit's own (app.js:98-104): null or non-finite is an em-dash, never a fake number ── */
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function fmt(v, d) {
    return isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : EMDASH;
  }
  function sgn(v, d) { return isNum(v) ? (v >= 0 ? "+" : "") + fmt(v, d) : EMDASH; }
  function intStrSigned(v) { return isNum(v) ? (v >= 0 ? "+" : "") + Math.round(v).toLocaleString("en-US") : EMDASH; }
  function setText(el, text) { if (el.textContent !== text) el.textContent = text; }

  /* ── the cockpit's class pulses; each is a class the sheet animates only under [data-ah="on"] ── */
  function pulse(el, cls, clear) {
    el.classList.remove.apply(el.classList, clear);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  var COL = { bull: "var(--up, #46C98A)", bear: "var(--down, #F47265)", gold: "var(--gold, #E0AC4E)" };

  /* ── votes (indicators.py:51-58, 82-90, 120-129): a missing value votes neutral and prints "—" ── */
  function obiVote(obi) { return !isNum(obi) ? "neutral" : obi >= OBI_VOTE ? "bull" : obi <= -OBI_VOTE ? "bear" : "neutral"; }
  function vwapVote(price, vwap) {
    if (!isNum(price) || !isNum(vwap)) return "neutral";
    var d = price - vwap;
    return d > VWAP_TICKS * TICK ? "bull" : d < -VWAP_TICKS * TICK ? "bear" : "neutral";
  }
  /* the CVD vote reads the trailing-window slope: cvd now minus cvd at the window's start
     (server/sentinel/alerting/detectors.py:418-421). The shared tape publishes exactly that
     difference as `cvd`, so the vote reads the readout's own value; no book, no prints, no vote. */
  function cvdVote(slope) { return !isNum(slope) ? "neutral" : slope > 0 ? "bull" : slope < 0 ? "bear" : "neutral"; }

  /* ── the confluence verdict, app.js:220-225, and the tier word, detectors.py:608 ── */
  function verdict(votes) {
    var b = 0, r = 0;
    for (var i = 0; i < votes.length; i++) { if (votes[i] === "bull") b++; else if (votes[i] === "bear") r++; }
    var n = Math.max(b, r);
    var conv = n === 3 ? T.convHigh : n === 2 ? T.convBuilding : T.convStandard;
    if (b === 3) return { txt: T.highBull, sub: T.aligned, kind: "high-bull", col: COL.bull, conv: conv };
    if (r === 3) return { txt: T.highBear, sub: T.aligned, kind: "high-bear", col: COL.bear, conv: conv };
    if (n >= 2) return { txt: T.building + " " + (b > r ? "BULL" : "BEAR"), sub: n + " " + T.agree.replace(/^\s+/, ""), kind: "building", col: COL.gold, conv: conv };
    return { txt: T.mixed, sub: T.noConsensus, kind: "mixed", col: null, conv: conv };
  }

  /* ── sparklines: the toy's drawSpark (docs/tier-2-case/desk-toy.js:344-371) draws the line and lifts
     the pen at a null. A run of missing seconds is then ONE shaded band (core.css .ah-gapband) on the
     layer over the svg, from the last point drawn to the next, so the line stops at one dashed edge and
     resumes at the other. Nothing inside the band is a value; it is never drawn as zero. ── */
  var SVG_NS = "http://www.w3.org/2000/svg";
  var GAP_WORD = "no data";
  var TAG_MIN = 28, TAG_CH = 6.2, TAG_PAD = 8;   /* px: least band for a tag; 10 px mono at .02em a character */
  function drawSpark(svg, layer, series, vote, width) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("data-vote", vote);
    var vals = [], runs = [], run = null, i;
    for (i = 0; i < series.length; i++) if (isNum(series[i])) vals.push(series[i]);
    var lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 1;
    if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
    var off = Math.max(0, width - series.length), d = "", pen = false;
    for (i = 0; i < series.length; i++) {
      var x = off + i, v = series[i];
      if (!isNum(v)) {
        if (run) run.b = i; else run = { a: i, b: i };
        pen = false;
        continue;
      }
      if (run) { runs.push(run); run = null; }
      d += (pen ? "L" : "M") + x + " " + (21 - (v - lo) / (hi - lo) * 18).toFixed(1) + " ";
      pen = true;
    }
    if (run) runs.push(run);
    if (d) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    }
    drawGaps(layer, runs, off, series.length, width);
  }
  /* one element per run; its tag only when the band is wide enough to hold the word whole */
  function drawGaps(layer, runs, off, n, width) {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!runs.length) return;
    var boxW = layer.clientWidth || 0;
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var x0 = r.a > 0 ? off + r.a - 1 : off + r.a;          /* the last point drawn before the run */
      var x1 = r.b < n - 1 ? off + r.b + 1 : width;          /* the next point, or the right edge */
      var band = document.createElement("span");
      band.className = "ah-gapband";
      band.style.left = (x0 / width * 100).toFixed(3) + "%";
      band.style.width = ((x1 - x0) / width * 100).toFixed(3) + "%";
      var px = (x1 - x0) / width * boxW;
      if (px >= Math.max(TAG_MIN, GAP_WORD.length * TAG_CH + TAG_PAD)) {
        var tag = document.createElement("span");
        tag.style.left = "50%";
        tag.textContent = GAP_WORD;
        band.appendChild(tag);
      }
      layer.appendChild(band);
    }
  }

  /* ── state between frames: the previous price, verdict and votes decide what glows ── */
  var last = { price: null, verdict: null, votes: { obi: null, vwap: null, cvd: null } };
  var tally = { n: 0, bid: 0, ask: 0, seenSec: -1 };
  function resetLast() { last.price = null; last.verdict = null; last.votes = { obi: null, vwap: null, cvd: null }; }

  /* the ABS tally: every landed absorption event on the shared tape, counted once by its second */
  function countEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev || !isNum(ev.sec) || ev.sec <= tally.seenSec) continue;
      tally.n++;
      if (ev.side === "BID") tally.bid++; else if (ev.side === "ASK") tally.ask++;
    }
    if (events.length) tally.seenSec = Math.max(tally.seenSec, events[events.length - 1].sec);
  }

  function factorRow(rowEl, numEl, voteEl, text, vote, key, anim) {
    setText(numEl, text);
    setText(voteEl, vote === "neutral" ? EMDASH : vote.toUpperCase());
    voteEl.setAttribute("data-vote", vote);
    var prev = last.votes[key];
    last.votes[key] = vote;
    if (anim && prev !== null && vote !== prev && (vote === "bull" || vote === "bear")) {
      rowEl.style.setProperty("--flip-col", COL[vote]);
      pulse(rowEl, "flip", ["flip"]);
    }
  }

  /* one frame of the cockpit from the shared tape; anim=false draws the still */
  function render(AH, anim) {
    var tape = AH.tape, hist = tape.hist || [], width = tape.SPARK || 60;
    var price = isNum(tape.price) ? tape.price : null;
    var mid = isNum(tape.mid) ? tape.mid : null;
    var vwap = isNum(tape.vwap) ? tape.vwap : null;
    var obi = isNum(tape.obi) ? tape.obi : null;
    var cvd = isNum(tape.cvd) ? tape.cvd : null;

    setText(els.sym, tape.SYMBOL || "ES"); setText(els.sym2, tape.SYMBOL || "ES");
    setText(els.clock, AH.clock && typeof AH.clock.et === "function" ? AH.clock.et() : EMDASH);
    var printsOff = tape.outage && tape.outage.prints;
    setText(els.rate, printsOff ? EMDASH : fmt(tape.rate, 1));

    /* last price with the directional glow (app.js:208-211) */
    setText(els.price, fmt(price, 2));
    if (anim && isNum(price) && isNum(last.price) && price !== last.price) {
      pulse(els.price, price > last.price ? "tick-up" : "tick-down", ["tick-up", "tick-down"]);
    }
    last.price = price;
    /* the quote line reads the book; no book, no quote */
    setText(els.bid, fmt(mid, 2));
    setText(els.ask, isNum(mid) ? fmt(mid + TICK, 2) : EMDASH);
    setText(els.spr, isNum(mid) ? fmt(TICK, 2) : EMDASH);

    /* the three factors: value · vote · sparkline */
    var vO = obiVote(obi), vV = vwapVote(price, vwap), vC = cvdVote(cvd);
    var vwDist = (isNum(price) && isNum(vwap)) ? price - vwap : null;
    factorRow(els.fObi, els.obiN, els.obiV, sgn(obi, 2), vO, "obi", anim);
    factorRow(els.fVwap, els.vwapN, els.vwapV, sgn(vwDist, 2), vV, "vwap", anim);
    factorRow(els.fCvd, els.cvdN, els.cvdV, intStrSigned(cvd), vC, "cvd", anim);
    var sObi = [], sVw = [], sCvd = [];
    for (var i = 0; i < hist.length; i++) {
      var h = hist[i] || {};
      sObi.push(isNum(h.obi) ? h.obi : null);
      sVw.push((isNum(h.mid) && isNum(vwap)) ? h.mid - vwap : null);
      sCvd.push(isNum(h.cvd) ? h.cvd : null);
    }
    drawSpark(els.spkObi, els.gapObi, sObi, vO, width);
    drawSpark(els.spkVwap, els.gapVwap, sVw, vV, width);
    drawSpark(els.spkCvd, els.gapCvd, sCvd, vC, width);

    /* the confluence chip: flash on a change, ring when all three agree (app.js:247-259) */
    var v = verdict([vO, vV, vC]);
    els.vbadge.setAttribute("data-conv", v.kind);
    setText(els.vtxt, v.txt);
    setText(els.vsub, v.sub);
    setText(els.conv, v.conv);
    if (anim && v.txt !== last.verdict) {
      pulse(els.vbadge, "flash", ["flash", "conv-high"]);
      if (v.kind === "high-bull" || v.kind === "high-bear") {
        els.vbadge.style.setProperty("--flip-col", v.col);
        els.vbadge.classList.add("conv-high");
      }
    }
    last.verdict = v.txt;

    /* the ABS tally from the landed events */
    countEvents(tape.events || []);
    setText(els.abs, tally.n ? String(tally.n) : EMDASH);
    setText(els.absBid, tally.n ? String(tally.bid) : EMDASH);
    setText(els.absAsk, tally.n ? String(tally.ask) : EMDASH);
  }

  var TRANSIENT = ["flash", "tick-up", "tick-down", "flip", "conv-high"];
  function clearEffects() {
    root.classList.remove("bd-wake");
    var lit = root.querySelectorAll("." + TRANSIENT.join(",."));
    for (var i = 0; i < lit.length; i++) lit[i].classList.remove.apply(lit[i].classList, TRANSIENT);
  }

  var piece = {
    id: "board", el: root, always: false,
    start: function () {
      /* became live: draw the baseline still, then let the deskbar, rail and footbar assemble */
      resetLast();
      render(window.AH, false);
      root.classList.remove("bd-wake"); void root.offsetWidth; root.classList.add("bd-wake");
    },
    stop: function () { clearEffects(); },
    tick: function () { render(window.AH, true); },
    static: function () {
      /* reduced motion: one complete frame from the booted tape, no animating class anywhere */
      clearEffects();
      resetLast();
      render(window.AH, false);
    }
  };

  try {
    syncWords();
    if (window.AH && typeof window.AH.register === "function") window.AH.register(piece);
  } catch (e) { /* the markup stands complete without the piece */ }
})();
