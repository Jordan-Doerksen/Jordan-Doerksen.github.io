// ==========================================================================
// MINI-MOCK — tiny living elements inside project cards.
//   · Sentinel-Pro  → a miniature cockpit (ticking price + order-flow + reads)
//   · Star Charter  → a drifting asteroid field with the occasional black hole
//   · CN Conductor  → a night train running an endless track, scenery passing
// Each only runs while on screen; reduced motion renders one static frame.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- generic: run a canvas scene only while it is on screen ----------------
function runScene(canvas, make) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = null, last = 0, scene = null;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
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
  window.addEventListener('resize', resize);
  if (reduced) return;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  }).observe(canvas);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- ① Sentinel-Pro mini cockpit (DOM) -------------------------------------
const f2 = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function sentinel(el) {
  const px = el.querySelector('[data-px]'), chg = el.querySelector('[data-chg]');
  const bars = [...el.querySelectorAll('[data-bars] i')];
  const obi = el.querySelector('[data-obi]'), cvd = el.querySelector('[data-cvd]'), vwap = el.querySelector('[data-vwap]');
  if (!px) return;
  let p = 7368.25; const base = 7366.75; let cvdv = -1840;
  function tick() {
    p = Math.round((p + Math.round((Math.random() - 0.48) * 6) * 0.25) * 4) / 4;
    const c = Math.round((p - base) * 100) / 100, up = c >= 0;
    px.textContent = f2(p);
    chg.textContent = (up ? '▲ ' : '▼ ') + f2(Math.abs(c)); chg.className = 'mm-chg ' + (up ? 'up' : 'dn');
    bars.forEach((b) => { b.style.height = (16 + Math.random() * 80) + '%'; });
    const o = Math.random() * 0.55 - 0.12;
    obi.textContent = (o >= 0 ? '+' : '−') + Math.abs(o).toFixed(2); obi.className = o >= 0 ? 'up' : 'dn';
    cvdv += Math.round((Math.random() - 0.5) * 260);
    cvd.textContent = (cvdv >= 0 ? '+' : '−') + Math.abs(cvdv).toLocaleString(); cvd.className = cvdv >= 0 ? 'up' : 'dn';
    vwap.textContent = f2(7375.25 + (Math.random() - 0.5) * 2);
  }
  tick();
  if (reduced) return;
  let timer = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) timer = setInterval(tick, 1400);
    else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
  }).observe(el);
}

