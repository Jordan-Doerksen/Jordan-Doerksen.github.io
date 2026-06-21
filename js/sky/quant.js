// ==========================================================================
// SKY MODE · QUANT — Pro. A live quant terminal, dialled to 11: a blueprint grid
// with a scanning sweep, matrix-style columns of generated code/figures, a
// streaming candlestick tape, drifting greeks/formulas, and a physics node-
// network that bounces around and leans toward the cursor. Navy + market-green +
// oxblood. Reads --sky-warm (navy) + --sky-meteor (green); oxblood is baked.
// ==========================================================================

export function makeQuant(ctx) {
  let w = 0, h = 0, cols = [], candles = [], candleOff = 0, formulas = [], nodes = [];
  const OX = '122, 34, 48';
  const GLYPH = '0123456789$%+-<>ΔΓΘΣσμβλρ';
  const FX = ['Δ', 'Γ', 'Θ', 'ν', 'ρ', 'σ√t', '∫dS', 'Σwᵢ', 'e^{-rt}', 'N(d₁)', '∂V/∂S', 'μΔt', 'β', 'VaR₉₅', 'α', '√Δt', 'dW', 'λ'];

  function spawnFormula(seed) { return { x: Math.random() * w, y: seed ? Math.random() * h : h + 20, vx: (Math.random() - 0.5) * 8, vy: -(6 + Math.random() * 10), age: seed ? Math.random() * 6 : 0, ttl: 6 + Math.random() * 5, txt: FX[Math.floor(Math.random() * FX.length)], green: Math.random() < 0.25 }; }
  function pushCandle() { const prev = candles.length ? candles[candles.length - 1].c : h * 0.5; let c = prev + (Math.random() - 0.5) * 16; c = Math.max(h * 0.4, Math.min(h * 0.6, c)); candles.push({ o: prev, c, hi: Math.min(c, prev) - Math.random() * 8, lo: Math.max(c, prev) + Math.random() * 8 }); }
  function resize(_w, _h) {
    w = _w; h = _h;
    const nc = Math.max(8, Math.floor(w / 34));
    cols = Array.from({ length: nc }, (_, i) => ({ x: (i + 0.5) * (w / nc), y: Math.random() * h, sp: 50 + Math.random() * 130, len: 5 + Math.floor(Math.random() * 9), tone: Math.random() }));
    candles = []; candleOff = 0; for (let i = 0; i < Math.ceil(w / 12) + 2; i++) pushCandle();
    formulas = Array.from({ length: 9 }, () => spawnFormula(true));
    nodes = Array.from({ length: 16 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50 }));
  }

  function draw(dt, env) {
    const { t, smx, smy, skin } = env, navy = skin.warm, green = skin.meteor;

    ctx.strokeStyle = `rgba(${navy}, 0.06)`; ctx.lineWidth = 1; ctx.beginPath();   // blueprint grid
    const step = 46; for (let x = step / 2; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (let y = step / 2; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
    const scanY = (t * 60) % (h + 80) - 40;                                        // scanning sweep
    const sg = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40); sg.addColorStop(0, 'transparent'); sg.addColorStop(0.5, `rgba(${green}, 0.06)`); sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0, scanY - 40, w, 80);

    // streaming candlestick tape
    if (dt) { candleOff += 26 * dt; while (candleOff >= 12) { candleOff -= 12; candles.shift(); pushCandle(); } }
    for (let i = 0; i < candles.length; i++) {
      const cd = candles[i], x = i * 12 - candleOff; if (x < -12 || x > w) continue;
      const up = cd.c < cd.o, col = up ? green : OX;
      ctx.strokeStyle = `rgba(${col}, 0.45)`; ctx.fillStyle = `rgba(${col}, 0.22)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 6, cd.hi); ctx.lineTo(x + 6, cd.lo); ctx.stroke();
      const top = Math.min(cd.o, cd.c), bh = Math.max(2, Math.abs(cd.c - cd.o)); ctx.fillRect(x + 2, top, 8, bh); ctx.strokeRect(x + 2, top, 8, bh);
    }

    // matrix code rain (generated figures)
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'alphabetic';
    for (const c of cols) {
      if (dt) { c.y += c.sp * dt; if (c.y - c.len * 15 > h) c.y = -Math.random() * h * 0.4; }
      for (let k = 0; k < c.len; k++) {
        const yy = c.y - k * 15; if (yy < 0 || yy > h) continue;
        const a = k === 0 ? 0.75 : Math.max(0, 0.42 - k * 0.05); if (a <= 0) continue;
        const col = k === 0 ? (c.tone < 0.5 ? green : navy) : navy;
        const ch = k === 0 ? GLYPH[Math.floor(Math.random() * GLYPH.length)] : GLYPH[(k * 7 + Math.floor(c.y / 15)) % GLYPH.length];
        ctx.fillStyle = `rgba(${col}, ${a})`; ctx.fillText(ch, c.x, yy);
      }
    }

    // physics node-network (bounces, leans toward the cursor)
    const cxp = (smx || 0.5) * w, cyp = (smy || 0.5) * h;
    if (dt) {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {   // mutual repulsion so they spread, not clump
        const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < 120) { const f = (120 - d) / 120 * 1100 * dt, ux = dx / d, uy = dy / d; a.vx += ux * f; a.vy += uy * f; b.vx -= ux * f; b.vy -= uy * f; }
      }
      for (const n of nodes) {
        n.vx += (cxp - n.x) * 0.05 * dt; n.vy += (cyp - n.y) * 0.05 * dt;                 // gentle pull toward the cursor
        const sp = Math.hypot(n.vx, n.vy); if (sp > 220) { n.vx *= 220 / sp; n.vy *= 220 / sp; }   // cap speed (keeps it calm)
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > w) { n.vx *= -1; n.x = Math.max(0, Math.min(w, n.x)); }
        if (n.y < 0 || n.y > h) { n.vy *= -1; n.y = Math.max(0, Math.min(h, n.y)); }
        n.vx *= 0.99; n.vy *= 0.99;
      }
    }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 150 * 150) { ctx.strokeStyle = `rgba(${navy}, ${0.18 * (1 - Math.sqrt(d2) / 150)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    for (const n of nodes) { ctx.fillStyle = `rgba(${OX}, 0.6)`; ctx.beginPath(); ctx.arc(n.x, n.y, 2, 0, 6.2832); ctx.fill(); }

    // drifting greeks / formulas
    ctx.font = 'italic 15px Georgia, serif';
    for (const f of formulas) {
      if (dt) { f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.age > f.ttl || f.y < -20) Object.assign(f, spawnFormula(false)); }
      const k = Math.max(0, Math.min(1, Math.min(f.age / 1.2, (f.ttl - f.age) / 1.6)));
      ctx.fillStyle = `rgba(${f.green ? green : navy}, ${0.4 * k})`; ctx.fillText(f.txt, f.x, f.y);
    }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
