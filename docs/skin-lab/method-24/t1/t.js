// T1, Stage and file-down. The markup is the complete document; this script only sets the md-js flag
// and runs the sequence (DISP-08). States: 0 empty slots, 1..4 one gate arrives each, 5 filed into the record.
// Under prefers-reduced-motion no timer, no observer and no fetch is created: the page shows state 5 and
// Play, Step and Reset jump between states (a press is the only thing that changes a state).
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  try {
    var gates = all('.md-gate'), wires = all('.md-gatechain > .md-wire');
    var marks = all('.md-mark'), mwires = all('.md-spinechain > .md-wire');
    var status = document.querySelector('.md-status');
    var bPlay = document.querySelector('[data-act="play"]');
    var bStep = document.querySelector('[data-act="step"]');
    var bReset = document.querySelector('[data-act="reset"]');
    var N = gates.length, FINAL = N + 1;
    var s = FINAL, cfg = null, timer = 0, running = false, started = false;

    function say() {
      var t = s === 0 ? status.getAttribute('data-idle') : s >= FINAL ? status.getAttribute('data-done')
        : status.getAttribute('data-gate').replace('{n}', s).replace('{title}', gates[s - 1].querySelector('.md-h3').textContent);
      status.textContent = t;
    }
    function render(n) {
      s = n;
      gates.forEach(function (g, i) { g.classList.toggle('md-lit', n >= i + 1); });
      wires.forEach(function (w, i) { w.classList.toggle('md-lit', n >= i + 2); });
      var filed = n >= FINAL;
      marks.forEach(function (m, i) {
        m.style.transitionDelay = filed && cfg ? (i * cfg.file_stagger_ms) + 'ms' : '0ms';
        m.classList.toggle('md-lit', filed);
      });
      mwires.forEach(function (w, i) {
        w.querySelector('path').style.transitionDelay = filed && cfg ? ((i + 1) * cfg.file_stagger_ms + cfg.file_down_ms / 2) + 'ms' : '0ms';
        w.classList.toggle('md-lit', filed);
      });
      say();
    }
    function label() { bPlay.textContent = running ? 'Pause' : 'Play'; }
    function stop() { if (timer) { clearTimeout(timer); timer = 0; } running = false; label(); }
    function tick() {
      timer = 0;
      if (s >= FINAL) { stop(); return; }
      render(s + 1);
      if (s >= FINAL) { stop(); return; }
      timer = setTimeout(tick, cfg.reading_pause_ms);
    }
    var timed = function () { return !reduce && !!cfg; };

    bPlay.addEventListener('click', function () {
      if (!timed()) { render(FINAL); return; }
      if (running) { stop(); return; }
      if (s >= FINAL) render(0);
      running = true; label(); started = true;
      tick();
    });
    bStep.addEventListener('click', function () { if (timed()) stop(); render(Math.min(s + 1, FINAL)); });
    bReset.addEventListener('click', function () { if (timed()) stop(); render(0); });

    root.classList.add('md-js');
    if (reduce) { render(FINAL); return; }
    render(0);
    fetch('motion.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (c) {
      cfg = c;
      root.style.setProperty('--md-dur-arrive', c.arrive_ms + 'ms');
      root.style.setProperty('--md-dur-connector', c.connector_ms + 'ms');
      root.style.setProperty('--md-dur-file', c.file_down_ms + 'ms');
      if (!('IntersectionObserver' in window)) { render(FINAL); return; }
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting || started) return;
        started = true; io.disconnect();
        running = true; label();
        timer = setTimeout(tick, cfg.first_arrival_delay_ms);
      }, { threshold: c.autoplay_threshold });
      io.observe(document.querySelector('.md-stage'));
    }).catch(function () { render(FINAL); });
  } catch (e) { all('.md-gate, .md-mark, .md-wire').forEach(function (n) { n.classList.add('md-lit'); }); }
})();
