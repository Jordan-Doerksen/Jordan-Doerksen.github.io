/* Tier-3 wall (DECISIONS.md CR-15, display-case-law.md, game law 5b).
 *
 * Every game's attract screen, running. No queue, no constellation, no stage:
 * a room you scan, where the things on the walls are alive.
 *
 * THE CPU BUDGET IS THE MECHANIC. Ten attract screens are ten canvas loops, and
 * running them all would make a laptop audible for no reader benefit. A panel
 * mounts its iframe when it comes near the viewport and unmounts when it goes
 * well past, with a hard cap on how many run at once. Mount and unmount use
 * DIFFERENT margins on purpose: equal ones thrash when a reader scrolls slowly
 * across the boundary.
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
    var wall = document.querySelector(".wall");
    if (!wall) return;

    var panels = Array.prototype.slice.call(wall.querySelectorAll(".panel[data-attract]"));
    if (!panels.length) return;

    var cfg = {
      maxLive: parseInt(wall.dataset.maxlive, 10) || 6,
      mount: wall.dataset.mountmargin || "400px",
      unmount: wall.dataset.unmountmargin || "1200px"
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

    var live = [];   // panels with a mounted iframe, most recently seen last

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
      live.push(panel);
      evict();
    }

    function unmount(panel) {
      if (panel.dataset.mounted !== "1") return;
      var f = panel.querySelector(".screen iframe");
      if (f) { f.src = "about:blank"; f.remove(); }   // dropping src stops the loop
      panel.dataset.mounted = "0";
      live = live.filter(function (p) { return p !== panel; });
    }

    function evict() {
      while (live.length > cfg.maxLive) unmount(live[0]);
    }

    // Two observers, two margins. One boundary would thrash.
    panels.forEach(function (p) { p.dataset.mounted = "0"; });

    // Mount the first few OUTRIGHT, before any observer speaks. An
    // IntersectionObserver reports nothing in a hidden or not-yet-laid-out
    // document, so a wall that waits for it is a grid of empty rectangles on
    // arrival - the same failure as a canvas that only ever draws from its
    // animation loop. These are the top of the page and effectively always in
    // view; the observers take over from here.
    panels.slice(0, Math.min(3, cfg.maxLive)).forEach(mount);

    // Feature check FIRST, and no early return: the click handlers below are how
    // a game gets played, and skipping them would leave a wall you cannot use.
    if ("IntersectionObserver" in window) {
      // Two observers, two margins. One boundary would thrash when a reader
      // scrolls slowly across it.
      var mounter = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) mount(e.target); });
      }, { rootMargin: cfg.mount });

      var unmounter = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (!e.isIntersecting) unmount(e.target); });
      }, { rootMargin: cfg.unmount });

      panels.forEach(function (p) {
        mounter.observe(p);
        unmounter.observe(p);
      });
    } else {
      panels.slice(0, cfg.maxLive).forEach(mount);   // no observer: mount the cap
    }

    function open(url, name) {
      if (!overlay || !frame) { window.location.href = url; return; }
      frame.src = url;
      if (title) title.textContent = name;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      // Everything on the wall stops while a game is being played. One loop at
      // a time is the whole point of the budget.
      live.slice().forEach(unmount);
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      if (!overlay || !frame) return;
      overlay.hidden = true;
      frame.src = "about:blank";
      document.body.style.overflow = "";
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
