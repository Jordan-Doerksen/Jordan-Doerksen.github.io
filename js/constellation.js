// ==========================================================================
// CONSTELLATION — the Places section.
// Modern + techy: each place is a crisp glowing node with small satellites on
// tidy elliptical orbits (orbital mechanics). Behind them a faint flowing
// current of fine streamlines drifts across the panel and swirls gently around
// each node (the fluid, coupled to the orbits). Lived/worked places carry the
// orbits + labels; travel spots are quiet points that name themselves on hover.
// Everything reads the active skin's tokens and re-reads on change. Transparent
// canvas — the glass panel shows through. Data: data/places.json.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
  return {
    home: hexToRgb(v('--gold', '#d8ac4e')),
    work: hexToRgb(v('--places-blue', '#8fb7ff')),
    explore: hexToRgb(v('--text-faint', '#969eac')),
    flow: hexToRgb(v('--gold', '#d8ac4e')),
    active: hexToRgb(v('--starlight', '#f2f4fa')),
    label: v('--text-muted', '#97a0b5'),
    labelActive: v('--text', '#e9edf6'),
  };
}

export async function initConstellation() {
  const wrap = document.getElementById('constellation');
  if (!wrap) return;
  const canvas = wrap.querySelector('canvas');
  const tip = wrap.querySelector('.constellation-tip');
  const ctx = canvas.getContext('2d');

  let places = [];
  try {
    places = await (await fetch('data/places.json?v=2')).json();
  } catch {
    places = [
      { id: 'winnipeg', label: 'Winnipeg, MB', type: 'home', x: 0.62, y: 0.58, blurb: 'Home base.', story: '' },
    ];
  }

  let w = 0, h = 0, t = 0, raf = null;
  let hovered = null, pinned = null;
  let mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;   // parallax target + eased (nodes only)
  let colors = readColors();
  let flowP = [], asteroids = [], stars = [];
  let flyby = null, flybyTimer = 6 + Math.random() * 8;   // the odd rocket/probe/alien

  const depthFor = { home: 0.35, work: 0.6, explore: 1 };
  const nodes = places.map((p, i) => ({
    ...p,
    phase: (i * 1.7) % (Math.PI * 2),
    speed: 0.16 + (i % 5) * 0.04,
    ampFrac: 0.007 + (i % 4) * 0.003,    // very subtle — planets hold their station
    depth: depthFor[p.type] ?? 1,
    twPhase: (i * 2.3) % (Math.PI * 2),
    twSpeed: 1.6 + (i % 5) * 0.5,
    pause: 0,
    px: 0, py: 0,
    big: p.id === 'winnipeg',                // the home hub — bigger, many rings
    sats: p.id === 'winnipeg'
      ? [18, 26, 34, 43, 52, 61].map((rad, k) => ({
          rad, squash: 0.38 + 0.08 * (k % 3), tilt: k * 0.5,
          ph: k * 1.1, sp: (k % 2 ? -1 : 1) * (0.72 - k * 0.07), sz: 1.5,
        }))
      : (depthFor[p.type] ?? 1) < 1 ? [       // other home/work get a couple
          { rad: 16, squash: 0.42, tilt: i * 0.7, ph: i * 1.3, sp: 0.9, sz: 1.7 },
          { rad: 27, squash: 0.55, tilt: i * 0.7 + 1.1, ph: i * 2.1, sp: -0.55, sz: 1.3 },
        ] : [],
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flowP = Array.from({ length: Math.round(Math.min(120, w / 8)) }, () => {
      const x = Math.random() * w, y = Math.random() * h;
      return { x, y, ox: x, oy: y, spd: 0.7 + Math.random() * 0.9 };
    });
    asteroids = Array.from({ length: 4 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      r: 3 + Math.random() * 5, rot: Math.random() * 6.2832, vr: (Math.random() - 0.5) * 0.02,
      verts: Array.from({ length: 8 }, () => 0.62 + Math.random() * 0.5),
    }));
    stars = Array.from({ length: Math.round(Math.min(120, w / 8.5)) }, () => ({
      x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.1,
      tw: Math.random() * 6.2832, tws: 0.6 + Math.random() * 1.6, depth: 0.3 + Math.random() * 1.2,
    }));
    if (reduced) paint();
  }

  function nodePos(n) {
    const drift = 1 - n.pause;
    const amp = n.ampFrac * Math.min(w, h);
    const par = Math.min(w, h) * 0.05 * n.depth * drift;
    const dx = Math.sin(t * n.speed + n.phase) * amp * drift + (smx - 0.5) * par;
    const dy = Math.cos(t * n.speed * 0.8 + n.phase) * amp * 0.7 * drift + (smy - 0.5) * par * 0.6;
    n.px = n.x * w + (reduced ? 0 : dx);
    n.py = n.y * h + (reduced ? 0 : dy);
  }

  function twinkle(n) {
    if (reduced) return 1;
    const range = n.type === 'explore' ? 0.4 : 0.18;
    return 1 - range + range * (0.5 + 0.5 * Math.sin(t * n.twSpeed + n.twPhase));
  }

  function colorOf(n) { return colors[n.type] || colors.explore; }

  // streamlines ride a smooth flow field and swirl gently around each node
  function stepFlow() {
    const R = Math.min(w, h) * 0.2, R2 = R * R;
    for (const p of flowP) {
      p.ox = p.x; p.oy = p.y;
      const ang = Math.sin(p.x * 0.0026 + t * 0.15) * 1.6 + Math.cos(p.y * 0.003 - t * 0.12) * 1.6;
      let vx = Math.cos(ang), vy = Math.sin(ang);
      for (const n of nodes) {
        const dx = p.x - n.px, dy = p.y - n.py, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1) {
          const d = Math.sqrt(d2), k = (1 - d / R) * 1.1;
          vx += (-dy / d) * k; vy += (dx / d) * k;        // tangential swirl
        }
      }
      p.x += vx * p.spd; p.y += vy * p.spd;
      if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;
      if (Math.abs(p.x - p.ox) > w * 0.5) p.ox = p.x;     // don't streak across a wrap
      if (Math.abs(p.y - p.oy) > h * 0.5) p.oy = p.y;
    }
  }

  function drawStarfield() {
    const dim = colors.light ? 0.45 : 0.75;
    for (const s of stars) {
      const par = Math.min(w, h) * 0.03 * s.depth;
      const x = s.x * w + (smx - 0.5) * par;
      const y = s.y * h + (smy - 0.5) * par * 0.6;
      const a = (0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.tws + s.tw))) * dim;
      ctx.fillStyle = `rgba(${colors.active}, ${a})`;
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.2832); ctx.fill();
    }
  }

  function drawFlow() {
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${colors.flow}, 0.10)`;
    ctx.beginPath();
    for (const p of flowP) { ctx.moveTo(p.ox, p.oy); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }

  // ---- space traffic: drifting asteroids + the odd rocket / probe / alien ----
  function spawnFlyby() {
    const type = ['rocket', 'probe', 'alien'][Math.floor(Math.random() * 3)];
    const fromLeft = Math.random() < 0.5;
    const speed = (type === 'alien' ? 1.3 : 0.95) + Math.random() * 0.5;
    const y = h * (0.16 + Math.random() * 0.66);
    flyby = { type, x: fromLeft ? -50 : w + 50, y, baseY: y, vx: fromLeft ? speed : -speed, t: 0, rot: fromLeft ? 0 : Math.PI };
  }

  function stepSpace() {
    for (const a of asteroids) {
      a.x += a.vx; a.y += a.vy; a.rot += a.vr;
      if (a.x < -a.r - 4) a.x = w + a.r; else if (a.x > w + a.r + 4) a.x = -a.r;
      if (a.y < -a.r - 4) a.y = h + a.r; else if (a.y > h + a.r + 4) a.y = -a.r;
    }
    if (flyby) {
      flyby.t += 0.016; flyby.x += flyby.vx;
      if (flyby.type === 'alien') flyby.y = flyby.baseY + Math.sin(flyby.t * 2) * 9;
      if (flyby.x < -70 || flyby.x > w + 70) { flyby = null; flybyTimer = 14 + Math.random() * 18; }
    } else if ((flybyTimer -= 0.016) <= 0) {
      spawnFlyby();
    }
  }

  function drawAsteroids() {
    ctx.lineWidth = 1;
    for (const a of asteroids) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
      ctx.fillStyle = `rgba(${colors.explore}, 0.42)`;
      ctx.strokeStyle = `rgba(${colors.explore}, 0.72)`;
      ctx.beginPath();
      a.verts.forEach((rf, k) => {
        const ang = (k / a.verts.length) * 6.2832;
        const px = Math.cos(ang) * a.r * rf, py = Math.sin(ang) * a.r * rf;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawRocket(f) {
    const flick = 0.6 + 0.4 * Math.sin(f.t * 30);
    const fl = ctx.createLinearGradient(-10, 0, -24, 0);
    fl.addColorStop(0, `rgba(255, 170, 70, ${0.85 * flick})`); fl.addColorStop(1, 'transparent');
    ctx.fillStyle = fl;
    ctx.beginPath(); ctx.moveTo(-9, -2.6); ctx.lineTo(-22 - 7 * flick, 0); ctx.lineTo(-9, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c2c8d2';
    ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-12, -7); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-12, 7); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eef1f6';
    ctx.beginPath(); ctx.moveTo(-9, -3.2); ctx.lineTo(6, -3.2); ctx.lineTo(13, 0); ctx.lineTo(6, 3.2); ctx.lineTo(-9, 3.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0483a';
    ctx.beginPath(); ctx.moveTo(6, -3.2); ctx.lineTo(13, 0); ctx.lineTo(6, 3.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fbfff';
    ctx.beginPath(); ctx.arc(-1, 0, 1.5, 0, 6.2832); ctx.fill();
  }

  function drawProbe() {
    ctx.fillStyle = 'rgba(95, 125, 185, 0.85)'; ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 1;
    ctx.fillRect(-2, -12, 4, 8); ctx.fillRect(-2, 4, 4, 8);
    ctx.strokeRect(-2, -12, 4, 8); ctx.strokeRect(-2, 4, 4, 8);
    ctx.fillStyle = '#cdd3dc'; ctx.fillRect(-3, -3.5, 7, 7);
    ctx.fillStyle = '#e8ecf2';
    ctx.beginPath(); ctx.arc(8, 0, 5, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 0, 5, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(8, 0); ctx.stroke();
  }

  function drawAlien(f) {
    const beam = ctx.createLinearGradient(0, 4, 0, 18);
    beam.addColorStop(0, 'rgba(125, 255, 165, 0.22)'); beam.addColorStop(1, 'transparent');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(6, 5); ctx.lineTo(11, 18); ctx.lineTo(-11, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#aeb6c2';
    ctx.beginPath(); ctx.ellipse(0, 2, 13, 4.2, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = 'rgba(150, 230, 255, 0.9)';
    ctx.beginPath(); ctx.arc(0, 1, 5, Math.PI, 0); ctx.fill();
    const blink = Math.sin(f.t * 8) > 0;
    [-7, -2.4, 2.4, 7].forEach((lx, k) => {
      ctx.fillStyle = (k % 2 === (blink ? 0 : 1)) ? '#7dff9d' : '#ff7a7a';
      ctx.beginPath(); ctx.arc(lx, 3.6, 1, 0, 6.2832); ctx.fill();
    });
  }

  function drawFlyby() {
    if (!flyby) return;
    ctx.save(); ctx.translate(flyby.x, flyby.y);
    if (flyby.type === 'alien') drawAlien(flyby);
    else { ctx.rotate(flyby.rot); (flyby.type === 'rocket' ? drawRocket : drawProbe)(flyby); }
    ctx.restore();
  }

  function drawOrbits() {
    for (const n of nodes) {
      if (!n.sats.length) continue;
      const rgb = colorOf(n);
      const ct = Math.cos, st = Math.sin;
      for (const s of n.sats) {
        ctx.strokeStyle = `rgba(${rgb}, 0.13)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(n.px, n.py, s.rad, s.rad * s.squash, s.tilt, 0, 6.2832);
        ctx.stroke();
        const a = s.ph + (reduced ? 0 : t * s.sp);
        const ex = Math.cos(a) * s.rad, ey = Math.sin(a) * s.rad * s.squash;
        const sx = n.px + ex * ct(s.tilt) - ey * st(s.tilt);
        const sy = n.py + ex * st(s.tilt) + ey * ct(s.tilt);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.sz * 4);
        g.addColorStop(0, `rgba(${rgb}, 0.5)`); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s.sz * 4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = `rgb(${rgb})`;
        ctx.beginPath(); ctx.arc(sx, sy, s.sz, 0, 6.2832); ctx.fill();
      }
    }
  }

  function drawNodes() {
    for (const n of nodes) {
      const active = n === hovered || n === pinned;
      const rgb = colorOf(n);
      const tw = active ? 1 : twinkle(n);
      const pulse = active && !reduced ? 1 + 0.12 * Math.sin(t * 4) : 1;
      const base = n.big ? 7 : n.type === 'explore' ? 2.4 : 4;
      const r = (active ? base + 1.6 : base) * pulse;

      const glow = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r * 6);
      glow.addColorStop(0, `rgba(${active ? colors.active : rgb}, ${active ? 0.55 : (n.big ? 0.36 : 0.26) * tw})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(n.px, n.py, r * 6, 0, 6.2832); ctx.fill();

      const coreA = n.type === 'explore' ? 0.5 + 0.5 * tw : 0.95;
      ctx.fillStyle = active ? `rgb(${colors.active})` : `rgba(${rgb}, ${coreA})`;
      ctx.beginPath(); ctx.arc(n.px, n.py, r, 0, 6.2832); ctx.fill();

      if (n.type !== 'explore' || active) {
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = active ? colors.labelActive : colors.label;
        ctx.globalAlpha = active ? 1 : 0.8;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.px, n.py + r + 15);
        ctx.globalAlpha = 1;
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, w, h);
    drawStarfield();
    drawFlow();
    drawAsteroids();
    drawFlyby();
    drawOrbits();
    drawNodes();
  }

  function paint() { nodes.forEach(nodePos); render(); }   // one static frame

  function frame() {
    for (const n of nodes) {
      const target = n === hovered || n === pinned ? 1 : 0;
      n.pause += (target - n.pause) * 0.08;
    }
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    nodes.forEach(nodePos);
    stepFlow();
    stepSpace();
    render();
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function hitTest(cx, cy) {
    let best = null, bestDist = 26;
    for (const n of nodes) {
      const d = Math.hypot(n.px - cx, n.py - cy);
      if (d < bestDist) { best = n; bestDist = d; }
    }
    return best;
  }

  function showTip(n) {
    tip.innerHTML = `
      <figure class="tip-photo">
        <img src="assets/img/places/${escapeHtml(n.id)}.jpg" alt="${escapeHtml(n.label)}"
             loading="lazy" onerror="this.style.display='none'">
      </figure>
      <p class="tip-type">${escapeHtml(n.type || 'place')}</p>
      <h4>${escapeHtml(n.label)}</h4>
      ${n.blurb ? `<p class="tip-blurb">${escapeHtml(n.blurb)}</p>` : ''}
      ${n.story ? `<p class="tip-story">${escapeHtml(n.story)}</p>` : ''}
    `;
    tip.classList.add('is-open');
    const pad = 14;
    let left = n.px + 18, top = n.py - 12;
    const tw = tip.offsetWidth || 300, th = tip.offsetHeight || 140;
    if (left + tw > w - pad) left = n.px - tw - 18;
    if (top + th > h - pad) top = h - th - pad;
    if (top < pad) top = pad;
    if (left < pad) left = pad;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTip() { tip.classList.remove('is-open'); }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    mx = cx / w; my = cy / h;
    hovered = hitTest(cx, cy);
    canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    if (hovered) showTip(hovered);
    else if (!pinned) hideTip();
    if (reduced) paint();
  });

  canvas.addEventListener('mouseleave', () => {
    hovered = null; mx = 0.5; my = 0.5;
    if (!pinned) hideTip();
    if (reduced) paint();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    pinned = hit === pinned ? null : hit;
    if (pinned) showTip(pinned); else hideTip();
    if (reduced) paint();
  });

  window.addEventListener('skinchange', () => { colors = readColors(); if (reduced || !raf) paint(); });

  resize();
  addEventListener('resize', resize);

  if (reduced) { paint(); return; }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) frame();
    else if (!entry.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  }).observe(canvas);
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
