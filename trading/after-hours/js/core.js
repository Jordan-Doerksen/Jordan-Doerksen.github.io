/* After Hours — js/core.js. The one scheduler.
 *
 * This file is the ONLY place on the page that creates a requestAnimationFrame. No setTimeout
 * or setInterval exists anywhere on the page. It defines window.AH synchronously, before every
 * piece script, and boots on DOMContentLoaded.
 *
 * REDUCED is read once from matchMedia. When it is true, boot adds html.ah-reduced, calls every
 * piece's static() once, and returns: no IntersectionObserver, no rAF, no timer, nothing logged.
 * The page is then a complete still. A piece that registers later gets its static() at once.
 *
 * Otherwise boot adds html.ah-js, observes every piece root with one IntersectionObserver and
 * keeps a live set: the budget.max intersecting pieces nearest the viewport centre, plus the
 * `always` pieces while the tab is visible (the scanner only on a fine pointer). One rAF loop
 * runs only while that set is non-empty and the document is visible. Each whole demo second it
 * advances the shared synthetic tape, then calls tick(sec) on every live piece; each frame it
 * calls frame(t, dt). A piece that throws is stopped, marked data-ah="failed" and dropped; the
 * loop continues.
 *
 * The tape is a port of the tier-2 desk toy's feed (docs/tier-2-case/desk-toy.js): a random walk
 * in 0.25 ticks, OBI decaying toward 0, 2–7 prints a second feeding VWAP and CVD over the desk's
 * window, a skew compute every `refresh` seconds held then blank past `stale`, and an outage
 * script sized from those limits. Null is a gap. Pieces draw gaps as gaps, never as 0.
 *
 * Every number the tape holds is synthetic. The limits it runs on (refresh, stale, cvdWindow)
 * are the desk's own, written onto <body> by the generator. A missing limit fails boot and the
 * page stays as its markup: complete and readable.
 */
