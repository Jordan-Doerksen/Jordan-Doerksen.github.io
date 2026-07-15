// pool.js — alloc-light object pool with SWAP-REMOVE (perf law: never Array.splice in the
// hot loop). Dead objects are recycled through a free list so steady-state spawn/despawn does
// no allocation. Iterate .items backwards when removing during a pass.

export class Pool {
  constructor(factory, reset) {
    this.factory = factory;   // () => new blank object
    this.reset = reset;       // (obj, ...args) => initialize a recycled object
    this.items = [];          // live objects (dense)
    this.free = [];           // recycled, inactive
  }

  get count() { return this.items.length; }

  spawn(...args) {
    const o = this.free.pop() || this.factory();
    o.active = true;
    if (this.reset) this.reset(o, ...args);
    this.items.push(o);
    return o;
  }

  // Remove the object at index i by swapping the last item into its slot (O(1)).
  removeAt(i) {
    const items = this.items;
    const o = items[i];
    const last = items.length - 1;
    items[i] = items[last];
    items.pop();
    o.active = false;
    this.free.push(o);
    return o;
  }

  clear() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].active = false;
      this.free.push(this.items[i]);
    }
    this.items.length = 0;
  }
}