// ---- ② Star Charter — asteroid field + the occasional black hole -----------
function starField(w, h) {
  let stars = Array.from({ length: 46 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, tw: 0.5 + Math.random() }));
  let rocks = [];
  let hole = null, holeIn = 3 + Math.random() * 3, t = 0;
  function spawnRock() {
    const left = Math.random() < 0.5;
    rocks.push({ x: left ? -12 : w + 12, y: 10 + Math.random() * (h - 20), vx: (left ? 1 : -1) * (9 + Math.random() * 15), vy: (Math.random() - 0.5) * 6, r: 3 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.6 });
  }
  for (let i = 0; i < 3; i++) spawnRock();
  function frame(dt, ctx) {
    t += dt;
    for (const s of stars) {
      let a = 0.15 + 0.3 * Math.abs(Math.sin(s.p + t * s.tw)), sx = s.x, sy = s.y;
      if (hole) { const dx = hole.x - s.x, dy = hole.y - s.y, d = Math.hypot(dx, dy) || 1; if (d < 46) { const pull = (1 - d / 46) * 5; sx += dx / d * pull; sy += dy / d * pull; a *= clamp(d / 46, 0.2, 1); } }
      ctx.fillStyle = `rgba(233,237,246,${a})`; ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, 6.2832); ctx.fill();
    }
    if (dt) for (const o of rocks) { o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; }
    for (const o of rocks) {
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.2832, rr = o.r * (0.72 + 0.28 * Math.sin(a * 3 + o.r)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = 'rgba(120,138,170,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(190,205,255,.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    rocks = rocks.filter((o) => o.x > -20 && o.x < w + 20 && o.y > -20 && o.y < h + 20);
    while (rocks.length < 3) spawnRock();
    holeIn -= dt;
    if (!hole && holeIn <= 0) { const left = Math.random() < 0.5; hole = { x: left ? -24 : w + 24, y: h * (0.3 + Math.random() * 0.4), vx: (left ? 1 : -1) * (10 + Math.random() * 6), r: 8 + Math.random() * 3 }; }
    if (hole) {
      hole.x += hole.vx * dt;
      const g = ctx.createRadialGradient(hole.x, hole.y, hole.r * 0.5, hole.x, hole.y, hole.r * 3.4);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(79,227,208,.12)'); g.addColorStop(0.7, 'rgba(216,172,78,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * 3.4, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(216,172,78,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * 1.25, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#05070d'; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, 6.2832); ctx.fill();
      if (hole.x < -30 || hole.x > w + 30) { hole = null; holeIn = 5 + Math.random() * 4; }
    }
  }
  return { frame };
}

// ---- ③ CN Conductor — an endless night train ------------------------------
function railRun(w, h) {
  const railY = Math.round(h * 0.66), groundY = railY + 6, trainX = Math.round(w * 0.30), speed = 54;
  let dist = 0, t = 0, trees = [], smoke = [], signalX = null, signalAsp = null, animal = null;
  let treeIn = 0, signalIn = 3 + Math.random() * 3, animalIn = 4 + Math.random() * 4;
  const dualAspect = () => ({ top: Math.random() < 0.6 ? '#3ddc84' : '#ffaa44', bottom: Math.random() < 0.6 ? '#3ddc84' : '#ffaa44' });  // green/yellow, never red
  const stars = Array.from({ length: 9 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.42, r: Math.random() * 0.9 + 0.3, p: Math.random() * 6.28 }));
  const moon = { x: Math.round(w * 0.8), y: Math.round(h * 0.22), r: 6.5 };
  function spawnTree() { trees.push({ x: w + 16, h: 12 + Math.random() * 16, layer: Math.random() < 0.45 ? 1 : 0.65 }); }
  for (let i = 0; i < 4; i++) trees.push({ x: Math.random() * w, h: 12 + Math.random() * 16, layer: Math.random() < 0.5 ? 1 : 0.65 });

  function tree(ctx, x, h, layer) {
    const wd = h * 0.42, a = 0.16 + 0.24 * layer;
    ctx.fillStyle = `rgba(58,78,108,${a})`;
    ctx.fillRect(x - 1, groundY - 3, 2, 4);
    ctx.beginPath(); ctx.moveTo(x, groundY - h); ctx.lineTo(x - wd, groundY - 1); ctx.lineTo(x + wd, groundY - 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, groundY - h * 0.6); ctx.lineTo(x - wd * 1.25, groundY + 2); ctx.lineTo(x + wd * 1.25, groundY + 2); ctx.closePath(); ctx.fill();
  }
  function signal(ctx, x, asp) {
    ctx.strokeStyle = 'rgba(150,165,200,.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - 24); ctx.stroke();
    ctx.fillStyle = 'rgba(36,46,64,.95)'; roundRect(ctx, x - 3.4, groundY - 41, 6.8, 17, 2); ctx.fill();
    const lamp = (cy, c) => {
      ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, cy, 4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, cy, 2, 0, 6.28); ctx.fill();
    };
    lamp(groundY - 35, asp.top); lamp(groundY - 28, asp.bottom);
  }
  function critter(ctx, a) {
    if (a.kind === 'deer') {
      ctx.fillStyle = 'rgba(70,90,120,.6)';
      const x = a.x, y = groundY - 1;
      ctx.fillRect(x - 5, y - 6, 10, 5);
      ctx.fillRect(x - 4, y - 1, 1.6, 4); ctx.fillRect(x + 3, y - 1, 1.6, 4);
      ctx.fillRect(x + 4.5, y - 11, 1.8, 6); ctx.fillRect(x + 4, y - 13, 4, 3);
    } else {
      // a little bat, wings flapping
      const x = a.x, y = a.y, f = Math.sin(a.ph * 13) * 2.6;
      ctx.fillStyle = 'rgba(32,36,50,.92)';
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x - 3.5, y - 1 - f); ctx.lineTo(x - 7, y - 4 - f); ctx.lineTo(x - 5.5, y + 1); ctx.lineTo(x - 2.5, y + 1.5);
      ctx.lineTo(x, y + 2.4);
      ctx.lineTo(x + 2.5, y + 1.5); ctx.lineTo(x + 5.5, y + 1); ctx.lineTo(x + 7, y - 4 - f); ctx.lineTo(x + 3.5, y - 1 - f);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 1.4, y - 2.6, 1, 1.7); ctx.fillRect(x + 0.5, y - 2.6, 1, 1.7);  // ears
    }
  }
  function train(ctx, dt) {
    const x = trainX, y = railY + Math.sin(t * 8) * 0.4;   // body baseline, gentle bob
    const wy = railY + 1;                                   // wheels rest on the rail (steady)
    // smoke from the chimney
    if (dt) {
      if (Math.random() < dt * 10) smoke.push({ x: x + 24, y: y - 15, vx: -15 - Math.random() * 8, vy: -7 - Math.random() * 5, r: 1.6, life: 0 });
      for (const p of smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 7; p.life += dt; }
      smoke = smoke.filter((p) => p.life < 1.5);
    }
    for (const p of smoke) { const a = 0.16 * (1 - p.life / 1.5); ctx.fillStyle = `rgba(150,160,185,${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
    // boxcar (trailing, left)
    ctx.fillStyle = 'rgba(110,135,175,.9)'; roundRect(ctx, x - 27, y - 10, 21, 10, 2); ctx.fill();
    // engine body
    ctx.fillStyle = '#aeb8cf';
    ctx.fillRect(x - 2, y - 16, 11, 16);                    // cab (tall, at the back)
    roundRect(ctx, x + 6, y - 9, 24, 9, 2); ctx.fill();     // boiler (toward the front)
    ctx.fillRect(x + 22, y - 15, 4, 6);                     // chimney
    ctx.fillStyle = '#6aa9ff'; ctx.fillRect(x + 1, y - 12, 6, 5);   // cab window (centred in the cab)
    ctx.fillStyle = '#aeb8cf';
    ctx.beginPath(); ctx.moveTo(x + 30, y - 2); ctx.lineTo(x + 35, y + 1); ctx.lineTo(x + 30, y + 1); ctx.closePath(); ctx.fill(); // cowcatcher
    ctx.fillStyle = 'rgba(255,240,180,.6)'; ctx.beginPath(); ctx.arc(x + 30, y - 5, 1.6, 0, 6.28); ctx.fill(); // headlight
    // wheels — resting on the rail, tucked under the frame
    const driv = [x + 4, x + 12, x + 20], boxw = [x - 22, x - 11], a = t * 11;
    ctx.fillStyle = '#05070d';
    driv.forEach((wx) => { ctx.beginPath(); ctx.arc(wx, wy, 2.6, 0, 6.28); ctx.fill(); });
    boxw.forEach((wx) => { ctx.beginPath(); ctx.arc(wx, wy, 2.2, 0, 6.28); ctx.fill(); });
    ctx.strokeStyle = 'rgba(150,165,200,.45)'; ctx.lineWidth = 1;
    driv.forEach((wx) => { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 1.9, wy + Math.sin(a) * 1.9); ctx.stroke(); });
    boxw.forEach((wx) => { ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * 1.5, wy + Math.sin(a) * 1.5); ctx.stroke(); });
    // side rod across the drivers (classic steam motion)
    ctx.strokeStyle = 'rgba(90,110,150,.7)'; ctx.lineWidth = 1.4;
    const py = wy + Math.sin(a) * 1.9, dx = Math.cos(a) * 1.9;
    ctx.beginPath(); ctx.moveTo(driv[0] + dx, py); ctx.lineTo(driv[2] + dx, py); ctx.stroke();
  }

  function frame(dt, ctx) {
    t += dt; dist += speed * dt;
    // sky
    for (const s of stars) { ctx.fillStyle = `rgba(233,237,246,${0.35 + 0.3 * Math.abs(Math.sin(s.p + t))})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = 'rgba(216,220,235,.5)'; ctx.beginPath(); ctx.arc(moon.x, moon.y, moon.r, 0, 6.28); ctx.fill();
    // trees
    if (dt) trees.forEach((tr) => { tr.x -= speed * tr.layer * dt; });
    for (const tr of trees) tree(ctx, tr.x, tr.h, tr.layer);
    trees = trees.filter((tr) => tr.x > -18);
    treeIn -= dt; if (treeIn <= 0) { spawnTree(); treeIn = 0.6 + Math.random() * 1.1; }
    // animal
    animalIn -= dt;
    if (!animal && animalIn <= 0) animal = { x: w + 12, kind: Math.random() < 0.55 ? 'deer' : 'bat', y: h * 0.30, ph: 0 };
    if (animal) { animal.x -= speed * (animal.kind === 'bat' ? 1.15 : 0.9) * dt; animal.ph += dt; critter(ctx, animal); if (animal.x < -14) { animal = null; animalIn = 5 + Math.random() * 6; } }
    // signal (once in a while)
    signalIn -= dt;
    if (signalX === null && signalIn <= 0) { signalX = w + 12; signalAsp = dualAspect(); }
    if (signalX !== null) { signalX -= speed * dt; signal(ctx, signalX, signalAsp); if (signalX < -8) { signalX = null; signalIn = 5 + Math.random() * 5; } }
    // ground + rail + ties
    ctx.strokeStyle = 'rgba(190,205,255,.10)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,150,200,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, railY + 3); ctx.lineTo(w, railY + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,150,200,.22)'; ctx.lineWidth = 2;
    const gap = 14, off = dist % gap;
    for (let x = -off; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, railY + 1); ctx.lineTo(x, railY + 5); ctx.stroke(); }
    // the train
    train(ctx, dt);
  }
  return { frame };
}

