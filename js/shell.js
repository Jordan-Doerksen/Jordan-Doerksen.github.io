// ==========================================================================
// SHELL — the one place the site's chrome is defined.
// Renders the logo, the star-chart navigation (desktop rail + mobile star
// map), the living-sky canvas, and the footer into mount points, so every
// page (the hub and each spoke) shares one source of truth.
//
//   · Pages declare which page they are with <body data-page="…">.
//     "hub" (or unset) → in-page #anchors.  Anything else → a spoke, whose
//     nav links point back to the hub (/#section) and whose logo goes home.
//   · A page opts in by including <div id="shell-nav"></div> and
//     <div id="shell-footer"></div>; the sky <canvas id="sky"> is created
//     automatically if the page didn't already include one.
//
// To add a topic to the navigation everywhere, edit SECTIONS below — once.
// ==========================================================================

// The hub's sections, top to bottom. The nav mirrors this on every page.
const SECTIONS = [
  { id: 'about', name: 'About' },
  { id: 'music', name: 'Music' },
  { id: 'places', name: 'Places' },
  { id: 'projects', name: 'Projects' },
  { id: 'forge', name: 'Forge' },
  { id: 'library', name: 'Library' },
  { id: 'contact', name: 'Contact' },
];

export function renderShell() {
  const page = document.body.dataset.page || 'hub';
  const isHub = page === 'hub';

  ensureSky();

  const navMount = document.getElementById('shell-nav');
  if (navMount) navMount.innerHTML = navMarkup(isHub);

  const footMount = document.getElementById('shell-footer');
  if (footMount) footMount.innerHTML = footerMarkup();

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// The fixed full-viewport canvas js/sky.js paints onto.
function ensureSky() {
  if (document.getElementById('sky')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'sky';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
}

function navMarkup(isHub) {
  // On the hub the links are in-page anchors (so the active-star highlighting
  // in starchart-nav.js can match them); on a spoke they jump back to the hub.
  const home = isHub ? '#top' : '/';
  const href = (id) => (isHub ? `#${id}` : `/#${id}`);

  const rail = SECTIONS.map(
    (s) =>
      `<a href="${href(s.id)}"><span class="rail-label">${s.name}</span><span class="rail-star"></span></a>`
  ).join('');

  const map = SECTIONS.map(
    (s, i) =>
      `<li><a href="${href(s.id)}"><span class="map-no">${String(i + 1).padStart(2, '0')}</span><span class="map-name">${s.name}</span></a></li>`
  ).join('');

  return `
    <a class="obs-logo" href="${home}" aria-label="Home — The Observatory">J<span>·</span>D</a>

    <nav class="star-rail" aria-label="Main">${rail}</nav>

    <div class="obs-topbar">
      <button class="chart-toggle" aria-haspopup="dialog" aria-controls="star-map">Star chart</button>
    </div>

    <div class="star-map" id="star-map" role="dialog" aria-modal="true" aria-label="Site navigation" aria-hidden="true">
      <button class="map-close" aria-label="Close star chart">✕</button>
      <nav aria-label="Star chart"><ol>${map}</ol></nav>
    </div>`;
}

function footerMarkup() {
  return `<footer class="site-footer">
    <p>© <span id="year"></span> Jordan Doerksen · built by hand under prairie skies · hosted on GitHub Pages</p>
  </footer>`;
}
