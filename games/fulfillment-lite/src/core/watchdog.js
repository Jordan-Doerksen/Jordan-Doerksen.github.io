// watchdog.js — built FIRST, before the mechanics (house game law). A tiny always-on error/event
// ring buffer plus a toggle overlay (~ or backtick). If a frame throws, the loop routes it here:
// the run pauses, the overlay opens, and the trace is preserved instead of a silent white screen.

const MAX = 60;

export function createWatchdog() {
  const ring = [];
  let overlay = null;
  let visible = false;
  let trapped = false;
  let onTrap = null;

  function push(kind, msg) {
    const t = (performance.now() / 1000).toFixed(2);
    ring.push({ t, kind, msg: String(msg) });
    if (ring.length > MAX) ring.shift();
    if (visible) render();
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'watchdog';
    overlay.style.cssText = [
      'position:fixed', 'left:0', 'bottom:0', 'right:0', 'max-height:42vh', 'overflow:auto',
      'z-index:9999', 'background:rgba(3,6,11,.92)', 'border-top:1px solid #FF8066',
      'color:#EDF7FF', "font:11px/1.5 'Rajdhani',ui-monospace,monospace", 'padding:8px 12px',
      'letter-spacing:.04em', 'white-space:pre-wrap', 'display:none',
    ].join(';');
    document.body.appendChild(overlay);
  }

  function render() {
    ensureOverlay();
    const head = `▚ WATCHDOG · ${ring.length} events${trapped ? ' · TRAPPED A FRAME ERROR' : ''} · press ~ to close`;
    const lines = ring.slice().reverse().map((e) => `${e.t.padStart(7)}  ${e.kind.padEnd(6)}  ${e.msg}`);
    overlay.textContent = head + '\n' + lines.join('\n');
  }

  function toggle(force) {
    ensureOverlay();
    visible = force === undefined ? !visible : !!force;
    overlay.style.display = visible ? 'block' : 'none';
    if (visible) render();
  }

  // key hook: backtick / tilde toggles the overlay
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') { toggle(); }
  });

  // catch anything the loop's try/catch doesn't
  window.addEventListener('error', (e) => push('error', e.message || e.error));
  window.addEventListener('unhandledrejection', (e) => push('reject', e.reason && e.reason.message || e.reason));

  return {
    log: (m) => push('log', m),
    warn: (m) => push('warn', m),
    trap(err) {
      trapped = true;
      push('THROW', (err && err.stack) || err);
      toggle(true);
      if (onTrap) onTrap(err);
    },
    onTrap(fn) { onTrap = fn; },
    toggle,
    events: ring,
  };
}
