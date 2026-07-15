// main.js — bootstrap + orchestration. Loads config, wires the domains, owns state
// transitions and the update/draw glue. Gameplay math lives in the domain modules;
// this file is the only place they meet.

import { initScene } from './core/scene.js';
import { createState } from './core/state.js';
import { startLoop } from './core/loop.js';
import { mulberry32, stream, randomSeed, seedFromHash, writeSeedToHash, seedToHex } from './core/rng.js';
import { createInput } from './input/input.js';
import { createShip } from './entities/ship.js';
import { createWrecks } from './entities/wrecks.js';
import { createHazards } from './entities/hazards.js';
import { createLeviathan } from './entities/leviathan.js';
import { createParticles } from './entities/particles.js';
import { createReveal } from './systems/reveal.js';
import { createSurvey } from './systems/survey.js';
import { createDraft } from './systems/draft.js';
import { createDirector } from './systems/director.js';
import { createRenderer } from './render/render.js';
import { renderPlate, savePlate } from './render/plate.js';
import { createAudio } from './audio/audio.js';

const cfg = await fetch('./config/game.json').then(r => r.json());

const scene = initScene();
const state = createState(cfg);
const ship = createShip(cfg, scene);
const wrecks = createWrecks(cfg, scene);
const hazards = createHazards(cfg, scene);
const leviathan = createLeviathan(cfg, scene);
const particles = createParticles(cfg);
const reveal = createReveal(cfg, scene);
const survey = createSurvey(cfg, scene);
const draft = createDraft(cfg, state);
const director = createDirector(cfg, state, scene, { wrecks, hazards, leviathan });
const renderer = createRenderer(cfg, scene);
const audio = createAudio(cfg);

// ----- seed -----
state.seed = seedFromHash() ?? randomSeed();
writeSeedToHash(state.seed);
let cosmeticRng = mulberry32(state.seed ^ 0xC053E71C); // cosmetic stream — never feeds gameplay
let levRng = stream(state.seed, 'leviathan');

// ----- DOM -----
const el = id => document.getElementById(id);
const titleScreen = el('titleScreen'), draftScreen = el('draftScreen'),
  pauseScreen = el('pauseScreen'), endScreen = el('endScreen'), hud = el('hud');
const uiClock = el('uiClock'), uiQuota = el('uiQuota'), uiSalvage = el('uiSalvage'),
  uiHearts = el('uiHearts'), uiBest = el('uiBest'), uiSeed = el('uiSeed');
const muteBtn = el('muteBtn');
uiBest.textContent = state.save.best;
uiSeed.textContent = '#' + seedToHex(state.seed);
el('skipBtn').textContent = `Sail on (+${cfg.run.skipSalvageBonus}) ✦`;

function refreshHud() {
  uiClock.textContent = state.clockLabel();
  uiQuota.textContent = `${state.quotaDone}/${state.quota}`;
  uiSalvage.textContent = state.salvage;
  uiHearts.textContent = '◆'.repeat(state.hearts) + '◇'.repeat(Math.max(0, cfg.ship.hearts + state.mods.hearts - state.hearts));
  uiHearts.classList.toggle('warn', state.hearts <= 1);
  uiBest.textContent = state.save.best;
}

// ----- audio + mute -----
audio.setMuted(state.save.muted);
function syncMuteLabel() { muteBtn.textContent = state.save.muted ? 'sound · off' : 'sound · on'; }
syncMuteLabel();
function toggleMute() {
  state.save.muted = !state.save.muted; state.persist();
  audio.setMuted(state.save.muted); syncMuteLabel();
}
muteBtn.addEventListener('click', toggleMute);

// ----- settings (sfx + music toggles, persisted under their own key) -----
const settingsScreen = el('settingsScreen'), sfxToggle = el('sfxToggle'),
  musicToggle = el('musicToggle');
let settingsReturn = null; // the screen to restore when settings close
audio.setSfx(state.settings.sfx);
audio.setMusic(state.settings.music);
function syncToggles() {
  sfxToggle.textContent = `sfx · ${state.settings.sfx ? 'on' : 'off'}`;
  sfxToggle.setAttribute('aria-pressed', String(state.settings.sfx));
  musicToggle.textContent = `music · ${state.settings.music ? 'on' : 'off'}`;
  musicToggle.setAttribute('aria-pressed', String(state.settings.music));
}
syncToggles();
function openSettings(from) {
  settingsReturn = from; from.hidden = true;
  settingsScreen.hidden = false;
  sfxToggle.focus();
}
function closeSettings() {
  settingsScreen.hidden = true;
  if (settingsReturn) { settingsReturn.hidden = false; settingsReturn = null; }
}
sfxToggle.addEventListener('click', () => {
  state.settings.sfx = !state.settings.sfx; state.persistSettings();
  audio.setSfx(state.settings.sfx); syncToggles();
});
musicToggle.addEventListener('click', () => {
  state.settings.music = !state.settings.music; state.persistSettings();
  audio.setMusic(state.settings.music); syncToggles();
});
el('settingsBackBtn').addEventListener('click', closeSettings);
el('settingsBtn').addEventListener('click', () => openSettings(titleScreen));
el('pauseSettingsBtn').addEventListener('click', () => openSettings(pauseScreen));

