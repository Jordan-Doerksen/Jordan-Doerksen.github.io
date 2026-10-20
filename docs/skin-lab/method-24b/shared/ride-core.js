// ride-core.js: the ride state machine shared by R1, R2 and R3 (item 24b). The page is a ride the reader starts, not a
// scroll. One track position s (px) moves from beat to beat at ride.speed_px_s, eases to a stop at each beat, and dwells
// there (ride.dwell_ms, never under the law's 2200 ms reading pause). A variant supplies the geometry (anchors), draws
// the frame (render) and answers an arrival (arrive). Everything timed is in ride.json, stamped into the page (#md-ride).
// Rules the core enforces for every variant:
//  - nothing moves before "Start the ride" (or a step gesture); the ride never starts on load;
//  - the ride holds while the pointer or keyboard focus is inside a card, so a link never moves under a hand (WEB-06);
//  - Pause / Resume on every beat; wheel and arrow keys step beat by beat and never auto-play;
//  - "See all chapters" stops the ride and shows the whole page as a stepped list;
//  - under prefers-reduced-motion nothing is installed that animates: no rAF, no timer, no auto-advance. Next and Back
//    step the complete page, one beat at a time.
(function (g) {
  'use strict';
  var root = document.documentElement;
  var reduce = g.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (ctx, s) { return Array.prototype.slice.call(ctx.querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  function Ride(mode) {
    var core = this, cfg = JSON.parse(document.getElementById('md-ride').textContent);
    core.cfg = cfg; core.reduce = reduce; core.mode = mode;
    core.cards = all(document, '.md-card'); core.marks = all(document, '.md-mark');
    core.N = core.cards.length + 1;                 // four cards and the record
    core.cur = -1; core.s = 0; core.v = 0; core.dwell = 0;
    core.playing = false; core.hold = 0; core.tween = null; core.anchors = []; core.start = 0; core.done = false;
    core.status = document.querySelector('.md-status');
    core.btn = { go: document.querySelector('[data-act=go]'), back: document.querySelector('[data-act=back]'), next: document.querySelector('[data-act=next]'), all: document.querySelector('[data-act=all]') };
    core.panel = document.getElementById('md-r-all');
    core.raf = 0; core.last = 0; core.wheelAcc = 0; core.wheelAt = 0;
    Object.keys(cfg.vars || {}).forEach(function (k) { root.style.setProperty('--md-r-' + k.replace(/_/g, '-'), cfg.vars[k]); });
    document.querySelector('[data-ctls]').hidden = false;
    root.classList.add('md-js');
    core.bind();
    if (reduce) { core.steppedInit(); } else { core.liveInit(); }
  }
  var P = Ride.prototype;

  // ---- layout and state ------------------------------------------------------------------------------------
  P.layout = function () {
    var top = document.querySelector('.md-r-top');
    root.style.setProperty('--md-r-top-h', top.offsetHeight + 'px');
    if (this.mode.layout) { this.mode.layout(this); }
    this.end = this.anchors.length ? this.anchors[this.anchors.length - 1] : 0;
    this.paint();
  };
  P.progress = function () { var d = this.end - this.start; return d > 0 ? clamp((this.s - this.start) / d, 0, 1) : 0; };
  P.setState = function (st) { root.setAttribute('data-ride', st); };
  P.say = function () {
    var s = this.status; if (!s) { return; }
    var n = this.cur, t;
    if (this.hold && !reduce && this.cur >= 0 && this.cur < this.cards.length) { t = s.getAttribute('data-held'); }
    else if (n < 0) { t = s.getAttribute('data-idle'); }
    else if (n >= this.cards.length) { t = s.getAttribute('data-done'); }
    else { t = s.getAttribute('data-step').replace('{n}', n + 1).replace('{of}', this.cards.length).replace('{title}', this.cards[n].querySelector('.md-h3').textContent); }
    if (s.textContent !== t) { s.textContent = t; }
  };
  P.paint = function () {
    var c = this, p = c.progress();
    root.style.setProperty('--md-r-p', p);
    c.cards.forEach(function (el, i) { el.classList.toggle('md-lit', reduce || c.cur >= i); });
    c.marks.forEach(function (el, i) { el.classList.toggle('md-lit', reduce || c.cur > i); });
    c.btn.back.disabled = c.cur < 0 && !c.tween; c.btn.next.disabled = c.cur >= c.N - 1;
    if (c.mode.render) { c.mode.render(c, c.dwell); }
    c.say();
  };
  P.state = function () {
    var st = this.done ? 'done' : this.hold && this.playing ? 'held' : this.playing ? (this.dwelling ? 'dwell' : 'riding') : this.cur >= 0 ? 'paused' : 'idle';
    this.setState(st);
    if (this.btn.go) { this.btn.go.textContent = this.playing ? this.btn.go.getAttribute('data-pause') : (this.cur >= 0 && !this.done) ? this.btn.go.getAttribute('data-resume') : this.btn.go.getAttribute('data-start'); }
  };

  // ---- arrival ---------------------------------------------------------------------------------------------
  P.arrive = function (i) {
    this.cur = i; this.dwell = 0; this.dwelling = true; this.v = 0; this.s = this.anchors[i];
    if (i >= this.N - 1) { this.done = true; this.playing = false; this.dwelling = false; }
    if (this.mode.arrive) { this.mode.arrive(this, i); }
    this.paint(); this.state();
  };
  P.reset = function () {
    this.cur = -1; this.s = this.start; this.v = 0; this.dwell = 0; this.dwelling = false; this.done = false; this.target = 0;
    if (this.mode.reset) { this.mode.reset(this); }
    this.paint();
  };

  // ---- stepping (wheel, arrows, Next, Back, a hash) --------------------------------------------------------
  P.goTo = function (i) {
    var c = this; i = clamp(i, -1, c.N - 1);
    if (c.reduce) { c.cur = i; c.done = i >= c.N - 1; c.paint(); c.steppedShow(i); c.state(); return; }
    c.playing = false; c.dwelling = false; c.done = false; c.v = 0;
    var to = i < 0 ? c.start : c.anchors[i];
    if (i < 0) { c.cur = -1; if (c.mode.reset) { c.mode.reset(c); } }
    c.tween = { from: c.s, to: to, t: 0, dur: Math.max(120, c.cfg.step_ms * Math.min(1, Math.abs(to - c.s) / Math.max(1, c.cfg.step_ref_px || 600))), idx: i };
    c.state(); c.kick();
  };
  P.step = function (dir) {
    var base = this.tween ? this.tween.idx : this.cur;
    this.goTo(base + dir);
  };
  P.steppedShow = function (i) {
    var c = this;
    c.cards.forEach(function (el, k) { if (k === i) { el.setAttribute('aria-current', 'step'); } else { el.removeAttribute('aria-current'); } });
    var rec = document.querySelector('.md-record'); if (rec) { if (i >= c.N - 1) { rec.setAttribute('aria-current', 'step'); } else { rec.removeAttribute('aria-current'); } }
    var el = i < 0 ? document.querySelector('.md-r-head') : i >= c.cards.length ? rec : c.cards[i];
    if (el && el.scrollIntoView) { el.scrollIntoView({ block: i < 0 ? 'start' : 'center', behavior: 'instant' }); }
    c.status.textContent = c.statusFor(i);
  };
  P.statusFor = function (i) {
    var s = this.status;
    if (i < 0) { return s.getAttribute('data-idle-still'); }
    if (i >= this.cards.length) { return s.getAttribute('data-done'); }
    return s.getAttribute('data-step').replace('{n}', i + 1).replace('{of}', this.cards.length).replace('{title}', this.cards[i].querySelector('.md-h3').textContent);
  };

  // ---- the loop (not used under reduced motion) ------------------------------------------------------------
  P.kick = function () { var c = this; if (c.reduce || c.raf) { return; } c.last = 0; c.raf = g.requestAnimationFrame(function f(t) { c.frame(t); if (c.raf) { c.raf = g.requestAnimationFrame(f); } }); };
  P.frame = function (now) {
    var c = this, dt = c.last ? Math.min(now - c.last, 64) : 16; c.last = now;
    var busy = false;
    if (c.tween) {
      var tw = c.tween; tw.t += dt; var u = clamp(tw.t / tw.dur, 0, 1); c.s = tw.from + (tw.to - tw.from) * ease(u); busy = true;
      if (u >= 1) { c.tween = null; c.arriveStep(tw.idx); }
    } else if (c.playing && !c.hold && !(c.panel && c.panel.classList.contains('md-open'))) {
      busy = true;
      if (c.dwelling) {
        c.dwell += dt;
        if (c.dwell >= c.cfg.dwell_ms) { c.dwelling = false; c.target = c.cur + 1; c.state(); }
      } else {
        var cf = c.cfg, to = c.anchors[c.target], rem = to - c.s, dir = rem < 0 ? -1 : 1, ar = Math.abs(rem);
        var vmax = cf.speed_px_s, vt = Math.min(vmax, Math.sqrt(2 * cf.decel_px_s2 * ar)), sec = dt / 1000;
        c.v = c.v < vt ? Math.min(vt, c.v + cf.accel_px_s2 * sec) : vt;
        var mv = Math.min(ar, Math.max(c.v, cf.min_px_s || 6) * sec);
        c.s += dir * mv;
        if (ar - mv < 0.5) { c.arrive(c.target); }
      }
    } else if (c.hold && c.playing) { busy = true; }
    c.paint();
    if (!busy && !c.tween) { c.raf = 0; }
  };
  P.arriveStep = function (i) {
    this.cur = i; this.s = i < 0 ? this.start : this.anchors[i]; this.dwell = 0; this.dwelling = false; this.v = 0; this.done = i >= this.N - 1;
    if (i >= 0 && this.mode.arrive) { this.mode.arrive(this, i); }
    this.paint(); this.state();
  };
  P.go = function () {
    var c = this;
    if (c.reduce) { return; }
    if (c.playing) { c.playing = false; c.state(); return; }
    if (c.done) { c.reset(); }
    if (c.cur < 0) { c.s = c.start; }
    c.target = c.cur + 1; c.playing = true; c.dwelling = c.cur >= 0 && c.dwell < c.cfg.dwell_ms; c.v = 0;
    c.state(); c.kick();
  };

  // ---- inputs ----------------------------------------------------------------------------------------------
  P.bind = function () {
    var c = this;
    if (c.btn.go) { c.btn.go.addEventListener('click', function () { c.go(); }); if (reduce) { c.btn.go.hidden = true; } }
    c.btn.back.addEventListener('click', function () { c.step(-1); });
    c.btn.next.addEventListener('click', function () { c.step(1); });
    c.btn.all.addEventListener('click', function () { c.toggleAll(); });
    var closeBtn = c.panel && c.panel.querySelector('[data-act=close]');
    if (closeBtn) { closeBtn.addEventListener('click', function () { c.toggleAll(false); }); }
    // hold while the pointer or focus is inside a card
    var held = { p: 0, f: 0 };
    var upd = function () { c.hold = held.p + held.f; root.toggleAttribute('data-hold', !!c.hold); if (!c.reduce) { c.state(); c.say(); } };
    c.cards.forEach(function (el) {
      el.addEventListener('pointerenter', function () { held.p = 1; upd(); });
      el.addEventListener('pointerleave', function () { held.p = 0; upd(); });
      el.addEventListener('focusin', function () { held.f = 1; upd(); });
      el.addEventListener('focusout', function () { held.f = 0; upd(); });
    });
    g.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (e.key === 'Escape' && c.panel && c.panel.classList.contains('md-open')) { c.toggleAll(false); return; }
      if (c.panel && c.panel.classList.contains('md-open')) { return; }
      var k = e.key, d = (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') ? 1 : (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') ? -1 : 0;
      if (!d) { return; }
      var tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) { return; }
      if (c.reduce && !(c.mode.stepKeysReduced)) { return; }
      e.preventDefault(); c.step(d);
    });
    if (!reduce) {
      g.addEventListener('wheel', function (e) {
        if (c.mode.nativeWheel && !c.mode.nativeWheel(c, e)) { return; }
        if (c.panel && c.panel.classList.contains('md-open')) { return; }
        e.preventDefault();
        var now = performance.now();
        if (c.tween || now - c.wheelAt < c.cfg.wheel_lock_ms) { return; }
        c.wheelAcc += e.deltaY;
        if (Math.abs(c.wheelAcc) >= c.cfg.wheel_threshold) { var d = c.wheelAcc > 0 ? 1 : -1; c.wheelAcc = 0; c.wheelAt = now; c.step(d); }
      }, { passive: false });
    }
    g.addEventListener('hashchange', function () { c.fromHash(); });
  };
  P.toggleAll = function (force) {
    var c = this, open = typeof force === 'boolean' ? force : !c.panel.classList.contains('md-open');
    c.panel.classList.toggle('md-open', open); c.btn.all.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { c.playing = false; c.state(); root.classList.add('md-r-allopen'); var h = c.panel.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
    else { root.classList.remove('md-r-allopen'); c.btn.all.focus(); }
  };
  P.fromHash = function () {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id) { return; }
    var i = -2;
    this.cards.forEach(function (el, k) { if (el.id === id) { i = k; } });
    if (id === 'record') { i = this.N - 1; }
    if (i === -2) { return; }
    if (this.reduce) { this.goTo(i); } else { this.cur = i - 1 >= -1 ? i - 1 : -1; this.s = i < 0 ? this.start : this.anchors[i]; this.arriveStep(i); }
  };

  // ---- the two ways in ---------------------------------------------------------------------------------------
  P.steppedInit = function () {
    // Reduced motion: the page is complete. No loop, no timer. Next and Back move through the beats.
    var c = this;
    c.mode.layout && c.mode.layout(c);
    c.cur = -1; c.cards.forEach(function (el) { el.classList.add('md-lit'); }); c.marks.forEach(function (el) { el.classList.add('md-lit'); });
    c.btn.back.disabled = true;
    c.status.textContent = c.status.getAttribute('data-idle-still');
    var onresize = function () { document.documentElement.style.setProperty('--md-r-top-h', document.querySelector('.md-r-top').offsetHeight + 'px'); };
    onresize(); g.addEventListener('resize', onresize);
    c.state();
    if (location.hash) { c.fromHash(); }
  };
  P.liveInit = function () {
    var c = this;
    c.layout(); c.reset(); c.state();
    g.addEventListener('resize', function () { var a = c.cur, ss = c.s; c.layout(); if (a >= 0) { c.s = c.anchors[a]; } else { c.s = c.start; } c.paint(); });
    if (location.hash) { c.fromHash(); }
  };

  g.Ride = Ride;
})(window);
