/*
  diagram-live.js — the architecture figures, alive.
  Shared by the front door and the atlas template (both call DiagramLive.scan()
  after their diagrams exist in the DOM; scan is idempotent per svg).

  Two behaviors, both additive to the static figure:
   1. Node hover lights the connected edges (adds .lit — pure highlight).
   2. A small gold pulse travels each gold-path edge while the figure is on
      screen — the data flow, moving. One pulse per gold edge, staggered so
      a chain reads as one packet moving through the system.

  ACCESSIBILITY: prefers-reduced-motion skips the pulses entirely (the figure
  stays exactly as it was); hover lighting is a non-motion highlight and the
  global reduced-motion CSS already zeroes its transitions. Pulses also stop
  whenever the figure leaves the viewport — no offscreen rAF work.
*/
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function wire(svg) {
    if (svg.dataset.live) return;
    svg.dataset.live = "1";

    /* ---- 1. hover lighting ---- */
    function nodeOf(t) { return (t && t.closest) ? t.closest(".dg-node") : null; }
    svg.addEventListener("mouseover", function (e) {
      var n = nodeOf(e.target);
      if (!n) return;
      svg.querySelectorAll(".dg-edge.e-" + n.getAttribute("data-n")).forEach(function (ed) {
        ed.classList.add("lit");
      });
    });
    svg.addEventListener("mouseout", function (e) {
      var n = nodeOf(e.target);
      if (!n || nodeOf(e.relatedTarget) === n) return;
      svg.querySelectorAll(".dg-edge.lit").forEach(function (ed) { ed.classList.remove("lit"); });
    });

    /* ---- 2. traveling pulses on the gold path ---- */
    if (reduced) return;
    var paths = svg.querySelectorAll(".dg-edge.gold path");
    if (!paths.length) return;

    var SPEED = 55;            /* px per second along the path — unhurried */
    var GAP   = 0.45;          /* seconds of stagger between successive edges */
    var pulses = [];
    paths.forEach(function (p, i) {
      var len = p.getTotalLength();
      if (!len) return;
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "dg-pulse");
      dot.setAttribute("r", "2.6");
      svg.appendChild(dot);
      pulses.push({ path: p, dot: dot, len: len, delay: i * GAP });
    });
    if (!pulses.length) return;

    var raf = null, t0 = null;
    var cycle = pulses.reduce(function (m, p) { return Math.max(m, p.delay + p.len / SPEED); }, 0) + 1.2;

    function frame(ts) {
      if (t0 === null) t0 = ts;
      var t = ((ts - t0) / 1000) % cycle;
      pulses.forEach(function (p) {
        var local = t - p.delay;
        var travel = p.len / SPEED;
        if (local < 0 || local > travel) {
          p.dot.setAttribute("opacity", "0");
          return;
        }
        var pt = p.path.getPointAtLength(local * SPEED);
        p.dot.setAttribute("cx", pt.x);
        p.dot.setAttribute("cy", pt.y);
        /* ease the pulse in and out at the ends of its run */
        var fade = Math.min(1, local / 0.25, (travel - local) / 0.25);
        p.dot.setAttribute("opacity", String(0.9 * Math.max(0, fade)));
      });
      raf = requestAnimationFrame(frame);
    }
    function startLoop() { if (!raf) { t0 = null; raf = requestAnimationFrame(frame); } }
    function stopLoop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      pulses.forEach(function (p) { p.dot.setAttribute("opacity", "0"); });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? startLoop() : stopLoop(); });
      }, { rootMargin: "60px" }).observe(svg);
    } else {
      startLoop();
    }
  }

  function scan() {
    document.querySelectorAll(".diagram-well svg").forEach(wire);
  }

  window.DiagramLive = { scan: scan };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
