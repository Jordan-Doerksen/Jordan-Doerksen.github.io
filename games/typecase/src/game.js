// game.js -- clock, rounds, quota, scoring, state machine. DOM-free.
//
// Modes: title -> playing -> roundend -> playing ... -> over. Pause is a flag
// on top of playing (the clock stops; the UI hides the rack -- no free
// thinking time). The UI subscribes via on(); this module never touches the
// DOM, so the smoke harness can run it headless in Node.
"use strict";
(function () {

  var CFG = window.GAME_CONFIG;
  var RACK = window.RACK;
  var DICT = window.DICT;

  // ---- events ----
  var handlers = {};
  function on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  function emit(ev, data) {
    var hs = handlers[ev];
    if (hs) for (var i = 0; i < hs.length; i++) hs[i](data);
  }

  // ---- persistent best (guarded -- localStorage may be absent or blocked) ----
  var BEST_KEY = "typecase.best";
  function loadBest() {
    try {
      var b = JSON.parse(localStorage.getItem(BEST_KEY) || "null");
      if (b && typeof b.score === "number") {
        // normalize: a partial blob must never surface "round undefined"
        return {
          score: b.score,
          round: typeof b.round === "number" ? b.round : 0,
          longestWord: typeof b.longestWord === "string" ? b.longestWord : ""
        };
      }
    } catch (e) { /* file:// or headless: fall through */ }
    return { score: 0, round: 0, longestWord: "" };
  }
  function saveBest() {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(S.best)); } catch (e) { /* ok */ }
  }

  // ---- state ----
  var S = {
    mode: "title",       // title | playing | roundend | over
    paused: false,
    time: 0,
    score: 0,
    round: 0,
    quota: 0,            // words needed this round
    roundFound: 0,       // words found this round
    totalFound: 0,
    longestWord: "",
    bestRoundScore: 0,   // highest single-round score this game
    roundScore: 0,
    fullRackFound: false,
    findables: [],       // every spellable word for the current rack
    foundWords: [],      // [{word, points}] this rack, newest first
    foundSet: {},        // word -> true (this rack)
    lastSecond: -1,      // heartbeat edge detector
    best: loadBest()
  };

  function quotaFor(round) {
    return CFG.quota.base + (round - 1) * CFG.quota.perRound;
  }

  function scoreWord(word) {
    var vals = CFG.scoring.letterValues;
    var sum = 0;
    for (var i = 0; i < word.length; i++) sum += vals[word[i]] || 0;
    var mult = CFG.scoring.lengthMultiplier[String(Math.min(word.length, 8))] || 1;
    return Math.round(sum * mult);
  }

  function timeFor(word) {
    return CFG.timeBonus[String(Math.min(word.length, 8))] || 0;
  }

  // top-N missed findables by score (the learning beat at round end / game over).
  // Priced exactly as submit() would have paid them -- full-rack bonus included
  // -- so the by-score ranking is honest. The seed itself stays excluded; the
  // reveal shows it separately.
  function missedWords() {
    var missed = [];
    var seedLen = RACK.seed().length;
    for (var i = 0; i < S.findables.length; i++) {
      var w = S.findables[i];
      if (S.foundSet[w] || w === RACK.seed()) continue;
      var points = scoreWord(w);
      if (w.length === seedLen) points += CFG.scoring.fullRackBonus;
      missed.push({ word: w, points: points });
    }
    missed.sort(function (a, b) { return b.points - a.points || a.word.localeCompare(b.word); });
    return missed.slice(0, CFG.reveal.missedCount);
  }

  function loadRack(seedWord) {
    var seed = RACK.load(seedWord);
    S.findables = DICT.findables(seed);
    S.foundWords = [];
    S.foundSet = {};
    S.fullRackFound = false;
    S.roundFound = 0;
    S.roundScore = 0;
    emit("rack", { seed: seed, findableCount: S.findables.length });
  }

  function newGame() {
    S.mode = "playing";
    S.paused = false;
    S.time = CFG.clock.start;
    S.score = 0;
    S.round = 1;
    S.quota = quotaFor(1);
    S.totalFound = 0;
    S.longestWord = "";
    S.bestRoundScore = 0;
    S.lastSecond = -1;
    loadRack();
    emit("start");
  }

  // roundend -> next round: refill clock, fresh rack
  function nextRound() {
    if (S.mode !== "roundend") return;
    S.round++;
    S.quota = quotaFor(S.round);
    S.time = Math.min(CFG.clock.max, S.time + CFG.clock.roundRefill);
    S.lastSecond = -1; // re-arm the heartbeat edge detector for the fresh clock
    S.mode = "playing";
    loadRack();
    emit("round", { round: S.round, quota: S.quota });
  }

  function gameOver() {
    S.mode = "over";
    var isBest = S.score > S.best.score;
    if (isBest) {
      S.best.score = S.score;
      S.best.round = S.round;
    }
    if (S.longestWord.length > (S.best.longestWord || "").length) {
      S.best.longestWord = S.longestWord;
    }
    saveBest();
    emit("over", {
      score: S.score, round: S.round, words: S.totalFound,
      longestWord: S.longestWord, isBest: isBest,
      fullRackWord: RACK.seed(), missed: missedWords()
    });
  }

  // submit the rack's current attempt (or an explicit word via the dev handle)
  function submit() {
    if (S.mode !== "playing" || S.paused) return { ok: false, reason: "mode" };
    var word = RACK.word();

    if (word.length < 3) {
      emit("reject", { word: word, reason: "short", line: CFG.tooShortLine });
      return { ok: false, reason: "short" };
    }
    if (S.foundSet[word]) {
      emit("reject", { word: word, reason: "duplicate", line: CFG.duplicateLine });
      return { ok: false, reason: "duplicate" };
    }
    if (!DICT.has(word)) {
      var line = CFG.rejections[Math.floor(Math.random() * CFG.rejections.length)];
      emit("reject", { word: word, reason: "invalid", line: line });
      return { ok: false, reason: "invalid" };
    }

    // accepted. Any valid word spending every tile is by construction an
    // anagram of the seed -- so length alone identifies a full-rack word.
    var points = scoreWord(word);
    var fullRack = word.length === RACK.seed().length;
    if (fullRack) points += CFG.scoring.fullRackBonus;
    var timeAdd = timeFor(word);

    S.score += points;
    S.roundScore += points;
    S.time = Math.min(CFG.clock.max, S.time + timeAdd);
    S.roundFound++;
    S.totalFound++;
    S.foundSet[word] = true;
    S.foundWords.unshift({ word: word, points: points });
    if (word.length > S.longestWord.length) S.longestWord = word;
    if (fullRack) S.fullRackFound = true;
    RACK.clear();

    var res = { ok: true, word: word, points: points, timeAdd: timeAdd, fullRack: fullRack };
    emit("accept", res);

    if (S.roundFound >= S.quota) {
      S.bestRoundScore = Math.max(S.bestRoundScore, S.roundScore);
      S.mode = "roundend";
      emit("roundclear", {
        round: S.round, roundScore: S.roundScore,
        fullRackWord: RACK.seed(), missed: missedWords()
      });
    }
    return res;
  }

  // advance the clock; the UI's rAF loop drives this
  function tick(dt) {
    if (S.mode !== "playing" || S.paused) return;
    S.time -= dt;
    // heartbeat: once per whole second below the urgency line
    var sec = Math.ceil(S.time);
    if (S.time > 0 && S.time <= CFG.clock.urgentAt && sec !== S.lastSecond) {
      S.lastSecond = sec;
      emit("urgent", { seconds: sec });
    }
    if (S.time <= 0) {
      S.time = 0;
      S.bestRoundScore = Math.max(S.bestRoundScore, S.roundScore);
      gameOver();
    }
  }

  function pause() {
    if (S.mode !== "playing" || S.paused) return;
    S.paused = true;
    emit("pause");
  }
  function resume() {
    if (!S.paused) return;
    S.paused = false;
    emit("resume");
  }

  window.GAME = {
    on: on,
    state: S,
    newGame: newGame,
    nextRound: nextRound,
    submit: submit,
    tick: tick,
    pause: pause,
    resume: resume,
    scoreWord: scoreWord,
    timeFor: timeFor,
    quotaFor: quotaFor,
    missedWords: missedWords,
    loadRack: loadRack
  };

  // ---- headless debug handle (harness + console; harmless in play) ----
  window.__tc = {
    get state() { return S; },
    // compose a word on the rack then submit it, exactly as typing would
    submit: function (word) {
      RACK.clear();
      for (var i = 0; i < word.length; i++) {
        if (RACK.typeChar(word[i]) < 0) {
          RACK.clear();
          return { ok: false, reason: "letters" };
        }
      }
      return submit();
    },
    loadRack: function (seedWord) { loadRack(seedWord); return RACK.seed(); },
    tick: function (seconds) { tick(seconds); },
    nextRound: nextRound,
    newGame: newGame
  };
})();
