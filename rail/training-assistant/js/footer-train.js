// ==========================================================================
// FOOTER TRAIN — a clean, professional endless train for the footer band.
// Descended from the portfolio night-train, but daytime + restrained: charcoal
// loco and cars with a rail-red accent, subtle smoke, scrolling ties, and the
// occasional passing signal (on theme for a signals trainer). Runs only while
// on screen; reduced motion draws a single static frame.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function runScene(canvas, make) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = null, last = 0, scene = null;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scene = make(w, h);
    if (reduced) { ctx.clearRect(0, 0, w, h); scene.frame(0, ctx, w, h); }
  }
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    ctx.clearRect(0, 0, w, h);
    scene.frame(dt, ctx, w, h);
    raf = requestAnimationFrame(loop);
  }
  resize();
  addEventListener('resize', resize);
  if (reduced) return;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  }).observe(canvas);
}

// ---- the scene -------------------------------------------------------------
const INK = '#2f3742', INK2 = '#3a434f', STEEL = '#586577', ACCENT = '#b3322c';
const GREEN = '#2f7a4d', AMBER = '#b06a12';                 // dual-aspect lamps — never red boards
const dualAspect = () => ({ top: Math.random() < 0.6 ? GREEN : AMBER, bottom: Math.random() < 0.6 ? GREEN : AMBER });

function railRun(w, h) {
  const railY = Math.round(h * 0.72), groundY = railY + 4, trainX = Math.round(Math.min(w * 0.30, 240)), speed = 52;
  let dist = 0, t = 0, smoke = [], pines = [], signalX = null, signalAsp = dualAspect(), signalIn = 4 + Math.random() * 4;
  let pineIn = 0;
  const spawnPine = () => pines.push({ x: w + 14, h: 8 + Math.random() * 12, layer: Math.random() < 0.5 ? 1 : 0.62 });
  for (let i = 0; i < 5; i++) pines.push({ x: Math.random() * w, h: 8 + Math.random() * 12, layer: Math.random() < 0.5 ? 1 : 0.62 });

  function pine(ctx, x, ph, layer) {
    const wd = ph * 0.4;
    ctx.fillStyle = `rgba(70,95,90,${0.10 + 0.12 * layer})`;
    ctx.beginPath(); ctx.moveTo(x, groundY - ph); ctx.lineTo(x - wd, groundY); ctx.lineTo(x + wd, groundY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, groundY - ph * 0.62); ctx.lineTo(x - wd * 1.2, groundY + 1); ctx.lineTo(x + wd * 1.2, groundY + 1); ctx.closePath(); ctx.fill();
  }
  function signal(ctx, x, asp) {
    ctx.strokeStyle = 'rgba(88,101,119,.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - 21); ctx.stroke();
    ctx.fillStyle = 'rgba(47,55,66,.95)'; roundRect(ctx, x - 3.2, groundY - 36, 6.4, 15, 2); ctx.fill();
    const lamp = (cy, c) => {
      ctx.globalAlpha = 0.3; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, cy, 3, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, cy, 1.7, 0, 6.28); ctx.fill();
    };
    lamp(groundY - 31, asp.top); lamp(groundY - 25, asp.bottom);
  }
  function car(ctx, x, y, ww, fill) {
    ctx.fillStyle = fill; roundRect(ctx, x, y - 11, ww, 11, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x + 2, y - 9, ww - 4, 2);   // roof sheen
  }
  function wheel(ctx, wx, wy, r, a) {
    ctx.fillStyle = '#1a1e24'; ctx.beginPath(); ctx.arc(wx, wy, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(120,135,160,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (r - 0.6), wy + Math.sin(a) * (r - 0.6)); ctx.stroke();
  }
  function train(ctx, dt) {
    const x = trainX, y = railY + Math.sin(t * 8) * 0.3, wy = railY + 1, a = t * 11;
    // smoke
    if (dt) {
      if (Math.random() < dt * 9) smoke.push({ x: x + 24, y: y - 17, vx: -14 - Math.random() * 7, vy: -7 - Math.random() * 4, r: 1.5, life: 0 });
      for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 6; p.life += dt; }
      smoke = smoke.filter((p) => p.life < 1.5);
    }
    for (const p of smoke) { ctx.fillStyle = `rgba(120,130,145,${0.14 * (1 - p.life / 1.5)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
    // trailing cars + couplers
    ctx.strokeStyle = STEEL; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 2, y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 31, y - 4); ctx.lineTo(x - 27, y - 4); ctx.stroke();
    car(ctx, x - 27, y, 21, ACCENT);        // CN-red boxcar
    car(ctx, x - 52, y, 21, INK2);          // slate boxcar
    // engine
    ctx.fillStyle = INK;
    ctx.fillRect(x - 2, y - 17, 11, 17);                    // cab
    roundRect(ctx, x + 6, y - 9, 24, 9, 2); ctx.fill();     // boiler
    ctx.fillRect(x + 22, y - 16, 4, 7);                     // chimney
    ctx.fillStyle = ACCENT; ctx.fillRect(x - 2, y - 3, 32, 2);  // running-board accent stripe
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 1, y - 13, 6, 5);   // lit cab window
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.moveTo(x + 30, y - 2); ctx.lineTo(x + 35, y + 1); ctx.lineTo(x + 30, y + 1); ctx.closePath(); ctx.fill(); // cowcatcher
    ctx.fillStyle = 'rgba(255,226,150,.85)'; ctx.beginPath(); ctx.arc(x + 30, y - 5, 1.7, 0, 6.28); ctx.fill(); // headlight
    // wheels (drivers + cars) with side rod
    const driv = [x + 4, x + 12, x + 20];
    driv.forEach((wx) => wheel(ctx, wx, wy, 2.6, a));
    [x - 22, x - 11, x - 47, x - 36].forEach((wx) => wheel(ctx, wx, wy, 2.2, a));
    ctx.strokeStyle = 'rgba(88,101,119,.8)'; ctx.lineWidth = 1.4;
    const py = wy + Math.sin(a) * 1.9, dx = Math.cos(a) * 1.9;
    ctx.beginPath(); ctx.moveTo(driv[0] + dx, py); ctx.lineTo(driv[2] + dx, py); ctx.stroke();
  }

  function frame(dt, ctx) {
    t += dt; dist += speed * dt;
    // distant pines
    if (dt) pines.forEach((p) => { p.x -= speed * p.layer * 0.5 * dt; });
    for (const p of pines) pine(ctx, p.x, p.h, p.layer);
    pines = pines.filter((p) => p.x > -16);
    pineIn -= dt; if (pineIn <= 0) { spawnPine(); pineIn = 0.9 + Math.random() * 1.4; }
    // passing signal
    signalIn -= dt;
    if (signalX === null && signalIn <= 0) { signalX = w + 12; signalAsp = dualAspect(); }
    if (signalX !== null) { signalX -= speed * dt; signal(ctx, signalX, signalAsp); if (signalX < -8) { signalX = null; signalIn = 6 + Math.random() * 6; } }
    // rail + ties
    ctx.strokeStyle = 'rgba(88,101,119,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, railY + 3); ctx.lineTo(w, railY + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(88,101,119,.26)'; ctx.lineWidth = 2;
    const gap = 14, off = dist % gap;
    for (let xx = -off; xx < w; xx += gap) { ctx.beginPath(); ctx.moveTo(xx, railY + 1); ctx.lineTo(xx, railY + 5); ctx.stroke(); }
    train(ctx, dt);
  }
  return { frame };
}

document.querySelectorAll('canvas[data-train]').forEach((c) => runScene(c, railRun));
