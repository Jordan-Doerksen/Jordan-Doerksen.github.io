// R3, Conveyor stage. The track is the belt's offset (px). Cards flow up through a window that is the height of the stage;
// each card stops on the dwell line. The page itself never scrolls while the ride is live. A hash such as #gate-3 sets the stage.
(function () {
  'use strict';
  var root = document.documentElement, belt, win, endcard;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mid(el) { return el.offsetTop + el.offsetHeight / 2; }
  var mode = {
    layout: function (c) {
      if (c.reduce) { c.anchors = []; c.start = 0; return; }
      var H = win.clientHeight, yd = c.cfg.dwell_line * H, items = c.cards.concat([endcard]);
      c.anchors = items.map(function (el) { return Math.max(0, mid(el) - yd); });
      c.start = c.anchors[0] - c.cfg.enter_line * H + yd;      // the first card waits low, entering from below
    },
    render: function (c) { if (c.reduce) { return; } belt.style.transform = 'translateY(' + (-c.s).toFixed(1) + 'px)'; },
    arrive: function (c, i) {
      var e = c.cards[i]; if (!e) { return; }
      e.classList.remove('md-land'); void e.offsetWidth; e.classList.add('md-land');
    },
    reset: function (c) { c.cards.forEach(function (e) { e.classList.remove('md-land'); }); }
  };
  belt = document.querySelector('.md-belt'); win = document.querySelector('.md-r3-window'); endcard = document.querySelector('.md-endcard');
  if (!reduced) { root.classList.add('md-r-live'); }
  var c = new window.Ride(mode);
  if (!reduced) { c.layout(); c.paint(); }
})();
