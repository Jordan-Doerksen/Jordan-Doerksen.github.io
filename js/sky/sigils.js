// ==========================================================================
// SKY MODE · SIGILS — Demonic. An occult field: glowing runes/glyphs that pulse
// in and out, the odd full summoning circle rotating + fading, drifting smoke,
// and a low hell-glow rising from the bottom. Reads --sky-warm (molten orange)
// + --sky-meteor (sulfur). Low-alpha so it stays ritual, not noisy.
// ==========================================================================

export function makeSigils(ctx) {
  let w = 0, h = 0, glyphs = [], circles = [], smoke = [];

  function spawnGlyph(seed) {
    return { x: Math.random() * w, y: Math.random() * h, age: seed ? Math.random() * 4 : 0, ttl: 3 + Math.random() * 4, kind: Math.floor(Math.random() * 4), size: 7 + Math.random() * 12, sulfur: Math.random() < 0.4, rot: Math.random() * 6.28 };
  }
  function spawnSmoke(seed) { return { x: Math.random() * w, y: seed ? Math.random() * h : h + 60, r: 120 + Math.random() * 160, v: 5 + Math.random() * 6, a: 0.05 + Math.random() * 0.05 }; }
  function resize(_w, _h) {
    w = _w; h = _h;
    glyphs = Array.from({ length: Math.max(6, Math.round((w * h) / 130000)) }, () => spawnGlyph(true));
    smoke = Array.from({ length: 5 }, () => spawnSmoke(true));
    circles = [];
  }

  function rune(x, y, s, kind, rot, col, a) {
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    if (kind === 0) { ctx.arc(0, 0, s, 0, 6.2832); ctx.moveTo(0, -s); ctx.lineTo(0, s); }
    else if (kind === 1) { ctx.moveTo(0, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); }
    else if (kind === 2) { ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.7, -s * 0.7); ctx.lineTo(s * 0.7, s * 0.7); }
    else { for (let i = 0; i < 5; i++) { const a2 = -Math.PI / 2 + i * 4 * Math.PI / 5; const px = Math.cos(a2) * s, py = Math.sin(a2) * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
    ctx.stroke(); ctx.restore();
  }
  function summon(c, col, a) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.age * 0.3);
    ctx.strokeStyle = `rgba(${col}, ${a})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, c.r * 0.82, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const a2 = -Math.PI / 2 + i * 4 * Math.PI / 5; const px = Math.cos(a2) * c.r * 0.82, py = Math.sin(a2) * c.r * 0.82; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a2 = i * 6.2832 / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * c.r, Math.sin(a2) * c.r); ctx.lineTo(Math.cos(a2) * c.r * 0.92, Math.sin(a2) * c.r * 0.92); ctx.stroke(); }
    ctx.restore();
  }

  function draw(dt, env) {
    const { t, skin } = env, warm = skin.warm, sulfur = skin.meteor;
    const grd = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, Math.max(w, h) * 0.8);  // hell-glow from below
    const breath = 0.85 + 0.15 * Math.sin(t * 0.5);
    grd.addColorStop(0, `rgba(${warm}, ${0.08 * breath})`); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

    for (const s of smoke) {                                        // drifting smoke
      if (dt) { s.y -= s.v * dt; if (s.y + s.r < 0) Object.assign(s, spawnSmoke(false)); }
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, `rgba(${warm}, ${s.a})`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
    }
    for (const gl of glyphs) {                                      // pulsing runes
      if (dt) { gl.age += dt; if (gl.age > gl.ttl) Object.assign(gl, spawnGlyph(false)); }
      const f = Math.max(0, Math.min(1, Math.min(gl.age / 0.8, (gl.ttl - gl.age) / 1.2)));
      if (f > 0) rune(gl.x, gl.y, gl.size, gl.kind, gl.rot, gl.sulfur ? sulfur : warm, 0.28 * f);
    }
    if (dt) {                                                       // occasional summoning circle
      if (Math.random() < dt * 0.22) circles.push({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.15 + Math.random() * 0.7), r: 40 + Math.random() * 50, age: 0, ttl: 4 + Math.random() * 2 });
      for (const c of circles) c.age += dt;
      circles = circles.filter((c) => c.age < c.ttl);
    }
    for (const c of circles) { const f = Math.max(0, Math.min(1, Math.min(c.age / 1, (c.ttl - c.age) / 1.4))); if (f > 0) summon(c, warm, 0.22 * f); }
  }

  function frame(dt, env) { draw(dt, env); }
  function staticFrame(env) { draw(0, env); }

  return { resize, frame, static: staticFrame };
}
