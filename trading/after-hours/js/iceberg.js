/* 02 iceberg — the absorption ladder. A piece of the after-hours page. It registers with the core
   scheduler (window.AH) and is driven by it: no timer, no frame request, no fetch of its own. It
   reads its own root only. Number helpers are copied from the cockpit script (fmt, intStr,
   compactNum, ratioStr). Every value it draws is synthetic; a null from the tape is a gap ("—"). */
(function () {
  "use strict";
  try {
    var root = document.getElementById("ah-iceberg");
    var AH = window.AH;
    if (!root || !AH || typeof AH.register !== "function") return;

    var EMDASH = "—";
    var LEVELS = 10;       // rungs a side, twenty in all
    var FEED_ROWS = 6;
    var TICK = (AH.tape && isNum(AH.tape.TICK)) ? AH.tape.TICK : 0.25;

    /* Desk words as fallbacks, typed from the worktree the design names: the cockpit script
       :479 :495 :533 :539-540, the iceberg rule :56, the alert joiner :194; the join limits from
       the iceberg config :8 :11. The build writes the same words into data-ah-desk; those win. */
    var FALLBACK = {
      text: {
        bidAbs: "BID ABSORPTION · BULL", askAbs: "ASK ABSORPTION · BEAR", noAbs: "NO LIVE ABSORPTION",
        sell: "SELL ABSORPTION", buy: "BUY ABSORPTION", into: "absorbed into", shown: "shown", held: "❄ held",
        vConfirmed: "confirmed", vRejected: "rejected", vMixed: "mixed", sep: "  ·  "
      },
      lim: { joinWindow: 60, joinTicks: 8 }
    };

    function isNum(v) { return typeof v === "number" && isFinite(v); }
    function fmt(v, d) {
      if (d === undefined) d = 2;
      return isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : EMDASH;
    }
    function intStr(v) { return isNum(v) ? Math.round(v).toLocaleString("en-US") : EMDASH; }
    function compactNum(v) {
      if (!isNum(v)) return EMDASH;
      var a = Math.abs(v);
      if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
      if (a >= 1e4) return Math.round(v / 1000) + "k";
      return Math.round(v).toLocaleString("en-US");
    }
    function ratioStr(v) { return (isNum(v) && v > 0) ? fmt(v, 1) + "×" : EMDASH; }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    /* the demo clock reads from 09:30:00; an event carries its second */
    function hms(sec) {
      if (!isNum(sec)) return EMDASH;
      var s = (34200 + Math.round(sec)) % 86400;
      return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    }
    /* This piece's own generator (mulberry32, the core's algorithm), seeded from the body's seed with a
       salt of its own. It never draws from AH.rng: a draw between two tape steps would change the shared
       tape according to which pieces happen to be live, and the same seed must give the same tape. */
    var seedAttr = Number(document.body && document.body.getAttribute("data-ah-seed"));
    var seedState = (isFinite(seedAttr) ? (seedAttr | 0) : 1) ^ 0x1CE0BE26;
    function rng() {
      seedState = (seedState + 0x6D2B79F5) | 0;
      var t = seedState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function sizeStr(v) { return (isNum(v) && v > 0) ? String(Math.round(v)) : EMDASH; }

    /* data-ah-desk: {"text":{},"fmt":{},"lim":{}} written by the build. The placeholder, or a
       parse failure, leaves the typed fallbacks in place. */
    function readDesk() {
      var raw = root.getAttribute("data-ah-desk") || "", got = null;
      if (raw.charAt(0) === "{") { try { got = JSON.parse(raw); } catch (e) { got = null; } }
      return got || {};
    }
    var desk = readDesk(), T = {}, L = {}, k;
    for (k in FALLBACK.text) T[k] = FALLBACK.text[k];
    for (k in FALLBACK.lim) L[k] = FALLBACK.lim[k];
    if (desk.text) for (k in desk.text) if (typeof desk.text[k] === "string") T[k] = desk.text[k];
    if (desk.lim) for (k in desk.lim) if (isNum(Number(desk.lim[k]))) L[k] = Number(desk.lim[k]);

    function setText(node, s) { if (node && node.textContent !== s) node.textContent = s; }
    function all(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    function one(sel) { return root.querySelector(sel); }
    /* every word element shows the desk's word: JSON, then the generator-filled attribute, then the typed text */
    function syncWords() {
      all("[data-ah-key]").forEach(function (n) {
        var key = n.getAttribute("data-ah-key"), attr = n.getAttribute("data-ah-word") || "";
        var word = (desk.text && typeof desk.text[key] === "string") ? desk.text[key] : (attr.charAt(0) !== "%" ? attr : null);   // "%" = an unfilled token
        if (typeof word === "string" && word) setText(n, word);
      });
      all("[data-ah-lim]").forEach(function (n) {
        var v = L[n.getAttribute("data-ah-lim")];
        if (isNum(v)) setText(n, String(v));
      });
    }

    var rows = all(".ice-row");
    var el = {
      focus: one("[data-ice='focus']"), flab: one("[data-ice='flab']"), fpx: one("[data-ice='fpx']"),
      fsub: one("[data-ice='fsub']"), fratio: one("[data-ice='fratio']"), mid: one("[data-ice='mid']"),
      feed: one("[data-ice='feed']"), empty: one("[data-ice='empty']"), track: one("[data-ice='track']")
    };
    function cell(row, name) { return row.querySelector("[data-ice='" + name + "']"); }
    function mk(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    }

    /* the resting book: a size per price, kept between ticks so the bars breathe instead of
       re-rolling. Synthetic throughout; the card says so. */
    var rest = {};
    function restAt(price) {
      var key = price.toFixed(2), r = rest[key];
      if (!r) { r = rest[key] = { shown: 20 + Math.floor(rng() * 260), traded: 0 }; r.traded = Math.floor(r.shown * rng() * 0.7); }
      return r;
    }
    function nudge(prices) {
      var keep = {}, i, r;
      for (i = 0; i < prices.length; i++) {
        r = restAt(prices[i]); keep[prices[i].toFixed(2)] = r;
        r.shown = Math.max(5, Math.min(900, r.shown + Math.round((rng() - 0.5) * r.shown * 0.12)));
        r.traded = Math.max(0, Math.min(Math.round(r.shown * 0.9), r.traded + Math.round((rng() - 0.45) * 6)));
      }
      rest = keep;
    }
    /* twenty tick levels: ten asks above the best bid (highest first), the best bid and nine below */
    function ladderPrices(mid) {
      var bestBid = Math.round(mid / TICK) * TICK, out = [], i;
      for (i = LEVELS; i >= 1; i--) out.push(bestBid + i * TICK);
      for (i = 0; i < LEVELS; i++) out.push(bestBid - i * TICK);
      return out;
    }
    function sameLevel(a, b) { return isNum(a) && isNum(b) && Math.abs(a - b) < TICK / 2; }
    function sideOf(ev) { return ev && String(ev.side).toUpperCase() === "BID" ? "bid" : "ask"; }
    function inGate(ev, mid) { return isNum(mid) && ev && isNum(ev.price) && Math.abs(ev.price - mid) <= L.joinTicks * TICK + TICK / 4; }
    function inWindow(ev, nowSec) { return ev && isNum(ev.sec) && isNum(nowSec) && nowSec - ev.sec <= L.joinWindow; }

    /* one frame of the ladder. mid null = book outage: every rung a dash, no bars, no gate. */
    function renderLadder(mid, abs) {
      var i, row, price, r, hit, shown, traded, maxShown = 1, prices, w;
      if (!isNum(mid)) {
        for (i = 0; i < rows.length; i++) {
          row = rows[i];
          row.classList.remove("absorbing", "inside"); row.removeAttribute("data-join"); row.removeAttribute("data-fire");
          setText(row.querySelector(".ice-mark"), ""); setText(row.querySelector(".ice-x"), "");
          setText(cell(row, "px"), EMDASH); setText(cell(row, "shown"), EMDASH); setText(cell(row, "traded"), EMDASH);
          row.querySelector(".ice-bar-shown i").style.width = "0"; row.querySelector(".ice-bar-traded i").style.width = "0";
        }
        setText(el.mid, EMDASH);
        return;
      }
      prices = ladderPrices(mid);
      for (i = 0; i < prices.length; i++) {
        r = restAt(prices[i]);
        maxShown = Math.max(maxShown, r.shown, (abs && sameLevel(abs.price, prices[i]) && isNum(abs.shown)) ? abs.shown : 0);
      }
      for (i = 0; i < rows.length && i < prices.length; i++) {
        row = rows[i]; price = prices[i]; r = restAt(price);
        hit = !!(abs && sameLevel(abs.price, price));   // the level lights wherever it sits; the firing side colours the inset
        shown = hit && isNum(abs.shown) ? abs.shown : r.shown;
        traded = hit && isNum(abs.traded) ? abs.traded : r.traded;
        row.classList.toggle("absorbing", hit);
        row.classList.toggle("inside", i === LEVELS - 1 || i === LEVELS);
        if (hit) row.setAttribute("data-fire", sideOf(abs)); else row.removeAttribute("data-fire");
        if (Math.abs(price - mid) <= L.joinTicks * TICK + TICK / 4) row.setAttribute("data-join", "in"); else row.removeAttribute("data-join");
        setText(row.querySelector(".ice-mark"), hit ? "❄" : "");
        setText(row.querySelector(".ice-x"), hit ? ratioStr(abs.ratio) : "");
        setText(cell(row, "px"), fmt(price));
        setText(cell(row, "shown"), sizeStr(shown));
        setText(cell(row, "traded"), traded > 0 ? compactNum(traded) : EMDASH);
        w = shown > 0 ? Math.max(4, Math.min(100, shown / maxShown * 100)) : 0;
        row.querySelector(".ice-bar-shown i").style.width = w + "%";
        w = traded > 0 ? Math.max(4, Math.min(100, traded / maxShown * 100)) : 0;
        row.querySelector(".ice-bar-traded i").style.width = w + "%";
      }
      setText(el.mid, fmt(Math.round(mid / TICK) * TICK + TICK / 2) + T.sep + "spr " + fmt(TICK));
    }

    /* the focus readout: the level absorbing now, or the rest state; a change flashes it while live */
    var lastFocus = null;
    function renderFocus(mid, abs, animate) {
      var key;
      if (isNum(mid) && abs && isNum(abs.price)) {
        var bid = sideOf(abs) === "bid";
        el.focus.setAttribute("data-side", bid ? "bid" : "ask");
        setText(el.flab, bid ? T.bidAbs : T.askAbs);
        setText(el.fpx, fmt(abs.price));
        setText(el.fsub, (isNum(abs.traded) && abs.traded > 0 ? compactNum(abs.traded) : EMDASH) + " " + T.into + " " +
          sizeStr(abs.shown) + " " + T.shown + (abs.held ? T.sep + T.held : ""));
        setText(el.fratio, ratioStr(abs.ratio));
        key = sideOf(abs) + "@" + abs.price;
      } else {
        el.focus.setAttribute("data-side", "none");
        setText(el.flab, T.noAbs); setText(el.fpx, EMDASH); setText(el.fsub, EMDASH); setText(el.fratio, EMDASH);
        key = "none";
      }
      if (animate && lastFocus !== null && key !== lastFocus) {
        el.focus.classList.remove("flash"); void el.focus.offsetWidth; el.focus.classList.add("flash");
      }
      lastFocus = key;
    }

    /* the event feed: the newest FEED_ROWS of tape.events, newest first. Rows are rebuilt only when a
       new event lands; a row not seen before enters with the lifted keyframe (translateY only) while
       live. The gate tag on each row follows the clock and the inside every second. */
    var seen = {}, primed = false, lastNewest = null;
    function evKey(e) { return [e && e.sec, e && e.side, e && e.price].join("|"); }
    function feedRow(e, animate) {
      var bull = sideOf(e) === "bid", li = mk("li", "ice-ev " + (bull ? "bull" : "bear")), top = mk("div", "ice-ev-top"), p = mk("p", "ice-ev-evid");
      if (animate && primed && !seen[evKey(e)]) li.className += " enter";
      li.setAttribute("data-key", evKey(e));
      top.appendChild(mk("span", "ice-ev-title", (bull ? T.sell : T.buy) + " @ " + fmt(e.price)));
      top.appendChild(mk("span", "ice-ev-t", hms(e.sec)));
      p.appendChild(mk("b", "", isNum(e.traded) && e.traded > 0 ? intStr(e.traded) : EMDASH));
      p.appendChild(document.createTextNode(" " + T.into + " "));
      p.appendChild(mk("b", "", sizeStr(e.shown)));
      p.appendChild(document.createTextNode(" " + T.shown));
      p.appendChild(mk("span", "ice-ev-ice", T.sep + ratioStr(e.ratio)));
      if (e.held) p.appendChild(mk("span", "ice-ev-ice", T.sep + T.held));
      li.appendChild(top); li.appendChild(p); li.appendChild(mk("span", "ice-ev-gate", EMDASH));
      return li;
    }
    function renderFeed(events, nowSec, mid, animate) {
      if (!el.feed || !Array.isArray(events)) return;
      var list = events.slice(-FEED_ROWS).reverse(), newest = list.length ? evKey(list[0]) : null, next = {}, i, e, tag, ok;
      if (newest !== lastNewest || !primed) {
        while (el.feed.firstChild) el.feed.removeChild(el.feed.firstChild);
        for (i = 0; i < list.length; i++) { el.feed.appendChild(feedRow(list[i], animate)); next[evKey(list[i])] = true; }
        seen = next; lastNewest = newest; primed = true;
        setText(el.empty, list.length ? "newest first" : EMDASH);   // the marker becomes the footer line; it never hides
      }
      for (i = 0; i < list.length; i++) {
        e = list[i]; tag = el.feed.children[i] && el.feed.children[i].querySelector(".ice-ev-gate");
        if (!tag) continue;
        ok = inGate(e, mid) && inWindow(e, nowSec);
        tag.setAttribute("data-in", ok ? "yes" : "no");
        setText(tag, ok ? "◆ in range" : "— out of range");
      }
    }

    /* the join window: one pip per event landed inside the last joinWindow seconds, sliding left */
    function renderWindow(events, nowSec) {
      if (!el.track || !Array.isArray(events)) return;
      var keep = {}, i, e, key, pip, age;
      for (i = 0; i < events.length; i++) {
        e = events[i];
        if (!inWindow(e, nowSec) || !(L.joinWindow > 0)) continue;
        key = evKey(e); keep[key] = true;
        pip = el.track.querySelector("[data-key='" + key + "']");
        if (!pip) { pip = mk("span", "ice-pip"); pip.setAttribute("data-key", key); pip.setAttribute("data-side", sideOf(e)); el.track.appendChild(pip); }
        age = Math.max(0, nowSec - e.sec);
        pip.style.left = (100 - age / L.joinWindow * 100).toFixed(1) + "%";
      }
      all(".ice-pip").forEach(function (n) { if (!keep[n.getAttribute("data-key")]) n.parentNode.removeChild(n); });
    }

    function liveMid() { var t = AH.tape || {}; return (t.outage && t.outage.book) ? null : (isNum(t.mid) ? t.mid : null); }
    function draw(animate) {
      var t = AH.tape || {}, mid = liveMid(), abs = isNum(mid) ? t.absorption : null, events = Array.isArray(t.events) ? t.events : [];
      renderLadder(mid, abs); renderFocus(mid, abs, animate); renderFeed(events, t.sec, mid, animate); renderWindow(events, t.sec);
    }

    /* ── the piece ── */
    function start() {
      syncWords(); primed = false; seen = {}; lastFocus = null;
      draw(false);
    }
    function tick() {
      var mid = liveMid();
      if (isNum(mid)) nudge(ladderPrices(mid));
      draw(true);
    }
    function stop() {
      el.focus.classList.remove("flash");
      all(".enter").forEach(function (n) { n.classList.remove("enter"); });
      primed = false;
    }
    /* the complete still: the ladder lit from the newest landed event, the six newest events in the
       feed with their gate tags, the pips of the last joinWindow seconds. No class that animates. */
    function renderStatic() {
      syncWords();
      var t = AH.tape || {}, events = Array.isArray(t.events) ? t.events : [], ev = events.length ? events[events.length - 1] : null, mid;
      if (!ev || !isNum(ev.price)) { renderLadder(null, null); renderFocus(null, null, false); renderFeed(events, t.sec, null, false); renderWindow(events, t.sec); return; }
      mid = sideOf(ev) === "bid" ? ev.price : ev.price - TICK;   // the event sits on a rung of its own side
      renderLadder(mid, ev); renderFocus(mid, ev, false); renderFeed(events, t.sec, mid, false); renderWindow(events, t.sec);
    }

    AH.register({ id: "iceberg", el: root, always: false, start: start, stop: stop, tick: tick, static: renderStatic });
  } catch (e) { /* a throw at load leaves the markup complete and the piece unregistered */ }
})();
