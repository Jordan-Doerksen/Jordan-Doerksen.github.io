// main.js — the bootstrap + state machine (ARCHITECTURE "bootstrap"). Loads the two JSON configs,
// builds the world, wires input/render/hud/audio, owns the screen state machine (title · play · draft ·
// pause · settings · death · results) and the ONE canonical sim step order. The fixed-step loop calls
// simStep(dt) (only advances while state==='play' — every non-play screen freezes the field for free)
// and renderFrame(dt) every rAF. Audio is fired by DIFFING the world after each frame, so the sim never
// learns about sound (one-way law holds). Nothing here reaches into a system's internals.

import { makeRng, randomSeed, seedToHex, seedFromHash, writeSeedToHash } from './core/rng.js';
import { createWorld, resetRun } from './core/state.js';
import { startLoop } from './core/loop.js';
import { createWatchdog } from './core/watchdog.js';
import { createInput } from './input/input.js';
import { updateAim, stepPlayer } from './entities/player.js';
import { stepEnemies } from './entities/enemies.js';
import { stepBullets, stepShots } from './entities/projectiles.js';
import { stepSpawn } from './systems/spawn.js';
import { stepWeapons, initLoadout } from './systems/weapons.js';
import { stepBulletHits, stepContact, reapEnemies } from './systems/combat.js';
import { stepStatus } from './systems/status.js';
import { stepBoss } from './systems/boss.js';
import { stepProgression } from './systems/progression.js';
import { buildDraft, applyDraft } from './systems/draft.js';
import { createRenderer } from './render/render.js';
import { createHud } from './render/hud.js';
import { createAudio } from './audio/audio.js';

const $ = (id) => document.getElementById(id);