// ----- pause -----
let loopHandle;
function togglePause() {
  if (!settingsScreen.hidden) { closeSettings(); return; } // P/Esc backs out of settings first
  if (state.phase === 'playing') { state.phase = 'paused'; pauseScreen.hidden = false; }
  else if (state.phase === 'paused') {
    state.phase = 'playing'; pauseScreen.hidden = true; loopHandle.resetClock();
  }
}
const input = createInput({ scene, onPause: togglePause, onMute: toggleMute });

// ----- run transitions -----
function startRun() {
  state.resetRun(); draft.reset();
  levRng = stream(state.seed, 'leviathan');
  ship.reset(); reveal.reset(); particles.list.length = 0;
  director.setupSector();
  input.resetRun();
  state.phase = 'playing';
  scene.cvs.classList.add('in-run');
  titleScreen.hidden = true; endScreen.hidden = true; draftScreen.hidden = true;
  hud.hidden = false; muteBtn.hidden = false;
  audio.ensure(); audio.horn();
  refreshHud();
}

function nextSector() {
  state.sector++;
  ship.reset(); reveal.reset(); input.resetRun();
  director.setupSector();
  draftScreen.hidden = true;
  state.phase = 'playing'; loopHandle.resetClock();
  audio.horn();
  refreshHud();
}

function sectorComplete() {
  if (director.isFinalSector()) { endRun(true); return; }
  state.phase = 'draft';
  openDraft();
}

function endRun(won) {
  state.phase = won ? 'won' : 'over';
  scene.cvs.classList.remove('in-run');
  const isNewBest = state.salvage > state.save.best;
  if (isNewBest) state.save.best = state.salvage;
  state.save.bestSector = Math.max(state.save.bestSector, state.sector);
  if (won) state.save.wins++;
  state.persist();
  if (won) audio.dawnChime(); else audio.thud();
  audio.rumble(0);

  const dawnClock = String((cfg.run.startHour + cfg.run.sectors) % 24).padStart(2, '0') + ':00';
  el('endEyebrow').textContent = won ? 'made harbor ✦ ' + dawnClock : 'sounding ended early ✦ ' + state.clockLabel();
  el('endTitle').innerHTML = won ? 'First <em>Light</em>' : 'Still <em>Dark</em>';
  el('endText').textContent = won
    ? `${state.chartedLog.length} wrecks charted, ${state.salvage} salvage brought in.${isNewBest ? ' A record.' : ''}`
    : `The sea kept the rest. ${state.chartedLog.length} wrecks charted, ${state.salvage} salvage on the books.${isNewBest ? ' A record, for what it is.' : ''}`;

  renderPlate(cfg, el('plate'), {
    seed: state.seed, seedHex: seedToHex(state.seed), won,
    salvage: state.salvage, charted: state.chartedLog,
    sectorsReached: state.sector, best: state.save.best,
  });
  hud.hidden = true; endScreen.hidden = false;
  refreshHud();
}

// ----- the draft (DOM cards) -----
function openDraft() {
  const rng = stream(state.seed, 'draft-' + state.sector);
  const cards = draft.roll(rng);
  el('draftHour').textContent = `${state.clockLabel()} — sector ${state.sector} charted`;
  const holder = el('draftCards');
  holder.innerHTML = '';
  for (const c of cards) {
    const div = document.createElement('button');
    div.className = 'card' + (c.kind === 'synergy' ? ' synergy' : '');
    div.innerHTML = `<span class="lane">${c.lane}</span><h3>${c.name}</h3>` +
      `<span class="tier">${c.kind === 'synergy' ? c.tierLabel : 'tier ' + c.tierLabel}</span>` +
      `<span class="flavor">${c.flavor}</span><span class="effect">${c.effect}</span>`;
    div.addEventListener('click', () => {
      draft.take(c, ship);
      audio.bell(6);
      nextSector();
    });
    holder.appendChild(div);
  }
  draftScreen.hidden = false;
}
el('skipBtn').addEventListener('click', () => {
  state.salvage += cfg.run.skipSalvageBonus;
  audio.bell(2);
  nextSector();
});

