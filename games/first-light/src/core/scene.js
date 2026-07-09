// core/scene.js — the canvas surface: DPR-aware fullscreen sizing + reduced-motion law.
// Owns nothing about gameplay. Everything else reads W/H/DPR from here.

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scene = { cvs: null, ctx: null, W: 0, H: 0, DPR: 1 };

export function initScene() {
  scene.cvs = document.getElementById('sea');
  scene.ctx = scene.cvs.getContext('2d');
  const resize = () => {
    scene.DPR = Math.min(devicePixelRatio || 1, 2);
    scene.W = scene.cvs.width = Math.floor(innerWidth * scene.DPR);
    scene.H = scene.cvs.height = Math.floor(innerHeight * scene.DPR);
    scene.cvs.style.width = innerWidth + 'px';
    scene.cvs.style.height = innerHeight + 'px';
  };
  addEventListener('resize', resize);
  resize();
  return scene;
}

// shared tiny math helpers — 3 lines, they stay inline (the 5-line-utility clause)
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
