// ==========================================================================
// ROUTER — a tiny hash router. Routes look like #/quiz or #/drill/clear.
// Each handler(viewEl, arg) renders into #view and wires its own events.
// Also keeps the top-bar nav's active state in sync.
// ==========================================================================

const routes = {};
let viewEl = null;
let fallback = '';

export function route(path, handler) { routes[path] = handler; return { route }; }
export function go(hash) { location.hash = hash.startsWith('#') ? hash : '#/' + hash; }

function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = h.split('/');
  return { path: path || fallback, arg: decodeURIComponent(rest.join('/')) };
}

function render() {
  const { path, arg } = parse();
  const handler = routes[path] || routes[fallback];
  viewEl.innerHTML = '';
  viewEl.scrollTop = 0; window.scrollTo(0, 0);
  document.querySelectorAll('[data-nav]').forEach((n) => n.classList.toggle('is-on', n.getAttribute('data-nav') === path));
  handler(viewEl, arg);
}

export function start(el, fallbackPath = '') {
  viewEl = el; fallback = fallbackPath;
  addEventListener('hashchange', render);
  render();
}

export function refresh() { render(); }
