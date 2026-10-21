/* kind-stage.js: the kind containers on Home (DECISIONS.md CR-32, Site card item 43).

   PROGRESSIVE ENHANCEMENT. scripts/front_kindstage.py writes every rail row as a plain link to its project and shows
   the first project's panel; the page is complete with this file absent or broken. This script adds, in order:
     1. data-js="on" on the wrapper, and a roving tab stop on each rail (one Tab stop per kind, arrow keys inside).
     2. Selecting: hover (mouse), focus or a click on a rail row shows that project's panel and stops that
        kind's stepping. A plain click selects; a click with a modifier key, or a middle click, still opens the page.
     3. Stepping: the highlight steps down the rail every dwell (data-dwell, from home.stage_v2.dwell_ms) and the
        stage follows. ONLY THE KIND MOST IN VIEW STEPS (IntersectionObserver); the rest hold still. A kind with
        fewer than data-min-steps projects never steps. Stepping stops when the tab is hidden.
     4. A Pause / Play button in each stepping kind's header corner (WEB-06: it never moves).

   REDUCED MOTION (SAFE-05) is read before anything else: no timer is ever created, no entrance class is added, the
   first project stays shown, the Pause button stays hidden (there is nothing to pause), and a click or an arrow key
   selects. If the setting turns on while the page is open, every timer is cleared at once.

   Timings and labels come from data attributes the generator wrote out of scripts/front_page.config.json. No
   fetch, no config parsing at runtime, no timer except the one step timer of the one kind in view. */
(function () {
  "use strict";

  var wrap = document.querySelector(".fp-ksx");
  if (!wrap) { return; }
  wrap.setAttribute("data-js", "on");

  var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var DWELL = parseInt(wrap.getAttribute("data-dwell"), 10);
  var MIN_STEPS = parseInt(wrap.getAttribute("data-min-steps"), 10);
  var canObserve = typeof window.IntersectionObserver === "function";
  var kinds = [];

  function reduced() { return !!(motion && motion.matches); }

  function build(el) {
    var rows = Array.prototype.slice.call(el.querySelectorAll(".fp-ks-link"));
    var panels = Array.prototype.slice.call(el.querySelectorAll(".fp-ks-panel"));
    if (!rows.length || rows.length !== panels.length) { return null; }
    var k = {
      el: el,
      rows: rows,
      panels: panels,
      pause: el.querySelector(".fp-ks-pause"),
      idx: 0,
      stopped: false,          /* the person took over, or pressed Pause */
      timer: 0,
      seen: 0                  /* visible height in px, from the observer */
    };
    k.canStep = rows.length >= MIN_STEPS && !!k.pause && canObserve && DWELL >= 2200;
    return k;
  }

  function show(k, i, entrance) {
    var j;
    for (j = 0; j < k.rows.length; j++) {
      var on = j === i;
      if (on) { k.rows[j].setAttribute("aria-current", "true"); } else { k.rows[j].removeAttribute("aria-current"); }
      k.rows[j].setAttribute("tabindex", on ? "0" : "-1");
      k.panels[j].hidden = !on;
      k.panels[j].classList.remove("fp-ks-in");
    }
    k.idx = i;
    if (entrance && !reduced()) {
      /* The fade is added here and nowhere else, so the content is at full opacity in the document before any script. */
      var p = k.panels[i];
      p.classList.add("fp-ks-in");
      p.addEventListener("animationend", function done() { p.classList.remove("fp-ks-in"); p.removeEventListener("animationend", done); });
    }
  }

  function clear(k) {
    if (k.timer) { window.clearTimeout(k.timer); k.timer = 0; }
    k.el.setAttribute("data-stepping", "off");
  }

  function arm(k) {
    clear(k);
    k.el.setAttribute("data-stepping", "on");
    k.timer = window.setTimeout(function () {
      k.timer = 0;
      show(k, (k.idx + 1) % k.rows.length, true);
      arm(k);
    }, DWELL);
  }

  function label(k) {
    if (!k.pause) { return; }
    k.pause.textContent = k.pause.getAttribute(k.stopped ? "data-label-play" : "data-label-pause");
    k.pause.setAttribute("aria-label", k.pause.getAttribute(k.stopped ? "data-aria-play" : "data-aria-pause"));
  }

  /* One decision point: which kind may step right now. The one with the most of itself in view, if it may step at all. */
  function refresh() {
    var best = null;
    var i;
    var go = !reduced() && !document.hidden;
    if (go) {
      for (i = 0; i < kinds.length; i++) {
        var k = kinds[i];
        if (k.canStep && !k.stopped && k.seen > 0 && (!best || k.seen > best.seen)) { best = k; }
      }
    }
    for (i = 0; i < kinds.length; i++) {
      if (kinds[i] === best) {
        if (!kinds[i].timer) { arm(kinds[i]); }
      } else {
        clear(kinds[i]);
      }
    }
  }

  function takeOver(k, i) {
    show(k, i, false);
    if (!k.stopped) { k.stopped = true; label(k); }
    refresh();
  }

  function wire(k) {
    show(k, 0, false);
    label(k);
    if (k.pause && k.canStep && !reduced()) { k.pause.hidden = false; }
    k.rows.forEach(function (row, n) {
      /* hover takes over for a mouse only: a finger lands on the click, which takes over as well */
      row.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { takeOver(k, n); } });
      row.addEventListener("focus", function () { takeOver(k, n); });
      row.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) { return; }
        e.preventDefault();       /* the panel carries the "Open" link; a plain click on a row selects */
        takeOver(k, n);
      });
      row.addEventListener("keydown", function (e) {
        var to = -1;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { to = (n + 1) % k.rows.length; }
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { to = (n + k.rows.length - 1) % k.rows.length; }
        else if (e.key === "Home") { to = 0; }
        else if (e.key === "End") { to = k.rows.length - 1; }
        if (to < 0) { return; }
        e.preventDefault();
        k.rows[to].focus();       /* the focus handler selects it */
      });
    });
    if (k.pause) {
      k.pause.addEventListener("click", function () {
        k.stopped = !k.stopped;
        label(k);
        refresh();
      });
    }
  }

  Array.prototype.forEach.call(wrap.querySelectorAll(".fp-ks"), function (el) {
    var k = build(el);
    if (k) { kinds.push(k); wire(k); }
  });
  if (!kinds.length) { return; }

  if (canObserve) {
    var steps = [];
    var t;
    for (t = 0; t <= 20; t++) { steps.push(t / 20); }
    var io = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        kinds.forEach(function (k) { if (k.el === en.target) { k.seen = en.isIntersecting ? en.intersectionRect.height : 0; } });
      });
      refresh();
    }, { threshold: steps });
    kinds.forEach(function (k) { io.observe(k.el); });
  }

  document.addEventListener("visibilitychange", refresh);
  function onMotion() {
    kinds.forEach(function (k) { if (k.pause) { k.pause.hidden = reduced() || !k.canStep; } });
    refresh();
  }
  if (motion) {
    if (motion.addEventListener) { motion.addEventListener("change", onMotion); }
    else if (motion.addListener) { motion.addListener(onMotion); }
  }
})();