(async function boot() {
  const watchdog = createWatchdog();
  let game, content;
  try {
    [game, content] = await Promise.all([
      fetch('./config/game.json').then((r) => r.json()),
      fetch('./config/content.json').then((r) => r.json()),
    ]);
  } catch (err) {
    watchdog.trap(new Error('Config load failed (serve over http, not file://): ' + err));
    return;
  }

  const canvas = $('field');
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let seed = (game.sim.worldSeedInHash && seedFromHash()) || randomSeed();

  const world = createWorld(game, content, makeRng(seed), seed);
  world.reducedMotion = mq.matches;
  mq.addEventListener('change', (e) => { world.reducedMotion = e.matches; });

  const renderer = createRenderer(canvas, world);
  const hud = createHud(world);
  const audio = createAudio(game);
  const input = createInput(canvas, { onPress: onKeyPress });
  renderer.resize();
  window.addEventListener('resize', renderer.resize);

  // ---------- DOM handles ----------
  const dom = {
    hud: $('hud'), topBtns: $('topBtns'), bossBanner: $('bossBanner'), deathOverlay: $('deathOverlay'),
    bannerBig: $('bossBanner').querySelector('.big'), bannerSmall: $('bossBanner').querySelector('.small'),
    draftCards: $('draftCards'), draftEyebrow: $('draftEyebrow'), draftSub: $('draftSub'),
    uiSeed: $('uiSeed'), rSeed: $('rSeed'),
    rReview: $('rReview'), rTime: $('rTime'), rKills: $('rKills'), rBosses: $('rBosses'), rGrade: $('rGrade'), rScrip: $('rScrip'), rBest: $('rBest'),
    sfxToggle: $('sfxToggle'), musicToggle: $('musicToggle'),
  };
  const SCREENS = ['titleScreen', 'draftScreen', 'pauseScreen', 'settingsScreen', 'resultsScreen'];

  // ---------- settings (persisted) ----------
  let settings = { sfx: true, music: true };
  try { const raw = localStorage.getItem(game.meta.settingsKey); if (raw) settings = Object.assign(settings, JSON.parse(raw)); } catch (e) { /* private mode */ }
  function saveSettings() { try { localStorage.setItem(game.meta.settingsKey, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
  function applySettings() {
    audio.setSfx(settings.sfx); audio.setMusic(settings.music);
    dom.sfxToggle.setAttribute('aria-pressed', String(settings.sfx));
    dom.sfxToggle.textContent = 'sound · ' + (settings.sfx ? 'on' : 'off');
    dom.musicToggle.setAttribute('aria-pressed', String(settings.music));
    dom.musicToggle.textContent = 'music · ' + (settings.music ? 'on' : 'off');
  }
  applySettings();

  // ---------- populate copy from content (config is the source of tone) ----------
  const c = content.copy;
  $('tCompany').textContent = c.company; $('tDivision').textContent = c.division; $('tTagline').textContent = c.tagline;
  $('startBtn').textContent = c.start; $('tHint').textContent = c.hint; $('skipBtn').textContent = c.skip;
  dom.uiSeed.textContent = seedToHex(seed);

  // ================= state machine =================
  let state = 'title';
  let settingsReturn = 'title';
  let deathTimer = 0;

  function showScreen(id) { for (const s of SCREENS) { const n = $(s); if (n) n.hidden = (s !== id); } }
  function showGameChrome(on) { dom.hud.hidden = !on; dom.topBtns.hidden = !on; }
  function hideTransients() { dom.bossBanner.hidden = true; dom.deathOverlay.hidden = true; }

  function showTitle() {
    state = 'title'; showScreen('titleScreen'); showGameChrome(false); hideTransients();
    canvas.classList.remove('in-run'); audio.stopMusic();
    dom.uiSeed.textContent = seedToHex(seed);
  }

  function startRun(newSeed) {
    if (newSeed !== undefined) { seed = newSeed >>> 0; if (game.sim.worldSeedInHash) writeSeedToHash(seed); }
    resetRun(world, seed);
    initLoadout(world);
    renderer.clearFx(); hud.reset(); resetSnap();
    audio.resume(); if (settings.music) audio.startMusic();
    state = 'play'; showScreen(null); showGameChrome(true); hideTransients();
    canvas.classList.add('in-run');
  }

  function resumePlay() { state = 'play'; world.draftPending = null; showScreen(null); showGameChrome(true); }

  function togglePause() {
    if (state === 'play') { state = 'pause'; showScreen('pauseScreen'); }
    else if (state === 'pause') { resumePlay(); }
  }

  function openSettings(from) { settingsReturn = from; state = 'settings'; showScreen('settingsScreen'); }
  function closeSettings() { if (settingsReturn === 'pause') { state = 'pause'; showScreen('pauseScreen'); } else showTitle(); }

  // ---------- draft ----------
  const symbolFor = (o) => o.kind === 'evo' ? '★' : o.kind === 'upgrade' ? '+' : o.name.charAt(0).toUpperCase();
  function enterDraft() {
    if (state === 'draft') return;
    state = 'draft';
    world.draftOffers = buildDraft(world);
    dom.draftEyebrow.textContent = world.draftKind === 'fork' ? c.forkTitle : c.draftTitle;
    dom.draftSub.textContent = world.draftKind === 'fork' ? c.forkSub : c.draftSub;
    dom.draftCards.innerHTML = '';
    world.draftOffers.forEach((o, i) => {
      const card = document.createElement('button');
      card.className = 'card' + (o.rarity === 'fork' ? ' fork' : (o.rarity !== 'common' ? ' rar-' + o.rarity : ''));
      const col = content.elements[o.element || 0].color;
      card.innerHTML =
        `<span class="key">${i + 1}</span>` +          // 1–4 keys already pick; now they're visible
        `<div class="lane">${o.lane}</div>` +
        `<div class="glyph" style="color:${col}">${symbolFor(o)}</div>` +
        `<h3>${o.name}</h3><div class="tier">${o.tierText}</div>` +
        `<div class="flavor">${o.flavor}</div><div class="effect">${o.effect}</div>`;
      card.addEventListener('click', () => pickDraft(o));
      dom.draftCards.appendChild(card);
      if (i === 0) setTimeout(() => card.focus(), 0);
    });
    showScreen('draftScreen'); audio.sfx('ui');
  }
  function resolveOneDraft() {
    world.pendingLevels = Math.max(0, (world.pendingLevels || 1) - 1);
    if (world.pendingLevels > 0) { state = 'play'; enterDraft(); } // rebuild the next owed card set
    else resumePlay();
  }
  function pickDraft(o) { applyDraft(world, o); audio.sfx('ui'); resolveOneDraft(); }
  function declineDraft() { audio.sfx('ui'); resolveOneDraft(); }

  // ---------- death → results ----------
  function enterDeath() {
    state = 'death'; deathTimer = 1.7;
    showGameChrome(false); dom.bossBanner.hidden = true; dom.deathOverlay.hidden = false;
    dom.deathOverlay.querySelector('.big').textContent = c.deathTitle;
    dom.deathOverlay.querySelector('.small').textContent = c.deathSub;
    audio.sfx('death'); audio.stopMusic();
  }
  function showResults() {
    state = 'results'; hideTransients(); showGameChrome(false);
    const scrip = world.scrip;
    let best = 0; try { best = parseInt(localStorage.getItem(game.meta.saveKey) || '0', 10) || 0; } catch (e) { /* ignore */ }
    if (scrip > best) { best = scrip; try { localStorage.setItem(game.meta.saveKey, String(best)); } catch (e) { /* ignore */ } }
    let review = c.reviews[0].line;
    for (const rv of c.reviews) if (scrip >= rv.minScrip) review = rv.line;
    dom.rReview.textContent = review;
    dom.rTime.textContent = fmtClock(world.time);
    dom.rKills.textContent = String(world.kills);
    dom.rBosses.textContent = String(world.bossesKilled);
    dom.rGrade.textContent = String(world.level);
    dom.rScrip.textContent = String(scrip);
    dom.rBest.textContent = String(best);
    dom.rSeed.textContent = seedToHex(seed);
    showScreen('resultsScreen');
  }

  function fmtClock(t) { const s = Math.max(0, Math.floor(t)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  // ================= the sim step (fixed order — the one place the systems run) =================
  function simStep(dt) {
    if (state !== 'play') return;               // any non-play screen freezes the field
    const w = world;
    if (w.hitstop > 0) { if (w.reducedMotion) w.hitstop = 0; else { w.hitstop--; return; } }

    input.sample(w);
    updateAim(w);
    stepPlayer(w, dt);
    stepSpawn(w, dt);
    stepEnemies(w, dt);
    stepBoss(w, dt);
    // rebuild the broadphase from current positions, THEN add the boss so targeting/hits can see it
    w.grid.rebuild(w.enemies.items);
    if (w.boss && !w.boss.dead) w.grid.add(w.boss);
    stepWeapons(w, dt);
    stepBullets(w, dt);
    stepShots(w, dt);
    stepBulletHits(w);
    stepContact(w);
    stepStatus(w, dt);
    reapEnemies(w);
    stepProgression(w, dt);
    w.time += dt; w.frame++;

    if (w.draftPending) enterDraft();
    else if (!w.player.alive) enterDeath();
  }

  // ================= per-frame render + audio + overlays =================
  let snap = {};
  function resetSnap() { snap = { kills: 0, level: 1, scrip: 0, bosses: 0, pips: world.player.pipsMax, shield: world.player.shield, bossActive: false, muzzleHot: false, lastFire: 0 }; }
  resetSnap();

  function audioReact(now) {
    if (state !== 'play' && state !== 'draft') return;
    const p = world.player;
    if (world.kills > snap.kills) { audio.sfx('kill'); }
    if (world.bossesKilled > snap.bosses) audio.sfx('bossdown');
    if (world.level > snap.level) audio.sfx('level');
    if (world.bossActive && !snap.bossActive) audio.sfx('boss');
    if (p.pips < snap.pips) audio.sfx('pip');
    else if (p.shield < snap.shield - 0.5) audio.sfx('hurt');
    const hot = p.muzzle > 0.5;
    if (hot && !snap.muzzleHot && (now - snap.lastFire) > 70) { audio.sfx('fire'); snap.lastFire = now; }
    snap.kills = world.kills; snap.level = world.level; snap.scrip = world.scrip; snap.bosses = world.bossesKilled;
    snap.pips = p.pips; snap.shield = p.shield; snap.bossActive = world.bossActive; snap.muzzleHot = hot;
  }

  function updateOverlays() {
    const boss = world.boss;
    let show = false;
    if (state === 'play' && boss && boss.bannerT > 0) { dom.bannerBig.textContent = c.bossName; dom.bannerSmall.textContent = c.bossBanner; show = true; }
    else if (state === 'play' && world.bossDownT > 0) { dom.bannerBig.textContent = c.bossDown; dom.bannerSmall.textContent = ''; show = true; }
    dom.bossBanner.hidden = !show;
  }

  function renderFrame(dt) {
    renderer.frame(dt);
    if (state === 'death') { deathTimer -= dt; if (deathTimer <= 0) showResults(); }
    if (!dom.hud.hidden) hud.update();
    updateOverlays();
    audioReact(performance.now());
  }

  // ================= input + buttons =================
  function onKeyPress(k) {
    if (k === 'p' || k === 'Escape') { if (state === 'play' || state === 'pause') togglePause(); return; }
    if (state === 'draft' && world.draftOffers) { // 1..4 pick, 0/backspace decline
      const n = parseInt(k, 10);
      if (n >= 1 && n <= world.draftOffers.length) pickDraft(world.draftOffers[n - 1]);
    }
  }
  $('startBtn').addEventListener('click', () => { audio.resume(); startRun(seed); });
  $('settingsBtn').addEventListener('click', () => openSettings('title'));
  $('pauseBtn').addEventListener('click', togglePause);
  $('pauseSettingsBtn').addEventListener('click', () => openSettings('pause'));
  $('settingsBackBtn').addEventListener('click', closeSettings);
  $('abandonBtn').addEventListener('click', showResults);
  $('skipBtn').addEventListener('click', declineDraft);
  $('restartBtn').addEventListener('click', () => startRun(seed));      // retry THIS shift (same seed)
  $('newSeedBtn').addEventListener('click', () => startRun(randomSeed())); // a fresh shift
  dom.sfxToggle.addEventListener('click', () => { settings.sfx = !settings.sfx; applySettings(); saveSettings(); audio.sfx('ui'); });
  dom.musicToggle.addEventListener('click', () => { settings.music = !settings.music; applySettings(); saveSettings(); });

  // ================= go =================
  watchdog.onTrap(() => { if (state === 'play') { state = 'pause'; showScreen('pauseScreen'); } });
  showTitle();
  startLoop(game.sim, simStep, renderFrame, watchdog);
  watchdog.log('boot ok · seed ' + seedToHex(seed));
})();
