/*
  Daybreak Editorial — shader.js
  ============================================================================
  Lightweight canvas noise/gradient layer for the drifting sun (#sun).
  Hand-ported idea from Paper Shaders (shaders.paper.design) — plain 2D canvas,
  no WebGL, no dependencies, stays file://-safe. Adds soft drifting accent
  blobs inside the existing .sun circle for more depth than the flat CSS
  radial-gradient alone.

  Optional: if #sun is missing, this does nothing (same convention as
  effects.js — missing hooks are safely ignored).

  ACCESSIBILITY: under prefers-reduced-motion, draws a single static frame
  and never starts a requestAnimationFrame loop.
  ============================================================================
*/
(function () {
  "use strict";

  function start() {
    var sun = document.getElementById("sun");
    if (!sun) return;

    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var canvas = document.createElement("canvas");
    canvas.className = "sun-canvas";
    canvas.setAttribute("aria-hidden", "true");
    sun.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var accentRGB = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "184,134,11";
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      var r = sun.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    size();
    requestAnimationFrame(size); /* first rect can read 0 before layout settles; resize once more post-paint */
    window.addEventListener("resize", size);

    /* three soft blobs on independent slow drift paths */
    var blobs = [
      { r: .60, ph: 0.0, sx: .15, sy: .11 },
      { r: .42, ph: 2.1, sx: .21, sy: .17 },
      { r: .50, ph: 4.2, sx: .13, sy: .23 }
    ];

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      blobs.forEach(function (b) {
        var cx = W / 2 + Math.sin(t * b.sx + b.ph) * W * 0.18;
        var cy = H / 2 + Math.cos(t * b.sy + b.ph) * H * 0.18;
        var rad = Math.min(W, H) * b.r;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, "rgba(" + accentRGB + ",.22)");
        g.addColorStop(.6, "rgba(" + accentRGB + ",.08)");
        g.addColorStop(1, "rgba(" + accentRGB + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
      });
    }

    /* second size() waits for the deferred rAF above so W/H are the settled values */
    requestAnimationFrame(function () {
      if (reduced) { draw(0); return; }
      var startT = null;
      function loop(ts) {
        if (!startT) startT = ts;
        draw((ts - startT) / 1000);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
