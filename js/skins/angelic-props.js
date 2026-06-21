// ==========================================================================
// ANGELIC PROPS — scene toys that appear ONLY under the Angelic skin: a stream
// of doves gliding across the footer. Mounts on skinchange when
// data-skin="angelic", unmounts otherwise. Reduced-motion draws a single still
// frame. Parallels military-props.js.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function rgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return { gold: v('--gold', '#c9a24a'), goldInk: v('--gold-ink', '#876518') };
}

// overlay canvas anchored on a host, with its own loop / resize / pause / static.
function attach(host, css, draw) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:2;' + css;
  const prevPos = host.style.position;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, t = 0, raf = null, last = 0, onScreen = true, pal = readPalette();

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function still() { ctx.clearRect(0, 0, w, h); draw(ctx, 0, 0, w, h, pal); }
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
    ctx.clearRect(0, 0, w, h); draw(ctx, dt, t, w, h, pal);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduced) { still(); return; }
    if (!raf && onScreen && document.visibilityState === 'visible') { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  const onResize = () => { size(); if (!raf) still(); };
  const onVis = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else stop(); });
  io.observe(canvas);

  requestAnimationFrame(() => { size(); start(); });
  return {
    destroy() {
      stop(); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      io.disconnect(); canvas.remove(); host.style.position = prevPos;
    },
  };
}

// ---------- doves across the footer ----------
function drawDove(ctx, x, y, t, ph, pal, s) {
  const wy = -Math.sin(t * 6 + ph) * 6;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = rgba(pal.goldInk, 0.55); ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-12, -2); ctx.lineTo(-11, 2); ctx.closePath(); ctx.fill(); ctx.stroke();   // tail
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.3, -0.18, 0, 6.2832); ctx.fill(); ctx.stroke();                                  // body
  ctx.beginPath(); ctx.arc(6, -2.6, 2.4, 0, 6.2832); ctx.fill(); ctx.stroke();                                            // head
  ctx.fillStyle = rgba(pal.gold, 0.9); ctx.beginPath(); ctx.moveTo(8.2, -3); ctx.lineTo(11, -2.4); ctx.lineTo(8.2, -1.6); ctx.closePath(); ctx.fill();  // beak
  ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = rgba(pal.goldInk, 0.55);
  ctx.beginPath(); ctx.moveTo(-1, -1); ctx.quadraticCurveTo(-4, wy - 8, -11, wy - 1); ctx.quadraticCurveTo(-4, -1, -1, -1); ctx.closePath(); ctx.fill(); ctx.stroke();  // far wing
  ctx.beginPath(); ctx.moveTo(1, -1); ctx.quadraticCurveTo(4, wy - 9, 10, wy - 2); ctx.quadraticCurveTo(4, 0, 1, -1); ctx.closePath(); ctx.fill(); ctx.stroke();        // near wing
  ctx.restore();
}
export function drawDoves(ctx, dt, t, w, h, pal, st) {
  const gy = h * 0.5, s = 0.95, spacing = 150, speed = 46;
  if (!st.doves.length) for (let x = -60; x < w + spacing; x += spacing) st.doves.push({ x, y: gy + (Math.random() - 0.5) * h * 0.5, ph: Math.random() * 6.28, sp: speed * (0.9 + Math.random() * 0.25), amp: 3 + Math.random() * 5 });
  if (dt) {
    for (const d of st.doves) d.x += d.sp * dt;
    let minx = Infinity; for (const d of st.doves) minx = Math.min(minx, d.x);
    for (const d of st.doves) if (d.x > w + 60) { d.x = minx - spacing; minx = d.x; d.y = gy + (Math.random() - 0.5) * h * 0.5; }
  }
  for (const d of st.doves) drawDove(ctx, d.x, d.y + Math.sin(t * 1.5 + d.ph) * d.amp, t, d.ph, pal, s);
}

export function initAngelicProps() {
  let doves = null;
  function mount() {
    const f = document.querySelector('.site-footer');
    if (f && !doves) { const st = { doves: [] }; doves = attach(f, 'left:0;width:100%;top:-70px;height:74px;', (c, dt, t, w, h, p) => drawDoves(c, dt, t, w, h, p, st)); }
  }
  function unmount() { if (doves) { doves.destroy(); doves = null; } }
  function sync() { if (document.documentElement.dataset.skin === 'angelic') mount(); else unmount(); }

  window.addEventListener('skinchange', sync);
  sync();
}
