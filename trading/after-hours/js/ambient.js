/* 10 ambient: the quant sky.
 *
 * The quant renderer from the site's sky sheet (js/sky/quant.js, makeQuant) lifted inline as a
 * script-tag global, with the dispatcher's canvas lifecycle (js/sky.js: the 1.75 dpr cap, the
 * smoothed pointer, a first frame on a dt of 0) folded into the piece: a blueprint grid, a
 * scanning sweep, a streaming candle tape, glyph columns and a physics node net that leans toward
 * the pointer, on one fixed full-viewport canvas behind the cards. Decorative: the glyphs and
 * formulas are the renderer's own alphabet, not desk words, and its tape is not the shared feed;
 * it prints no number that means anything, so it carries no desk attribute.
 *
 * Changes from the lift, and why: every alpha passes through dim(), which keeps each under the
 * contract's 0.12 (the source drew up to 0.75 for a light-ground site); the three colours are the
 * page's own tokens as "r, g, b" strings (navy → --live, green → --up, oxblood → --down), read at
 * start with the contract's hex as the fallback; the formula face is the page's sans (the source
 * used a serif this page does not load). The renderer's Math.random stays: it never touches the
 * shared seeded rng, so the tape every content piece reads is unchanged by this lane.
 *
 * The two text layers (glyph columns, formulas) blit from a sprite sheet instead of calling
 * fillText. A canvas 2D font setter resolves the font against the element's computed style, and
 * with the two faces alternating every frame Chrome flushed document style inside the frame
 * callback on nearly every frame while any CSS animation ran elsewhere on the page. The sheet is
 * a never-appended canvas drawn once per size() (and once more when the web fonts finish
 * loading, off document.fonts.ready: a promise, not a timer) holding every glyph and formula in
 * both colours at full opacity; draw() copies cells under globalAlpha = dim(a), which composites
 * exactly as the rgba fill it replaces. Text drawn on a detached canvas resolves the page's web
 * fonts and never touches document style. No canvas text API runs per frame.
 *
 * It registers with core as an `always` piece. Core starts it while the tab is visible and calls
 * frame(t, dt) each frame; this file never creates a timer or a frame request of its own. Under
 * reduced motion core never calls start(), static() draws nothing and the canvas stays
 * display:none behind core's .ah-live-only gate. A throw at load leaves the canvas as the markup
 * put it: hidden, with nothing on it. */
