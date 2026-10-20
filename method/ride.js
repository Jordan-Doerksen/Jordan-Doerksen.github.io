// The one method page, R2 Rollercoaster (item 24b, CR-29). It replaces the scroll engine of CR-28.
// ONE track (an SVG path, a connector only) runs through a station at every card of every chapter. The car (a particle)
// rides it, the window follows the car, and at each station the car circles the card once while the card lights, its
// connector draws and its part lights in the chapter's diagram record. Every time and distance is in ride.json, which
// build_method.py stamps into the page (#md-ride). Content is in the markup and complete with scripts off: this script
// sets a flag and runs the ride. It never starts on load. Under prefers-reduced-motion it starts nothing: no ride, no
// timer, no animation frame, only a stepped page with Back and Next.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var all = function (ctx, s) { return Array.prototype.slice.call(ctx.querySelectorAll(s)); };
  var one = function (s) { return document.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';
  var CARD = '.md-arr, .md-mark, .md-term';

  var cfg, mainEl, ctl, btnA, btnB, btnAll, railN, railT;
  var chapters = [], stations = [];

  function lightAll() { all(document, '.md-arr, .md-mark, .md-wire, .md-dp.md-new').forEach(function (n) { n.classList.add('md-lit'); n.style.removeProperty('--md-wp'); }); }
  function chapterOf(el) { var c = el.closest('[data-ch]'); return chapters.filter(function (r) { return r.el === c; })[0]; }
  function stickyH() { return one('.md-bar').offsetHeight + one('.md-rail').offsetHeight; }
  function setLabel(btn, text) { btn.textContent = text; }
  function chapterWord(c) { return c.n === 0 ? 'Opening' : 'Chapter ' + c.n + ' of 9'; }

  function collect() {
    all(document, '[data-ch]').forEach(function (el) {
      chapters.push({
        el: el, id: el.id, n: +el.getAttribute('data-ch'), title: el.getAttribute('data-title') || '', st: [],
        marks: all(el, '.md-mark'), spine: all(el, '.md-spine .md-wire'), fresh: all(el, '.md-dgwrap .md-dp.md-new'),
        dg: el.querySelector('.md-dgwrap'), status: el.querySelector('.md-status')
      });
    });
    all(document, '[data-station], .md-arr').forEach(function (el) {
      var c = chapterOf(el), nx = el.nextElementSibling, w = null;
      if (nx && nx.classList.contains('md-wire')) { w = nx; }
      else if (el.parentElement && el.parentElement.nextElementSibling && el.parentElement.nextElementSibling.classList.contains('md-return') && !nx) { w = el.parentElement.nextElementSibling; }
      var s = { el: el, ch: c, i: stations.length, k: c.st.length, wire: w, num: el.querySelector('.md-n'), pt: null, box: null, L: 0 };
      stations.push(s); c.st.push(s);
    });
  }

  function say(c, n, done) {
    var s = c.status, N = c.st.length, t;
    if (!s) { return; }
    if (n <= 0) { t = s.getAttribute('data-idle'); }
    else if (done) { t = s.getAttribute('data-done'); }
    else {
      var a = c.st[n - 1].el, h = a.querySelector('.md-h3') || a.querySelector('.md-h4') || a.querySelector('.md-n');
      t = s.getAttribute('data-step').replace('{n}', n).replace('{of}', N).replace('{title}', h ? h.textContent : '');
    }
    s.textContent = t;
  }

  // ---------- reduced motion: the stepped page. No timer, no frame, no animation. ----------
  function stepped() {
    var cur = 0, last = chapters.length - 1;
    root.classList.add('md-js', 'md-stepped');
    lightAll();
    setLabel(btnA, 'Back'); setLabel(btnB, 'Next');
    btnA.setAttribute('aria-label', 'Back to the previous chapter'); btnB.setAttribute('aria-label', 'Next chapter');
    ctl.hidden = false;
    function show(k, move) {
      cur = k;
      chapters.forEach(function (c, i) { c.el.classList.toggle('md-step-on', i === k); });
      var c = chapters[k];
      railN.textContent = chapterWord(c);
      railT.textContent = c.title + '. Step through with Back and Next.';
      btnA.setAttribute('aria-disabled', k === 0 ? 'true' : 'false');
      btnB.setAttribute('aria-disabled', k === last ? 'true' : 'false');
      if (move) { window.scrollTo(0, 0); try { history.replaceState(null, '', '#' + c.id); } catch (e) { /* file:// may refuse */ } }
    }
    function fromHash() {
      var id = decodeURIComponent(location.hash.slice(1)), t = id ? document.getElementById(id) : null, c = t ? chapterOf(t) : null;
      if (c) { show(chapters.indexOf(c), false); t.scrollIntoView(); }
      else { show(cur, false); }
    }
    btnA.addEventListener('click', function () { if (root.classList.contains('md-stepped') && cur > 0) { show(cur - 1, true); } });
    btnB.addEventListener('click', function () { if (root.classList.contains('md-stepped') && cur < last) { show(cur + 1, true); } });
    btnAll.addEventListener('click', function () {
      root.classList.remove('md-stepped');
      railN.textContent = 'Ten chapters'; railT.textContent = 'Showing every chapter. Stepping is off.';
      btnA.setAttribute('aria-disabled', 'true'); btnB.setAttribute('aria-disabled', 'true');
    });
    window.addEventListener('hashchange', function () { if (root.classList.contains('md-stepped')) { fromHash(); } });
    fromHash();
  }

  // ---------- the ride ----------
  function ride() {
    var layer, svg, base, done, car, len = 0, totalLen = 1, pathStart = { x: 0, y: 0 };
    var riding = false, userPaused = false, free = false, hovered = null, focused = null;
    var idx = -1, phase = 'idle', tt = 0, Lfrom = 0, Lto = 0, travelMs = 1000, Lnow = 0, pos = { x: 0, y: 0 };
    var raf = 0, last = 0, cam = 0, lastSet = 0, glide = false, glideMs = 0, needLayout = false, finished = false;
    var mainTop = 0;
    var test = parseInt(new URLSearchParams(location.search).get(cfg.test_flag), 10);
    if (test > 0) {
      cfg.dwell_ms = test; cfg.orbit_ms = Math.min(cfg.orbit_ms, test * 0.7); cfg.connector_ms = Math.min(cfg.connector_ms, test * 0.5);
      cfg.speed_px_s *= cfg.test_speed_mult;
    }
    var T = { trace: cfg.trace_ms, tick: cfg.tick_ms, ring: cfg.ring_ms, settle: cfg.settle_ms };
    root.style.setProperty('--md-ride-trace', T.trace + 'ms'); root.style.setProperty('--md-ride-tick', T.tick + 'ms');
    root.style.setProperty('--md-ride-ring', T.ring + 'ms'); root.style.setProperty('--md-dur-settle', T.settle + 'ms');

    function ease(f) { return 0.5 - 0.5 * Math.cos(Math.PI * f); }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }

    function setMsg(n, t) { if (n !== null) { railN.textContent = n; } if (t !== null) { railT.textContent = t; } }
    function placeN() {
      if (finished) { return; }
      if (idx < 0) { setMsg('Ten chapters', null); return; }
      var s = stations[idx];
      setMsg(chapterWord(s.ch) + ' · stop ' + (idx + 1) + ' of ' + stations.length, null);
    }
    function placeLabel() {
      if (idx < 0) { setMsg('Ten chapters', 'Starting. The car climbs to the first stop.'); return; }
      placeN(); setMsg(null, stations[idx].ch.title);
    }
    function stateMsg() {
      if (finished) { return; }
      placeN();
      if (userPaused) { setMsg(null, free ? 'Paused. Resume continues from the nearest stop.' : 'Paused. Resume to continue the ride.'); }
      else if (hovered || focused) { setMsg(null, 'Held while the pointer or focus is in a card.'); }
      else { placeLabel(); }
    }
    function stopped() { return userPaused || !!hovered || !!focused; }
    function syncPaused() { root.classList.toggle('md-paused', stopped()); setLabel(btnB, userPaused ? 'Resume' : 'Pause'); stateMsg(); }

    // ---- geometry: one track through every station, measured from the page ----
    function layout() {
      var mr = mainEl.getBoundingClientRect(), W = mr.width, H = mainEl.scrollHeight, pad = cfg.orbit_pad_px;
      mainTop = mr.top + window.scrollY;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
      stations.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        s.box = { l: r.left - mr.left - pad, t: r.top - mr.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad };
        s.pt = { x: Math.max(4, r.left - mr.left - pad), y: r.top - mr.top + 16 };
        s.pageTop = r.top + window.scrollY; s.h = r.height;
      });
      pathStart = { x: stations[0].pt.x, y: Math.max(8, stations[0].pt.y - 70) };
      var segs = [], prev = pathStart, flip = 1;
      stations.forEach(function (s) {
        var a = prev, b = s.pt, dy = b.y - a.y, dx = b.x - a.x, d;
        if (Math.abs(dy) < 60) { var h = cfg.arch_px; d = 'C ' + a.x + ' ' + (a.y - h) + ' ' + b.x + ' ' + (b.y - h) + ' ' + b.x + ' ' + b.y; }
        else if (Math.abs(dx) < 60) { var w = 8 * flip; flip = -flip; d = 'C ' + (a.x + w) + ' ' + (a.y + dy * 0.33) + ' ' + (b.x - w) + ' ' + (b.y - dy * 0.33) + ' ' + b.x + ' ' + b.y; }
        else { d = 'C ' + a.x + ' ' + (a.y + dy * 0.9) + ' ' + b.x + ' ' + (b.y - dy * 0.9) + ' ' + b.x + ' ' + b.y; }
        segs.push(d); prev = b;
      });
      var head = 'M ' + pathStart.x + ' ' + pathStart.y + ' ';
      stations.forEach(function (s, i) { base.setAttribute('d', head + segs.slice(0, i + 1).join(' ')); s.L = base.getTotalLength(); });
      base.setAttribute('d', head + segs.join(' '));
      len = totalLen = Math.max(1, base.getTotalLength());
      done.setAttribute('d', base.getAttribute('d'));
      done.style.strokeDasharray = len;
      Lnow = idx < 0 ? 0 : stations[idx].L;
    }
    function pt(L) { var p = base.getPointAtLength(clamp(L, 0, len)); return { x: p.x, y: p.y }; }
    // the car circles a card once: the card's outline grown by orbit_pad_px, from the station point, clockwise
    function orbit(s, u) {
      var b = s.box, P = 2 * (b.w + b.h), start = P - (s.pt.y - (b.t + cfg.orbit_pad_px) + cfg.orbit_pad_px), q = ((start + u * P) % P + P) % P;
      if (q < b.w) { return { x: b.l + q, y: b.t }; }
      q -= b.w; if (q < b.h) { return { x: b.l + b.w, y: b.t + q }; }
      q -= b.h; if (q < b.w) { return { x: b.l + b.w - q, y: b.t + b.h }; }
      q -= b.w; return { x: b.l, y: b.t + b.h - q };
    }

    // ---- lighting: the state of the whole page for "station k is the latest lit" ----
    function restartHit(el) { el.classList.remove('md-hit'); void el.offsetWidth; el.classList.add('md-hit'); }
    function paintTo(k, fb) {
      stations.forEach(function (s) {
        var on = s.i <= k;
        s.el.classList.toggle('md-lit', on);
        if (s.wire) { var d = s.i < k; s.wire.classList.toggle('md-lit', d); s.wire.style.setProperty('--md-wp', d ? 1 : 0); }
        if (!(fb && s.i === k)) { s.el.classList.remove('md-hit'); }
      });
      chapters.forEach(function (c) {
        var N = c.st.length, n = c.st.filter(function (s) { return s.i <= k; }).length;
        c.marks.forEach(function (m, j) { m.classList.toggle('md-lit', N > 0 && n >= Math.ceil((j + 1) * N / c.marks.length)); });
        c.spine.forEach(function (w, j) { w.classList.toggle('md-lit', !!(c.marks[j] && c.marks[j + 1] && c.marks[j].classList.contains('md-lit') && c.marks[j + 1].classList.contains('md-lit'))); w.style.setProperty('--md-wp', w.classList.contains('md-lit') ? 1 : 0); });
        c.fresh.forEach(function (d, j) { d.classList.toggle('md-lit', N > 0 && n >= Math.ceil((j + 1) * N / c.fresh.length)); });
        if (N) { say(c, n, n === N && c.st[N - 1].i < k); }
        c.dg && c.dg.classList.remove('md-hit');
      });
      if (fb && k >= 0) { restartHit(stations[k].el); }
    }
    function drawWire(s, p) { if (s.wire) { s.wire.style.setProperty('--md-wp', p); if (p >= 1) { s.wire.classList.add('md-lit'); } } }

    // ---- the camera: the window follows the car, slow and steady ----
    function camTarget() {
      var sh = stickyH(), usable = window.innerHeight - sh, y;
      if (phase === 'finale' && stations.length) {
        var dg = chapters[chapters.length - 1].dg, r = dg ? dg.getBoundingClientRect() : null;
        if (r) { return clamp(window.scrollY + r.top + Math.min(r.height, usable) / 2 - sh - usable / 2, 0, maxScroll()); }
      }
      var s = idx >= 0 ? stations[idx] : null;
      if ((phase === 'dwell' || phase === 'pause') && s && s.h + 60 <= usable) { return clamp(s.pageTop + s.h / 2 - sh - usable / 2, 0, maxScroll()); }
      return clamp(mainTop + pos.y - sh - usable * cfg.camera_anchor, 0, maxScroll());
    }
    function moveCamera(dt) {
      var goal = camTarget(), step = (goal - cam) * (1 - Math.exp(-dt / cfg.camera_tau_ms)), cap = cfg.camera_max_px_s * dt / 1000;
      cam += clamp(step, -cap, cap);
      if (Math.abs(goal - cam) < 1) { cam = goal; }
      lastSet = Math.round(cam);
      window.scrollTo({ top: lastSet, left: 0, behavior: 'instant' });
      return Math.abs(goal - cam) < 1;
    }

    // ---- the state machine ----
    function beginTravel(from, to) {
      var dist = Math.abs(to - from);
      Lfrom = from; Lto = to; tt = 0; phase = 'travel';
      travelMs = clamp(dist / cfg.speed_px_s * 1000, cfg.travel_min_ms, cfg.travel_max_ms);
    }
    function arrive(i) {
      idx = i; tt = 0; phase = 'dwell'; Lnow = stations[i].L;
      paintTo(i, true);
      placeLabel();
    }
    function leave() {
      var s = stations[idx], c = s.ch;
      if (s.k === c.st.length - 1) { say(c, c.st.length, true); }
      drawWire(s, 1);
      if (idx >= stations.length - 1) { phase = 'finale'; tt = 0; finale(); return; }
      beginTravel(s.L, stations[idx + 1].L);
    }
    function finale() {
      stations.forEach(function (s) { s.el.classList.add('md-lit'); });
      var dg = chapters[chapters.length - 1].dg;
      if (dg) { restartHit(dg); }
      finished = true; glide = true; glideMs = 0;
      setMsg('Ride complete', 'Ride complete. All ' + stations.length + ' stops are on the diagram. Press Start the ride to ride again.');
      btnB.setAttribute('aria-disabled', 'true'); setLabel(btnB, 'Pause');
    }
    function advance(dt) {
      if (phase === 'travel') {
        tt += dt; var f = Math.min(1, tt / travelMs); Lnow = Lfrom + (Lto - Lfrom) * ease(f); pos = pt(Lnow);
        if (f >= 1) { arrive(idx + 1); pos = stations[idx].pt; }
      } else if (phase === 'dwell') {
        tt += dt; var s = stations[idx];
        pos = tt < cfg.orbit_ms ? orbit(s, tt / cfg.orbit_ms) : s.pt;
        drawWire(s, Math.min(1, tt / cfg.connector_ms));
        if (tt >= cfg.dwell_ms) { leave(); }
      }
    }
    function render() {
      car.style.transform = 'translate(' + pos.x.toFixed(1) + 'px,' + pos.y.toFixed(1) + 'px)';
      done.style.strokeDashoffset = len - Lnow;
      root.style.setProperty('--md-p', clamp(Lnow / totalLen, 0, 1).toFixed(4));
    }
    function frame(now) {
      raf = 0;
      if (!riding) { return; }
      var dt = Math.min(now - last, 100); last = now;
      if (needLayout) { needLayout = false; layout(); if (idx >= 0) { pos = phase === 'dwell' ? stations[idx].pt : pt(Lnow); } }
      if (!userPaused && !finished && !glide && Math.abs(window.scrollY - lastSet) > 3) { userScroll(); }
      if (!stopped() && !finished) { advance(dt); moveCamera(dt); }
      else if (glide) { glideMs += dt; if (moveCamera(dt) || glideMs > 4000) { glide = false; } }
      render();
      if (finished && !glide) { return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    // ---- user control ----
    function userScroll() { free = true; userPaused = true; syncPaused(); }
    function nearest() {
      var mid = window.innerHeight / 2 + stickyH() / 2, best = 0, bd = 1e9;
      stations.forEach(function (s, i) { var r = s.el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function resume() {
      if (free) {
        free = false; var j = nearest();
        paintTo(j - 1, false); idx = j - 1; finished = false;
        var L0 = j === 0 ? 0 : stations[j - 1].L; pos = j === 0 ? pathStart : stations[j - 1].pt; Lnow = L0;
        cam = window.scrollY; lastSet = Math.round(cam); beginTravel(L0, stations[j].L);
      } else if (phase === 'pause') { phase = 'dwell'; tt = cfg.dwell_ms; }
      userPaused = false; syncPaused();
    }
    function startRide() {
      root.classList.add('md-riding'); root.classList.remove('md-paused');
      layer.hidden = false;
      layout(); finished = false; free = false; userPaused = false; idx = -1; glide = false;
      paintTo(-1, false);
      chapters.forEach(function (c) { if (c.st.length) { say(c, 0, false); } });
      pos = pathStart; Lnow = 0; cam = window.scrollY; lastSet = Math.round(cam);
      riding = true; beginTravel(0, stations[0].L);
      btnB.setAttribute('aria-disabled', 'false'); setLabel(btnB, 'Pause');
      placeLabel(); render(); kick();
    }
    function seeAll() {
      riding = false; finished = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
      root.classList.remove('md-riding', 'md-paused'); layer.hidden = true;
      all(document, '.md-hit').forEach(function (n) { n.classList.remove('md-hit'); });
      lightAll(); chapters.forEach(function (c) { if (c.status) { c.status.textContent = c.status.getAttribute('data-done'); } });
      setMsg('Ten chapters', 'Showing every chapter. The ride is stopped.');
      btnB.setAttribute('aria-disabled', 'true'); setLabel(btnB, 'Pause');
    }
    function stepTo(j) {
      j = clamp(j, 0, stations.length - 1);
      userPaused = true; free = false; finished = false; idx = j; phase = 'pause'; tt = cfg.dwell_ms;
      paintTo(j, true); drawWire(stations[j], 1);
      pos = stations[j].pt; Lnow = stations[j].L; glide = true; glideMs = 0; cam = window.scrollY;
      syncPaused(); render(); kick();
    }

    btnA.addEventListener('click', function () { startRide(); });
    btnB.addEventListener('click', function () {
      if (!riding || finished) { setMsg(null, finished ? 'The ride is complete. Press Start the ride to ride again.' : 'Press Start the ride first.'); return; }
      if (userPaused) { resume(); } else { userPaused = true; syncPaused(); }
    });
    btnAll.addEventListener('click', seeAll);
    window.addEventListener('wheel', function () { if (riding && !finished && !userPaused) { userScroll(); } else if (riding && userPaused) { free = true; syncPaused(); } }, { passive: true });
    window.addEventListener('touchmove', function () { if (riding && !finished && !userPaused) { userScroll(); } else if (riding && userPaused) { free = true; syncPaused(); } }, { passive: true });
    window.addEventListener('hashchange', function () { if (riding && !finished) { userScroll(); } });
    window.addEventListener('resize', function () { if (riding) { needLayout = true; kick(); } });
    document.addEventListener('keydown', function (e) {
      if (!riding || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
      var k = e.key;
      if (k === 'PageDown' || k === 'PageUp' || k === ' ' || k === 'Home' || k === 'End') {
        if (!(e.target.closest && e.target.closest('button, a, summary, .md-term')) && !finished && !userPaused) { userScroll(); }
        return;
      }
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].indexOf(k) < 0) { return; }
      if (e.target.closest && e.target.closest('.md-term, input, select, textarea, [contenteditable]')) { return; }
      e.preventDefault();
      var cur = idx < 0 ? -1 : idx, nxt = (k === 'ArrowDown' || k === 'ArrowRight') ? cur + 1 : cur - 1;
      stepTo(cur < 0 && nxt < 0 ? 0 : nxt);
    });
    // the ride holds while the pointer or the keyboard focus is inside a card, so nothing moves under a hand (WEB-06)
    document.addEventListener('pointerover', function (e) { if (e.pointerType === 'touch') { return; } var c = e.target.closest ? e.target.closest(CARD) : null; if (c !== hovered) { hovered = c; if (riding) { syncPaused(); } } });
    document.addEventListener('pointerout', function (e) { if (e.pointerType === 'touch') { return; } if (hovered && !(e.relatedTarget && hovered.contains(e.relatedTarget))) { hovered = null; if (riding) { syncPaused(); } } });
    document.addEventListener('focusin', function (e) { var c = e.target.closest ? e.target.closest(CARD) : null; focused = c; if (riding) { syncPaused(); } });
    document.addEventListener('focusout', function (e) { if (focused && !(e.relatedTarget && focused.contains(e.relatedTarget))) { focused = null; if (riding) { syncPaused(); } } });

    // the layer is made here, so a page without scripts has no empty track
    layer = document.createElement('div'); layer.className = 'md-ride-layer'; layer.hidden = true; layer.setAttribute('aria-hidden', 'true');
    svg = document.createElementNS(NS, 'svg');
    base = document.createElementNS(NS, 'path'); base.setAttribute('class', 'md-track-base');
    done = document.createElementNS(NS, 'path'); done.setAttribute('class', 'md-track-done');
    svg.appendChild(base); svg.appendChild(done);
    car = document.createElement('i'); car.className = 'md-car';
    layer.appendChild(svg); layer.appendChild(car); mainEl.insertBefore(layer, mainEl.firstChild);
    ctl.hidden = false;
    btnB.setAttribute('aria-disabled', 'true');
    railN.textContent = 'Ten chapters'; railT.textContent = 'Press Start the ride, or read on.';
    root.style.setProperty('--md-anchor-off', (stickyH() + 12) + 'px');
    // the sticky bars set where a chapter link lands; measure them now and land on a fragment again
    var id = decodeURIComponent(location.hash.slice(1)), target = id ? document.getElementById(id) : null;
    if (target) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }

  try {
    mainEl = one('main'); ctl = one('.md-ctl'); railN = one('.md-rail-n'); railT = one('.md-rail-t');
    var bs = all(ctl, '.md-btn'); btnA = bs[0]; btnB = bs[1]; btnAll = bs[2];
    root.classList.add('md-js');
    collect();
    if (reduce) { stepped(); return; }
    cfg = JSON.parse(document.getElementById('md-ride').textContent);
    lightAll();
    ride();
  } catch (e) { root.classList.add('md-js'); root.classList.remove('md-riding', 'md-stepped'); lightAll(); }
})();
