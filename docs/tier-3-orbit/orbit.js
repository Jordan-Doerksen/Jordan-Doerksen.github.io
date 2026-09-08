/* Tier-3 orbit scene (DECISIONS.md CR-14, display-case-law.md).
 *
 * One canvas owns the page and the games are bodies in it. Point at a body and
 * it wakes; click it and the game opens full size, playable. The scene IS the
 * navigation, which is the bible's portfolio_as_experience rule - make the
 * interface prove a relevant capability.
 *
 * NOT the tier-2 stage. Nothing queues, nothing files down, nothing arrives on a
 * timer. That pattern belongs to a system with an order; a room full of games
 * has none, and applying it produced a conveyor belt where an arcade should be.
 *
 * Canvas 2D rather than WebGL, deliberately: this repo bans frameworks, and
 * hand-rolled GL makes readable text labels expensive for no gain at ten bodies.
 *
 * PROGRESSIVE ENHANCEMENT. The markup ships every game as a real link with its
 * name and description. With this file absent, blocked or throwing, that index
 * is the page and every game still works at its own URL. The scene replaces it
 * only once the canvas is running.
 *
 * Under prefers-reduced-motion the scene is drawn ONCE, static, and stays
 * clickable. No animation loop is ever started.
 */
(function () {
  "use strict";

  var reduced = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function boot() {
    var root = document.querySelector(".orbit");
    if (!root) return;

    var canvas = root.querySelector("canvas.scene");
    var list = root.querySelector(".index");
    var overlay = document.querySelector(".player");
    var frame = overlay && overlay.querySelector("iframe");
    var title = overlay && overlay.querySelector(".player-title");
    var closeBtn = overlay && overlay.querySelector(".player-close");
    if (!canvas || !list) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;                    // no 2d context: the index stands

    var cfg = {
      stars: parseInt(root.dataset.stars, 10) || 220,
      speed: parseFloat(root.dataset.speed) || 0.055,
      r: parseInt(root.dataset.bodyr, 10) || 13,
      hover: parseInt(root.dataset.hoverr, 10) || 46,
      drift: parseInt(root.dataset.drift, 10) || 7
    };

    var games = Array.prototype.map.call(list.querySelectorAll("a[data-game]"),
      function (a, i) {
        return {
          name: a.dataset.game,
          url: a.getAttribute("href"),
          spec: a.dataset.spec || "",
          ring: i % 3,
          angle: (i / 10) * Math.PI * 2 + (i % 3) * 0.6,
          x: 0, y: 0, glow: 0, el: a
        };
      });
    if (!games.length) return;

    root.dataset.js = "on";

    var stars = [];
    var W = 0, H = 0, dpr = 1;
    var pointer = { x: -1e4, y: -1e4, has: false };
    var focused = null;
    var t0 = null;
    var raf = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      W = Math.max(320, rect.width);
      H = Math.max(280, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
      // ALWAYS paint one frame synchronously, not just under reduced motion.
      // requestAnimationFrame does not fire in a hidden or background tab, so a
      // scene that only ever draws from the loop is a blank rectangle until the
      // tab is looked at. One immediate frame means the field is there on
      // arrival and the animation is the enhancement on top of it.
      draw(0);
    }

    function seedStars() {
      stars = [];
      for (var i = 0; i < cfg.stars; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          depth: 1 + Math.floor(Math.random() * 3),
          a: 0.25 + Math.random() * 0.6
        });
      }
    }

    function layout(time) {
      var cx = W / 2, cy = H / 2;
      var base = Math.min(W, H) * 0.34;
      games.forEach(function (g, i) {
        var ringR = base * (0.55 + g.ring * 0.30);
        var speed = cfg.speed / (1 + g.ring * 0.7);
        var a = g.angle + time * speed;
        g.x = cx + Math.cos(a) * ringR * 1.28;
        g.y = cy + Math.sin(a) * ringR * 0.72
            + Math.sin(time * 0.7 + i) * cfg.drift;
      });
    }

    function nearest() {
      if (!pointer.has) return null;
      var best = null, bd = cfg.hover;
      games.forEach(function (g) {
        var d = Math.hypot(g.x - pointer.x, g.y - pointer.y);
        if (d < bd) { bd = d; best = g; }
      });
      return best;
    }

    function draw(time) {
      ctx.clearRect(0, 0, W, H);

      // field
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var px = pointer.has ? (pointer.x - W / 2) * 0.004 * s.depth : 0;
        var py = pointer.has ? (pointer.y - H / 2) * 0.004 * s.depth : 0;
        ctx.globalAlpha = s.a * (0.35 + s.depth * 0.2);
        ctx.fillStyle = "#9fb4cc";
        ctx.fillRect(s.x + px, s.y + py, s.depth > 2 ? 2 : 1, s.depth > 2 ? 2 : 1);
      }
      ctx.globalAlpha = 1;

      layout(time);
      focused = nearest();

      games.forEach(function (g) {
        var want = (g === focused) ? 1 : 0;
        g.glow += (want - g.glow) * (reduced ? 1 : 0.18);

        var r = cfg.r * (1 + g.glow * 0.5);

        if (g.glow > 0.02) {
          ctx.beginPath();
          ctx.arc(g.x, g.y, r + 10 + g.glow * 10, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,120,90," + (0.20 + g.glow * 0.5) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        var grd = ctx.createRadialGradient(g.x, g.y, 1, g.x, g.y, r * 2.6);
        grd.addColorStop(0, g.glow > 0.4 ? "#FFB49E" : "#7FD3F5");
        grd.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(g.x, g.y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
        ctx.fillStyle = g.glow > 0.4 ? "#FF6B4A" : "#39BDF8";
        ctx.fill();

        // Every name is drawn at all times. Hunting for a 13px dot to find out
        // what anything is would fail the bible's rule against making people
        // win a game to reach basic information.
        ctx.font = (g.glow > 0.4 ? "600 " : "500 ") + "13px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var label = g.name;
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#080A0E";
        ctx.strokeText(label, g.x, g.y + r + 9);
        ctx.fillStyle = g.glow > 0.4 ? "#FFFFFF" : "#AEB6C4";
        ctx.fillText(label, g.x, g.y + r + 9);
      });

      canvas.style.cursor = focused ? "pointer" : "default";
    }

    function loop(ts) {
      if (t0 === null) t0 = ts;
      draw((ts - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }

    function open(g) {
      if (!overlay || !frame) { window.location.href = g.url; return; }
      frame.src = g.url;
      if (title) title.textContent = g.name;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
      if (raf) { cancelAnimationFrame(raf); raf = null; }   // scene stops while playing
    }

    function close() {
      if (!overlay || !frame) return;
      overlay.hidden = true;
      frame.src = "about:blank";          // stop the game's loop
      document.body.style.overflow = "";
      if (!reduced && !raf) { t0 = null; raf = requestAnimationFrame(loop); }
    }

    canvas.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.has = true;
      if (reduced) draw(0);
    });
    canvas.addEventListener("pointerleave", function () {
      pointer.has = false;
      if (reduced) draw(0);
    });
    canvas.addEventListener("click", function () {
      if (focused) open(focused);
    });

    // The DOM index stays in the document and stays keyboard-reachable. It is
    // the accessible route to every game, and the fallback, and the site map.
    list.querySelectorAll("a[data-game]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var g = games.filter(function (x) { return x.el === a; })[0];
        if (g && overlay) { e.preventDefault(); open(g); }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.hidden) close();
    });

    window.addEventListener("resize", resize);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
