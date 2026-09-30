/* 09 scanner: the reticle cursor.
 *
 * The scanner effect from the site's cursor sheet (js/cursor-fx.js, makeScanner) lifted inline
 * as a script-tag global: a crosshair at the pointer, a lagging reticle ring, a short tracer
 * trail and two radar pings on a click, on one fixed full-viewport canvas above the cards.
 * Decorative: it prints no word and no number, so it carries no desk attribute.
 *
 * The tracer is capped (owner review, 2026-09-29): the lifted version joined every sampled
 * point, so a pointer that jumped (a fast flick, leaving and re-entering the window) drew one
 * long straight line across the cards. Now it is a tail of at most TRAIL_LEN px behind the
 * pointer, at any pointer speed: it is drawn back from the newest point and cut where the
 * length runs out, so a quick flick of 30 to 59 px a frame draws the same short tail as a slow
 * move. It keeps the last TRAIL_MAX points, a pair more than TRAIL_GAP px apart ends the tail
 * (nothing older is joined to it), and it is emptied when the pointer leaves the page, the
 * window loses focus or the tab's visibility changes. The next move after any of those starts
 * a new trail and puts the ring on the pointer instead of sliding it across the page.
 *
 * The canvas is sized from the box it fills (clientWidth/clientHeight, which leave out a
 * classic scrollbar), not from innerWidth, so the crosshair sits on the pointer's hotspot out
 * to the right edge while the native cursor is hidden.
 *
 * It registers with core as an `always` piece. Core starts it only on a fine pointer and only
 * while the tab is visible, and calls frame(t, dt) each frame; this file never creates a timer
 * or a frame request of its own. Under reduced motion core never calls start(), static() draws
 * nothing and the canvas stays display:none behind core's .ah-live-only gate. A throw at load
 * leaves the canvas as the markup put it: hidden, with nothing on it. */
