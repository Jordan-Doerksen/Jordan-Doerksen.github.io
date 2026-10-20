// R1, Lazy river. The track is the page's own scroll position (px). Anchors put each card on the dwell line.
(function () {
  'use strict';
  var lastSet = 0, core;
  function dwellY() { return core.cfg.dwell_line * window.innerHeight; }
  function maxY() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  var mode = {
    layout: function (c) {
      core = c;
      var els = c.cards.concat([document.querySelector('.md-record')]), a = [];
      els.forEach(function (el, i) {
        var r = el.getBoundingClientRect(), y = r.top + window.scrollY + r.height / 2 - dwellY();
        y = Math.min(Math.max(0, y), maxY()); if (i && y < a[i - 1]) { y = a[i - 1]; } a.push(y);
      });
      c.anchors = a; c.start = 0;
    },
    render: function (c) { if (c.reduce) { return; } if (Math.abs(window.scrollY - c.s) > 0.5) { window.scrollTo(0, c.s); } lastSet = c.s; },
    arrive: function (c, i) {
      var el = c.cards[i]; if (!el) { return; }
      el.classList.remove('md-hit', 'md-settle'); void el.offsetWidth; el.classList.add('md-hit', 'md-settle');
    },
    reset: function (c) { c.cards.forEach(function (el) { el.classList.remove('md-hit', 'md-settle'); }); }
  };
  var c = new window.Ride(mode);
  if (!c.reduce) {
    // A scroll the ride did not make (touch, scrollbar, Space) pauses the ride and moves the ride to where the reader is.
    window.addEventListener('scroll', function () {
      if (c.tween || Math.abs(window.scrollY - lastSet) < 3) { return; }
      c.playing = false; c.dwelling = false; c.s = window.scrollY; lastSet = c.s;
      var k = -1; c.anchors.forEach(function (a, i) { if (a <= c.s + 2) { k = i; } }); c.cur = k; c.done = k >= c.N - 1;
      c.paint(); c.state();
    }, { passive: true });
  }
})();
