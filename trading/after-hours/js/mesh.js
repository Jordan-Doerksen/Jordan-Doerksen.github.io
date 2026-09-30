/* 04 mesh: the system tour.
 *
 * Adapted from the tier-2 case's stage script: the mesh that lights part by part, a wire
 * appearing once both of its ends are lit, one path chained to the next. What is NOT lifted:
 * after(), scheduleFileDown() and fileDown() and their setTimeout calls. This piece owns no
 * timer and no animation frame of its own. A step table is advanced from frame(t, dt) and
 * tick(sec) on the core clock, and the four durations (enter, wire, hold, fileDown) come from
 * the root's data-ah-timings JSON that the generator wrote; nothing is typed here.
 *
 * The markup is the still: every node, wire, label and path name is in the SVG and the legend.
 * This script adds pips, inline dash offsets and "on" classes only, and it reads the paths from
 * the legend lists, so the step data lives in the markup too. A throw at load means no
 * register(): the map stays complete and unlit. Under reduced motion the core calls static()
 * once and nothing else; start() guards it too.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var root = document.getElementById("ah-mesh");
  if (!root || !window.AH) return;

  try {
    var svg = root.querySelector(".ahm-svg");
    var pipLayer = svg.querySelector(".ahm-pips");
    var nowT = root.querySelector(".ahm-now-t");
    var nowV = root.querySelector(".ahm-now-v");
    var fenceRect = svg.querySelector(".ahm-fence-rect");
    var fenceTag = svg.querySelector(".ahm-fence-tag");

    // Durations, seconds. A missing or malformed attribute throws on purpose: no register.
    var raw = JSON.parse(root.dataset.ahTimings);
    var T = {};
    ["enter", "wire", "hold", "fileDown"].forEach(function (k) {
      var v = Number(raw[k]);
      if (!isFinite(v) || v <= 0) throw new Error("timing " + k);
      T[k] = v / 1000;
    });

    // The paths, read from the legend: one section per path, one <ol> per branch. A path with
    // two branches alternates them cycle by cycle.
    var paths = Array.prototype.map.call(root.querySelectorAll(".ahm-path"), function (sec) {
      return {
        id: sec.dataset.path,
        head: sec.querySelector("h3"),
        glyph: sec.querySelector(".ahm-glyph"),
        branches: Array.prototype.map.call(sec.querySelectorAll("ol"), function (ol) {
          return Array.prototype.map.call(ol.querySelectorAll("li[data-node]"), function (li) {
            return li.dataset.node;
          });
        })
      };
    });
    if (!paths.length) throw new Error("no paths");

    function nodeEls(id) {
      return root.querySelectorAll('[data-node="' + id + '"]');
    }
    function nodeSvg(id) {
      var g = svg.querySelector('.ahm-node[data-node="' + id + '"]');
      if (!g) throw new Error("no node " + id);
      return g;
    }
    function wireBetween(a, b) {
      var w = svg.querySelector('.ahm-wire[data-a="' + a + '"][data-b="' + b + '"]');
      if (w) return { el: w, reverse: false };
      w = svg.querySelector('.ahm-wire[data-a="' + b + '"][data-b="' + a + '"]');
      if (w) return { el: w, reverse: true };
      throw new Error("no wire " + a + " " + b);
    }
    function wireName(w) {
      var t = w.querySelector("title");
      return t ? t.textContent : "";
    }
    // The node's printed name, from the map itself, never the id.
    function nodeName(id) {
      var t = nodeSvg(id).querySelector("text");
      return t ? t.textContent : id;
    }
    function anchor(id) {
      var g = nodeSvg(id);
      var c = g.querySelector("circle");
      if (c) return { x: +c.getAttribute("cx"), y: +c.getAttribute("cy") };
      var r = g.querySelector("rect");
      return { x: +r.getAttribute("x") + r.getAttribute("width") / 2,
               y: +r.getAttribute("y") + r.getAttribute("height") / 2 };
    }

    // ---- state -------------------------------------------------------------------------
    var segs = [];        // the step table for this cycle
    var si = 0;           // index of the running segment
    var elapsed = 0;      // seconds into it
    var cycle = 0;        // completed cycles; picks the watchdog branch
    var running = false;
    var pip = null;       // { g, halo } or null
    var wireLen = [];     // measured once per start(), by wire element index
    var wires = Array.prototype.slice.call(svg.querySelectorAll(".ahm-wire"));

    function build(n) {
      var out = [];
      paths.forEach(function (p) {
        var nodes = p.branches[n % p.branches.length];
        if (!nodes || !nodes.length) return;
        out.push({ k: "enter", p: p, node: nodes[0], dur: T.enter });
        out.push({ k: "hold", p: p, node: nodes[0], dur: T.hold });
        for (var i = 1; i < nodes.length; i++) {
          var w = wireBetween(nodes[i - 1], nodes[i]);
          out.push({ k: "wire", p: p, a: nodes[i - 1], b: nodes[i], w: w.el, rev: w.reverse, dur: T.wire });
          out.push({ k: "enter", p: p, node: nodes[i], dur: T.enter });
          out.push({ k: "hold", p: p, node: nodes[i], dur: T.hold });
        }
        out.push({ k: "file", p: p, dur: T.fileDown });
      });
      out.push({ k: "rest", dur: T.hold });
      return out;
    }

    // Prove the markup at load: every branch's nodes and wires exist, on every cycle. A defect
    // here throws before register(), so the map stands as it shipped.
    var maxBranches = paths.reduce(function (m, p) { return Math.max(m, p.branches.length); }, 1);
    for (var b = 0; b < maxBranches; b++) {
      build(b).forEach(function (s) { if (s.node) anchor(s.node); });
    }

    function light(id) {
      Array.prototype.forEach.call(nodeEls(id), function (el) {
        if (el.classList.contains("on")) {
          // A joint reached a second time pops again: drop the class, flush, put it back.
          el.classList.remove("on");
          void el.getBoundingClientRect();
        }
        el.classList.add("on");
      });
      if (id === "bot") {
        fenceRect.classList.add("on");
        fenceTag.classList.add("on");
      }
    }

    function unlightAll() {
      Array.prototype.forEach.call(root.querySelectorAll(".on"), function (el) {
        el.classList.remove("on");
      });
      wires.forEach(function (w) {
        w.style.removeProperty("stroke-dasharray");
        w.style.removeProperty("stroke-dashoffset");
      });
      paths.forEach(function (p) {
        if (p.head) p.head.removeAttribute("data-state");
        if (p.glyph) p.glyph.textContent = "◌";
      });
    }

    function setPathState(p, state) {
      if (p.head) p.head.setAttribute("data-state", state);
      if (p.glyph) p.glyph.textContent = state === "done" ? "✓" : "●";
    }

    function say(text) {
      if (nowV) nowV.textContent = text;
    }
    function stamp() {
      if (nowT) nowT.textContent = window.AH.clock.et();
    }

    function narrate(s) {
      if (!s) return;
      if (s.k === "wire") say(s.p.id + " · " + nodeName(s.a) + " → " + nodeName(s.b) + " · " + wireName(s.w));
      else if (s.k === "enter" || s.k === "hold") say(s.p.id + " · " + nodeName(s.node));
      else if (s.k === "file") say(s.p.id + " · path drawn");
      else say("every path drawn · clearing");
    }

    // ---- the pip -----------------------------------------------------------------------
    function makePip() {
      var g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "ahm-pip");
      var halo = document.createElementNS(SVG_NS, "circle");
      halo.setAttribute("class", "ahm-pip-halo");
      halo.setAttribute("r", "12");
      var dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "ahm-pip-dot");
      dot.setAttribute("r", "5");
      g.appendChild(halo);
      g.appendChild(dot);
      pipLayer.appendChild(g);
      return { g: g, halo: halo };
    }
    function placePip(x, y) {
      if (!pip) pip = makePip();
      pip.g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")");
    }
    function dropPip() {
      if (pip && pip.g.parentNode) pip.g.parentNode.removeChild(pip.g);
      pip = null;
    }

    function measure(w) {
      var i = wires.indexOf(w);
      if (wireLen[i] === undefined) {
        try { wireLen[i] = w.getTotalLength(); } catch (e) { wireLen[i] = 0; }
      }
      return wireLen[i];
    }

    // ---- the step table ----------------------------------------------------------------
    function begin(s) {
      if (s.k === "enter") {
        var at = anchor(s.node);
        placePip(at.x, at.y);
        pip.g.classList.toggle("bot", s.p.id === "bot");
        light(s.node);
        setPathState(s.p, "running");
      } else if (s.k === "wire") {
        var len = measure(s.w);
        s.w.style.setProperty("stroke-dasharray", len.toFixed(1));
        s.w.style.setProperty("stroke-dashoffset", (s.rev ? -len : len).toFixed(1));
      } else if (s.k === "file") {
        setPathState(s.p, "done");
        dropPip();
      } else if (s.k === "rest") {
        dropPip();
      }
      narrate(s);
    }

    function progress(s, f, t) {
      if (s.k === "wire") {
        var len = measure(s.w);
        var d = s.rev ? len * (1 - f) : len * f;
        var pt = null;
        try { pt = s.w.getPointAtLength(d); } catch (e) { pt = null; }
        if (pt) placePip(pt.x, pt.y);
        s.w.style.setProperty("stroke-dashoffset", ((s.rev ? -len : len) * (1 - f)).toFixed(1));
      } else if (s.k === "hold" && pip) {
        // A resting pip breathes on its node.
        pip.halo.setAttribute("r", (11 + 3 * Math.sin(t * 4)).toFixed(2));
      }
    }

    function finish(s) {
      if (s.k === "wire") {
        s.w.style.setProperty("stroke-dashoffset", "0");
        s.w.classList.add("on");
      } else if (s.k === "rest") {
        unlightAll();
        cycle += 1;
        segs = build(cycle);
        si = -1;   // the caller steps to 0
      }
    }

    function advance(dt, t) {
      elapsed += dt;
      var guard = 0;
      while (si < segs.length && elapsed >= segs[si].dur && guard++ < 64) {
        elapsed -= segs[si].dur;
        finish(segs[si]);
        si += 1;
        if (si < segs.length) begin(segs[si]);
      }
      if (si < segs.length) progress(segs[si], Math.min(1, elapsed / segs[si].dur), t);
    }

    // ---- the piece ---------------------------------------------------------------------
    var piece = {
      id: "mesh",
      el: root,
      always: false,

      // Became live: a fresh tour from the first path. The pop keyframe reads the enter
      // timing from the root, so the sheet holds no number for it.
      start: function () {
        if (window.AH.REDUCED) { piece.static(); return; }
        root.style.setProperty("--ahm-enter", T.enter.toFixed(3) + "s");
        unlightAll();
        dropPip();
        wireLen = [];
        elapsed = 0;
        si = 0;
        segs = build(cycle);
        running = true;
        stamp();
        begin(segs[0]);
      },

      // Left the live set: clear the effects; the names stay readable.
      stop: function () {
        running = false;
        dropPip();
        unlightAll();
        root.style.removeProperty("--ahm-enter");
        if (nowT) nowT.textContent = "—";
        say("—");
      },

      frame: function (t, dt) {
        if (!running) return;
        advance(dt, t);
      },

      // Once a demo second: the clock stamp beside the narration.
      tick: function () {
        if (!running) return;
        stamp();
      },

      // The complete still: every part reached, every wire drawn, no pip, nothing moving.
      static: function () {
        running = false;
        dropPip();
        Array.prototype.forEach.call(root.querySelectorAll("[data-node]"), function (el) {
          el.classList.add("on");
        });
        wires.forEach(function (w) { w.classList.add("on"); });
        fenceRect.classList.add("on");
        fenceTag.classList.add("on");
        paths.forEach(function (p) { setPathState(p, "done"); });
        stamp();
        say("every path drawn · nothing moves");
      }
    };

    window.AH.register(piece);
  } catch (err) {
    // No register: the markup stands as the finished map.
  }
})();
