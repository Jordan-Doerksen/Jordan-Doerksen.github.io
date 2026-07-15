// grid.js — one uniform spatial hash, rebuilt once per tick from the live enemy list. EVERY
// range query in the sim (weapon target-pick, combat hit-test, chain, pull, blast) goes through
// this — never a brute-force n² scan over the pool (perf law). Stores object references.

export class Grid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();   // packed cell key -> array of objects
  }

  _key(cx, cy) {
    // pack two signed cell coords into one number key (offset keeps them non-negative)
    return ((cx + 4096) * 8192) + (cy + 4096);
  }

  rebuild(objects) {
    this.map.clear();
    for (let i = 0; i < objects.length; i++) this.add(objects[i]);
  }

  // insert a single object (e.g. the boss, which lives outside the enemy pool)
  add(o) {
    const inv = 1 / this.cell;
    const k = this._key((o.x * inv) | 0, (o.y * inv) | 0);
    let bucket = this.map.get(k);
    if (!bucket) { bucket = []; this.map.set(k, bucket); }
    bucket.push(o);
  }

  // Call cb(obj) for every stored object whose cell overlaps the query circle's bounding box.
  // Callback must do its own precise distance test (this is a broadphase).
  query(x, y, r, cb) {
    const inv = 1 / this.cell;
    const minx = ((x - r) * inv) | 0, maxx = ((x + r) * inv) | 0;
    const miny = ((y - r) * inv) | 0, maxy = ((y + r) * inv) | 0;
    for (let cx = minx; cx <= maxx; cx++) {
      for (let cy = miny; cy <= maxy; cy++) {
        const bucket = this.map.get(this._key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) cb(bucket[i]);
      }
    }
  }

  // Nearest live enemy to (x,y) within r that passes optional filter. Returns object or null.
  nearest(x, y, r, filter) {
    let best = null, bestD = r * r;
    this.query(x, y, r, (o) => {
      if (o.dead || (filter && !filter(o))) return;
      const dx = o.x - x, dy = o.y - y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  }
}
