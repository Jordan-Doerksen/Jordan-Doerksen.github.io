// ==========================================================================
// SIGNAL — the SVG aspect renderer, ported verbatim from the audited
// cn-conductor-trainer Signal Reading module. drawSignal(spec) -> SVG string.
//   spec.heads  top→bottom: G green · R red · Y yellow · L lunar(white) · D dark
//               append 'f' to a head to flash THAT lamp ("Yf" = flashing yellow)
//   spec.type   "mast" | "dwarf"      spec.stagger  bool      spec.plaque  "DV"|"R"|"L"
// (There is NO "A"/absolute plate in Canada.)
// ==========================================================================

function lampFill(c) { return ({ G: '#27d65a', R: '#ff453a', Y: '#ffd60a', L: '#dfe9ff', D: '#16202c' })[c] || '#16202c'; }

export function drawSignal(spec) {
  const heads = spec.heads || ['R'], dwarf = spec.type === 'dwarf', plq = spec.plaque || null, stag = !!spec.stagger, flash = !!spec.flash;
  const R = 12, gap = 7, pitch = 2 * R + gap, n = heads.length, S = stag ? 9 : 0;
  const W = 80 + 2 * S, top = 14, headsH = n * pitch - gap, poleLen = dwarf ? 20 : 62, poleBottom = top + headsH + poleLen, H = poleBottom + (plq ? 34 : 16), cx = W / 2;
  const p = [];
  p.push(`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`);
  p.push(`<rect x="${cx - 3}" y="${top + headsH - 2}" width="6" height="${poleLen}" fill="#46586e"/>`);
  p.push(`<rect x="${cx - 15}" y="${poleBottom - 3}" width="30" height="6" rx="2" fill="#46586e"/>`);
  for (let i = 0; i < n; i++) {
    const raw = heads[i], hf = (typeof raw === 'string' && raw.charAt(raw.length - 1) === 'f'), c = hf ? raw.slice(0, -1) : raw;
    const hx = cx + (stag ? ((i % 2 === 0) ? -S : S) : 0), cy = top + i * pitch + R, fill = lampFill(c), lit = c !== 'D', fl = (hf || flash) && lit;
    p.push(`<circle cx="${hx}" cy="${cy}" r="${R + 3}" fill="#0a0f16" stroke="#2c3340" stroke-width="1.5"/>`);
    p.push(`<circle cx="${hx}" cy="${cy}" r="${R}" fill="${fill}" stroke="#000" stroke-width="1.2">${fl ? '<animate attributeName="opacity" values="1;0.12;1" dur="1s" repeatCount="indefinite"/>' : ''}</circle>`);
    if (lit) p.push(`<circle cx="${hx - 3.5}" cy="${cy - 3.5}" r="3.2" fill="#ffffff" opacity="0.5"/>`);
  }
  if (plq) {
    const py = poleBottom + 4;
    p.push(`<rect x="${cx - 13}" y="${py}" width="26" height="22" rx="3" fill="#eef" stroke="#7a8aa0"/>`);
    p.push(`<text x="${cx}" y="${py + 16}" text-anchor="middle" font-family="monospace" font-weight="800" font-size="14" fill="#111">${plq}</text>`);
  }
  p.push('</svg>');
  return p.join('');
}
