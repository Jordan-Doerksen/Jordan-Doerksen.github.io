/*
  GameStd.createInput — intent input (GAME-19, AI-Brain instructions/game-systems-law.md).
  Disk-safe: a plain script that assigns one global. No module, no fetch.

  The rules never see a key code, a button index or a pointer event. They read intents.

  Config (config/game.json):
    "input": {
      "intents": ["left", "right", "fire", "pause"],
      "keys":    { "ArrowLeft": "left", "KeyA": "left", "ArrowRight": "right", "KeyD": "right", "Space": "fire", "KeyP": "pause", "Escape": "pause" },
      "pointer": { "down": "fire" }
    }
  Usage:
    <script src="src/std/input.js"></script>
    const input = GameStd.createInput({ config: cfg.input, target: canvas });
    input.bind();
    // in update(dt):  if (input.held.left) ...;  if (input.pressed('fire')) ...;  input.endStep();
    // pointer position, for aiming: input.pointer.x / .y (CSS pixels relative to the target), .down

  Clauses: 1 intents named in config · 2 one map per device · 3 rules read intents ·
  4 devices that exist (this file maps keyboard and pointer, which covers touch).
*/
(function (g) {
  'use strict';
  g.GameStd = g.GameStd || {};

  function createInput(o) {
    o = o || {};
    var cfg = o.config || {};
    var intents = Array.isArray(cfg.intents) ? cfg.intents.slice() : [];
    if (!intents.length) throw new Error('GameStd.createInput: config.intents must name at least one intent (clause 1)');
    var keys = cfg.keys || {};
    var pointerMap = cfg.pointer || {};
    var known = {};
    intents.forEach(function (i) { known[i] = true; });
    var unknown = [];
    for (var k in keys) if (!known[keys[k]]) unknown.push(k + '->' + keys[k]);
    for (var p in pointerMap) if (!known[pointerMap[p]]) unknown.push('pointer.' + p + '->' + pointerMap[p]);
    if (unknown.length) throw new Error('GameStd.createInput: map names an intent that is not in config.intents: ' + unknown.join(', '));

    var held = {}, edge = {};
    intents.forEach(function (i) { held[i] = 0; edge[i] = 0; });
    var pointer = { x: 0, y: 0, down: false, type: null };
    var target = o.target || null;
    var doc = o.doc || (typeof g.document !== 'undefined' ? g.document : null);
    var win = o.win || g;   /* window blur releases everything; injectable for a test with no window */
    /* Device-layer guard: keyFilter(event, intent) returning false drops the key before it becomes
       an intent. The one real use: a focused button owns its own Enter and Space. */
    var keyFilter = typeof o.keyFilter === 'function' ? o.keyFilter : null;
    var bound = [];

    function press(intent) { if (!known[intent]) return; if (!held[intent]) edge[intent] += 1; held[intent] = 1; }
    function release(intent) { if (!known[intent]) return; held[intent] = 0; }

    var api = {
      intents: intents,
      held: held,
      pointer: pointer,
      /* True once per press, until endStep() clears it. */
      pressed: function (intent) { return edge[intent] > 0; },
      endStep: function () { for (var i in edge) edge[i] = 0; },

      /* The device layer. DOM listeners call these; so does a test, with no DOM at all. */
      keyDown: function (code) { var i = keys[code]; if (i) { press(i); return true; } return false; },
      keyUp: function (code) { var i = keys[code]; if (i) { release(i); return true; } return false; },
      pointerDown: function (x, y, type) { pointer.x = x; pointer.y = y; pointer.down = true; pointer.type = type || null; if (pointerMap.down) press(pointerMap.down); },
      pointerMove: function (x, y) { pointer.x = x; pointer.y = y; },
      pointerUp: function () { pointer.down = false; if (pointerMap.down) release(pointerMap.down); },
      releaseAll: function () { for (var i in held) held[i] = 0; pointer.down = false; },

      bind: function () {
        if (!doc) return false;
        var onKeyDown = function (e) {
          if (keyFilter && keys[e.code] && keyFilter(e, keys[e.code]) === false) return;
          if (api.keyDown(e.code)) e.preventDefault();
        };
        var onKeyUp = function (e) { api.keyUp(e.code); };
        var local = function (e) { var r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0 }; return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        var onDown = function (e) { var p = local(e); api.pointerDown(p.x, p.y, e.pointerType); };
        var onMove = function (e) { var p = local(e); api.pointerMove(p.x, p.y); };
        var onUp = function () { api.pointerUp(); };
        var onBlur = function () { api.releaseAll(); };
        var tgt = target || doc;
        add(doc, 'keydown', onKeyDown); add(doc, 'keyup', onKeyUp);
        add(tgt, 'pointerdown', onDown); add(tgt, 'pointermove', onMove);
        add(doc, 'pointerup', onUp); add(doc, 'pointercancel', onUp);
        if (win && typeof win.addEventListener === 'function') add(win, 'blur', onBlur);
        return true;
      },
      unbind: function () { bound.forEach(function (b) { b.el.removeEventListener(b.type, b.fn); }); bound = []; }
    };
    function add(el, type, fn) { el.addEventListener(type, fn); bound.push({ el: el, type: type, fn: fn }); }
    return api;
  }

  g.GameStd.createInput = createInput;
})(typeof globalThis !== 'undefined' ? globalThis : this);
