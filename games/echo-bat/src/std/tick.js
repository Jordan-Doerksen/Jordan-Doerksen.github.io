/*
  GameStd.createTick — the tick contract (GAME-18, AI-Brain instructions/game-systems-law.md).
  Disk-safe: a plain script that assigns one global. No module, no fetch.

  Usage:
    <script src="src/std/tick.js"></script>
    const tick = GameStd.createTick({
      maxStepMs: cfg.tick.maxStepMs,                 // clause 3; default 100
      update: (dt) => { ... },                        // seconds; skipped while paused
      draw: (dt) => { ... },                          // always, so a paused screen still paints
      derive: (dt) => ({ income: ..., upkeep: ... })  // clause 6; optional; read as tick.derived
    });
    tick.delay(800, () => spawnBoss());               // clause 4: counted down with dt, never setTimeout
    tick.start();  tick.paused = true;  tick.stop();

  Clauses: 1 one loop · 2 invalid step is zero · 3 cap · 4 no timer in game code · 5 allow-list
  (config tick.rawTimers; this file does not enforce it, the check script does) · 6 derived once per step.
*/
(function (g) {
  'use strict';
  g.GameStd = g.GameStd || {};

  function createTick(o) {
    o = o || {};
    var maxStepMs = typeof o.maxStepMs === 'number' && isFinite(o.maxStepMs) && o.maxStepMs > 0 ? o.maxStepMs : 100;
    var raf = o.raf || (typeof g.requestAnimationFrame === 'function' ? function (fn) { return g.requestAnimationFrame(fn); } : null);
    var caf = o.caf || (typeof g.cancelAnimationFrame === 'function' ? function (h) { g.cancelAnimationFrame(h); } : function () {});
    var now = o.now || (typeof g.performance !== 'undefined' && g.performance.now ? function () { return g.performance.now(); } : function () { return Date.now(); });
    var update = o.update || function () {};
    var draw = o.draw || function () {};
    var derive = o.derive || null;
    var last = null, handle = 0, running = false;
    var delays = [];

    var api = {
      paused: false,
      speed: 1,          /* a speed setting applies to every delay too, because delays count dt (clause 4) */
      derived: derive ? derive(0) : null,
      steps: 0,
      lastDt: 0,

      /* Clauses 2 and 3, pure: milliseconds in, the clamped step in seconds out. */
      clamp: function (dtMs) {
        if (typeof dtMs !== 'number' || dtMs !== dtMs || dtMs < 0) return 0;
        return Math.min(dtMs, maxStepMs) / 1000;
      },

      /* One step of game time. `nowMs` is injectable so a test drives the loop without a screen. */
      step: function (nowMs) {
        var dtMs = last === null ? 0 : nowMs - last;
        last = nowMs;
        var dt = api.clamp(dtMs);
        api.lastDt = dt;
        if (!api.paused) {
          var gameDt = dt * api.speed;
          if (gameDt > 0) tickDelays(gameDt);
          update(gameDt);
          if (derive) api.derived = derive(gameDt);   /* clause 6: once per step, one object */
          api.steps += 1;
        }
        draw(dt);
        return dt;
      },

      /* Clause 4: a delay is a number the loop counts down. */
      delay: function (ms, fn) {
        var d = { left: ms / 1000, fn: fn, done: false };
        delays.push(d);
        return { cancel: function () { d.done = true; }, get left() { return d.left; } };
      },
      pending: function () { return delays.filter(function (d) { return !d.done; }).length; },

      start: function () {
        if (running) return;
        if (!raf) throw new Error('GameStd.createTick: no requestAnimationFrame and no raf option');
        running = true;
        last = null;
        var frame = function (ts) {
          if (!running) return;
          api.step(typeof ts === 'number' ? ts : now());
          handle = raf(frame);
        };
        handle = raf(frame);
      },
      stop: function () { running = false; caf(handle); last = null; },
      get running() { return running; }
    };

    function tickDelays(dt) {
      for (var i = 0; i < delays.length; i++) {
        var d = delays[i];
        if (d.done) continue;
        d.left -= dt;
        if (d.left <= 0) { d.done = true; d.fn(); }
      }
      delays = delays.filter(function (d) { return !d.done; });
    }

    return api;
  }

  g.GameStd.createTick = createTick;
})(typeof globalThis !== 'undefined' ? globalThis : this);
