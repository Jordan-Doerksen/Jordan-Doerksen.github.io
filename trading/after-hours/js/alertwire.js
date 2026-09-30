/* 03 alertwire: the alert types itself.
 *
 * Adapts the tier-2 desk toy's parts, factorParts and skewPart to the shared synthetic tape.
 * Every desk word and number format comes from the root's data-ah-desk JSON, which the build
 * read from the desk's own source; the values are the tape's. Nothing here owns a timer or a
 * frame: the core scheduler calls tick() once per demo second, frame() while live, and
 * static() under reduced motion. A throw at load leaves the markup as the complete still.
 */
(function () {
  "use strict";
  var root = document.getElementById("ah-alertwire");
  if (!root || !window.AH) return;
  try { AH.register(build()); } catch (e) { /* not registered: the markup is the still */ }

  function build() {
    var desk = JSON.parse(root.getAttribute("data-ah-desk") || "null");
    if (!desk || !desk.text || !desk.fmt) throw new Error("desk facts missing");
    var T = desk.text, F = desk.fmt, L = desk.lim || {}, body = document.body;
    var STALE = Number(L.stale) || Number(body.getAttribute("data-ah-stale"));
    var REFRESH = Number(L.refresh) || Number(body.getAttribute("data-ah-refresh"));
    if (!(STALE > 0) || !(REFRESH > 0)) throw new Error("skew limits missing");
    var tape = AH.tape, fill = AH.fmt.fill, num = AH.fmt.num, TICK = tape.TICK || 0.25;
    var FACTORS = ["OBI", "VWAP", "CVD"];
    // the desk's vote thresholds, read by the build from the desk's indicators module as lim.obiVote and
    // lim.vwapTicks: never printed, never typed here. Missing means no register and the markup stands as
    // the still (the skew limits' rule above), so this piece never votes with a number of its own and the
    // marks it types come from the same limits the generator graded the still with.
    var OBI_VOTE = Number(L.obiVote), VWAP_TICKS = Number(L.vwapTicks);
    if (!(OBI_VOTE > 0) || !(VWAP_TICKS > 0)) throw new Error("vote limits missing");
    var CPS = 0.018;                         // seconds per typed character
    var COOL = 20, IDLE = 40, HOLD = 20;     // staged cadence, demo seconds
    var TARGET = 4, WINDOW = 45, NEAR = 8;   // outcome distance in ticks, its window, join distance
    var OUT = { win: "outWin", loss: "outLoss", timeout: "outTime" };
    var GLYPH = { win: word("glyphWin"), loss: word("glyphLoss"), timeout: word("glyphTime") };
    var SPEC = { px: specOf(F.px, "px"), vwap: specOf(F.px, "vwap"), obi: specOf(F.obi, "obi"), cvd: specOf(F.cvd, "cvd") };
    var SEP = word("sep"), SYMBOL = tape.SYMBOL || "ES";
    // the footer's zone word and the entry line's side words, resolved here so a missing one is a load-time
    // throw (no register, the markup is the still), never a throw inside a running tick
    var ZONE = word("zone");
    var WHERE = { above: word("whereAbove"), below: word("whereBelow"), at: word("whereAt") };

    var cards = {
      "break": root.querySelector('.ah-alert[data-case="break"]'),
      gap: root.querySelector('.ah-alert[data-case="gap"]')
    };
    var posts = root.querySelector(".ah-aw-posts");
    var now = {};
    each(root.querySelectorAll("[data-ah-now]"), function (el) { now[el.getAttribute("data-ah-now")] = el; });
    if (!cards["break"] || !cards.gap || !posts) throw new Error("markup missing");
    // the legend's typed words meet the build-checked ones
    each(root.querySelectorAll("[data-ah-key]"), function (el) {
      var k = el.getAttribute("data-ah-key");
      if (typeof T[k] === "string") el.textContent = T[k];
    });

    var job = null, lastValid = null, prevMid = null, open = null, ice = null;
    var cool = 0, idle = 0, cand = null, held = 0, posted = null, armed = false;
    var lv = { hi: null, lo: null, orHi: null, orLo: null };
    var shown = {};

    // ---- helpers ------------------------------------------------------------
    function each(list, fn) { Array.prototype.forEach.call(list, fn); }
    function specOf(lit, name) {
      var m = new RegExp("\\{" + name + ":([^}]*)\\}").exec(lit || "");
      if (!m) throw new Error("no " + name + " in format");
      return m[1];
    }
    function word(k) {
      if (typeof T[k] !== "string") throw new Error("no desk word " + k);
      return T[k];
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function isNum(v) { return typeof v === "number" && isFinite(v); }
    function seg(t, c) { return { t: t, c: c || "" }; }
    function join(parts) {
      var out = [];
      parts.forEach(function (p, i) { if (i) out.push(seg(SEP)); out.push.apply(out, p); });
      return out;
    }
    function segLen(segs) { return segs.reduce(function (n, s) { return n + s.t.length; }, 0); }
    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
    function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    function dirWord(dir) { return word(dir === "long" ? "dirLong" : "dirShort"); }
    // the engine's regime word for the tape's read, when the build gave this piece that word
    function regimeWord(r) { return (typeof r === "string" && typeof T[r] === "string") ? T[r] : word("regime"); }

    // ---- the tape as the detector reads it -----------------------------------
    function readings() {
      return {
        mid: isNum(tape.mid) ? tape.mid : null, obi: isNum(tape.obi) ? tape.obi : null,
        vwap: isNum(tape.vwap) ? tape.vwap : null, cvd: isNum(tape.cvd) ? tape.cvd : null
      };
    }
    // the desk's votes: a missing input votes neutral, and neutral is a failed vote
    function votes(r) {
      var d = (r.mid != null && r.vwap != null) ? r.mid - r.vwap : null;
      return {
        OBI: r.obi == null ? "neutral" : r.obi >= OBI_VOTE ? "bull" : r.obi <= -OBI_VOTE ? "bear" : "neutral",
        VWAP: d == null ? "neutral" : d > VWAP_TICKS * TICK ? "bull" : d < -VWAP_TICKS * TICK ? "bear" : "neutral",
        CVD: r.cvd == null ? "neutral" : r.cvd > 0 ? "bull" : r.cvd < 0 ? "bear" : "neutral"
      };
    }
    function fails(v, dir) {
      var want = dir === "long" ? "bull" : "bear";
      return FACTORS.filter(function (k) { return v[k] !== want; });
    }
    function levels() {
      var h = tape.hist || [], mids = [];
      for (var i = 0; i < h.length - 1; i++) if (h[i] && isNum(h[i].mid)) mids.push(h[i].mid);
      if (!mids.length) return false;
      lv.hi = Math.max.apply(null, mids); lv.lo = Math.min.apply(null, mids);
      if (lv.orHi == null) {                 // the opening range: the first 20 s seen, fixed
        var or = mids.slice(0, 20);
        lv.orHi = Math.max.apply(null, or); lv.orLo = Math.min.apply(null, or);
      }
      return true;
    }
    // the last good skew compute: the tape stamps it; failing that, the last second one was shown
    function syncSkew() {
      var s = tape.skew || {};
      if (isNum(s.asof)) { lastValid = s.asof; return; }
      var h = tape.hist || [];
      for (var i = h.length - 1; i >= 0; i--) {
        if (h[i] && isNum(h[i].skew)) { lastValid = Math.floor(h[i].sec / REFRESH) * REFRESH; break; }
      }
    }

    // ---- the alert, part by part ---------------------------------------------
    function mark(name, fl) {
      var bad = fl.indexOf(name) >= 0;
      return [seg(" "), seg(bad ? "✗" : "✓", bad ? "bad" : "ok")];
    }
    function factor(txt, name, fl, na) { return [seg(txt, na ? "na" : "")].concat(mark(name, fl)); }
    // three states that must not look alike: a current number with its regime word; n/a with a
    // named reason (stale, or held inside the limit, aged at the compute as the engine ages it);
    // n/a with no chain. No mark on this part, ever.
    function skewPart(sec) {
      var s = tape.skew || {};
      if (s.ok && isNum(s.value)) {
        var age = isNum(s.asof) ? sec - s.asof : 0;
        if (age > STALE) return [seg(fill(F.stale, { age_s: age }), "na")];
        return [seg(fill(F.skew, { skew: s.value }) + " " + regimeWord(s.regime))];
      }
      var lastT = isNum(s.asof) ? s.asof : lastValid;
      var at = sec - (sec % REFRESH);
      if (lastT !== null && at - lastT >= 0 && at - lastT <= STALE) {
        var heldFor = Math.round((at - lastT) * 10) / 10;
        return [seg(word("skewNa") + " (" + fill(F.hold, { age: heldFor, "block.suspect_reason": word("noChain") }) + ")", "na")];
      }
      return [seg(word("skewNa") + " (" + word("noChain") + ")", "na")];
    }
    function factorParts(r, fl, sec) {
      return [
        r.obi == null ? factor(word("obiNa"), "OBI", fl, true) : factor(fill(F.obi, { obi: r.obi }), "OBI", fl),
        (r.mid != null && r.vwap != null)
          ? factor(fill(F.px, { px: r.mid, vwap: r.vwap }), "VWAP", fl) : factor(word("vwapNa"), "VWAP", fl, true),
        r.cvd == null ? factor(word("cvdNa"), "CVD", fl, true) : factor(fill(F.cvd, { cvd: r.cvd }), "CVD", fl),
        skewPart(sec)
      ];
    }
    // a filled format with its fabricated zero wrapped as such
    function zeroed(lit, vals, zero, spec, name, fl) {
      var s = fill(lit, vals), z = num(zero, spec), at = s.lastIndexOf(z);
      return [seg(s.slice(0, at)), seg(z, "z"), seg(s.slice(at + z.length))].concat(mark(name, fl));
    }
    function ghostLine(r, dir, sec) {
      var z = { mid: r.mid, obi: r.obi == null ? 0 : r.obi, vwap: r.vwap == null ? 0 : r.vwap, cvd: r.cvd == null ? 0 : r.cvd };
      var fl = fails(votes(z), dir), sk = skewPart(sec);
      return join([
        r.obi == null ? zeroed(F.obi, { obi: 0 }, 0, SPEC.obi, "OBI", fl) : factor(fill(F.obi, { obi: r.obi }), "OBI", fl),
        r.vwap == null ? zeroed(F.px, { px: r.mid, vwap: 0 }, 0, SPEC.vwap, "VWAP", fl)
          : factor(fill(F.px, { px: r.mid, vwap: r.vwap }), "VWAP", fl),
        r.cvd == null ? zeroed(F.cvd, { cvd: 0 }, 0, SPEC.cvd, "CVD", fl) : factor(fill(F.cvd, { cvd: r.cvd }), "CVD", fl),
        sk[0].c === "na" ? [seg(fill(F.skew, { skew: 0 }), "z")] : sk
      ]);
    }
    // blind: the same break read off a feed with no trade prints (VWAP, CVD and the join need them)
    function makeCase(r, brk, sec, clock, blind) {
      if (blind) r = { mid: r.mid, obi: r.obi, vwap: null, cvd: null };
      var fl = fails(votes(r), brk.dir);
      var conv = fl.length === 0 ? "High" : fl.length === 1 ? "Building" : "Standard";
      var side = word(brk.dir === "long" ? "sideBuy" : "sideSell");
      var cw = word("conv" + conv);            // the desk writes the foot's field as {a.conviction}
      // the entry line's tail, as the desk builds it: the gap past the level to two decimals (the price's own
      // spec) with a trailing space, or nothing at the level, then the side word. span is a STRING here:
      // fill() would run num() on a number, and the desk formats the gap itself, not through a field spec.
      var gap = r.mid - brk.lvl;
      var span = gap === 0 ? "" : num(Math.abs(gap), SPEC.px) + " ";
      var where = gap > 0 ? WHERE.above : gap < 0 ? WHERE.below : WHERE.at;
      var lines = [
        { tag: "p", cls: "ah-alert-title", segs: [seg(cap(dirWord(brk.dir)) + fill(F.title, { trig_name: brk.trigName }))] },
        { tag: "p", cls: "ah-alert-read", segs: [seg(fill(F.read, { side: side, trig_name: brk.trigName }) + " " + word("flow" + conv))] },
        { tag: "code", cls: "ah-alert-line", segs: [seg(fill(F.entry, { px: r.mid, trig: brk.trig, lvl: brk.lvl, span: span, where: where }))] },
        { tag: "code", cls: "ah-alert-line", segs: join(factorParts(r, fl, sec)) },
        { tag: "code", cls: "ah-alert-line", segs: [blind ? seg(fill(F.ice, { why: word("noPrints") }), "na") : seg(word("iceNone"))] },
        { tag: "p", cls: "ah-alert-foot", segs: [seg(fill(F.foot, { "a.conviction": cw, conviction: cw }) + SEP + SYMBOL + SEP + clock + " " + ZONE)] }
      ];
      if (blind) lines.push({ tag: "code", cls: "ah-alert-line ah-ghost", segs: ghostLine(r, brk.dir, sec) });
      return lines;
    }

    // ---- rendering, whole or up to a typed position --------------------------
    function putSegs(el, segs, limit) {
      var left = limit;
      segs.forEach(function (s) {
        if (left <= 0) return;
        var t = s.t.slice(0, left); left -= t.length;
        if (!s.c) { el.appendChild(document.createTextNode(t)); return; }
        var sp = document.createElement("span");
        sp.className = s.c === "na" ? "ah-na" : s.c === "z" ? "ah-z" : "ah-aw-" + s.c;
        sp.textContent = t;
        el.appendChild(sp);
      });
    }
    function render(card, lines, at) {
      clear(card);
      lines.forEach(function (ln, i) {
        if (at && i > at.li) return;
        var el = document.createElement(ln.tag);
        el.className = ln.cls;
        putSegs(el, ln.segs, at && i === at.li ? at.shown : Infinity);
        if (at && i === at.li) {
          var caret = document.createElement("span");
          caret.className = "ah-aw-caret"; caret.setAttribute("aria-hidden", "true");
          el.appendChild(caret);
        }
        card.appendChild(el);
      });
    }
    function startJob(spec) {
      job = { card: spec.card, lines: spec.lines, li: 0, shown: 0, acc: 0, next: spec.next || null };
      replay(job.card, "ah-aw-land");
      render(job.card, job.lines, job);
    }
    function finishJob() {
      if (!job) return;
      render(job.card, job.lines, null);
      var next = job.next; job = null;
      if (next) startJob(next);
    }
    function post(text, clock) {
      var li = document.createElement("li"), tm = document.createElement("time");
      tm.textContent = clock; li.appendChild(tm); li.appendChild(document.createTextNode(text));
      li.className = "ah-aw-post ah-aw-in";
      posts.appendChild(li);
      while (posts.children.length > 4) posts.removeChild(posts.firstChild);
    }
    function setNow(key, text, na, dirn) {
      var el = now[key];
      if (!el) return;
      var changed = shown[key] !== text;
      shown[key] = text;
      el.textContent = text;
      el.className = na ? "ah-aw-na" : "";
      if (!changed) return;
      if (dirn) replay(el, dirn > 0 ? "ah-aw-up" : "ah-aw-down"); else replay(el, "ah-aw-flip");
    }
    function paintNow(r, sec) {
      setNow("obi", r.obi == null ? word("obiNa") : fill(F.obi, { obi: r.obi }), r.obi == null);
      var px = (r.mid != null && r.vwap != null);
      setNow("px", px ? fill(F.px, { px: r.mid, vwap: r.vwap }) : word("vwapNa"), !px,
        (r.mid != null && prevMid != null && r.mid !== prevMid) ? (r.mid > prevMid ? 1 : -1) : 0);
      setNow("cvd", r.cvd == null ? word("cvdNa") : fill(F.cvd, { cvd: r.cvd }), r.cvd == null);
      var sk = skewPart(sec);
      setNow("skew", sk[0].t, sk[0].c === "na");
      if (lv.hi != null) {
        setNow("lvl", word("trigCodeHod") + " " + num(lv.hi, SPEC.px) + SEP + word("trigCodeLod") + " " + num(lv.lo, SPEC.px)
          + SEP + word("trigCodeOrHi") + " " + num(lv.orHi, SPEC.px) + SEP + word("trigCodeOrLo") + " " + num(lv.orLo, SPEC.px));
      }
    }

    // ---- the break: a real cross of a level, or the nearer level when the tape has idled
    function crossed(r) {
      if (r.mid == null || prevMid == null || lv.hi == null) return null;
      if (r.mid > lv.hi) return brk("long", "trigCodeHod", "trigHod", lv.hi);
      if (r.mid < lv.lo) return brk("short", "trigCodeLod", "trigLod", lv.lo);
      if (prevMid <= lv.orHi && r.mid > lv.orHi) return brk("long", "trigCodeOrHi", "trigOr", lv.orHi);
      if (prevMid >= lv.orLo && r.mid < lv.orLo) return brk("short", "trigCodeOrLo", "trigOr", lv.orLo);
      return null;
    }
    function nearest(r) {
      if (r.mid == null || lv.hi == null) return null;
      var up = r.mid - lv.lo >= lv.hi - r.mid;
      return up ? brk("long", "trigCodeHod", "trigHod", Math.min(lv.hi, r.mid - TICK))
                : brk("short", "trigCodeLod", "trigLod", Math.max(lv.lo, r.mid + TICK));
    }
    function brk(dir, code, name, lvl) { return { dir: dir, trig: word(code), trigName: word(name), lvl: lvl }; }
    function fire(b, r, sec, typed) {
      var clock = AH.clock.et();
      var a = makeCase(r, b, sec, clock, false), g = makeCase(r, b, sec, clock, true);
      if (typed) startJob({ card: cards["break"], lines: a, next: { card: cards.gap, lines: g } });
      else { render(cards["break"], a, null); render(cards.gap, g, null); }
      open = { dir: b.dir, lvl: b.lvl, sec: sec, clock: clock };
      ice = { dir: b.dir, lvl: b.lvl, trig: b.trig, sec: sec, done: false };
      cool = COOL; idle = 0;
    }

    // ---- the scheduler's calls -------------------------------------------------
    function tick(sec) {
      var r = readings();
      if (tape.skew && tape.skew.ok && isNum(tape.skew.asof)) lastValid = tape.skew.asof;
      levels();
      var b = crossed(r);
      if (!b && !job && idle >= IDLE) b = nearest(r);
      if (b && cool <= 0 && !job) fire(b, r, sec, true); else idle += 1;
      cool -= 1;
      var clock = AH.clock.et();
      if (open && r.mid != null && sec - open.sec >= 8) {
        var d = open.dir === "long" ? r.mid - open.lvl : open.lvl - r.mid;
        var res = d >= TARGET * TICK ? "win" : d <= -TARGET * TICK ? "loss" : (sec - open.sec > WINDOW ? "timeout" : null);
        if (res) {
          post(GLYPH[res] + " " + word(OUT[res]) + " — " + dirWord(open.dir) + " " + open.clock.slice(0, 5), clock);
          open = null;
        }
      }
      if (ice && !ice.done && sec - ice.sec <= 40) {
        var ev = tape.events && tape.events[tape.events.length - 1];
        if (ev && ev.sec > ice.sec && isNum(ev.price) && Math.abs(ev.price - ice.lvl) <= NEAR * TICK) {
          post(word("iceUpdate") + dirWord(ice.dir) + " " + ice.trig + " break", clock);
          ice.done = true;
        }
      }
      var v = votes(r), n = 0;
      FACTORS.forEach(function (k) { n += v[k] === "bull" ? 1 : v[k] === "bear" ? -1 : 0; });
      var lean = n > 0 ? "long" : n < 0 ? "short" : "balanced";
      if (lean !== cand) { cand = lean; held = 0; } else held += 1;
      if (held >= HOLD && cand !== posted) {
        posted = cand;
        post(word(cand === "long" ? "leanLong" : cand === "short" ? "leanShort" : "leanBal"), clock);
      }
      paintNow(r, sec);
      prevMid = r.mid;
    }
    function frame(t, dt) {
      if (!job) return;
      job.acc += dt;
      var n = Math.floor(job.acc / CPS);
      if (n <= 0) return;
      job.acc -= n * CPS;
      while (n-- > 0 && job.li < job.lines.length) {
        job.shown += 1;
        if (job.shown >= segLen(job.lines[job.li].segs)) { job.li += 1; job.shown = 0; }
      }
      if (job.li >= job.lines.length) finishJob(); else render(job.card, job.lines, job);
    }
    function start() {
      if (AH.REDUCED) { statik(); return; }   // never a typed line under reduced motion
      syncSkew();
      var r = readings(), sec = tape.sec || 0;
      if (!armed && levels()) {
        armed = true;
        var b = crossed(r) || nearest(r);
        if (b) fire(b, r, sec, true);
      }
      paintNow(r, sec);
    }
    function stop() {
      while (job) finishJob();
      each(root.querySelectorAll(".ah-aw-land, .ah-aw-in, .ah-aw-flip, .ah-aw-up, .ah-aw-down"), function (el) {
        el.classList.remove("ah-aw-land", "ah-aw-in", "ah-aw-flip", "ah-aw-up", "ah-aw-down");
      });
    }
    // the complete still: both cards and the strip from the tape's newest readable second
    function statik() {
      syncSkew();
      if (!levels()) return;
      var r = readings(), sec = tape.sec || 0;
      if (r.mid == null) {
        var h = tape.hist || [];
        for (var i = h.length - 1; i >= 0; i--) if (h[i] && isNum(h[i].mid)) { r.mid = h[i].mid; r.obi = isNum(h[i].obi) ? h[i].obi : null; r.cvd = isNum(h[i].cvd) ? h[i].cvd : null; break; }
        if (r.mid == null) return;
      }
      prevMid = r.mid;
      fire(crossed(r) || nearest(r), r, sec, false);
      paintNow(r, sec);
    }

    return { id: "alertwire", el: root, always: false, start: start, stop: stop, frame: frame, tick: tick, static: statik };
  }
})();
