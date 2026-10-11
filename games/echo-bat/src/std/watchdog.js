/*
  GameStd.createWatchdog — the debug watchdog (OBS-09, OBS-01 to OBS-05, OBS-08).
  Disk-safe: a plain script that assigns one global. No module, no fetch. Loads from file://.
  Contract: std/watchdog.contract.json. The TypeScript twin is games/starfall/src/watchdog/.

  Usage, FIRST script in the page (nothing runs before it):
    <script src="src/std/watchdog.js"></script>
    <script>
      var wd = GameStd.createWatchdog({ key: 'mygame.log.v1', ringSize: 500, flushMs: 2000, version: '1.0.0' });
      wd.install();                                   // traps + app_start
      wd.log.write('INFO', 'thing_happened', { n: 1 });
      wd.mountDevMenu({ target: document.getElementById('version'), taps: 5, lines: 60, exportName: 'mygame-log-{run_id}.jsonl' });
    </script>
  The game's save module takes wd.report as its `report` option.
*/
(function (g) {
  'use strict';
  g.GameStd = g.GameStd || {};

  var SEVERITY = { TRACE: 1, DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17, FATAL: 21 };
  var ERROR_FLOOR = 17;

  function newRunId(random) {
    random = random || Math.random;
    var out = '';
    for (var i = 0; i < 32; i++) {
      var n = Math.floor(random() * 16);
      if (i === 12) n = 4;
      if (i === 16) n = (n & 0x3) | 0x8;
      out += n.toString(16);
    }
    return out;
  }
  function probe(storage) {
    try { var k = '__gamestd_wd_probe__'; storage.setItem(k, '1'); storage.removeItem(k); return storage; } catch (e) { return null; }
  }
  function isLine(v) {
    return v && typeof v === 'object' && typeof v.ts === 'string' && typeof v.level === 'string' && typeof v.severity_number === 'number'
      && typeof v.run_id === 'string' && typeof v.event === 'string' && v.ctx && typeof v.ctx === 'object';
  }
  function describe(reason) {
    if (reason && typeof reason === 'object' && 'message' in reason) return { name: reason.name || 'Error', message: String(reason.message), stack: reason.stack ? String(reason.stack) : null };
    return { value: String(reason) };
  }

  function createWatchdog(o) {
    o = o || {};
    if (!o.key) throw new Error('GameStd.createWatchdog: key is required (the storage key lives in config)');
    var ringSize = Math.max(1, o.ringSize || 500);
    var flushMs = o.flushMs == null ? 2000 : o.flushMs;
    var now = o.now || function () { return new Date().toISOString(); };
    var win = o.win || g;
    var doc = o.doc || (typeof g.document !== 'undefined' ? g.document : null);
    var con = o.console || (typeof g.console !== 'undefined' ? g.console : null);
    var setT = o.setTimeout || (typeof g.setTimeout === 'function' ? function (fn, ms) { return g.setTimeout(fn, ms); } : null);
    var clearT = o.clearTimeout || (typeof g.clearTimeout === 'function' ? function (h) { g.clearTimeout(h); } : function () {});
    var storage = o.store !== undefined ? o.store : (typeof g.localStorage !== 'undefined' ? g.localStorage : null);
    var store = storage ? probe(storage) : null;
    var runId = o.runId || newRunId(o.random);

    var ring = [], dirty = false, storageWarned = store === null, corrupt = false;
    if (store) {
      try {
        var raw = store.getItem(o.key);
        if (raw != null) { var parsed = JSON.parse(raw); if (Array.isArray(parsed)) ring = parsed.filter(isLine).slice(-ringSize); else corrupt = true; }
      } catch (e) { corrupt = true; }
    }

    var flushTimer = null;
    function push(level, event, ctx) {
      var line = { ts: now(), level: level, severity_number: SEVERITY[level] || SEVERITY.INFO, run_id: runId, event: event, ctx: ctx || {} };
      ring.push(line);
      if (ring.length > ringSize) ring = ring.slice(ring.length - ringSize);
      dirty = true;
      return line;
    }
    function flush() {
      if (!store) return false;
      try { store.setItem(o.key, JSON.stringify(ring)); dirty = false; return true; }
      catch (e) {
        if (!storageWarned) { storageWarned = true; push('WARN', 'storage_unavailable', { reason: String(e), kept: 'memory' }); }
        return false;
      }
    }
    function scheduleFlush() {
      if (!setT) return;
      if (flushTimer !== null) clearT(flushTimer);
      flushTimer = setT(function () { flushTimer = null; flush(); }, flushMs);
    }

    var log = {
      runId: runId,
      get dirty() { return dirty; },
      write: function (level, event, ctx) {
        var line = push(level, event, ctx);
        if (line.severity_number >= ERROR_FLOOR) flush(); else scheduleFlush();
        return line;
      },
      lines: function () { return ring; },
      flush: flush,
      exportText: function () { return ring.map(function (l) { return JSON.stringify(l); }).join('\n'); }
    };

    /* Negative space, once, at creation (OBS-03). */
    if (store === null) push('WARN', 'storage_unavailable', { reason: 'no store', kept: 'memory' });
    if (corrupt) push('WARN', 'log_store_corrupt', { action: 'started empty' });

    var installed = false, hidden = false, undo = [];
    function on(el, type, fn) { if (!el || typeof el.addEventListener !== 'function') return; el.addEventListener(type, fn); undo.push(function () { el.removeEventListener(type, fn); }); }

    var api = {
      log: log,
      available: store !== null,
      /* For a save module: report(event, ctx) at WARN. */
      report: function (event, ctx) { return log.write('WARN', event, ctx); },

      /* OBS-05: traps for the error channel, rejections, console error and warn, and app_hide. */
      install: function () {
        if (installed) return api;
        installed = true;
        var hide = function () {
          if (hidden) return;
          hidden = true;
          log.write('INFO', 'app_hide', { visibility: doc && doc.visibilityState ? doc.visibilityState : 'unknown' });
          flush();
        };
        on(win, 'error', function (e) {
          var d = describe(e && e.error);
          log.write('ERROR', 'window_error', { message: e && e.message, source: e && e.filename, line: e && e.lineno, col: e && e.colno, name: d.name, stack: d.stack || null, value: d.value });
        });
        on(win, 'unhandledrejection', function (e) { log.write('ERROR', 'unhandled_rejection', describe(e && e.reason)); });
        on(doc, 'visibilitychange', function () { if (doc.visibilityState === 'hidden') hide(); else hidden = false; });
        on(win, 'pagehide', hide);
        if (con) {
          var origError = con.error, origWarn = con.warn;
          con.error = function () { var a = Array.prototype.slice.call(arguments); if (origError) origError.apply(con, a); log.write('ERROR', 'console_error', { args: a.map(function (x) { return x && x.message ? String(x.message) : String(x); }) }); };
          con.warn = function () { var a = Array.prototype.slice.call(arguments); if (origWarn) origWarn.apply(con, a); log.write('WARN', 'console_warn', { args: a.map(String) }); };
          undo.push(function () { con.error = origError; con.warn = origWarn; });
        }
        log.write('INFO', 'app_start', {
          version: o.version || null,
          storage: store !== null,
          reduced_motion: typeof win.matchMedia === 'function' ? !!win.matchMedia('(prefers-reduced-motion: reduce)').matches : null,
          viewport: { w: win.innerWidth || null, h: win.innerHeight || null, dpr: win.devicePixelRatio || null },
          ua: win.navigator && win.navigator.userAgent ? win.navigator.userAgent : null
        });
        return api;
      },
      uninstall: function () { undo.forEach(function (f) { f(); }); undo = []; installed = false; },

      /* OBS-08: the export control. N taps on a target opens a sheet with Copy and Download. */
      mountDevMenu: function (m) {
        if (!doc || !m || !m.target) return null;
        var taps = m.taps || 5, lines = m.lines || 60, windowMs = m.windowMs || 2000;
        var panel = doc.createElement('section'); panel.className = 'gs-dev'; panel.hidden = true; panel.setAttribute('aria-label', 'Debug log');
        var head = doc.createElement('header'); head.className = 'gs-dev-head';
        var title = doc.createElement('span'); title.textContent = 'Log · ' + (o.version ? 'v' + o.version + ' · ' : '') + 'run ' + runId.slice(0, 8);
        var status = doc.createElement('span'); status.className = 'gs-dev-status';
        head.appendChild(title); head.appendChild(status);
        var pre = doc.createElement('pre'); pre.className = 'gs-dev-log';
        var bar = doc.createElement('div'); bar.className = 'gs-dev-bar';
        var mk = function (label) { var b = doc.createElement('button'); b.type = 'button'; b.className = 'gs-dev-btn'; b.textContent = label; bar.appendChild(b); return b; };
        var copy = mk('Copy'), download = mk('Download'), close = mk('Close');
        panel.appendChild(head); panel.appendChild(pre); panel.appendChild(bar);
        doc.body.appendChild(panel);
        var render = function () { var all = log.lines(); pre.textContent = all.slice(-lines).map(function (l) { return JSON.stringify(l); }).join('\n'); status.textContent = all.length + ' lines'; };
        var open = function () { render(); panel.hidden = false; log.write('DEBUG', 'dev_menu_open', {}); };
        copy.addEventListener('click', function () {
          var clip = win.navigator && win.navigator.clipboard;
          if (!clip) { status.textContent = 'copy failed: no clipboard'; log.write('WARN', 'copy_failed', { reason: 'no clipboard' }); return; }
          clip.writeText(log.exportText()).then(function () { status.textContent = 'copied'; }, function (err) { status.textContent = 'copy failed'; log.write('WARN', 'copy_failed', { reason: String(err) }); });
        });
        download.addEventListener('click', function () {
          var name = (m.exportName || 'log-{run_id}.jsonl').replace('{run_id}', runId);
          var url = win.URL.createObjectURL(new win.Blob([log.exportText() + '\n'], { type: 'application/x-ndjson' }));
          var a = doc.createElement('a'); a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove(); win.URL.revokeObjectURL(url);
          status.textContent = 'saved ' + name;
        });
        close.addEventListener('click', function () { panel.hidden = true; });
        var count = 0, first = 0;
        m.target.addEventListener('click', function () { var t = Date.now(); if (t - first > windowMs) { count = 0; first = t; } count += 1; if (count >= taps) { count = 0; open(); } });
        return { open: open, close: function () { panel.hidden = true; } };
      }
    };
    return api;
  }

  g.GameStd.createWatchdog = createWatchdog;
  g.GameStd.newRunId = newRunId;
})(typeof globalThis !== 'undefined' ? globalThis : this);
