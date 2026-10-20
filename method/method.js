// The one method page, treatment T2, Scroll as the film (item 24, CR-28). No timer, no animation frame and no fetch:
// one passive scroll listener maps each chapter's scroll position to progress p (0..1) and writes it as state.
// An arrival is a discrete state at a threshold (text never interpolates); connectors and the file-down are tied to p.
// Thresholds are in motion.json, which build_method.py stamps into the page (#md-motion). Content is in the markup;
// this script only sets flags. Under prefers-reduced-motion nothing is installed: the page is the complete still.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (ctx, s) { return Array.prototype.slice.call(ctx.querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var lightAll = function () { all(document, '.md-arr, .md-mark, .md-wire, .md-dp.md-new').forEach(function (n) { n.classList.add('md-lit'); }); };
  try {
    if (reduce) { root.classList.add('md-js'); lightAll(); return; }
    var cfg = JSON.parse(document.getElementById('md-motion').textContent);
    var rail = { n: document.querySelector('.md-rail-n'), t: document.querySelector('.md-rail-t') };
    var order = all(document, '[data-ch]');
    var chapters = order.filter(function (el) { return el.querySelector('.md-track'); }).map(function (el) {
      var c = cfg.chapters[el.id];
      if (!c) { throw new Error('no motion for ' + el.id); }
      return {
        el: el, c: c, track: el.querySelector('.md-track'), pin: el.querySelector('.md-pin'), pinned: false,
        arrs: all(el, '.md-arr'), wires: all(el, '.md-stage .md-wire'), marks: all(el, '.md-mark'), mwires: all(el, '.md-spine .md-wire'),
        fresh: all(el, '.md-dgwrap .md-dp.md-new'), status: el.querySelector('.md-status'), last: -1, settled: false
      };
    });
    var pinTop = 0;

    function say(ch, n) {
      var s = ch.status, N = ch.arrs.length, t;
      if (!s) { return; }
      if (n === 0) { t = s.getAttribute('data-idle'); }
      else if (n > N) { t = s.getAttribute('data-done'); }
      else {
        var a = ch.arrs[n - 1], h = a.querySelector('.md-h3') || a.querySelector('.md-h4') || a.querySelector('.md-n');
        t = s.getAttribute('data-step').replace('{n}', n).replace('{of}', N).replace('{title}', h ? h.textContent : '');
      }
      s.textContent = t;
    }
    function progress(ch) {
      if (ch.settled) { return 1; }
      var vh = window.innerHeight;
      if (ch.pinned) {
        var top = ch.track.getBoundingClientRect().top - pinTop;
        return clamp(-top / (ch.track.offsetHeight - ch.pin.offsetHeight));
      }
      var r = ch.pin.getBoundingClientRect();
      return clamp((cfg.flow_start_vh * vh - r.top) / ((cfg.flow_start_vh - cfg.flow_end_vh) * vh + r.height));
    }
    function paintChapter(ch, p) {
      var c = ch.c, n = 0;
      ch.arrs.forEach(function (a, i) { var on = p >= c.arrive_at[i]; a.classList.toggle('md-lit', on); if (on) { n = i + 1; } });
      ch.wires.forEach(function (w) {
        var i = +w.getAttribute('data-after'), a = c.arrive_at[i] + cfg.connector_gap, b = c.arrive_at[i + 1] - cfg.connector_gap;
        w.style.setProperty('--md-wp', clamp((p - a) / (b - a)));
        w.classList.toggle('md-lit', p >= c.arrive_at[i + 1]);
      });
      var mp = ch.marks.map(function (m, i) { return clamp((p - c.file_at - i * c.file_stagger) / c.file_span); });
      ch.marks.forEach(function (m, i) { m.style.setProperty('--md-mp', mp[i]); m.classList.toggle('md-lit', mp[i] >= 0.5); });
      ch.mwires.forEach(function (w, i) { w.style.setProperty('--md-wp', Math.min(mp[i], mp[i + 1])); w.classList.toggle('md-lit', mp[i] >= 0.5 && mp[i + 1] >= 0.5); });
      var done = ch.marks.length ? mp[mp.length - 1] >= 1 : p >= c.file_at + c.file_span;
      ch.fresh.forEach(function (d) { d.classList.toggle('md-lit', done); });
      if (done) { n = ch.arrs.length + 1; }
      if (n !== ch.last) { ch.last = n; say(ch, n); }
    }
    function paint() {
      var vh = window.innerHeight, ap = 0, i, k = 0, cur = null;
      for (i = 0; i < chapters.length; i++) { paintChapter(chapters[i], progress(chapters[i])); }
      for (i = 0; i < order.length; i++) { if (order[i].getBoundingClientRect().top <= vh * 0.5) { k = i; } }
      cur = chapters.filter(function (ch) { return ch.el === order[k]; })[0];
      if (cur) { ap = progress(cur); }
      rail.n.textContent = k === 0 ? 'Opening' : 'Chapter ' + k + ' of ' + (order.length - 1);
      rail.t.textContent = order[k].getAttribute('data-title') || '';
      root.style.setProperty('--md-p', clamp((k + ap) / (order.length - 1)));
    }
    function layout() {
      var wide = window.innerWidth >= cfg.pin_min_width_px;
      pinTop = document.querySelector('.md-bar').offsetHeight + document.querySelector('.md-rail').offsetHeight;
      root.style.setProperty('--md-pin-top', pinTop + 'px');
      chapters.forEach(function (ch) {
        ch.el.style.setProperty('--md-track-h', ch.c.track_vh + 'vh');
        ch.el.classList.remove('md-pinned');
        var fits = wide && (ch.pin.scrollHeight + pinTop <= window.innerHeight);
        ch.pinned = fits;
        ch.el.classList.toggle('md-pinned', fits);
      });
      paint();
    }
    function settle(first) {
      var id = decodeURIComponent(location.hash.slice(1)), target = id ? document.getElementById(id) : null;
      chapters.forEach(function (ch) { if (ch.el.id === id) { ch.settled = true; } });
      paint();
      // The tracks grow when layout() pins a chapter, after the browser has already scrolled to the fragment. Scroll again.
      if (first === true && target) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); paint(); }
    }
    root.style.setProperty('--md-dur-settle', cfg.settle_ms + 'ms');
    root.classList.add('md-js');
    lightAll();
    chapters.forEach(function (ch) { all(ch.el, '.md-arr, .md-mark, .md-wire, .md-dp.md-new').forEach(function (n) { n.classList.remove('md-lit'); }); });
    layout();
    settle(true);
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('hashchange', function () { settle(false); });
  } catch (e) { root.classList.add('md-js'); lightAll(); }
})();
