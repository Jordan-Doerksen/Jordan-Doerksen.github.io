/*
  Daybreak Editorial — effects.js
  ============================================================================
  Drop-in interaction/animation layer for the "Daybreak Editorial" house style.
  Extracted from the locked reference (A-refined-2.html). No build step, no
  dependencies, works from file://. Wrapped in an IIFE — no globals leak.

  Include once at the end of <body>:  <script src="effects.js"></script>

  DOM HOOKS it looks for (every one is optional — missing hooks are safely
  ignored, so this file is safe to drop into any page that uses only some of
  the components):

    #cursor            .cursor  — ink-dot custom cursor (adds .on / .hot)
    #hero-h                     — kinetic headline; words get wrapped in
                                  .hl-word > span and the h1 gets .lift
    #sun               .sun     — drifting sun, cursor-parallax translate
    .reveal                     — reveal-on-scroll (adds .in)
    [data-count]                — count-up stats (e.g. .stat .num)
    #magnet            .btn-primary — magnetic primary button follow
    .card (under .work perspective) — 3D tilt-toward-cursor + lift
    a, button, .card, .btn, .cat — "hot" targets that scale the cursor

  ACCESSIBILITY: fully respects prefers-reduced-motion: reduce. When set, the
  custom cursor is skipped, the kinetic rise is skipped (headline just shows),
  sun parallax is skipped, card tilt/lift-follow is skipped, reveal elements
  appear immediately, and count-up shows the final number instantly.

  NOTE: contains NO accent-swatcher, tuner, or localStorage logic — the accent
  is locked to Goldenrod in tokens.css and the picker UI is gone.
  ============================================================================
*/
(function () {
  "use strict";

  function start() {
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse  = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

    /* ---------- KINETIC HEADLINE — wrap words for staggered rise ---------- */
    (function kinetic() {
      var h1 = document.getElementById("hero-h");
      if (!h1) return;

      /* Parse the h1's EXISTING content (don't hardcode words — this file drops
         into any page). Text nodes become .hl-word > span per word; element
         nodes (e.g. the <em> whisper) become .hl-word > <tag> > span. */
      var frag = document.createDocumentFragment();
      function wrapWord(w) {
        var outer = document.createElement("span");
        outer.className = "hl-word";
        var inner = document.createElement("span");
        inner.textContent = w;
        outer.appendChild(inner);
        return outer;
      }
      Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {                       // text → one .hl-word per word
          node.textContent.split(/\s+/).forEach(function (w) {
            if (!w) return;
            frag.appendChild(wrapWord(w));
            frag.appendChild(document.createTextNode(" "));
          });
        } else if (node.nodeType === 1) {                // element (em etc.) → keep its tag as the styling hook
          var outer = document.createElement("span");
          outer.className = "hl-word";
          var el = document.createElement(node.tagName.toLowerCase());
          if (node.className) el.className = node.className;
          var inner = document.createElement("span");
          inner.textContent = node.textContent;
          el.appendChild(inner);
          outer.appendChild(el);
          frag.appendChild(outer);
          frag.appendChild(document.createTextNode(" "));
        }
      });

      h1.innerHTML = "";
      h1.appendChild(frag);

      if (!reduced) {
        var actual = h1.querySelectorAll(".hl-word");
        actual.forEach(function (word, i) {
          var sp = word.querySelector("span");
          if (sp) sp.style.transitionDelay = (0.06 * i + 0.15) + "s";
        });
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { h1.classList.add("lift"); });
        });
        /* Safety net: rAF doesn't fire in hidden/backgrounded tabs, which would
           leave the headline invisible until focus. Words must never stay hidden. */
        setTimeout(function () { h1.classList.add("lift"); }, 1500);
      } else {
        h1.classList.add("lift");
      }
    })();

    /* ---------- reveal on scroll ---------- */
    var reveals = document.querySelectorAll(".reveal");
    if (reveals.length) {
      if (reduced || !("IntersectionObserver" in window)) {
        reveals.forEach(function (el) { el.classList.add("in"); });
      } else {
        var ro = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
          });
        }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
        reveals.forEach(function (el) { ro.observe(el); });
      }
    }

    /* ---------- count-up stats (once) ---------- */
    var nums = document.querySelectorAll("[data-count]");
    function runCount(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (reduced) { el.textContent = target; return; }
      var dur = 1100, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      }
      requestAnimationFrame(step);
    }
    if (nums.length) {
      if (reduced || !("IntersectionObserver" in window)) {
        nums.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
      } else {
        var co = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
          });
        }, { threshold: 0.6 });
        nums.forEach(function (el) { co.observe(el); });
      }
    }

    /* ---------- 3D card tilt toward the cursor (disabled under reduced motion) ---------- */
    if (!reduced && !coarse) {
      var MAX_TILT = 6;   /* degrees */
      var LIFT = 8;       /* px translateY up on hover */
      document.querySelectorAll(".card").forEach(function (card) {
        var rect = null;
        card.addEventListener("mouseenter", function () { rect = card.getBoundingClientRect(); });
        card.addEventListener("mousemove", function (e) {
          if (!rect) rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width;   /* 0..1 */
          var py = (e.clientY - rect.top) / rect.height;   /* 0..1 */
          var ry = (px - 0.5) * (MAX_TILT * 2);            /* rotateY: left/right */
          var rx = (0.5 - py) * (MAX_TILT * 2);            /* rotateX: up/down */
          card.style.transform =
            "translateY(-" + LIFT + "px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
        });
        card.addEventListener("mouseleave", function () {
          rect = null;
          card.style.transform = "";
        });
      });
    }

    /* ---------- custom ink cursor + magnetic button + sun parallax ---------- */
    if (!reduced && !coarse) {
      var cursor = document.getElementById("cursor");
      var sun = document.getElementById("sun");

      /* Only run the animation loop if there's something to animate. */
      if (cursor || sun) {
        var cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
        var sunX = 0, sunY = 0, sunTX = 0, sunTY = 0;

        var loop = function () {
          cx += (tx - cx) * 0.28; cy += (ty - cy) * 0.28;
          if (cursor) cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
          sunX += (sunTX - sunX) * 0.06;
          sunY += (sunTY - sunY) * 0.06;
          if (sun) sun.style.transform = "translate(" + sunX + "px," + sunY + "px)";
          requestAnimationFrame(loop);
        };

        document.addEventListener("mousemove", function (e) {
          tx = e.clientX; ty = e.clientY;
          if (cursor) cursor.classList.add("on");
          var nx = (e.clientX / window.innerWidth) - 0.5;
          var ny = (e.clientY / window.innerHeight) - 0.5;
          sunTX = nx * -46;
          sunTY = ny * -34;
        });
        document.addEventListener("mouseleave", function () {
          if (cursor) cursor.classList.remove("on");
        });
        requestAnimationFrame(loop);
      }

      /* cursor grows over interactive elements */
      if (cursor) {
        var hotSel = "a, button, .card, .btn, .cat";
        document.querySelectorAll(hotSel).forEach(function (el) {
          el.addEventListener("mouseenter", function () { cursor.classList.add("hot"); });
          el.addEventListener("mouseleave", function () { cursor.classList.remove("hot"); });
        });
      }

      /* magnetic primary button — gently follows cursor within a few px */
      var mag = document.getElementById("magnet");
      if (mag) {
        var strength = 0.28, maxPull = 10;
        mag.addEventListener("mousemove", function (e) {
          var r = mag.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) * strength;
          var dy = (e.clientY - (r.top + r.height / 2)) * strength;
          dx = Math.max(-maxPull, Math.min(maxPull, dx));
          dy = Math.max(-maxPull, Math.min(maxPull, dy));
          mag.style.transform = "translate(" + dx + "px," + dy + "px)";
        });
        mag.addEventListener("mouseleave", function () { mag.style.transform = "translate(0,0)"; });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
