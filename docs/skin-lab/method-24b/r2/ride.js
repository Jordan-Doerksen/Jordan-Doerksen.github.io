// R2, Rollercoaster. The track is one SVG path from station to station, with a gentle dip between stations. The car
// rides the path at ride.speed_px_s; the viewport follows the car (camera follow). At a station the car orbits the card
// once (ride.orbit_ms), then the track to the next card draws (ride.draw_ms).
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', stage, svg, base, draw, car, L = 0, rects = [], reveal = 0, lastSet = 0, trackX = 0;
  function el(n, a) { var e = document.createElementNS(NS, n); Object.keys(a || {}).forEach(function (k) { e.setAttribute(k, a[k]); }); return e; }
  function rel(r) { var s = stage.getBoundingClientRect(); return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top }; }
  function perimeter(rc, u) {
    // clockwise from the left-middle of the rectangle; u in 0..1
    var w = rc.r - rc.l, h = rc.b - rc.t, cy = (rc.t + rc.b) / 2, d = u * 2 * (w + h), up = h / 2, x, y;
    if (d < up) { x = rc.l; y = cy - d; }
    else if ((d -= up) < w) { x = rc.l + d; y = rc.t; }
    else if ((d -= w) < h) { x = rc.r; y = rc.t + d; }
    else if ((d -= h) < w) { x = rc.r - d; y = rc.b; }
    else { d -= w; x = rc.l; y = rc.b - d; }
    return { x: x, y: y };
  }
  var mode = {
    layout: function (c) {
      if (c.reduce) { c.anchors = []; c.start = 0; return; }
      var els = c.cards.concat([document.querySelector('.md-record')]), cfg = c.cfg, dip = cfg.dip_px, seg = [];
      trackX = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--md-r-track-w')) / 2) + dip / 2;
      rects = els.map(function (e) { var r = rel(e.getBoundingClientRect()); return { l: trackX, t: r.t, r: r.r, b: r.b, cy: (r.t + r.b) / 2 }; });
      var pts = [{ x: trackX, y: Math.max(0, rects[0].cy - cfg.lead_in_px) }].concat(rects.map(function (r) { return { x: trackX, y: r.cy }; }));
      var d = 'M' + pts[0].x + ' ' + pts[0].y;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], k = (b.y - a.y) / 3;
        var tail = ' C' + (a.x - dip) + ' ' + (a.y + k) + ' ' + (b.x - dip) + ' ' + (b.y - k) + ' ' + b.x + ' ' + b.y;
        d += tail;
        var t = el('path', { d: 'M' + a.x + ' ' + a.y + tail }); svg.appendChild(t); seg.push(t.getTotalLength()); svg.removeChild(t);
      }
      base.setAttribute('d', d); draw.setAttribute('d', d); L = base.getTotalLength();
      draw.style.strokeDasharray = L + ' ' + L;
      var cum = 0; c.anchors = seg.map(function (s) { cum += s; return cum; }); c.start = 0;
      svg.setAttribute('viewBox', '0 0 ' + stage.offsetWidth + ' ' + stage.offsetHeight);
    },
    render: function (c, dwell) {
      if (c.reduce || !L) { return; }
      var p, at = c.cur >= 0 && c.s === c.anchors[c.cur];
      if (at && c.dwelling && c.playing && dwell < c.cfg.orbit_ms) { p = perimeter(rects[c.cur], dwell / c.cfg.orbit_ms); }
      else { var q = base.getPointAtLength(Math.min(L, Math.max(0, c.s))); p = { x: q.x, y: q.y }; }
      car.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      // the track draws behind the car, and toward the next card once the orbit is done
      var want = c.s;
      if (at && c.cur < c.N - 1 && c.playing) { want = c.s + (c.anchors[c.cur + 1] - c.s) * Math.min(1, Math.max(0, (dwell - c.cfg.orbit_ms) / c.cfg.draw_ms)); }
      if (want > reveal) { reveal = want; }
      draw.style.strokeDashoffset = (L - reveal).toFixed(1);
      // camera follow: the page scrolls so the car (at a station, the card) sits on the camera line
      var focusY = at ? rects[c.cur].cy : p.y;
      var y = stage.getBoundingClientRect().top + window.scrollY + focusY - c.cfg.camera_line * window.innerHeight;
      y = Math.min(Math.max(0, y), Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
      if (Math.abs(window.scrollY - y) > 0.5) { window.scrollTo(0, y); }
      lastSet = y;
    },
    arrive: function (c, i) {
      var e = c.cards[i]; if (!e) { return; }
      e.classList.remove('md-hit'); void e.offsetWidth; e.classList.add('md-hit');
    },
    reset: function (c) { reveal = 0; if (draw && L) { draw.style.strokeDashoffset = L; } c.cards.forEach(function (e) { e.classList.remove('md-hit'); }); }
  };
  stage = document.querySelector('.md-r2-stage');
  svg = el('svg', { class: 'md-track', 'aria-hidden': 'true' }); base = el('path', { class: 'md-track-base' }); draw = el('path', { class: 'md-track-draw' });
  svg.appendChild(base); svg.appendChild(draw); stage.insertBefore(svg, stage.firstChild);
  car = document.createElement('i'); car.className = 'md-car'; car.setAttribute('aria-hidden', 'true'); stage.appendChild(car);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    Array.prototype.forEach.call(document.querySelectorAll('.md-card > .md-n'), function (n, i) {
      n.innerHTML = 'Gate <span class="md-roll"><span><b aria-hidden="true">' + i + '</b><b>' + (i + 1) + '</b></span></span>';
    });
  }
  var c = new window.Ride(mode);
  if (c.reduce) {
    // reduced motion: the whole track, drawn once, no car
    car.style.display = 'none';
    var s = stage.getBoundingClientRect(), els = c.cards.concat([document.querySelector('.md-record')]), d = '';
    els.forEach(function (e, i) { var r = e.getBoundingClientRect(), y = r.top - s.top + r.height / 2; d += (i ? ' L' : 'M') + 18 + ' ' + y; });
    base.setAttribute('d', d); draw.setAttribute('d', d); svg.setAttribute('viewBox', '0 0 ' + stage.offsetWidth + ' ' + stage.offsetHeight);
  } else {
    window.addEventListener('scroll', function () {
      if (c.tween || Math.abs(window.scrollY - lastSet) < 3) { return; }
      c.playing = false; c.state();
    }, { passive: true });
  }
})();
