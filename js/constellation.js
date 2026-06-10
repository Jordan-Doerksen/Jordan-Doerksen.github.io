// ==========================================================================
// CONSTELLATION — the Places section.
// Stars drift on slow sine paths. Hovering (or tapping) a star pauses its
// drift, brightens it, and opens a tooltip with the place's story.
// Data lives in data/places.json — edit that file, not this one.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const TYPE_COLORS = {
  home: '#d4a843',     // gold
  work: '#8fb7ff',     // pale blue
  explore: '#969eac',  // muted
};

export async function initConstellation() {
  const wrap = document.getElementById('constellation');
  if (!wrap) return;
  const canvas = wrap.querySelector('canvas');
  const tip = wrap.querySelector('.constellation-tip');
  const ctx = canvas.getContext('2d');

  let places = [];
  try {
    places = await (await fetch('data/places.json')).json();
  } catch {
    // Local fallback in case the JSON fails to load (e.g. opened via file://)
    places = [
      { id: 'winnipeg', label: 'Winnipeg, MB', type: 'home', x: 0.62, y: 0.58, blurb: 'Home base.', story: '' },
    ];
  }

  let w = 0, h = 0, t = 0, raf = null;
  let hovered = null;
  let pinned = null; // tapped-open on touch devices

  const nodes = places.map((p, i) => ({
    ...p,
    phase: (i * 1.7) % (Math.PI * 2),
    speed: 0.25 + (i % 3) * 0.08,
    amp: 7 + (i % 4) * 2.5, // drift radius in px
    pause: 0,               // 0 = drifting, 1 = held still
    px: 0, py: 0,           // current pixel position
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) draw();
  }

  function nodePos(n) {
    const drift = 1 - n.pause;
    const dx = Math.sin(t * n.speed + n.phase) * n.amp * drift;
    const dy = Math.cos(t * n.speed * 0.8 + n.phase) * n.amp * 0.7 * drift;
    n.px = n.x * w + (reduced ? 0 : dx);
    n.py = n.y * h + (reduced ? 0 : dy);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    nodes.forEach(nodePos);

    // Faint constellation lines between nearby stars
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.px - b.px, a.py - b.py);
        const max = Math.min(w, h) * 0.45;
        if (dist < max) {
          ctx.strokeStyle = `rgba(231, 234, 240, ${0.08 * (1 - dist / max)})`;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
      }
    }

    // Stars + labels
    for (const n of nodes) {
      const active = n === hovered || n === pinned;
      const color = TYPE_COLORS[n.type] || TYPE_COLORS.explore;
      const r = active ? 6 : 4;

      // Glow
      const glow = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, r * 5);
      glow.addColorStop(0, color + (active ? 'aa' : '44'));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r * 5, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = active ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = active ? 'rgba(231,234,240,0.95)' : 'rgba(150,158,172,0.75)';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.px, n.py + 22);
    }
  }

  function frame() {
    // Ease pause in/out so the star settles gently instead of snapping
    for (const n of nodes) {
      const target = n === hovered || n === pinned ? 1 : 0;
      n.pause += (target - n.pause) * 0.08;
    }
    draw();
    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  function hitTest(mx, my) {
    let best = null, bestDist = 26; // generous hit radius
    for (const n of nodes) {
      const d = Math.hypot(n.px - mx, n.py - my);
      if (d < bestDist) { best = n; bestDist = d; }
    }
    return best;
  }

  function showTip(n) {
    tip.innerHTML = `
      <p class="tip-type">${escapeHtml(n.type || 'place')}</p>
      <h4>${escapeHtml(n.label)}</h4>
      ${n.blurb ? `<p class="tip-blurb">${escapeHtml(n.blurb)}</p>` : ''}
      ${n.story ? `<p class="tip-story">${escapeHtml(n.story)}</p>` : ''}
    `;
    tip.classList.add('is-open');
    // Keep the card inside the panel
    const pad = 14;
    let left = n.px + 18;
    let top = n.py - 12;
    const tw = tip.offsetWidth || 300;
    const th = tip.offsetHeight || 140;
    if (left + tw > w - pad) left = n.px - tw - 18;
    if (top + th > h - pad) top = h - th - pad;
    if (top < pad) top = pad;
    if (left < pad) left = pad;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function hideTip() {
    tip.classList.remove('is-open');
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hovered = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
    if (hovered) showTip(hovered);
    else if (!pinned) hideTip();
    if (reduced) draw();
  });

  canvas.addEventListener('mouseleave', () => {
    hovered = null;
    if (!pinned) hideTip();
    if (reduced) draw();
  });

  // Tap to pin on touch devices (and click on desktop)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    pinned = hit === pinned ? null : hit;
    if (pinned) showTip(pinned);
    else hideTip();
    if (reduced) draw();
  });

  resize();
  addEventListener('resize', resize);

  if (reduced) {
    draw();
    return;
  }

  // Animate only while on screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !raf) frame();
    else if (!entry.isIntersecting && raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(canvas);
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