(function () {
  "use strict";

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var REDUCED = !!(mq && mq.matches);

  // ---- rng: mulberry32, seeded at boot from body data-ah-seed -------------------------------
  var seedState = 1;
  function rng() {
    seedState = (seedState + 0x6D2B79F5) | 0;
    var t = seedState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rnd(a) { return (rng() * 2 - 1) * a; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function irange(lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }

  // ---- fmt: the toy's formatter. Python's two cases: a +.Nf / .Nf spec, or a bare float. ----
  var FIELD = /\{([\w.]+)(?::([^}]*))?\}/g;
  function num(v, spec) {
    if (!spec) return (v % 1 === 0) ? v.toFixed(1) : String(v);
    var m = /^(\+?)\.(\d+)f$/.exec(spec);
    if (!m) throw new Error("unsupported format spec " + spec);
    var s = v.toFixed(Number(m[2]));
    return (m[1] && v >= 0 ? "+" : "") + s;
  }
  function fill(lit, vals) {
    return String(lit).replace(FIELD, function (_, name, spec) {
      var v = vals[name];
      if (v === undefined || v === null) throw new Error("no value for " + name);
      return typeof v === "number" ? num(v, spec) : String(v);
    });
  }

  // ---- the shared synthetic tape ------------------------------------------------------------
  var LIM = { refresh: 0, stale: 0, cvdWindow: 0 };
  var tape = {
    TICK: 0.25, SPARK: 60, SYMBOL: "ES",
    sec: 0, price: 5412.25, mid: null, obi: null, vwap: null, cvd: null, rate: 0,
    skew: { ok: false, value: null, asof: null, regime: null, reason: null },
    absorption: null,
    events: [],
    hist: [],
    outage: { book: false, prints: false, chain: false, period: 0, chainFor: 0 },
    step: step
  };
  // private feed state (the toy's closure variables)
  var feed = {
    obi: 0.2, vnum: 0, vden: 0, prints: 0, cvd: 0, cvdHist: [],
    skewTrue: 0.103, ema: null, sign: 0, pend: [0, 0], lastValid: null, cache: null,
    nextEvent: 0, absorbUntil: 0
  };

  // The outage script, sized from the desk's limits at boot (sizeOutages). One period is
  // 2 × (stale + refresh) + 30 s. Once a period the book goes dark for a few seconds, and the
  // chain goes away for about ten seconds around ONE refresh, so one compute comes back empty and
  // the sky holds for one refresh interval. Every `longEvery`-th period the chain stays away
  // through enough refreshes that the last one is past the stale limit: the hold ages out and the
  // compute finds no chain (held, then n/a). The desk's own limits set the floor: a hold lasts one
  // refresh, and "none" needs the last good read older than `stale`. Both reason codes appear;
  // most of the time the engine reads.
  var CUT = { bookAt: 0, bookFor: 0, chainAt: 0, pre: 0, post: 0, longEvery: 3, longReads: 0 };
  function sizeOutages() {
    var R = LIM.refresh, S = LIM.stale, P = 2 * (S + R) + 30;
    tape.outage.period = P;
    CUT.bookAt = Math.round(P * 0.8);                           // 96 s into a 120 s period
    CUT.bookFor = Math.max(2, Math.round(P / 15));              // 8 s
    CUT.chainAt = Math.round(P * 0.625);                        // aimed at 75 s, snapped to a refresh
    CUT.pre = Math.max(1, Math.min(4, Math.floor(R / 3)));      // the chain goes a few seconds before
    CUT.post = Math.max(1, Math.min(6, R - CUT.pre - 1));       // and is back before the next refresh
    CUT.longReads = Math.floor(S / R) + 1;                      // empty computes until one is past `stale`
    tape.outage.chainFor = CUT.pre + (CUT.longReads - 1) * R + CUT.post;   // the long outage, 40 s
  }
  function outageAt(s) {
    var o = tape.outage, P = o.period, R = LIM.refresh;
    if (!(P > 0) || !(R > 0)) { o.book = false; o.chain = false; return; }
    var k = Math.floor(s / P), p = s - k * P;
    o.book = p >= CUT.bookAt && p < CUT.bookAt + CUT.bookFor;
    var r = Math.round((k * P + CUT.chainAt) / R) * R;         // the refresh this period's outage straddles
    var long = k % CUT.longEvery === CUT.longEvery - 1;
    var end = r + CUT.post + (long ? (CUT.longReads - 1) * R : 0);
    o.chain = s >= r - CUT.pre && s < end;
  }

  function step() {
    var s = ++tape.sec;
    var o = tape.outage;
    outageAt(s);
    o.prints = false;

    // the market moves even while a feed is off
    tape.price = Math.max(5300, tape.price + Math.round(rnd(3)) * tape.TICK);
    feed.obi = clamp(feed.obi * 0.8 + rnd(0.25), -0.9, 0.9);
    var n = irange(2, 7);
    for (var i = 0; i < n; i++) {
      var size = irange(1, 12);
      feed.vnum += (tape.price + Math.round(rnd(1)) * tape.TICK) * size;
      feed.vden += size;
      feed.prints += 1;
      // a print is signed against the book; with no book it is counted, not classified
      if (!o.book) feed.cvd += (rng() < 0.5 + feed.obi * 0.15 ? 1 : -1) * size;
    }
    tape.rate = n;
    feed.cvdHist.push([s, feed.cvd]);
    while (feed.cvdHist.length && feed.cvdHist[0][0] < s - LIM.cvdWindow) feed.cvdHist.shift();

    if (LIM.refresh > 0 && s % LIM.refresh === 0) refreshSkew(s, o.chain);
    publishSkew(s);

    tape.mid = o.book ? null : tape.price;
    tape.obi = o.book ? null : Math.round(feed.obi * 1000) / 1000;
    tape.vwap = feed.vden > 0 ? Math.round(feed.vnum / feed.vden * 100) / 100 : null;
    tape.cvd = (feed.prints > 0 && feed.cvdHist.length >= 2) ? feed.cvd - feed.cvdHist[0][1] : null;

    // absorption: the detector needs the book; an event lands every 7–15 s and stays current a few seconds
    if (o.book) {
      tape.absorption = null;
      feed.nextEvent = s + irange(7, 15);
    } else {
      if (tape.absorption && s >= feed.absorbUntil) tape.absorption = null;
      if (s >= feed.nextEvent) { land(s); feed.nextEvent = s + irange(7, 15); }
    }

    tape.hist.push({ sec: s, mid: tape.mid, obi: tape.obi, cvd: tape.cvd, skew: tape.skew.ok ? tape.skew.value : null });
    if (tape.hist.length > tape.SPARK) tape.hist.shift();
    clock.sec = s;
  }

  // One compute per refresh. The smoother's rules: the accumulator resets across a gap; a sign
  // flip is adopted only when two consecutive computes agree; within `stale` of the last good
  // read an empty chain is a HELD read with no number; past it, blank with the reason.
  function refreshSkew(s, chainOff) {
    if (!chainOff) {
      var pull = (0.10 - feed.skewTrue) * 0.15 + rnd(0.02);
      if (rng() < 0.05) pull -= 0.16;               // an occasional inversion, so both words appear
      feed.skewTrue = clamp(feed.skewTrue + pull, -0.12, 0.24);
      var x = Math.round(feed.skewTrue * 1e4) / 1e4;
      feed.ema = feed.ema === null ? x : 0.4 * x + 0.6 * feed.ema;
      var newSign = x > 0 ? 1 : x < 0 ? -1 : 0;
      if (newSign === feed.sign) {
        feed.pend = [0, 0];
      } else {
        var cnt = newSign === feed.pend[0] ? feed.pend[1] + 1 : 1;
        feed.pend = [newSign, cnt];
        if (cnt >= 2) { feed.sign = newSign; feed.pend = [0, 0]; }
      }
      feed.cache = {
        ok: true, value: Math.round(feed.ema * 1e4) / 1e4, asof: s,
        regime: feed.sign > 0 ? "fear" : feed.sign < 0 ? "inverted" : "neutral", reason: null
      };
      feed.lastValid = s;
    } else {
      feed.ema = null;
      var held = feed.lastValid !== null && s - feed.lastValid <= LIM.stale;
      feed.cache = { ok: false, value: null, asof: feed.lastValid, regime: null, reason: held ? "held" : "none" };
    }
  }

  // What the page may print this second. reason codes: null (a live read), "held" (chain came
  // back empty, inside the stale limit), "stale" (last read older than the limit), "none" (no chain).
  function publishSkew(s) {
    var c = feed.cache, k = tape.skew;
    if (!c) { k.ok = false; k.value = null; k.asof = null; k.regime = null; k.reason = "none"; return; }
    if (c.ok && s - c.asof > LIM.stale) { k.ok = false; k.value = null; k.asof = c.asof; k.regime = null; k.reason = "stale"; return; }
    k.ok = c.ok; k.value = c.value; k.asof = c.asof; k.regime = c.regime; k.reason = c.reason;
  }

  function land(s) {
    var shown = irange(20, 140);
    var ratio = Math.round((1.5 + rng() * 4.5) * 10) / 10;
    var ev = {
      sec: s,
      side: rng() < 0.5 + feed.obi * 0.3 ? "BID" : "ASK",
      price: Math.round((tape.price + irange(-3, 3) * tape.TICK) * 100) / 100,
      shown: shown,
      traded: Math.round(shown * ratio),
      ratio: ratio,
      held: rng() < 0.65
    };
    tape.events.push(ev);
    if (tape.events.length > 8) tape.events.shift();
    tape.absorption = ev;
    feed.absorbUntil = s + irange(3, 6);
  }

  // ---- the demo clock, from 09:30:00 --------------------------------------------------------
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var clock = {
    sec: 0, t: 0,
    et: function () {
      var s = (34200 + clock.sec) % 86400;
      return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    }
  };

  // ---- pieces, budget, the loop -------------------------------------------------------------
  var pieces = {};
  var budget = { max: 3, live: [], candidates: [] };
  var list = [];          // registration order
  var vis = {};           // id -> intersecting
  var dist = {};          // id -> distance to the viewport centre, at the last reconcile
  var failed = {};        // id -> true once dropped
  var booted = false, io = null, rafId = 0, last = 0, acc = 0, sinceRec = 0;

  function register(piece) {
    if (!piece || typeof piece.id !== "string" || !piece.id) throw new Error("piece needs an id");
    if (!piece.el || piece.el.nodeType !== 1) throw new Error("piece " + piece.id + " needs a root element");
    if (pieces[piece.id]) throw new Error("piece " + piece.id + " registered twice");
    pieces[piece.id] = piece;
    list.push(piece);
    if (!booted) return;
    if (REDUCED) { drawStatic(piece); return; }
    io.observe(piece.el);
    reconcile();
  }

  // Every piece call runs through here. A throw stops the piece, marks its root and drops it.
  function call(p, name, args) {
    if (failed[p.id]) return false;
    var fn = p[name];
    if (typeof fn !== "function") return true;
    try { fn.apply(p, args || []); return true; }
    catch (e) { drop(p); return false; }
  }
  function drop(p) {
    failed[p.id] = true;
    try { if (typeof p.stop === "function") p.stop(); } catch (e) { /* content stays readable */ }
    try { p.el.setAttribute("data-ah", "failed"); } catch (e2) { /* root gone */ }
    var i = budget.live.indexOf(p);
    if (i >= 0) budget.live.splice(i, 1);
    i = list.indexOf(p);
    if (i >= 0) list.splice(i, 1);
    delete pieces[p.id];
    delete vis[p.id];
    if (io) { try { io.unobserve(p.el); } catch (e3) { /* not observed */ } }
  }

  function drawStatic(p) {
    if (call(p, "static")) p.el.setAttribute("data-ah", "static");
  }

  function finePointer() {
    return !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);
  }

  function onIO(entries) {
    for (var i = 0; i < entries.length; i++) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].el === entries[i].target) { vis[list[j].id] = entries[i].isIntersecting; break; }
      }
    }
    reconcile();
  }

  function enter(p) {
    if (!call(p, "start")) return;
    p.el.setAttribute("data-ah", "on");
    budget.live.push(p);
  }
  function leave(p) {
    var i = budget.live.indexOf(p);
    if (i >= 0) budget.live.splice(i, 1);
    if (call(p, "stop")) p.el.setAttribute("data-ah", "off");
  }

  // The live set: the budget.max intersecting pieces nearest the viewport centre, plus the
  // `always` pieces while the tab is visible (the scanner only on a fine pointer).
  function settle() {
    if (!booted || REDUCED) return;
    var hidden = document.hidden;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var cands = [], always = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.always) {
        if (!hidden && (p.id !== "scanner" || finePointer())) always.push(p);
      } else if (vis[p.id]) {
        var r = p.el.getBoundingClientRect();
        dist[p.id] = Math.abs(r.top + r.height / 2 - vh / 2);
        cands.push(p);
      }
    }
    cands.sort(function (a, b) { return dist[a.id] - dist[b.id]; });
    budget.candidates = cands.slice();
    var next = cands.slice(0, budget.max).concat(always);
    var leaving = budget.live.slice();
    for (i = 0; i < leaving.length; i++) if (next.indexOf(leaving[i]) < 0) leave(leaving[i]);
    for (i = 0; i < next.length; i++) if (budget.live.indexOf(next[i]) < 0) enter(next[i]);
  }
  function reconcile() { settle(); sync(); }

  // The one rAF loop: alive only while the live set is non-empty and the document is visible.
  // sync() starts and stops it (a start clears `last`, so the first frame back has dt 0);
  // the loop re-arms itself while it is wanted.
  function wanted() { return budget.live.length > 0 && !document.hidden; }
  function sync() {
    if (wanted() && !rafId) { last = 0; rafId = requestAnimationFrame(loop); }
    else if (!wanted() && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  function loop(now) {
    rafId = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    clock.t += dt;
    acc += dt;
    sinceRec += dt;
    var live, i;
    if (acc >= 1) {
      acc -= 1;
      step();
      live = budget.live.slice();
      for (i = 0; i < live.length; i++) call(live[i], "tick", [clock.sec]);
    }
    live = budget.live.slice();
    for (i = 0; i < live.length; i++) call(live[i], "frame", [clock.t, dt]);
    if (sinceRec >= 0.5) { sinceRec = 0; settle(); }
    if (wanted()) rafId = requestAnimationFrame(loop);
  }

  // ---- boot -----------------------------------------------------------------------------------
  function boot() {
    var body = document.body;
    var seed = Number(body.getAttribute("data-ah-seed"));
    seedState = isFinite(seed) ? (seed | 0) : 1;
    LIM.refresh = Number(body.getAttribute("data-ah-refresh"));
    LIM.stale = Number(body.getAttribute("data-ah-stale"));
    LIM.cvdWindow = Number(body.getAttribute("data-ah-cvdwin"));
    if (!(LIM.refresh > 0) || !(LIM.stale > 0) || !(LIM.cvdWindow > 0)) throw new Error("desk limits missing");
    var max = Number(body.getAttribute("data-ah-max"));
    budget.max = max > 0 ? Math.floor(max) : 3;
    sizeOutages();

    // step 1, both modes: two demo minutes of history, pure computation
    for (var i = 0; i < 120; i++) step();
    booted = true;

    // step 2
    if (REDUCED) {
      document.documentElement.classList.add("ah-reduced");
      var all = list.slice();
      for (i = 0; i < all.length; i++) drawStatic(all[i]);
      return;
    }
    document.documentElement.classList.add("ah-js");
    io = new IntersectionObserver(onIO, { rootMargin: "-10% 0px -10% 0px" });
    for (i = 0; i < list.length; i++) io.observe(list[i].el);
    window.addEventListener("resize", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    reconcile();
  }

  window.AH = {
    REDUCED: REDUCED,
    register: register,
    pieces: pieces,
    tape: tape,
    clock: clock,
    budget: budget,
    rng: rng,
    fmt: { fill: fill, num: num }
  };

  function safeBoot() {
    try { boot(); } catch (e) { /* the markup is the page */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", safeBoot);
  else safeBoot();
})();
