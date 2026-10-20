// The one method page, R2 Rollercoaster (item 24b, CR-29). It replaces the scroll engine of CR-28.
// ONE track (an SVG path, a connector only) runs through a station at every card of every chapter. The car (a quiet
// particle) rides it, the page follows the car, and at each station the CARD gives the feedback: one soft glow pulse and
// a border light, once, then it stays lit; the connector to the next card draws and the card's part lights in the
// chapter's diagram record. The car does not circle a card. Every time and distance is in ride.json, which build_method.py
// stamps into the page (#md-ride). Content is in the markup and complete with scripts off: this script sets a flag and
// runs the ride. It never starts on load. The frame does no DOM read: all geometry is measured in layout(), and the
// camera moves the page by one sub-pixel transform on .md-cam (see "the camera lock" in ride()). Under
// prefers-reduced-motion it starts nothing: no ride, no timer, no animation frame, only a stepped page with Back and Next.
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
    var layer, svg, base, car, camEl, barFill, barHead, segs = [], len = 0, totalLen = 1, pathStart = { x: 0, y: 0 };
    var riding = false, userPaused = false, free = false, hovered = null, focused = null;
    var idx = -1, phase = 'idle', tt = 0, Lfrom = 0, Lto = 0, travelMs = 1000, Lnow = 0, pos = { x: 0, y: 0 };
    var raf = 0, last = 0, cam = 0, glide = false, glideMs = 0, needLayout = false, finished = false;
    var mainTop = 0, sticky = 0, vh = 0, vw = 0, finaleTop = 0, finaleH = 0, maxY = 0;
    // The camera (CR-29, smoothing pass). The window is NOT scrolled while the car rides: a window scroll snaps to whole
    // pixels, and at a slow camera speed that gives 1 px, 0 px, 1 px steps that judder against the car's sub-pixel moves. So
    // at the ride's start the window scroll is locked at lockY and ONE wrapper (.md-cam) carries the page by a sub-pixel
    // translate3d. The wrapper turns back into a real window scroll when the ride ends, on Pause, on See all, on a resize
    // and the moment the visitor scrolls, so the visitor always scrolls a normal page.
    var locked = false, lockY = 0, hoverAt = 0, ptr = null, segK = 0, doneAt = [], lastBar = -1;
    var test = parseInt(new URLSearchParams(location.search).get(cfg.test_flag), 10);
    if (test > 0) {
      cfg.dwell_ms = test; cfg.glow_ms = Math.min(cfg.glow_ms, test * 0.7); cfg.connector_ms = Math.min(cfg.connector_ms, test * 0.5);
      cfg.speed_px_s *= cfg.test_speed_mult;
    }
    root.style.setProperty('--md-ride-glow', cfg.glow_ms + 'ms'); root.style.setProperty('--md-ride-tick', cfg.tick_ms + 'ms');
    root.style.setProperty('--md-dur-settle', cfg.settle_ms + 'ms'); root.style.setProperty('--md-lit-rest', cfg.lit_rest);

    function ease(f) { return 0.5 - 0.5 * Math.cos(Math.PI * f); }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
    function view() { return locked ? cam : window.scrollY; }   // the document y at the top of the viewport

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

    // ---- the camera lock: window scroll <-> one sub-pixel transform ----
    function lock() {
      if (locked) { return; }
      cam = lockY = window.scrollY; locked = true;
      camEl.classList.add('md-cam-on'); camEl.style.transform = 'translate3d(0,0,0)';
    }
    function unlock() {
      if (!locked) { return; }
      var top = clamp(Math.round(cam), 0, maxScroll());
      locked = false; glide = false;
      camEl.style.transform = ''; camEl.classList.remove('md-cam-on');
      cam = top; window.scrollTo({ top: top, left: 0, behavior: 'instant' });
    }
    function setCam(c) { cam = c; camEl.style.transform = 'translate3d(0,' + (lockY - c).toFixed(2) + 'px,0)'; }

    // ---- geometry: one track through every station, measured from the page ----
    // Every measure the frame needs is taken here and on resize, never in the frame: a read in the frame forces a layout.
    function layout() {
      var v = view(), mr = mainEl.getBoundingClientRect(), W = mr.width, H = mainEl.scrollHeight, pad = cfg.station_pad_px;
      sticky = one('.md-bar').offsetHeight + one('.md-rail').offsetHeight; vh = window.innerHeight; vw = window.innerWidth;
      mainTop = mr.top + v;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
      stations.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        s.pt = { x: Math.max(4, r.left - mr.left - pad), y: r.top - mr.top + 16 };
        s.pageTop = r.top + v; s.h = r.height;
      });
      var dg = chapters[chapters.length - 1].dg;
      if (dg) { var q = dg.getBoundingClientRect(); finaleTop = q.top + v; finaleH = q.height; }
      pathStart = { x: stations[0].pt.x, y: Math.max(8, stations[0].pt.y - 70) };
      // One short path per leg of the track. The lit part is a dash offset on its own leg, so a frame repaints one leg and not
      // a track as high as the page, and a leg is short enough to sample into a table (no getPointAtLength in the frame).
      while (svg.lastChild && svg.lastChild !== base) { svg.removeChild(svg.lastChild); }
      segs = []; doneAt = [];
      var prev = pathStart, flip = 1, start = 0, whole = 'M ' + pathStart.x + ' ' + pathStart.y + ' ';
      stations.forEach(function (s) {
        var a = prev, b = s.pt, dy = b.y - a.y, dx = b.x - a.x, d;
        if (Math.abs(dy) < 60) { var h = cfg.arch_px; d = 'C ' + a.x + ' ' + (a.y - h) + ' ' + b.x + ' ' + (b.y - h) + ' ' + b.x + ' ' + b.y; }
        else if (Math.abs(dx) < 60) { var w = 8 * flip; flip = -flip; d = 'C ' + (a.x + w) + ' ' + (a.y + dy * 0.33) + ' ' + (b.x - w) + ' ' + (b.y - dy * 0.33) + ' ' + b.x + ' ' + b.y; }
        else { d = 'C ' + a.x + ' ' + (a.y + dy * 0.9) + ' ' + b.x + ' ' + (b.y - dy * 0.9) + ' ' + b.x + ' ' + b.y; }
        var p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'md-track-done'); p.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' ' + d);
        svg.appendChild(p);
        var n = p.getTotalLength(), N = Math.max(2, Math.ceil(n / 4)), xs = new Float32Array(N + 1), ys = new Float32Array(N + 1);
        for (var i = 0; i <= N; i++) { var pp = p.getPointAtLength(n * i / N); xs[i] = pp.x; ys[i] = pp.y; }
        p.style.strokeDasharray = n; p.style.strokeDashoffset = n;
        segs.push({ p: p, start: start, len: n, N: N, xs: xs, ys: ys }); doneAt.push(n);
        s.L = start + n; start += n; whole += d + ' '; prev = b;
      });
      base.setAttribute('d', whole);
      len = totalLen = Math.max(1, start);
      Lnow = idx < 0 ? 0 : stations[idx].L; segK = 0;
    }
    // the point on the track at distance L: a table lookup, no DOM
    function pt(L) {
      L = clamp(L, 0, len);
      while (segK > 0 && L < segs[segK].start) { segK--; }
      while (segK < segs.length - 1 && L > segs[segK].start + segs[segK].len) { segK++; }
      var g = segs[segK], u = clamp((L - g.start) / g.len, 0, 1) * g.N, i = Math.min(g.N - 1, Math.floor(u)), f = u - i;
      return { x: g.xs[i] + (g.xs[i + 1] - g.xs[i]) * f, y: g.ys[i] + (g.ys[i + 1] - g.ys[i]) * f };
    }
    function paintDone() {
      for (var k = 0; k < segs.length; k++) {
        var g = segs[k], off = g.len - clamp(Lnow - g.start, 0, g.len);
        if (off !== doneAt[k]) { doneAt[k] = off; g.p.style.strokeDashoffset = off; }
      }
    }

    // ---- lighting: the state of the whole page for "station k is the latest lit" ----
    // The card's feedback is its own: one glow pulse and a border light (md-hit, once per arrival), then it stays lit.
    function restartHit(el) { if (el.classList.contains('md-hit')) { el.classList.remove('md-hit'); void el.offsetWidth; } el.classList.add('md-hit'); }
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

    // ---- the camera: the page follows the car, slow and steady ----
    // The goal is a whole pixel, so the camera comes to rest on one and the text is sharp; the camera itself moves in sub-pixels.
    function camTarget() {
      var usable = vh - sticky;
      if (phase === 'finale' && stations.length && finaleH) { return Math.round(clamp(finaleTop + Math.min(finaleH, usable) / 2 - sticky - usable / 2, 0, maxY)); }
      var s = idx >= 0 ? stations[idx] : null;
      if ((phase === 'dwell' || phase === 'pause') && s && s.h + 60 <= usable) { return Math.round(clamp(s.pageTop + s.h / 2 - sticky - usable / 2, 0, maxY)); }
      return Math.round(clamp(mainTop + pos.y - sticky - usable * cfg.camera_anchor, 0, maxY));
    }
    function moveCamera(dt) {
      if (!locked) { return true; }
      var goal = camTarget(), d = goal - cam, step = d * (1 - Math.exp(-dt / cfg.camera_tau_ms)), cap = cfg.camera_max_px_s * dt / 1000;
      setCam(Math.abs(d) < 0.05 ? goal : cam + clamp(step, -cap, cap));
      return Math.abs(goal - cam) < 0.5;
    }

    // ---- the state machine ----
    function beginTravel(from, to) {
      var dist = Math.abs(to - from);
      Lfrom = from; Lto = to; tt = 0; phase = 'travel';
      travelMs = clamp(dist / cfg.speed_px_s * 1000, cfg.travel_min_ms, cfg.travel_max_ms);
    }
    function arrive(i) {
      idx = i; tt = 0; phase = 'dwell'; Lnow = stations[i].L; pos = stations[i].pt;
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
    // The car does not circle a card: it arrives, the card lights, and the car stays put for the dwell, which counts from the light.
    function advance(dt) {
      if (phase === 'travel') {
        tt += dt; var f = Math.min(1, tt / travelMs); Lnow = Lfrom + (Lto - Lfrom) * ease(f); pos = pt(Lnow);
        if (f >= 1) { arrive(idx + 1); }
      } else if (phase === 'dwell') {
        tt += dt; drawWire(stations[idx], Math.min(1, tt / cfg.connector_ms));
        if (tt >= cfg.dwell_ms) { leave(); }
      }
    }
    function render() {
      car.style.transform = 'translate3d(' + pos.x.toFixed(2) + 'px,' + pos.y.toFixed(2) + 'px,0)';
      paintDone();
      // The bar moves by transforms on its own two elements, not by a custom property on <html>: a property on the root
      // restyles the whole document every frame, a transform on these two restyles two elements.
      var p = clamp(Lnow / totalLen, 0, 1);
      if (p !== lastBar) { lastBar = p; barFill.style.transform = 'scaleX(' + p.toFixed(4) + ')'; barHead.style.transform = 'translate3d(' + (p * vw).toFixed(1) + 'px,0,0)'; }
    }
    // A page that moves by a transform does not always get a hover update under a still pointer, so the frame asks, at most
    // every pointer_probe_ms, which card is under the pointer. The ride then holds before a card slides under a hand (WEB-06).
    function probePointer(now) {
      if (!ptr || now - hoverAt < cfg.pointer_probe_ms) { return; }
      hoverAt = now;
      var e = document.elementFromPoint(ptr.x, ptr.y), c = e && e.closest ? e.closest(CARD) : null;
      if (c !== hovered) { hovered = c; syncPaused(); }
    }
    function frame(now) {
      raf = 0;
      if (!riding) { return; }
      var dt = Math.min(now - last, 100); last = now;
      if (needLayout) {
        needLayout = false; var was = locked; unlock(); maxY = maxScroll(); layout();
        if (idx >= 0) { pos = phase === 'dwell' ? stations[idx].pt : pt(Lnow); }
        if (was) { lock(); }
      }
      probePointer(now);
      if (!stopped() && !finished) { advance(dt); moveCamera(dt); }
      else if (glide) { glideMs += dt; if (moveCamera(dt) || glideMs > 4000) { unlock(); } }
      render();
      if (!locked && finished) { return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    // ---- user control ----
    function userScroll() { unlock(); free = true; userPaused = true; syncPaused(); }
    function nearest() {
      var mid = window.innerHeight / 2 + sticky / 2, best = 0, bd = 1e9;
      stations.forEach(function (s, i) { var r = s.el.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function resume() {
      if (free) {
        free = false; var j = nearest();
        paintTo(j - 1, false); idx = j - 1; finished = false;
        var L0 = j === 0 ? 0 : stations[j - 1].L; pos = j === 0 ? pathStart : stations[j - 1].pt; Lnow = L0;
        beginTravel(L0, stations[j].L);
      } else if (phase === 'pause') { phase = 'dwell'; tt = cfg.dwell_ms; }
      userPaused = false; maxY = maxScroll(); lock(); syncPaused(); kick();
    }
    function startRide() {
      root.classList.add('md-riding'); root.classList.remove('md-paused');
      layer.hidden = false; unlock();
      layout(); maxY = maxScroll(); finished = false; free = false; userPaused = false; idx = -1; glide = false;
      paintTo(-1, false);
      chapters.forEach(function (c) { if (c.st.length) { say(c, 0, false); } });
      pos = pathStart; Lnow = 0; lastBar = -1;
      riding = true; beginTravel(0, stations[0].L); lock();
      btnB.setAttribute('aria-disabled', 'false'); setLabel(btnB, 'Pause');
      placeLabel(); render(); kick();
    }
    function seeAll() {
      riding = false; finished = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
      unlock();
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
      pos = stations[j].pt; Lnow = stations[j].L; glide = true; glideMs = 0;
      maxY = maxScroll(); lock();
      syncPaused(); render(); kick();
    }
    function pauseNow() { userPaused = true; syncPaused(); unlock(); }

    btnA.addEventListener('click', function () { startRide(); });
    btnB.addEventListener('click', function () {
      if (!riding || finished) { setMsg(null, finished ? 'The ride is complete. Press Start the ride to ride again.' : 'Press Start the ride first.'); return; }
      if (userPaused) { resume(); } else { pauseNow(); }
    });
    btnAll.addEventListener('click', seeAll);
    // The visitor's own scroll takes over at once. The wheel and the touch pause the ride and hand the camera back to the
    // window; the scroll event covers every other way the window can move (scrollbar, keys, a fragment link, a focus jump)
    // and adds the distance the window moved to where the camera was.
    function takeOver() { if (riding && !finished && !userPaused) { userScroll(); } else if (riding && userPaused) { unlock(); free = true; syncPaused(); } }
    window.addEventListener('wheel', takeOver, { passive: true });
    window.addEventListener('touchmove', takeOver, { passive: true });
    window.addEventListener('scroll', function () {
      if (!locked || Math.abs(window.scrollY - lockY) < 1) { return; }
      var top = clamp(cam + (window.scrollY - lockY), 0, maxScroll());
      cam = top; locked = false; glide = false; camEl.style.transform = ''; camEl.classList.remove('md-cam-on');
      window.scrollTo({ top: top, left: 0, behavior: 'instant' });
      takeOver();
    }, { passive: true });
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
    document.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') { ptr = { x: e.clientX, y: e.clientY }; } }, { passive: true });
    document.addEventListener('pointerover', function (e) { if (e.pointerType === 'touch') { return; } var c = e.target.closest ? e.target.closest(CARD) : null; if (c !== hovered) { hovered = c; if (riding) { syncPaused(); } } });
    document.addEventListener('pointerout', function (e) { if (e.pointerType === 'touch') { return; } if (hovered && !(e.relatedTarget && hovered.contains(e.relatedTarget))) { hovered = null; if (riding) { syncPaused(); } } });
    document.addEventListener('focusin', function (e) { var c = e.target.closest ? e.target.closest(CARD) : null; focused = c; if (riding) { syncPaused(); } });
    document.addEventListener('focusout', function (e) { if (focused && !(e.relatedTarget && focused.contains(e.relatedTarget))) { focused = null; if (riding) { syncPaused(); } } });

    // the layer and the camera wrapper are made here, so a page without scripts has neither an empty track nor a wrapper
    camEl = document.createElement('div'); camEl.className = 'md-cam';
    mainEl.parentNode.insertBefore(camEl, mainEl); camEl.appendChild(mainEl);
    var foot = one('footer.md-ref'); if (foot) { camEl.appendChild(foot); }
    layer = document.createElement('div'); layer.className = 'md-ride-layer'; layer.hidden = true; layer.setAttribute('aria-hidden', 'true');
    svg = document.createElementNS(NS, 'svg');
    base = document.createElementNS(NS, 'path'); base.setAttribute('class', 'md-track-base');
    svg.appendChild(base);
    car = document.createElement('i'); car.className = 'md-car';
    // the car is quiet: its size and glow come from ride.json, set on the car only
    car.style.setProperty('--md-car-d', cfg.car_px + 'px'); car.style.setProperty('--md-car-halo', cfg.car_halo_px + 'px');
    car.style.setProperty('--md-glow-r', cfg.car_glow_px + 'px'); car.style.setProperty('--md-glow-s', cfg.car_glow_spread_px + 'px');
    layer.appendChild(svg); layer.appendChild(car); mainEl.insertBefore(layer, mainEl.firstChild);
    barFill = one('.md-ride-fill'); barHead = one('.md-ride-head');
    ctl.hidden = false;
    btnB.setAttribute('aria-disabled', 'true');
    railN.textContent = 'Ten chapters'; railT.textContent = 'Press Start the ride, or read on.';
    root.style.setProperty('--md-anchor-off', (one('.md-bar').offsetHeight + one('.md-rail').offsetHeight + 12) + 'px');
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
