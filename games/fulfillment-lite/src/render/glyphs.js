// glyphs.js — pure silhouette geometry (DECISIONS 4.1). No state, no world, just paths on a ctx.
// The enemy read is "corner-count encodes strength": a circle is weakest, more corners = tankier,
// each drawn as a clean neon polygon. The ship is a delta; the boss is an octagon. These are the
// whole visual language, so they stay deliberately spare — a heading and a corner-count carry it.

// Trace a regular polygon (corners<3 falls back to a circle) into the current path.
export function polyPath(ctx, x, y, radius, corners, rot) {
  ctx.beginPath();
  if (corners < 3) { ctx.arc(x, y, radius, 0, Math.PI * 2); return; }
  const step = (Math.PI * 2) / corners;
  for (let i = 0; i < corners; i++) {
    const a = rot + i * step;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// The Courier — a layered delta pointing along +x. Caller has already translated to the ship and
// rotated to its heading, so we draw in local space. r is the ship (collision) radius; the hull
// deliberately overdraws it a little — the old 4-point sliver read as a cursor, not a ship.
export function shipPath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(r * 1.65, 0);             // nose
  ctx.lineTo(r * 0.25, r * 0.5);       // starboard shoulder
  ctx.lineTo(-r * 0.55, r * 1.15);     // swept wingtip
  ctx.lineTo(-r * 1.0, r * 0.55);      // wing root
  ctx.lineTo(-r * 0.7, 0);             // engine notch
  ctx.lineTo(-r * 1.0, -r * 0.55);
  ctx.lineTo(-r * 0.55, -r * 1.15);
  ctx.lineTo(r * 0.25, -r * 0.5);
  ctx.closePath();
}

// A small four-point diamond (XP gems, enemy shards). Centered at x,y.
export function diamondPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

// A short bolt streak from (x,y) back along the travel angle. len scales the tail.
export function boltPath(ctx, x, y, ang, len) {
  const bx = x - Math.cos(ang) * len, by = y - Math.sin(ang) * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(bx, by);
}
