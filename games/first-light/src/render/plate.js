// render/plate.js — the run's artifact: a 1-of-1 sounding-chart plate (the Glass Atlas
// pattern). Deterministic from the run seed; colophon baked into the PNG; won = Daybreak
// paper, lost = night ink. Every color from config — no new hex lives here.

import { mulberry32 } from '../core/rng.js';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Space Grotesk', 'Inter', system-ui, sans-serif";
const SERIF = "'Fraunces', Georgia, serif";

export function renderPlate(cfg, canvas, runData) {
  const C = cfg.colors, W = cfg.plate.width, H = cfg.plate.height;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(runData.seed);
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // two skins: Daybreak paper for harbor, night ink for the sea's ledger
  const won = runData.won;
  const bg = won ? C.paper : C.night.bgTop;
  const txt = won ? C.leviathan : C.ink; // dark slate on paper, pale ink on night
  const gold = won ? C.goldInk : C.lamp;
  const goldBright = C.lamp;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const mono = (px, ls) => { ctx.font = `500 ${px}px ${MONO}`; ctx.letterSpacing = ls || '0px'; };

  // thin double border rules
  ctx.strokeStyle = rgba(txt, 0.75); ctx.lineWidth = 1;
  ctx.strokeRect(20.5, 20.5, W - 41, H - 41);
  ctx.strokeStyle = rgba(txt, 0.3);
  ctx.strokeRect(28.5, 28.5, W - 57, H - 57);

  // eyebrow
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  mono(13, '5px'); ctx.fillStyle = rgba(gold, 0.95);
  ctx.fillText(`${cfg.meta.name.toUpperCase()} ✦ ${cfg.meta.subtitle.toUpperCase()}`, W / 2, 92);

  // procedural deadpan title — article + italic gold adjective + noun
  const T = cfg.plate.titles;
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const parts = [
    { s: pick(T.articles) + ' ', f: `600 46px ${DISPLAY}`, c: txt },
    { s: pick(T.adjectives) + ' ', f: `italic 46px ${SERIF}`, c: gold },
    { s: pick(T.nouns), f: `600 46px ${DISPLAY}`, c: txt },
  ];
  ctx.letterSpacing = '0px';
  let total = 0;
  for (const p of parts) { ctx.font = p.f; p.w = ctx.measureText(p.s).width; total += p.w; }
  let px = (W - total) / 2;
  ctx.textAlign = 'left';
  for (const p of parts) { ctx.font = p.f; ctx.fillStyle = p.c; ctx.fillText(p.s, px, 178); px += p.w; }

  // ----- the passage chart: 8 bands, 21:00 at the bottom, 05:00 at the top -----
  const top = 240, bottom = 880, mx = 96, chartW = W - mx * 2;
  const sectors = cfg.run.sectors, bandH = (bottom - top) / sectors;

  if (won) { // dawn washes the last hour
    const wash = ctx.createLinearGradient(0, top, 0, top + bandH);
    wash.addColorStop(0, rgba(goldBright, 0.3)); wash.addColorStop(1, rgba(goldBright, 0));
    ctx.fillStyle = wash; ctx.fillRect(mx - 24, top, chartW + 48, bandH);
  }

  ctx.textAlign = 'left';
  for (let j = 0; j <= sectors; j++) { // faint band rules + tiny hour labels
    const y = bottom - j * bandH;
    ctx.strokeStyle = rgba(txt, j === 0 || j === sectors ? 0.4 : 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, y + 0.5); ctx.lineTo(mx + chartW, y + 0.5); ctx.stroke();
    mono(10, '1px'); ctx.fillStyle = rgba(txt, 0.55);
    ctx.fillText(String((cfg.run.startHour + j) % 24).padStart(2, '0') + ':00', 44, y + 3);
  }

  // seeded decorative soundings — faint little depth marks
  const nSound = 12 + Math.floor(rng() * 7);
  mono(10, '0px'); ctx.fillStyle = rgba(txt, 0.2);
  for (let i = 0; i < nSound; i++) {
    ctx.fillText(String(4 + Math.floor(rng() * 120)), mx + 14 + rng() * (chartW - 28), top + 12 + rng() * (bottom - top - 20));
  }

  // charted wrecks: gold ✦ marks joined by a fine dotted route
  const pt = e => ({
    x: mx + e.x * chartW,
    y: (bottom - e.sector * bandH) + e.y * bandH * 0.7,
  });
  const marks = runData.charted.map(pt);
  if (marks.length > 1) {
    ctx.strokeStyle = rgba(gold, 0.7); ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(marks[0].x, marks[0].y);
    for (let i = 1; i < marks.length; i++) ctx.lineTo(marks[i].x, marks[i].y);
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.fillStyle = rgba(gold, 0.95);
  for (const m of marks) { // small four-point stars
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - 6); ctx.quadraticCurveTo(m.x, m.y, m.x + 6, m.y);
    ctx.quadraticCurveTo(m.x, m.y, m.x, m.y + 6); ctx.quadraticCurveTo(m.x, m.y, m.x - 6, m.y);
    ctx.quadraticCurveTo(m.x, m.y, m.x, m.y - 6); ctx.fill();
  }

  if (!won) { // a small hollow circle where the night ended
    const last = runData.charted.filter(e => e.sector === runData.sectorsReached).pop();
    const lx = last ? mx + last.x * chartW : mx + chartW / 2;
    const ly = (bottom - runData.sectorsReached * bandH) + bandH * 0.35;
    ctx.strokeStyle = rgba(txt, 0.85); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.textAlign = 'center'; mono(9, '2px'); ctx.fillStyle = rgba(txt, 0.6);
    ctx.fillText('LOST HERE', lx, ly + 24);
  }

  // ----- catalog block -----
  ctx.textAlign = 'center';
  ctx.fillStyle = rgba(gold, 0.9); mono(14, '0px'); ctx.fillText('✦', W / 2, 930);
  mono(12, '2px'); ctx.fillStyle = rgba(txt, 0.85);
  ctx.fillText(
    `NIGHT #${runData.seedHex} · SALVAGE ${runData.salvage} · WRECKS CHARTED ${runData.charted.length}` +
    ` · SECTORS ${runData.sectorsReached}/${sectors} · BEST ${runData.best}`, W / 2, 972);
  mono(12, '3px'); ctx.fillStyle = rgba(gold, 0.95);
  ctx.fillText(won ? 'MADE HARBOR AT FIRST LIGHT.' : 'THE SEA KEPT THE REST.', W / 2, 1006);

  // colophon — baked into the artifact, from config
  mono(11, '4px'); ctx.fillStyle = rgba(txt, 0.65);
  ctx.fillText(`${cfg.meta.colophon} ✦ ${cfg.meta.author.toUpperCase()} ✦ ${cfg.meta.year}`, W / 2, H - 52);
  ctx.letterSpacing = '0px';
}

export function savePlate(canvas, filename) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