// ----- damage -----
function damage(fromX, fromY) {
  if (!ship.hurt(fromX, fromY, state.mods)) return;
  state.hearts--;
  particles.burst(ship.p.x, ship.p.y, cfg.colors.particle);
  audio.thud();
  refreshHud();
  if (state.hearts <= 0) endRun(false);
}

// beam-cone-only check (nightsight/pings don't repel the leviathan)
function inBeamCone(beams, x, y) {
  for (const b of beams) {
    const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
    if (d > b.range * 1.08) continue;
    let da = Math.atan2(dy, dx) - b.heading;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < b.arc / 2 + 0.06) return true;
  }
  return false;
}

// ----- update -----
let prevFocus = false; // lamp-sweep edge detector — audio only, no gameplay effect
function update(dt) {
  const mods = state.mods;
  ship.focus = input.focus;
  if (ship.focus && !prevFocus) audio.sweep(); // the beam narrowing gets a voice
  prevFocus = ship.focus;
  ship.update(dt, input, mods);
  const beams = ship.beams(mods);

  if (reveal.update(dt, ship, mods)) audio.chirp();
  reveal.applyTo(wrecks.list, beams, ship, mods, dt);
  reveal.applyTo(hazards.reefs, beams, ship, mods, dt);
  reveal.applyTo(hazards.mines, beams, ship, mods, dt);

  const charted = survey.update(dt, ship, wrecks.list, mods, null);
  if (charted) {
    const v = survey.value(state.sector, mods);
    state.salvage += v;
    state.quotaDone++;
    state.chartedLog.push({ x: charted.x / scene.W, y: charted.y / scene.H, sector: state.sector });
    particles.burst(charted.x, charted.y, cfg.colors.particleSonar);
    audio.bell(Math.min(state.quotaDone, 7));
    refreshHud();
    if (state.quotaDone >= state.quota) { sectorComplete(); return; }
  }

  hazards.update(dt);
  if (!ship.invuln()) {
    for (const rf of hazards.reefs) {
      if (Math.hypot(rf.x - ship.p.x, rf.y - ship.p.y) < rf.r * 0.75 + ship.p.r) { damage(rf.x, rf.y); break; }
    }
    for (let i = hazards.mines.length - 1; i >= 0; i--) {
      const mn = hazards.mines[i];
      if (Math.hypot(mn.x - ship.p.x, mn.y - ship.p.y) < mn.r + ship.p.r) {
        hazards.mines.splice(i, 1);
        particles.burst(mn.x, mn.y, cfg.colors.particleEmber);
        damage(mn.x, mn.y);
        break;
      }
    }
  }

  const inBeam = leviathan.active && inBeamCone(beams, leviathan.p.x, leviathan.p.y);
  const levEvent = leviathan.update(dt, ship, inBeam, state.sector, levRng, ship.focus);
  if (levEvent === 'hit') damage(leviathan.p.x, leviathan.p.y);
  if (levEvent === 'dove') audio.dive();
  audio.rumble(leviathan.menace(ship));

  particles.update(dt);
}

// ----- draw -----
function draw(dt) {
  renderer.draw(dt, {
    phase: state.phase, dawn: state.dawn(), sector: state.sector,
    ship, beams: state.phase === 'playing' ? ship.beams(state.mods || {}) : null,
    mods: state.mods, focus: ship.focus,
    wrecks: wrecks.list, reefs: hazards.reefs, mines: hazards.mines,
    lev: leviathan, pings: reveal.pings, particles: particles.list,
    surveyRadius: state.mods ? cfg.survey.radius * state.mods.surveyRadius * scene.DPR : 0,
    cosmeticRng,
  });
}

// ----- buttons + boot -----
el('startBtn').addEventListener('click', startRun);
el('savePlateBtn').addEventListener('click', () => savePlate(el('plate'), `first-light-${seedToHex(state.seed)}.png`));
el('sameBtn').addEventListener('click', startRun);
el('newBtn').addEventListener('click', () => {
  state.seed = randomSeed();
  writeSeedToHash(state.seed);
  uiSeed.textContent = '#' + seedToHex(state.seed);
  startRun();
});

loopHandle = startLoop({ state, update, draw });

// headless debug handle (echo-bat's __eb pattern) — automated verification only
window.__fl = {
  cfg, state, ship, wrecks, hazards, leviathan, draft, input,
  startRun, endRun, nextSector,
  step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && state.phase === 'playing'; i++) update(dt); },
  drawOnce: (dt = 1 / 60) => draw(dt),
};
