// T3, The trailer. The markup is the complete document; this script sets the md-js flag and runs the film (DISP-08).
// States: 0 empty slots, 1..4 one gate arrives each with one camera move, 5 filed and the camera pulls back.
// It starts once when the scene is in view, pauses when the scene leaves view or the tab hides, never loops.
// Under prefers-reduced-motion no timer, no observer and no fetch is created: the page shows state 5; Play and the
// chapter scrubber jump between states.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  try {
    var gates = all('.md-gate'), wires = all('.md-gatechain > .md-wire');
    var marks = all('.md-mark'), mwires = all('.md-spinechain > .md-wire');
    var status = document.querySelector('.md-status'), bPlay = document.querySelector('[data-act="play"]');
    var range = document.querySelector('.md-scrub-r');
    var N = gates.length, FINAL = N + 1;
    var s = FINAL, cfg = null, timer = 0, running = false, started = false;
    var names = ['Start'].concat(gates.map(function (g, i) { return 'Gate ' + (i + 1) + ': ' + g.querySelector('.md-h3').textContent; }), ['Filed']);

    function say() {
      status.textContent = s === 0 ? status.getAttribute('data-idle') : s >= FINAL ? status.getAttribute('data-done')
        : status.getAttribute('data-gate').replace('{n}', s).replace('{title}', gates[s - 1].querySelector('.md-h3').textContent);
    }
    function camera(n) {
      if (!cfg) return;
      var st = root.style;
      st.setProperty('--md-cam-scale', cfg.cam_scale[n]); st.setProperty('--md-pan-k', cfg.cam_pan_k[n]);
      st.setProperty('--md-glow-x', cfg.glow_x[n]); st.setProperty('--md-glow-s', cfg.glow_s[n]); st.setProperty('--md-glow-o', cfg.glow_o[n]);
    }
    function render(n) {
      s = n;
      gates.forEach(function (g, i) { g.classList.toggle('md-lit', n >= i + 1); g.classList.toggle('md-now', n === i + 1); });
      wires.forEach(function (w, i) { w.classList.toggle('md-lit', n >= i + 2); });
      var filed = n >= FINAL;
      marks.forEach(function (m, i) { m.style.transitionDelay = filed && cfg ? (i * cfg.file_stagger_ms) + 'ms' : '0ms'; m.classList.toggle('md-lit', filed); });
      mwires.forEach(function (w, i) {
        w.querySelector('path').style.transitionDelay = filed && cfg ? ((i + 1) * cfg.file_stagger_ms + cfg.file_down_ms / 2) + 'ms' : '0ms';
        w.classList.toggle('md-lit', filed);
      });
      camera(n);
      range.value = n; range.setAttribute('aria-valuetext', names[n]);
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
      running = true; started = true; label();
      tick();
    });
    range.addEventListener('input', function () { if (timed()) stop(); render(parseInt(range.value, 10)); });

    root.classList.add('md-js');
    if (reduce) { render(FINAL); return; }
    render(0);
    fetch('motion.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (c) {
      cfg = c;
      var st = root.style;
      st.setProperty('--md-dur-arrive', c.arrive_ms + 'ms'); st.setProperty('--md-dur-connector', c.connector_ms + 'ms');
      st.setProperty('--md-dur-file', c.file_down_ms + 'ms'); st.setProperty('--md-dur-cam', c.cam_ms + 'ms'); st.setProperty('--md-dur-glow', c.glow_ms + 'ms');
      camera(s);
      if (!('IntersectionObserver' in window)) { render(FINAL); return; }
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) {
          if (started) return;
          started = true; running = true; label();
          timer = setTimeout(tick, cfg.first_arrival_delay_ms);
        } else if (running) { stop(); }
      }, { threshold: c.autoplay_threshold });
      io.observe(document.querySelector('.md-cam'));
      document.addEventListener('visibilitychange', function () { if (document.hidden && running) stop(); });
    }).catch(function () { render(FINAL); });
  } catch (e) { all('.md-gate, .md-mark, .md-wire').forEach(function (n) { n.classList.add('md-lit'); }); }
})();