// ---- ④ Switch List — a cut rolls in and couples (a switching move) ---------
function switchYard(w, h) {
  const railY = Math.round(h * 0.60), carW = 24, gap = 3;
  const standX = Math.round(w * 0.44);              // right edge of the standing cut
  let dist = 0, t = 0, spark = 0, phase = 'in', wait = 0;
  let roller = { x: w + 20, vx: -(30 + Math.random() * 8) };
  const stars = Array.from({ length: 7 }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.42, r: Math.random() * 0.8 + 0.3, p: Math.random() * 6.28 }));
  function boxcar(ctx, x, y, lit) {
    ctx.fillStyle = lit ? 'rgba(150,170,205,.95)' : 'rgba(110,135,175,.88)';
    roundRect(ctx, x - carW, y - 11, carW, 11, 2); ctx.fill();
    ctx.fillStyle = 'rgba(58,78,112,.7)'; ctx.fillRect(x - carW * 0.6, y - 9, 5, 9);            // door
    ctx.fillStyle = '#05070d';
    ctx.beginPath(); ctx.arc(x - carW + 5, y + 1, 2.2, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 5, y + 1, 2.2, 0, 6.28); ctx.fill();
  }
  function frame(dt, ctx) {
    t += dt; dist += 11 * dt;
    for (const s of stars) { ctx.fillStyle = `rgba(233,237,246,${0.22 + 0.24 * Math.abs(Math.sin(s.p + t))})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill(); }
    ctx.strokeStyle = 'rgba(190,205,255,.10)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, railY + 7); ctx.lineTo(w, railY + 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,150,200,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, railY + 3); ctx.lineTo(w, railY + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,150,200,.2)'; ctx.lineWidth = 2;
    const g = 14, off = dist % g;
    for (let x = -off; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, railY + 1); ctx.lineTo(x, railY + 5); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(120,150,200,.16)'; ctx.lineWidth = 1.2;                              // turnout stub
    ctx.beginPath(); ctx.moveTo(standX - carW * 2, railY + 3); ctx.lineTo(standX - carW * 2 - 22, railY + 15); ctx.lineTo(0, railY + 15); ctx.stroke();
    boxcar(ctx, standX, railY, spark > 0);
    boxcar(ctx, standX - carW - gap, railY, false);
    if (roller) {
      if (dt && phase === 'in') roller.x += roller.vx * dt;
      boxcar(ctx, roller.x, railY, false);
      if (phase === 'in' && roller.x <= standX + carW + gap) { roller.x = standX + carW + gap; phase = 'wait'; wait = 1.5; spark = 0.45; }
    }
    if (phase === 'wait') { wait -= dt; if (wait <= 0) { phase = 'in'; roller = { x: w + 20, vx: -(30 + Math.random() * 8) }; } }
    if (spark > 0) {
      spark -= dt; const a = clamp(spark / 0.45, 0, 1);
      ctx.fillStyle = `rgba(216,172,78,${0.65 * a})`;
      ctx.beginPath(); ctx.arc(standX + 2, railY - 5, 1.5 + (1 - a) * 4, 0, 6.28); ctx.fill();
    }
  }
  return { frame };
}

// ---- boot ------------------------------------------------------------------
document.querySelectorAll('.mini-mock[data-mock="sentinel"]').forEach(sentinel);
document.querySelectorAll('.mini-canvas[data-mock="starcharter"] canvas').forEach((c) => runScene(c, starField));
document.querySelectorAll('.mini-yard[data-mock="conductor"] canvas').forEach((c) => runScene(c, railRun));
document.querySelectorAll('.mini-yard[data-mock="switchlist"] canvas').forEach((c) => runScene(c, switchYard));
