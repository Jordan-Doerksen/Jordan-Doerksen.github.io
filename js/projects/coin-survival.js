// ==========================================================================
// COIN SURVIVAL — the browser homage to the Warcraft III map.
// Catch coins (+10) and gems (+50). Dodge skulls (-1 life). Speed ramps.
// Controls: ← → / A D, or move the mouse over the canvas.
// ==========================================================================

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCoinSurvival() {
  const canvas = document.getElementById('coin-game');
  const overlay = document.getElementById('coin-overlay');
  const startBtn = document.getElementById('coin-start');
  if (!canvas || !overlay || !startBtn) return;

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;
  let running = false;
  let raf = null;

  const state = {
    heroX: 0,
    targetX: null, // mouse target
    keys: { left: false, right: false },
    drops: [],
    score: 0,
    lives: 3,
    wave: 0,
    spawnTimer: 0,
    flash: 0, // red flash when hit
  };

  let best = 0;
  try { best = Number(localStorage.getItem('coinSurvivalBest')) || 0; } catch { /* private mode */ }

  const HERO_W = 46;
  const HERO_H = 16;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.heroX = Math.min(state.heroX || w / 2, w);
    drawIdle();
  }

  function reset() {
    state.heroX = w / 2;
    state.targetX = null;
    state.drops = [];
    state.score = 0;
    state.lives = 3;
    state.wave = 0;
    state.spawnTimer = 0;
    state.flash = 0;
  }

  function spawn() {
    const roll = Math.random();
    // 12% skull, 8% gem, rest coins — skulls get more common with score
    const skullChance = Math.min(0.3, 0.12 + state.score / 2500);
    let kind = 'coin';
    if (roll < skullChance) kind = 'skull';
    else if (roll < skullChance + 0.08) kind = 'gem';

    state.drops.push({
      kind,
      x: 18 + Math.random() * (w - 36),
      y: -14,
      r: kind === 'gem' ? 8 : 9,
      v: (1.4 + Math.random() * 1.2) * (1 + state.score / 800),
      spin: Math.random() * Math.PI * 2,
    });
  }

  function update() {
    // Hero movement
    const speed = 5.2;
    if (state.keys.left) state.heroX -= speed;
    if (state.keys.right) state.heroX += speed;
    if (state.targetX !== null) state.heroX += (state.targetX - state.heroX) * 0.2;
    state.heroX = Math.max(HERO_W / 2, Math.min(w - HERO_W / 2, state.heroX));

    // Spawning
    state.spawnTimer -= 1;
    if (state.spawnTimer <= 0) {
      spawn();
      state.wave += 1;
      state.spawnTimer = Math.max(16, 46 - state.wave * 0.6);
    }

    // Drops
    const heroY = h - 30;
    for (let i = state.drops.length - 1; i >= 0; i--) {
      const d = state.drops[i];
      d.y += d.v;
      d.spin += 0.08;

      const caught =
        d.y + d.r > heroY - HERO_H / 2 &&
        d.y - d.r < heroY + HERO_H &&
        Math.abs(d.x - state.heroX) < HERO_W / 2 + d.r * 0.6;

      if (caught) {
        if (d.kind === 'skull') {
          state.lives -= 1;
          state.flash = 1;
          if (state.lives <= 0) return gameOver();
        } else {
          state.score += d.kind === 'gem' ? 50 : 10;
        }
        state.drops.splice(i, 1);
      } else if (d.y - d.r > h) {
        state.drops.splice(i, 1);
      }
    }

    state.flash *= 0.92;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Arena floor line
    ctx.strokeStyle = 'rgba(106, 169, 255, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, h - 14);
    ctx.lineTo(w, h - 14);
    ctx.stroke();

    // Drops
    for (const d of state.drops) {
      if (d.kind === 'coin') {
        const squish = Math.abs(Math.cos(d.spin)); // fake 3D spin
        ctx.fillStyle = '#d4a843';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * Math.max(0.25, squish), d.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(d.x - 2, d.y - 2, d.r * 0.25 * squish, d.r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === 'gem') {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#6aa9ff';
        ctx.fillRect(-d.r * 0.7, -d.r * 0.7, d.r * 1.4, d.r * 1.4);
        ctx.restore();
      } else {
        // skull: gray circle + eyes
        ctx.fillStyle = '#aeb6c2';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#070a10';
        ctx.beginPath();
        ctx.arc(d.x - 3, d.y - 1, 2, 0, Math.PI * 2);
        ctx.arc(d.x + 3, d.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(d.x - 4, d.y + 4, 8, 2);
      }
    }

    // Hero — a small shield-shaped catcher with a gold trim
    const heroY = h - 30;
    ctx.fillStyle = '#10131a';
    ctx.strokeStyle = '#d4a843';
    ctx.lineWidth = 1.5;
    roundRect(ctx, state.heroX - HERO_W / 2, heroY - HERO_H / 2, HERO_W, HERO_H, 6);
    ctx.fill();
    ctx.stroke();

    // HUD
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e7eaf0';
    ctx.fillText(`SCORE ${state.score}`, 14, 24);
    ctx.fillStyle = '#5d6573';
    ctx.fillText(`BEST ${best}`, 14, 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('♥'.repeat(state.lives) + ' '.repeat(0), w - 14, 24);

    // Hit flash
    if (state.flash > 0.03) {
      ctx.fillStyle = `rgba(255, 70, 70, ${state.flash * 0.18})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawIdle() {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5d6573';
    ctx.fillText('COIN SURVIVAL', w / 2, h / 2);
  }

  function loop() {
    update();
    if (!running) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    reset();
    overlay.hidden = true;
    running = true;
    canvas.focus?.();
    if (raf) cancelAnimationFrame(raf);
    loop();
  }

  function gameOver() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('coinSurvivalBest', String(best)); } catch { /* ignore */ }
    }
    draw();
    overlay.hidden = false;
    startBtn.textContent = '↻  Run it back';
    overlay.querySelector('p').textContent = `Final score: ${state.score} · Best: ${best}`;
  }

  // --- Input ---
  startBtn.addEventListener('click', start);

  addEventListener('keydown', (e) => {
    if (!running) return;
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) { state.keys.left = true; e.preventDefault(); }
    if (['ArrowRight', 'd', 'D'].includes(e.key)) { state.keys.right = true; e.preventDefault(); }
  });
  addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) state.keys.left = false;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) state.keys.right = false;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    state.targetX = e.clientX - rect.left;
  });
  canvas.addEventListener('pointerleave', () => { state.targetX = null; });

  resize();
  addEventListener('resize', resize);

  // Reduced motion: the game is opt-in (user-initiated), so it still works,
  // but we slow the ramp slightly to keep it gentle.
  if (reduced) state.spawnTimer = 60;
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