(function () {
  "use strict";

  var AH = window.AH;
  var root = document.getElementById("ah-ambient");
  if (!root || !AH) return;
  try { AH.register(build(root)); } catch (e) { /* nothing drawn is the still */ }

  // ---- palette: the page's tokens as "r, g, b" strings, the contract's hex as fallback --------
  function rgb(hex) { var n = parseInt(hex.replace("#", ""), 16); return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255); }
  function readPal() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { return cs.getPropertyValue(name).trim() || fb; }
    return { warm: rgb(v("--live", "#39BDF8")), meteor: rgb(v("--up", "#46C98A")), ox: rgb(v("--down", "#F47265")) };
  }
  // Every alpha the renderer draws with, kept under the contract's 0.12. A square-root curve keeps
  // the source's ordering (grid faintest, glyph heads brightest) and lands its 0.75 at 0.10.
  var CAP = 0.115;
  function dim(a) { return CAP * Math.sqrt(Math.max(0, Math.min(1, a))); }

  // ---- lifted from the sky sheet: the quant renderer, in var/function form -------------------
  function makeQuant(ctx) {
    var w = 0, h = 0, cols = [], candles = [], candleOff = 0, formulas = [], nodes = [];
    var GLYPH = "0123456789$%+-<>ΔΓΘΣσμβλρ";
    var FX = ["Δ", "Γ", "Θ", "ν", "ρ", "σ√t", "∫dS", "Σwᵢ", "e^{-rt}", "N(d₁)", "∂V/∂S", "μΔt", "β", "VaR₉₅", "α", "√Δt", "dW", "λ"];
    var MONO = '11px "JetBrains Mono", ui-monospace, monospace';
    var SANS = 'italic 15px "Space Grotesk", system-ui, sans-serif';

    // The sprite sheet. Rows 0 and 1: the glyphs, navy then green, GW × GH cells with the
    // baseline at GB and GP of side room for a left bearing. Rows 2 and 3: the formulas, navy
    // then green, fw × FH cells (fw from the widest formula plus FP either side) with the
    // baseline at FB. Rebuilt by sheetBuild() with
    // the main canvas's dpr, so a cell copies pixel for pixel. `ready` gates every copy: before
    // the first build there is nothing to copy from, and a copy from an empty canvas throws.
    var sheet = document.createElement("canvas"), sctx = sheet.getContext("2d");
    if (!sctx) throw new Error("no 2d context for the sheet");
    var GW = 12, GH = 16, GB = 12, GP = 2, FH = 22, FB = 16, FP = 4, fw = 0, sdpr = 1, ready = false;

    function sheetBuild(dpr, skin) {
      var i;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.font = SANS;
      fw = 0;
      for (i = 0; i < FX.length; i++) fw = Math.max(fw, sctx.measureText(FX[i]).width);
      fw = Math.ceil(fw) + 2 * FP;
      var sw = Math.max(GLYPH.length * GW, FX.length * fw), sh = 2 * GH + 2 * FH;
      sdpr = dpr;
      sheet.width = Math.max(1, Math.round(sw * dpr)); sheet.height = Math.max(1, Math.round(sh * dpr));   // resets the context state
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.textBaseline = "alphabetic";
      sctx.font = MONO;
      for (i = 0; i < GLYPH.length; i++) {
        sctx.fillStyle = "rgb(" + skin.warm + ")"; sctx.fillText(GLYPH[i], i * GW + GP, GB);
        sctx.fillStyle = "rgb(" + skin.meteor + ")"; sctx.fillText(GLYPH[i], i * GW + GP, GH + GB);
      }
      sctx.font = SANS;
      for (i = 0; i < FX.length; i++) {
        sctx.fillStyle = "rgb(" + skin.warm + ")"; sctx.fillText(FX[i], i * fw + FP, 2 * GH + FB);
        sctx.fillStyle = "rgb(" + skin.meteor + ")"; sctx.fillText(FX[i], i * fw + FP, 2 * GH + FH + FB);
      }
      ready = true;
    }

    function spawnFormula(seed) { return { x: Math.random() * w, y: seed ? Math.random() * h : h + 20, vx: (Math.random() - 0.5) * 8, vy: -(6 + Math.random() * 10), age: seed ? Math.random() * 6 : 0, ttl: 6 + Math.random() * 5, fi: Math.floor(Math.random() * FX.length), green: Math.random() < 0.25 }; }
    function pushCandle() { var prev = candles.length ? candles[candles.length - 1].c : h * 0.5; var c = prev + (Math.random() - 0.5) * 16; c = Math.max(h * 0.4, Math.min(h * 0.6, c)); candles.push({ o: prev, c: c, hi: Math.min(c, prev) - Math.random() * 8, lo: Math.max(c, prev) + Math.random() * 8 }); }
    function resize(_w, _h, dpr, skin) {
      var i;
      w = _w; h = _h;
      var nc = Math.max(8, Math.floor(w / 34));
      cols = []; for (i = 0; i < nc; i++) cols.push({ x: (i + 0.5) * (w / nc), y: Math.random() * h, sp: 50 + Math.random() * 130, len: 5 + Math.floor(Math.random() * 9), tone: Math.random() });
      candles = []; candleOff = 0; for (i = 0; i < Math.ceil(w / 12) + 2; i++) pushCandle();
      formulas = []; for (i = 0; i < 9; i++) formulas.push(spawnFormula(true));
      nodes = []; for (i = 0; i < 16; i++) nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50 });
      sheetBuild(dpr, skin);
    }

    function draw(dt, env) {
      var t = env.t, smx = env.smx, smy = env.smy, navy = env.skin.warm, green = env.skin.meteor, ox = env.skin.ox;
      var i, j, k, x, y;

      ctx.strokeStyle = "rgba(" + navy + ", " + dim(0.06) + ")"; ctx.lineWidth = 1; ctx.beginPath();   // blueprint grid
      var step = 46; for (x = step / 2; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (y = step / 2; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
      var scanY = (t * 60) % (h + 80) - 40;                                                          // scanning sweep
      var sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40); sg.addColorStop(0, "transparent"); sg.addColorStop(0.5, "rgba(" + green + ", " + dim(0.06) + ")"); sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 40, w, 80);

      // streaming candlestick tape
      if (dt) { candleOff += 26 * dt; while (candleOff >= 12) { candleOff -= 12; candles.shift(); pushCandle(); } }
      for (i = 0; i < candles.length; i++) {
        var cd = candles[i]; x = i * 12 - candleOff; if (x < -12 || x > w) continue;
        var up = cd.c < cd.o, col = up ? green : ox;
        ctx.strokeStyle = "rgba(" + col + ", " + dim(0.45) + ")"; ctx.fillStyle = "rgba(" + col + ", " + dim(0.22) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 6, cd.hi); ctx.lineTo(x + 6, cd.lo); ctx.stroke();
        var top = Math.min(cd.o, cd.c), bh = Math.max(2, Math.abs(cd.c - cd.o)); ctx.fillRect(x + 2, top, 8, bh); ctx.strokeRect(x + 2, top, 8, bh);
      }

      // glyph columns (generated figures): cells copied from the sheet, green heads on row 1
      for (i = 0; i < cols.length; i++) {
        var c = cols[i];
        if (dt) { c.y += c.sp * dt; if (c.y - c.len * 15 > h) c.y = -Math.random() * h * 0.4; }
        if (!ready) continue;
        for (k = 0; k < c.len; k++) {
          var yy = c.y - k * 15; if (yy < 0 || yy > h) continue;
          var a = k === 0 ? 0.75 : Math.max(0, 0.42 - k * 0.05); if (a <= 0) continue;
          var row = k === 0 && c.tone < 0.5 ? 1 : 0;
          var gi = k === 0 ? Math.floor(Math.random() * GLYPH.length) : (k * 7 + Math.floor(c.y / 15)) % GLYPH.length;
          ctx.globalAlpha = dim(a);
          ctx.drawImage(sheet, gi * GW * sdpr, row * GH * sdpr, GW * sdpr, GH * sdpr, c.x - GP, yy - GB, GW, GH);
        }
      }
      ctx.globalAlpha = 1;

      // physics node net (bounces, leans toward the pointer)
      var cxp = (smx || 0.5) * w, cyp = (smy || 0.5) * h;
      if (dt) {
        for (i = 0; i < nodes.length; i++) for (j = i + 1; j < nodes.length; j++) {   // mutual repulsion so they spread, not clump
          var A = nodes[i], B = nodes[j], dx = A.x - B.x, dy = A.y - B.y, d = Math.hypot(dx, dy) || 1;
          if (d < 120) { var f = (120 - d) / 120 * 1100 * dt, ux = dx / d, uy = dy / d; A.vx += ux * f; A.vy += uy * f; B.vx -= ux * f; B.vy -= uy * f; }
        }
        for (i = 0; i < nodes.length; i++) {
          var n = nodes[i];
          n.vx += (cxp - n.x) * 0.05 * dt; n.vy += (cyp - n.y) * 0.05 * dt;                 // gentle pull toward the pointer
          var sp = Math.hypot(n.vx, n.vy); if (sp > 220) { n.vx *= 220 / sp; n.vy *= 220 / sp; }   // cap speed (keeps it calm)
          n.x += n.vx * dt; n.y += n.vy * dt;
          if (n.x < 0 || n.x > w) { n.vx *= -1; n.x = Math.max(0, Math.min(w, n.x)); }
          if (n.y < 0 || n.y > h) { n.vy *= -1; n.y = Math.max(0, Math.min(h, n.y)); }
          n.vx *= 0.99; n.vy *= 0.99;
        }
      }
      for (i = 0; i < nodes.length; i++) for (j = i + 1; j < nodes.length; j++) {
        var P = nodes[i], Q = nodes[j], px = P.x - Q.x, py = P.y - Q.y, d2 = px * px + py * py;
        if (d2 < 150 * 150) { ctx.strokeStyle = "rgba(" + navy + ", " + dim(0.18 * (1 - Math.sqrt(d2) / 150)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke(); }
      }
      for (i = 0; i < nodes.length; i++) { ctx.fillStyle = "rgba(" + ox + ", " + dim(0.6) + ")"; ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, 2, 0, 6.2832); ctx.fill(); }

      // drifting greeks / formulas: cells copied from the sheet, green ones on row 3
      for (i = 0; i < formulas.length; i++) {
        var fm = formulas[i];
        if (dt) { fm.age += dt; fm.x += fm.vx * dt; fm.y += fm.vy * dt; if (fm.age > fm.ttl || fm.y < -20) Object.assign(fm, spawnFormula(false)); }
        var kk = Math.max(0, Math.min(1, Math.min(fm.age / 1.2, (fm.ttl - fm.age) / 1.6)));
        if (!ready || kk <= 0) continue;
        ctx.globalAlpha = dim(0.4 * kk);
        ctx.drawImage(sheet, fm.fi * fw * sdpr, (2 * GH + (fm.green ? FH : 0)) * sdpr, fw * sdpr, FH * sdpr, fm.x - FP, fm.y - FB, fw, FH);
      }
      ctx.globalAlpha = 1;
    }

    return { resize: resize, refont: sheetBuild, frame: function (dt, env) { draw(dt, env); } };
  }

  // ---- the piece ----------------------------------------------------------------------------
  function build(canvas) {
    if (typeof canvas.getContext !== "function") throw new Error("ambient root is not a canvas");
    var ctx = null, sky = null, pal = null, armed = false, dpr = 1, fontsHooked = false;
    var w = 0, h = 0, mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);                            // the dispatcher's cap
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky.resize(w, h, dpr, pal);
    }
    function refont() { if (armed && sky) sky.refont(dpr, pal); }                    // the web fonts arrived after the sheet was drawn
    function onMove(e) { if (w && h) { mx = e.clientX / w; my = e.clientY / h; } }

    return {
      id: "ambient", el: canvas, always: true,
      start: function () {
        if (armed || AH.REDUCED) return;                                            // core never asks under reduced motion; kept as a guard
        ctx = ctx || canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        pal = readPal(); sky = makeQuant(ctx);
        mx = my = smx = smy = 0.5;
        size();
        window.addEventListener("mousemove", onMove, { passive: true });
        armed = true;
        if (!fontsHooked && document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
          fontsHooked = true;                                                       // once: a later start() redraws the sheet in size() anyway
          document.fonts.ready.then(refont, function () { /* the fallback face stays */ });
        }
      },
      stop: function () {
        if (!armed) return;
        armed = false;
        window.removeEventListener("mousemove", onMove);
        canvas.width = 1; canvas.height = 1;                                        // clears the bitmap and frees it
        sky = null;
      },
      frame: function (t, dt) {
        if (!armed) return;
        if (window.innerWidth !== w || window.innerHeight !== h) size();           // no resize listener: checked per frame
        smx += (mx - smx) * 0.04; smy += (my - smy) * 0.04;                         // the dispatcher's pointer smoothing
        ctx.clearRect(0, 0, w, h);
        sky.frame(dt, { t: t, smx: smx, smy: smy, skin: pal });
      },
      static: function () { /* nothing drawn: the waived lane has no still */ }
    };
  }
})();
