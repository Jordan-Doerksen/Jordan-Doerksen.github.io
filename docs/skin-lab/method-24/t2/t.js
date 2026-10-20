// T2, Scroll as the film. No timer, no animation frame and no fetch loop: a passive scroll listener maps the scroll
// position to progress p (0..1) and writes it as state. A gate arrives at a threshold as a discrete state (text never
// interpolates); the connectors and the file-down are tied to p. Thresholds are in motion.json.
// Under prefers-reduced-motion nothing is installed: the page is the complete still.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  try {
    if (reduce) { root.classList.add('md-js'); all('.md-gate, .md-mark, .md-wire').forEach(function (n) { n.classList.add('md-lit'); }); return; }
    var gates = all('.md-gate'), wires = all('.md-gatechain > .md-wire');
    var marks = all('.md-mark'), mwires = all('.md-spinechain > .md-wire');
    var status = document.querySelector('.md-status');
    var track = document.querySelector('.md-track'), pin = document.querySelector('.md-pin');
    var N = gates.length, FINAL = N + 1, cfg = null, last = -1, pinned = false, pinTop = 0;

    function say(n) {
      status.textContent = n === 0 ? status.getAttribute('data-idle') : n >= FINAL ? status.getAttribute('data-done')
        : status.getAttribute('data-gate').replace('{n}', n).replace('{title}', gates[n - 1].querySelector('.md-h3').textContent);
    }
    function progress() {
      var vh = window.innerHeight;
      if (pinned) {
        var top = track.getBoundingClientRect().top - pinTop;
        return clamp(-top / (track.offsetHeight - pin.offsetHeight));
      }
      var r = pin.getBoundingClientRect();
      return clamp((cfg.flow_start_vh * vh - r.top) / ((cfg.flow_start_vh - cfg.flow_end_vh) * vh + r.height));
    }
    function paint() {
      var p = progress(), n = 0;
      cfg.gate_at.forEach(function (t, i) { if (p >= t) n = i + 1; });
      gates.forEach(function (g, i) { g.classList.toggle('md-lit', p >= cfg.gate_at[i]); });
      wires.forEach(function (w, i) {
        var a = cfg.gate_at[i] + cfg.connector_gap, b = cfg.gate_at[i + 1] - cfg.connector_gap;
        w.style.setProperty('--md-wp', clamp((p - a) / (b - a)));
        w.classList.toggle('md-lit', p >= cfg.gate_at[i + 1]);
      });
      var mp = marks.map(function (m, i) { return clamp((p - cfg.file_at - i * cfg.file_stagger) / cfg.file_span); });
      marks.forEach(function (m, i) { m.style.setProperty('--md-mp', mp[i]); m.classList.toggle('md-lit', mp[i] >= 0.5); });
      mwires.forEach(function (w, i) { w.style.setProperty('--md-wp', Math.min(mp[i], mp[i + 1])); w.classList.toggle('md-lit', mp[i] >= 0.5 && mp[i + 1] >= 0.5); });
      if (mp[N - 1] >= 1) n = FINAL;
      root.style.setProperty('--md-p', p);
      if (n !== last) { last = n; say(n); }
    }
    function layout() {
      var wide = window.innerWidth >= cfg.pin_min_width_px;
      pinTop = document.querySelector('.md-bar').offsetHeight + document.querySelector('.md-rail').offsetHeight;
      root.style.setProperty('--md-pin-top', pinTop + 'px');
      var fits = wide && (pin.scrollHeight + pinTop <= window.innerHeight);
      pinned = fits;
      root.classList.toggle('md-pinned', fits);
      paint();
    }
    root.classList.add('md-js');
    paint0();
    function paint0() { gates.forEach(function (g) { g.classList.remove('md-lit'); }); marks.forEach(function (m) { m.classList.remove('md-lit'); }); wires.concat(mwires).forEach(function (w) { w.classList.remove('md-lit'); }); }
    fetch('motion.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (c) {
      cfg = c;
      root.style.setProperty('--md-dur-settle', c.settle_ms + 'ms');
      root.style.setProperty('--md-track-h', c.track_vh + 'vh');
      layout();
      window.addEventListener('scroll', paint, { passive: true });
      window.addEventListener('resize', layout);
    }).catch(function () {
      all('.md-gate, .md-mark, .md-wire').forEach(function (n) { n.classList.add('md-lit'); });
      status.textContent = status.getAttribute('data-done');
    });
  } catch (e) { all('.md-gate, .md-mark, .md-wire').forEach(function (n) { n.classList.add('md-lit'); }); }
})();