(function () {
  "use strict";

  var AH = window.AH;
  var root = document.getElementById("ah-scanner");
  if (!root || !AH) return;
  try { AH.register(build(root)); } catch (e) { /* nothing drawn is the still */ }

  // ---- lifted from the cursor sheet: the palette helper and the scanner effect ---------------
  function rgb(hex) { var n = parseInt(hex.replace("#", ""), 16); return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255); }
  function readPal() {
    var cs = getComputedStyle(document.documentElement);
    return { gold: rgb(cs.getPropertyValue("--gold").trim() || "#E0AC4E") };
  }

  // The tracer's limits. CSS px, since the context is scaled by dpr in size().
  var TRAIL_TTL = 0.25;   // s a tracer point lives (the lifted value)
  var TRAIL_MAX = 8;      // points kept, newest last
  var TRAIL_GAP = 60;     // px; two points further apart than this are never joined
  var TRAIL_LEN = 90;     // px; the tracer's total drawn length, at any pointer speed
  var TRAIL_STILL = 0.5;  // px; a pointer that moved less than this adds no point

  // SENTINEL · scanner reticle + radar ping: the effect's own lines, in var/function form,
  // with the tracer capped as the header says.
  function makeScanner(ctx) {
    var rx = 0, ry = 0, fresh = true, trail = [], pings = [];
    return {
      frame: function (dt, env) {
        var mx = env.mx, my = env.my, pal = env.pal, i, a, b;
        if (fresh) { rx = mx; ry = my; fresh = false; }                             // a new trail: the ring starts on the pointer
        var k = Math.min(1, dt * 9); rx += (mx - rx) * k; ry += (my - ry) * k;
        for (i = 0; i < trail.length; i++) trail[i].age += dt;
        trail = trail.filter(function (p) { return p.age < TRAIL_TTL; });
        a = trail[trail.length - 1];
        if (!a || Math.hypot(mx - a.x, my - a.y) >= TRAIL_STILL) trail.push({ x: mx, y: my, age: 0 });
        if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
        // tracer: walked back from the newest point, one stroke per pair so each pair carries its
        // own fade (the lifted single stroke took only the last alpha set). The segment lengths
        // add up to TRAIL_LEN at most: the last segment is cut part-way where the length runs
        // out, and a pair further apart than TRAIL_GAP is a jump that ends the tail.
        ctx.strokeStyle = "rgba(" + pal.gold + ", 0.5)"; ctx.lineWidth = 1.4;
        var left = TRAIL_LEN, d, f;
        for (i = trail.length - 1; i > 0 && left > 0; i--) {
          b = trail[i]; a = trail[i - 1];
          d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d > TRAIL_GAP) break;                                                   // a jump ends the tail; nothing older is joined to it
          f = d > left ? left / d : 1;                                                // cut the last segment where the length runs out
          ctx.globalAlpha = 1 - a.age / TRAIL_TTL;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (a.x - b.x) * f, b.y + (a.y - b.y) * f); ctx.stroke();
          left -= d;
        }
        ctx.globalAlpha = 1;
        pings.forEach(function (p) { p.age += dt; var f = 1 - p.age / p.ttl; ctx.strokeStyle = "rgba(" + pal.gold + ", " + (0.6 * f) + ")"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + (p.maxr - 6) * (p.age / p.ttl), 0, 6.2832); ctx.stroke(); });
        pings = pings.filter(function (p) { return p.age < p.ttl; });
        ctx.strokeStyle = "rgba(" + pal.gold + ", 0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 13, 0, 6.2832); ctx.stroke();   // lagging reticle ring
        ctx.strokeStyle = "rgba(" + pal.gold + ", 0.95)"; ctx.lineWidth = 1.4;                  // crosshair at cursor
        ctx.beginPath(); ctx.moveTo(mx - 8, my); ctx.lineTo(mx - 3, my); ctx.moveTo(mx + 3, my); ctx.lineTo(mx + 8, my); ctx.moveTo(mx, my - 8); ctx.lineTo(mx, my - 3); ctx.moveTo(mx, my + 3); ctx.lineTo(mx, my + 8); ctx.stroke();
        ctx.fillStyle = "rgba(" + pal.gold + ", 0.9)"; ctx.fillRect(mx - 1, my - 1, 2, 2);
      },
      click: function (env) { var mx = env.mx, my = env.my; pings.push({ x: mx, y: my, maxr: 40, age: 0, ttl: 0.6 }, { x: mx, y: my, maxr: 26, age: -0.12, ttl: 0.6 }); },
      // Forget where the pointer was: no trail, no pings, and the ring snaps on the next frame.
      clear: function () { trail = []; pings = []; fresh = true; }
    };
  }

  // ---- the piece ----------------------------------------------------------------------------
  function build(canvas) {
    if (typeof canvas.getContext !== "function") throw new Error("scanner root is not a canvas");
    var html = document.documentElement;
    var ctx = null, effect = null, pal = null, armed = false;
    var w = 0, h = 0, mx = 0, my = 0, pmx = 0, pmy = 0, inside = false, down = false;

    // The box the canvas fills, in CSS px: clientWidth leaves out a classic scrollbar, which
    // innerWidth counts, so a bitmap sized from innerWidth was squeezed into the narrower box and
    // the crosshair landed up to a scrollbar's width left of the pointer. A canvas with no box
    // (display:none) reads 0, and the document's client box is the size it would fill.
    function boxW() { return canvas.clientWidth || document.documentElement.clientWidth; }
    function boxH() { return canvas.clientHeight || document.documentElement.clientHeight; }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = boxW(); h = boxH();
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(canvas.width / Math.max(1, w), 0, 0, canvas.height / Math.max(1, h), 0, 0);   // the rounded bitmap over the box, exactly
    }
    // Pointer events, mouse and pen only: a finger on a touch screen beside a fine pointer is
    // not the cursor this dresses, and would teleport the reticle to every tap.
    function isTouch(e) { return !!(e && e.pointerType === "touch"); }
    // The native cursor is hidden only while the reticle stands in for it: from the first move
    // until the pointer leaves or the piece stops (the cursor sheet's html.has-cursor, per piece).
    function onMove(e) {
      if (isTouch(e)) return;
      mx = e.clientX; my = e.clientY;
      if (!inside) { inside = true; pmx = mx; pmy = my; html.classList.add("ah-scanner-on"); }
    }
    // Leaving the page, the window losing focus and the tab's visibility changing all end the
    // trail: the pointer's next position is unknown, so nothing may join it to the last one.
    function onLeave(e) {
      if (isTouch(e)) return;
      inside = false; down = false;
      html.classList.remove("ah-scanner-on");
      if (effect) effect.clear();
    }
    function onOut(e) { if (!e.relatedTarget) onLeave(e); }                         // pointerout to nothing: left the window
    function onBlur() { onLeave(null); }
    function onVis() { onLeave(null); }
    // A press is also a position: a click that refocuses the window, with no move before it,
    // brings the reticle back where the press is instead of pinging where nothing is drawn.
    function onDown(e) {
      if (e.button !== 0 || isTouch(e) || !effect) return;
      onMove(e);
      down = true; effect.click({ mx: e.clientX, my: e.clientY, w: w, h: h, t: AH.clock.t, pal: pal });
    }
    function onUp() { down = false; }

    return {
      id: "scanner", el: canvas, always: true,
      start: function () {
        if (armed || AH.REDUCED) return;                                            // core never asks under reduced motion; kept as a guard
        if (!(window.matchMedia && window.matchMedia("(pointer: fine)").matches)) return;   // a coarse pointer has no cursor to dress
        ctx = ctx || canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        pal = readPal(); effect = makeScanner(ctx); inside = false; down = false;
        size();
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        html.addEventListener("pointerleave", onLeave);
        window.addEventListener("pointerout", onOut);
        window.addEventListener("blur", onBlur);
        document.addEventListener("visibilitychange", onVis);
        armed = true;
      },
      stop: function () {
        if (!armed) return;
        armed = false;
        window.removeEventListener("pointermove", onMove, { passive: true });
        window.removeEventListener("pointerdown", onDown, { passive: true });
        window.removeEventListener("pointerup", onUp, { passive: true });
        html.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("pointerout", onOut);
        window.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onVis);
        onLeave(null);
        canvas.width = 1; canvas.height = 1;                                        // clears the bitmap and frees it
        effect = null;
      },
      frame: function (t, dt) {
        if (!armed) return;
        if (boxW() !== w || boxH() !== h) size();                                  // no resize listener: checked per frame
        var vx = mx - pmx, vy = my - pmy; pmx = mx; pmy = my;
        ctx.clearRect(0, 0, w, h);
        if (inside) effect.frame(dt, { mx: mx, my: my, vx: vx, vy: vy, speed: Math.hypot(vx, vy), down: down, w: w, h: h, t: t, pal: pal });
      },
      static: function () { /* nothing drawn: a cursor effect has no still */ }
    };
  }
})();
