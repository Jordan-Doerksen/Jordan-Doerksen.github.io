/* Tier-3 wall (DECISIONS.md CR-15, display-case-law.md, game law 5b).
 *
 * Every game's attract screen, running. No queue, no constellation, no stage:
 * a room you scan, where the things on the walls are alive.
 *
 * THE CPU BUDGET IS THE MECHANIC. Ten attract screens are ten canvas loops, and
 * running them all would make a laptop audible for no reader benefit. At most
 * `maxLive` run, and they are the ones nearest the middle of the viewport.
 *
 * The wall does not mount and unmount on events. It RECONCILES: every change
 * recomputes which panels should be running and makes the page match. See
 * reconcile() for the two bugs that model exists to kill.
 *
 * PROGRESSIVE ENHANCEMENT. The markup ships every game as a real link with its
 * name and description. With this file absent, blocked or throwing, that index
 * is the page and every game still works at its own URL.
 *
 * Under prefers-reduced-motion no iframe is ever mounted. The attract assets
 * each honour reduced motion themselves, but the honest thing at this level is
 * not to start ten of them at all.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    // Every .wall on the page, not just the first. Tier 2's demo strip reuses
    // this exact budget rather than getting a second, drifting implementation
    // of the same mount-and-evict logic. Each wall carries its own maxLive.
    Array.prototype.forEach.call(document.querySelectorAll(".wall"), setupWall);
  }

  function setupWall(wall) {
    if (!wall) return;

    var panels = Array.prototype.slice.call(wall.querySelectorAll(".panel[data-attract]"));
    if (!panels.length) return;

    var cfg = {
      maxLive: parseInt(wall.dataset.maxlive, 10) || 6,
      // One margin now. The second (unmountMargin) existed to drive a separate
      // unmount observer and is unused since reconcile() replaced that model.
      mount: wall.dataset.mountmargin || "400px"
    };

    var overlay = document.querySelector(".player");
    var frame = overlay && overlay.querySelector("iframe");
    var title = overlay && overlay.querySelector(".player-title");
    var closeBtn = overlay && overlay.querySelector(".player-close");

    wall.dataset.js = "on";

    // Reduced motion: the wall is the index, and nothing is mounted at all.
    if (reduced) {
      wall.dataset.js = "static";
      return;
    }

    // Margin in px, parsed once. Visibility is DERIVED from geometry in
    // reconcile(), never stored - see the note there.
    var MARGIN = parseInt(cfg.mount, 10) || 400;

    function mount(panel) {
      if (panel.dataset.mounted === "1") return;
      var screen = panel.querySelector(".screen");
      if (!screen) return;
      var f = document.createElement("iframe");
      f.src = panel.dataset.attract;
      f.title = panel.dataset.name + " attract screen";
      f.setAttribute("scrolling", "no");
      f.tabIndex = -1;              // a display, not a control; the link is the way in
      screen.appendChild(f);
      panel.dataset.mounted = "1";
    }

    function unmount(panel) {
      if (panel.dataset.mounted !== "1") return;
      var f = panel.querySelector(".screen iframe");
      if (f) { f.src = "about:blank"; f.remove(); }   // dropping src stops the loop
      panel.dataset.mounted = "0";
    }

    /* RECONCILE, do not mount imperatively.
     *
     * The first version mounted on an observer event and evicted live[0] - the
     * oldest mount - whenever the cap was exceeded. Two ways that fails, and the
     * owner hit both:
     *
     *   Not loading. Evicting the oldest can unmount a panel that is still on
     *   screen. IntersectionObserver only fires on threshold CROSSINGS, so a
     *   panel that never left the margin gets no further callback and stays
     *   blank forever.
     *
     *   Not unloading. A panel mounted outright at boot, or one that never
     *   crosses the unmount boundary, is never reconsidered at all.
     *
     * So the observers now only record what is visible, and every event
     * recomputes the whole desired set: the visible panels nearest the middle of
     * the viewport, capped. Anything mounted that is not wanted is dropped;
     * anything wanted that is not mounted is started. State cannot drift,
     * because nothing depends on having seen a particular event.
     */
    function reconcile() {
      var vh = window.innerHeight;
      var mid = vh / 2;

      var want = panels
        .map(function (p) {
          var r = p.getBoundingClientRect();
          var near = r.bottom > -MARGIN && r.top < vh + MARGIN;
          return { p: p, near: near, d: Math.abs(r.top + r.height / 2 - mid) };
        })
        .filter(function (x) { return x.near; })
        .sort(function (a, b) { return a.d - b.d; })
        .slice(0, cfg.maxLive)
        .map(function (x) { return x.p; });

      panels.forEach(function (p) {
        var wanted = want.indexOf(p) > -1;
        if (wanted && p.dataset.mounted !== "1") mount(p);
        else if (!wanted && p.dataset.mounted === "1") unmount(p);
      });
    }

    panels.forEach(function (p) { p.dataset.mounted = "0"; });

    // Mount the first few OUTRIGHT, before any observer speaks. An
    // IntersectionObserver reports nothing in a hidden or not-yet-laid-out
    // document, so a wall that waits for it is a grid of empty rectangles on
    // arrival - the same failure as a canvas that only ever draws from its
    // animation loop. These are the top of the page and effectively always in
    // view; the observers take over from here.
    // Feature check FIRST, and no early return: the click handlers below are how
    // a game gets played, and skipping them would leave a wall you cannot use.
    // Every trigger calls the SAME reconcile, and reconcile reads geometry, so
    // it does not matter which events arrive or in what order. The observer is
    // an efficiency, not a source of truth.
    var ticking = false;
    function schedule() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; reconcile(); });
    }

    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(schedule, { rootMargin: cfg.mount });
      panels.forEach(function (p) { seen.observe(p); });
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Coming back to the tab: rAF and IntersectionObserver are both suspended
    // while it is hidden, so the page can return with a stale set.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) reconcile();
    });

    reconcile();   // the boot state, from geometry, not from an event

    function open(url, name) {
      if (!overlay || !frame) { window.location.href = url; return; }
      frame.src = url;
      if (title) title.textContent = name;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      // Everything on the wall stops while a game is being played. One loop at
      // a time is the whole point of the budget.
      panels.forEach(unmount);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!overlay || !frame) return;
      overlay.hidden = true;
      frame.src = "about:blank";
      document.body.style.overflow = "";
      reconcile();          // bring back whatever is on screen now
    }

    wall.addEventListener("click", function (e) {
      var play = e.target.closest && e.target.closest("[data-play]");
      if (!play) return;
      e.preventDefault();
      open(play.getAttribute("href"), play.dataset.play);
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.hidden) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
