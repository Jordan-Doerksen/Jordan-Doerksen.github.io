// dom.js — tiny DOM helpers for the ui domain. No game knowledge here.

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// Patch textContent only when the value actually changed (no per-frame churn).
export function setText(node, value) {
  const s = String(value);
  if (node.__last !== s) {
    node.__last = s;
    node.textContent = s;
  }
}

export function setClass(node, cls, on) {
  if (node.classList.contains(cls) !== !!on) node.classList.toggle(cls, !!on);
}

export function show(node, on) {
  setClass(node, 'hidden', !on);
}
