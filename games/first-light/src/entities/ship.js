// entities/ship.js — the lightship. Direct-follow steering with heavy hull momentum
// (Star Charter Pro's control redesign on a Boat-Rogue hull). Holds the lamp: the beam
// always points along the heading. Focus = slower, tighter, longer beam.
// All feel numbers live in config.ship / config.lamp; draft bonuses arrive via mods.

import { clamp } from '../core/scene.js';

export function createShip(cfg, scene) {
  const S = cfg.ship, L = cfg.lamp;
  const p = { x: 0, y: 0, vx: 0, vy: 0, r: S.radius * scene.DPR, heading: -Math.PI / 2 };
  const ship = { p, focus: false, iframeLeft: 0 };

  ship.reset = () => {
    p.x = scene.W / 2; p.y = scene.H * 0.72;
    p.vx = 0; p.vy = 0; p.heading = -Math.PI / 2;
    ship.iframeLeft = 0;
  };

  ship.update = (dt, input, mods) => {
    const DPR = scene.DPR;
    const maxSpeed = S.maxSpeed * mods.speed * (ship.focus ? S.focusSpeedMult : 1) * DPR;
    if (input.pointer.active) {
      const dx = input.pointer.x - p.x, dy = input.pointer.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > S.arriveRadius * DPR * 0.25) {
        const ease = Math.min(1, d / (S.arriveRadius * DPR)); // arrive dead-zone easing
        const a = S.accel * DPR * ease;
        p.vx += (dx / d) * a * dt;
        p.vy += (dy / d) * a * dt;
      }
    }
    p.vx *= S.drag; p.vy *= S.drag;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxSpeed) { p.vx = (p.vx / sp) * maxSpeed; p.vy = (p.vy / sp) * maxSpeed; }
    p.x = clamp(p.x + p.vx * dt, p.r, scene.W - p.r);
    p.y = clamp(p.y + p.vy * dt, p.r, scene.H - p.r);
    // heading follows real motion; below a crawl it drifts toward the pointer instead
    if (sp > 12 * DPR) {
      p.heading = Math.atan2(p.vy, p.vx);
    } else if (input.pointer.active) {
      const tx = input.pointer.x - p.x, ty = input.pointer.y - p.y;
      if (Math.hypot(tx, ty) > 30 * DPR) p.heading = Math.atan2(ty, tx);
    }
    if (ship.iframeLeft > 0) ship.iframeLeft -= dt;
  };

  // current beam geometry (bow lamp + optional stern lamp), mods + focus applied
  ship.beams = (mods) => {
    const DPR = scene.DPR;
    const arc = L.arc * mods.beamArc * (ship.focus ? L.focusArcMult : 1);
    const range = L.range * mods.beamRange * (ship.focus ? L.focusRangeMult : 1) * DPR;
    const list = [{ x: p.x, y: p.y, heading: p.heading, arc, range, power: 1 }];
    if (mods.sternLamp) {
      list.push({ x: p.x, y: p.y, heading: p.heading + Math.PI, arc, range: range * L.sternPowerMult, power: L.sternPowerMult });
    }
    return list;
  };

  ship.invuln = () => ship.iframeLeft > 0;

  // returns true if the hit landed (not shrugged off by i-frames)
  ship.hurt = (fromX, fromY, mods) => {
    if (ship.invuln()) return false;
    ship.iframeLeft = S.iframeSeconds * mods.iframes;
    const dx = p.x - fromX, dy = p.y - fromY, d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * S.hitKnockback * scene.DPR;
    p.vy += (dy / d) * S.hitKnockback * scene.DPR;
    return true;
  };

  return ship;
}
