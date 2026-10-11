/*
  GameStd.createSave — the save contract (GAME-17, AI-Brain instructions/game-systems-law.md).
  Disk-safe: a plain script that assigns one global. No module, no fetch. Loads from file://.

  Usage (config holds the keys, never code):
    <script src="src/std/save.js"></script>
    const save = GameStd.createSave({
      key: cfg.save.key, settingsKey: cfg.save.settingsKey, version: 1,
      defaults: { best: 0, runs: 0, waits: {} },
      settingsDefaults: { sound: true, music: true },
      migrations: { 0: (old) => ({ best: old.best || 0 }) },   // from the unversioned save
      report: (event, ctx) => watchdog.warn(event, ctx)        // optional
    });
    save.data.best = 12; save.write();
    if (save.newer) showTheNewerSaveLine();   // clause 9: progress is not kept in this session

  Clauses: 1 version · 2 migration · 3 merge onto defaults · 4 no invalid write · 5 probe ·
  6 two keys · 7 waits are saved · 8 unreadable save kept as <key>.bad · 9 a save from a newer
  version is left untouched.
*/
(function (g) {
  'use strict';
  g.GameStd = g.GameStd || {};

  var isObj = function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v); };

  /* Clause 5: test storage one time; fall back to memory for the session. */
  function probe(storage) {
    try {
      var k = '__gamestd_probe__';
      storage.setItem(k, '1');
      storage.removeItem(k);
      return storage;
    } catch (e) { return null; }
  }
  function memoryStore() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }

  /* Clause 3: saved values onto a fresh default object. Unknown fields are dropped. */
  function merge(defaults, saved) {
    var out = {};
    for (var k in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
      var d = defaults[k], s = saved && Object.prototype.hasOwnProperty.call(saved, k) ? saved[k] : undefined;
      if (isObj(d)) out[k] = merge(d, isObj(s) ? s : {});
      else if (Array.isArray(d)) out[k] = Array.isArray(s) ? s.slice() : d.slice();
      else out[k] = s === undefined ? d : s;
    }
    if (isObj(defaults.waits) && isObj(saved && saved.waits)) out.waits = merge({}, {}), out.waits = copyWaits(saved.waits);
    return out;
  }
  function copyWaits(w) { var o = {}; for (var k in w) if (typeof w[k] === 'number' && isFinite(w[k])) o[k] = w[k]; return o; }

  /* Clause 4: every number finite, or the write does not happen. Returns the first bad path or null. */
  function firstBadNumber(v, path) {
    if (typeof v === 'number') return isFinite(v) ? null : path;
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) { var p = firstBadNumber(v[i], path + '[' + i + ']'); if (p) return p; } return null; }
    if (isObj(v)) { for (var k in v) { var q = firstBadNumber(v[k], path ? path + '.' + k : k); if (q) return q; } return null; }
    return null;
  }

  function createSave(o) {
    if (!o || !o.key || !o.settingsKey) throw new Error('GameStd.createSave: key and settingsKey are required (clause 6)');
    if (o.key === o.settingsKey) throw new Error('GameStd.createSave: the save key and the settings key must differ (clause 6)');
    var version = o.version == null ? 1 : o.version;
    var report = o.report || function () {};
    var now = o.now || function () { return Date.now(); };
    var storage = o.store !== undefined ? o.store : (typeof g.localStorage !== 'undefined' ? g.localStorage : null);
    var store = storage ? probe(storage) : null;
    var available = store !== null;
    if (!available) { store = memoryStore(); report('storage_unavailable', { kept: 'memory' }); }
    var defaults = o.defaults || {};
    var settingsDefaults = o.settingsDefaults || {};
    var migrations = o.migrations || {};

    function readRaw(key) {
      var raw = null;
      try { raw = store.getItem(key); } catch (e) { report('storage_read_failed', { key: key, reason: String(e) }); return { raw: null, obj: null, bad: false }; }
      if (raw == null) return { raw: null, obj: null, bad: false };
      try {
        var obj = JSON.parse(raw);
        return { raw: raw, obj: isObj(obj) ? obj : null, bad: !isObj(obj) };
      } catch (e) { return { raw: raw, obj: null, bad: true }; }
    }

    /* Clauses 1, 2, 3, 8, 9. */
    function load() {
      var r = readRaw(o.key);
      if (r.bad) {
        try { store.setItem(o.key + '.bad', r.raw); } catch (e) { report('storage_write_failed', { key: o.key + '.bad', reason: String(e) }); }
        report('save_unreadable', { key: o.key, kept_as: o.key + '.bad' });
        return { data: merge(defaults, {}), fresh: true, migratedFrom: null, newer: null };
      }
      var obj = r.obj || {};
      var from = typeof obj.version === 'number' && isFinite(obj.version) ? Math.floor(obj.version) : 0;
      /* Clause 9: a save from a newer game gets no migration step and no merge. This game cannot
         know what the newer fields mean, and a merge drops every field it has never seen. */
      if (from > version) {
        report('save_newer_version', { key: o.key, found: from, expected: version });
        return { data: merge(defaults, {}), fresh: true, migratedFrom: null, newer: { found: from, expected: version } };
      }
      var cur = obj;
      for (var v = from; v < version; v++) {
        var step = migrations[v];
        if (typeof step !== 'function') { report('save_migration_missing', { from: v, to: version }); break; }
        cur = step(cur, store) || cur;
      }
      return { data: merge(defaults, cur), fresh: r.obj === null, migratedFrom: r.obj === null ? null : from, newer: null };
    }

    var loaded = load();
    /* Clause 9: in a newer-save session the save key is never written and never removed. The save
       calls go to a memory store, so the stored text is still there when the newer game returns.
       The settings keep the real store: they have their own key and no version (clause 6). */
    var saveStore = loaded.newer ? memoryStore() : store;
    var settingsRaw = readRaw(o.settingsKey);
    if (settingsRaw.bad) report('settings_unreadable', { key: o.settingsKey });

    var api = {
      available: available,
      fresh: loaded.fresh,
      migratedFrom: loaded.migratedFrom,
      newer: loaded.newer,   /* null, or { found, expected }: show the newer-save line (clause 9) */
      version: version,
      data: loaded.data,
      settings: merge(settingsDefaults, settingsRaw.obj || {}),

      /* Clause 4: refuse a write that holds NaN or Infinity; the last good save stays. */
      write: function () {
        var bad = firstBadNumber(api.data, '');
        if (bad) { report('save_invalid', { path: bad }); return false; }
        var out = merge(defaults, api.data);
        out.version = version;
        try { saveStore.setItem(o.key, JSON.stringify(out)); return true; }
        catch (e) { report('storage_write_failed', { key: o.key, reason: String(e) }); return false; }
      },
      writeSettings: function () {
        var bad = firstBadNumber(api.settings, '');
        if (bad) { report('settings_invalid', { path: bad }); return false; }
        try { store.setItem(o.settingsKey, JSON.stringify(merge(settingsDefaults, api.settings))); return true; }
        catch (e) { report('storage_write_failed', { key: o.settingsKey, reason: String(e) }); return false; }
      },
      /* Clause 6: a reset of the save does not touch the settings. */
      reset: function () {
        api.data = merge(defaults, {});
        try { saveStore.removeItem(o.key); } catch (e) { report('storage_write_failed', { key: o.key, reason: String(e) }); }
      },

      /* Clause 7: a wait the player could sit out is an absolute time in the save, so a reload keeps it. */
      startWait: function (name, ms) {
        if (!isObj(api.data.waits)) api.data.waits = {};
        api.data.waits[name] = now() + ms;
        return api.data.waits[name];
      },
      waitLeft: function (name) {
        var w = isObj(api.data.waits) ? api.data.waits[name] : undefined;
        if (typeof w !== 'number') return 0;
        return Math.max(0, w - now());
      },
      clearWait: function (name) { if (isObj(api.data.waits)) delete api.data.waits[name]; }
    };
    return api;
  }

  g.GameStd.createSave = createSave;
  g.GameStd._saveInternals = { merge: merge, firstBadNumber: firstBadNumber, memoryStore: memoryStore };
})(typeof globalThis !== 'undefined' ? globalThis : this);
