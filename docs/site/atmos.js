/* Atmosphere cross-fade between tier sections (DECISIONS.md D-A26).
 *
 * THIS IS NOT WHAT MAKES A SECTION THE RIGHT COLOUR. Every section paints its
 * own ground in CSS, so the palette is already correct with this file absent,
 * blocked or throwing, and under reduced motion. D-A26 states it as a rule: a
 * palette that needs a scroll listener to be correct is a defect.
 *
 * All this does is carry the PAGE background - the strip visible above the first
 * section and below the last, and behind any gap - from one section's ground to
 * the next, so the edges do not flash a colour that belongs to neither.
 *
 * Reads geometry on every call rather than remembering which section fired last,
 * for the reason recorded in wall.js: a stored set goes stale whenever the
 * events that maintain it do not arrive.
 */
(function () {
  "use strict";

  function boot() {
    var sections = Array.prototype.slice.call(document.querySelectorAll(".tier[data-atmos]"));
    if (!sections.length) return;

    // The ground of each section, read from the section itself. No palette is
    // duplicated here - CSS remains the single place a colour is declared.
    var grounds = sections.map(function (s) {
      return getComputedStyle(s).backgroundColor;
    });

    var reduced = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.body.style.transition = "none";
    }

    function nearest() {
      var mid = window.innerHeight / 2;
      var best = 0, bd = Infinity;
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].getBoundingClientRect();
        // Distance from the viewport middle to this section's span, zero inside.
        var d = (r.top > mid) ? r.top - mid : (r.bottom < mid ? mid - r.bottom : 0);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    var current = -1;
    function apply() {
      var i = nearest();
      if (i === current) return;
      current = i;
      var bg = grounds[i];
      if (bg && bg !== "rgba(0, 0, 0, 0)") document.body.style.backgroundColor = bg;
      document.documentElement.dataset.atmos = sections[i].dataset.atmos;
    }

    var ticking = false;
    function schedule() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; apply(); });
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) apply();
    });
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
