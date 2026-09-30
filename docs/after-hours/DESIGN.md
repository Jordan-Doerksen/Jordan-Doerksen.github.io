---
published: false
---
# After Hours — the design contract

The hidden showcase of the trading-desk system at `/trading/after-hours/`: dark, motion-heavy, every moving thing synthetic
and labelled so. The contract the parallel builders code against. Desk paths are relative to the worktree named by `deskRoot`
in `scripts/after_hours.config.json` (origin/main, c7310dd, 2026-09-27); the lagging checkout is never read; line numbers are
at that commit. The front matter keeps this file out of the rendered site; it is still public in the repo, so it obeys section 7.

## 1. Decisions (owner verdicts 2026-09-28, then the defaults)
- **Q1 data: synthetic feed, real formats.** Every desk string, format and limit the page prints is read from the worktree at
  build; a miss fails the build (the one softer case is the optional second root, 2.3 step 2). No screenshots, no desk start, no replay.
- **Q2 waiver: skin and ambient only.** Tokens-only colour, the `sc-` namespace and the idle-motion ban are waived for this
  page by one line in the site's decision record. The bible's bones stay: opaque cards, one director per viewport, ≤ 3
  clusters, contrast, content in markup, no sideways scroll.
- **Q3 scope: desk plus satellites** (the ten pieces of section 9). The bot is exactly ONE fenced line (piece 04). The rule
  manual gets one sentence on enforcement grades: no ids, no rule word. Review, named in the verdict, has no piece (a table of
  past alerts has nothing to animate); it stands in 08 as one role word on its family's tile (`%AH_GUARD_FAMILIES%`, 2.4), placed by its generated count, none claimed here.
- **Q4 address: `/trading/after-hours/`.** `noindex, nofollow` and `no-referrer` metas; zero inbound links; in no registry,
  data file, template, footer or docs page; the decision line says "a hidden showcase page", not the path; `.nojekyll`
  untouched. Hidden means unlinked, not private.
- **Q5 numbers: generated only.** A figure reaches the page only from `data/evidence.json` or `data/guards.json`, regenerated
  against the worktree and printed with its stamp. Ungenerated is omitted, never typed; the build's own checks (2.3, 7) fail
  on a miss. Synthetic market values (a price, a level) are not figures: they sit in a labelled card (section 4).
- **Defaults (not asked):** dark ground; legacy effects lifted inline, no annex file linked; "a private channel"; the retired
  fade alarm and branch-only work omitted; no third-party script; the owner eyeballs motion from disk before any push.

## 2. Architecture

### 2.1 File map (strict ownership; a builder touches only its own files)
`trading/after-hours/`: `index.html` (generated only, integrator) · `parts/00-shell.html` (head, stage frame, sticky SYNTHETIC
band, foot, reduced notice, the script slot) · `styles/core.css` (tokens, ground, cards, type, layout, reduced kill) ·
`js/core.js` (`window.AH`, the one scheduler, section 3) · per piece `parts/NN-<key>.html`, `styles/<key>.css`, `js/<key>.js`.
`scripts/`: `build_after_hours.py` (composer, injector, check) · `after_hours.config.json` (deskRoot, monadRoot, the read
groups, pieces, alertCase, roles, families, cases with its `skip` patterns, order, budget, seed, timings) · `after_hours.forbidden.json` (section 7). `docs/after-hours/DESIGN.md`: this contract.

### 2.2 Compose order (one director per screen; the ten keys are named here)
`00-shell` head → `10-ambient` (fixed canvas, z 0, behind everything) → `01-board` (hero) → `02-iceberg` → `03-alertwire` →
`04-mesh` → `05-regime` → `06-skew` → `07-heartbeat` → `08-guards` → `09-scanner` (fixed canvas, z 9, pointer-events none) →
`00-shell` foot → the scripts. The order is `compose.order` in the config, not the filename sort. Each content piece is one
full-width `<section class="ah-piece" id="ah-<key>">` on its own opaque card; two pieces never share a row; at most 3 clusters.

### 2.3 How index.html is composed
1. The shell has markers `<!-- AH:STYLES -->` (head), `<!-- AH:PIECES -->` (body), `<!-- AH:SCRIPTS -->` and `%AH_STAMP%` in
   the foot. The scripts marker is the LAST thing inside `<body>`, after the foot, directly after `<script src="js/core.js">`;
   no script sits in the head, so a piece IIFE finds its root at load (section 3).
2. The generator sets `tier2_desk_toy.CONFIG` to `after_hours.config.json`, then calls `tier2_desk_toy.read_desk()`. So the
   config carries the four groups that function reads (`limits`, `text`, `formats`, `rules`) plus `deskRoot`; `limits` must
   hold `refresh` and `stale` (the toy compares them at its line 182). A miss raises; nothing is written. Two added rules: every
   `limits` regex matches exactly once in its file (`len(re.findall(...)) == 1`, else exit 1); a text entry may carry `html:
   true` — `find` and `show` are then the file's entity form, html-unescaped before `show` enters the JSON and copied unchanged
   into markup (only `roNote`). The optional second root: the generator's own `read_literals(monadRoot, entries)` applies the
   toy's show-in-find rule, no limits, no commit. Root missing → every `data-ah-if="monad"` region is removed (2.4) and a report line says so. Root present and a literal missing → exit 1.
3. Per piece, in order: replace `%AH_DESK%` with the html-escaped JSON `{"text":{},"fmt":{},"lim":{}}` of the keys under
   `pieces.<key>` (05's object also carries `bands` and `precedence`; no entry → the empty triple); fill the content
   placeholders and `%AH_CFG:*%` (2.4); emit one `<link rel="stylesheet" href="styles/<key>.css">` in the head and one
   `<script src="js/<key>.js">` at the marker. Before the fill, every hand-typed stand-in region between
   `<!-- AH:FALLBACK -->` and `<!-- /AH:FALLBACK -->` is stripped, fence to fence, so a part reads complete from disk before
   compose and nothing typed by hand reaches the page (03 and 08 use it; the report counts the regions).
4. Fill the numbers (2.5), remove the conditional regions (2.4), fill `%AH_STAMP%`. Any `%AH_` token left in the page after the
   removals, or any `{` left in a filled format string, fails the build.
5. Checks run in memory before anything is written: the forbidden list over the composed page, the on-disk `parts/`, `styles/`,
   `js/`, this file, AND `data/guards.json` and `data/evidence.json` (a hit in a data file means a regeneration leaked something:
   nothing is written and that data file is not committed); exactly one "order authority" and zero `%AH_` in the composed page;
   ten piece script tags after the core tag. A hit prints file, line and entry, exit 1, nothing on disk. Only then is `index.html`
   written and the report printed: the `read_desk()` lines, the piece count, the number count, the check result.

### 2.4 Data attributes per piece (generator writes; a piece reads its own root only)
Every content piece root carries `data-ah-desk="%AH_DESK%"`. Keys, with the source at c7310dd:

| piece | text keys (`find` literal must exist in the file; `show` is what prints) | source |
|---|---|---|
| all | `sep` "  ·  " | `server/sentinel/alerting/discord.py:194` |
| 01 | `highBull` HIGH BULL · `highBear` HIGH BEAR · `building` BUILDING · `mixed` MIXED · `agree` of 3 agree · `noConsensus` no consensus · `aligned` all three aligned · `tps` " t/s"; `ro` READ-ONLY · `roNote` observes & displays only — never places an order (`html: true`: the file holds the ampersand as an entity) | `web/live/app.js:222-225,205`; `web/index.html:306,308` |
| 01, 03 | `convHigh` High · `convBuilding` Building · `convStandard` Standard | `server/sentinel/alerting/detectors.py:608` |
| 02 | `bidAbs` BID ABSORPTION · BULL · `askAbs` ASK ABSORPTION · BEAR · `noAbs` NO LIVE ABSORPTION · `sell` SELL ABSORPTION · `buy` BUY ABSORPTION · `into` absorbed into · `shown` shown · `held` ❄ held; verdicts `vConfirmed` confirmed · `vRejected` rejected · `vMixed` mixed (one flat `text` dict: a key is never defined twice) | `web/live/app.js:479,495,533,539-540`; `server/sentinel/alerting/iceberg_at_break.py:56` |
| 03 | the tier-2 toy's 12 text keys and 7 format keys, copied from its config; 06's `fear` · `inverted` · `neutral` | as that config cites; 06's row |
| 03 | `flowHigh` · `flowBuilding` · `flowStandard` (the `_FLOW` sentences) · `trigHod` high-of-day · `trigLod` low-of-day · `trigOr` opening-range · the codes `trigCodeHod` HOD · `trigCodeLod` LOD · `trigCodeOrHi` OR-hi · `trigCodeOrLo` OR-lo (`find` is the whole `"HOD": "high-of-day"` pair, `show` the code) · `sideBuy` Buyers · `sideSell` Sellers; `iceNone` iceberg: none in range · `iceUpdate` Iceberg update — | `detectors.py:169-173,621`; `discord.py:322`, `iceberg_watch.py:402` |
| 03 | `leanLong` Buyers taking control · `leanShort` Sellers taking control · `leanBal` Flow turning two-sided; `outWin` Target hit · `outLoss` Stopped out · `outTime` Timed out · `outOpen` Unresolved at session end, glyphs ✅ 🛑 ⏱️ ◌ | `detectors.py:174-175`; `server/sentinel/alerting/outcomes.py:206-208` |
| 03 | `dirLong` long · `dirShort` short (the direction word; the generator and 03's script capitalise it and prefix it to `title`); formats `title` " setup — {trig_name} break" (the desk's leading `{direction.capitalize()}` is not a field `FIELD` matches, so the literal starts after it) · `read` {side} broke the {trig_name} · `foot` Conviction: {a.conviction} (the desk's field name, filled under it) · `entry` entry {px:.2f}  ·  broke {trig} {lvl:.2f}  ·  {span}{where} (`span` the gap to the level to two decimals and a space, empty at the level; `where` the side word by the gap's sign); the side words `whereAbove` above · `whereBelow` below · `whereAt` at; `zone` ET, the footer's zone word | `detectors.py:621,174`; `detectors.py:623,622`, `discord.py:351,269`; `discord.py:266,354` |
| 05 | `gradeNow` Grade now; the grade line joins grade and label with " · " | `web/regime.html:148,283` |
| 06 | `fear` fear · `inverted` inverted · `neutral` neutral · `FEAR` · `INVERTED` · `SUSPECT` | `server/sentinel/skew/engine.py:233`, `web/live/app.js:336-346` |
| 07 | `vOk` OK · `vDegraded` DEGRADED · `vDown` DOWN; `rowServer` DESK SERVER · `rowEngine` 0DTE ENGINE · `rowWatchdog` WATCHDOG · `rowBackup` TAPE BACKUP · `rowJob` SCHEDULED JOB; `stHealthy` HEALTHY · `stStopped` STOPPED-ON-PURPOSE · `stFresh` FRESH · `stUnpushed` TAPES-UNPUSHED · `stStale` STALE; `standingDown` STANDING DOWN · `notAnswering` DESK NOT ANSWERING · `regression` TAPE REGRESSION | `probe/doctor.ps1:655,689-709,120,142,352,346,508`; `desk-watchdog.bat:79,215`, `backup-recordings.bat:385` |
| 07 | `upToDate` UP_TO_DATE · `updateAvailable` UPDATE_AVAILABLE · `localAhead` LOCAL_AHEAD · `diverged` DIVERGED · `dirty` DIRTY · `noUpstream` NO_UPSTREAM · `unknown` UNKNOWN, read by `read_literals` from `monadRoot` (its `DECISIONS.md:53`); printed only inside the `data-ah-if="monad"` region | the launcher repo |

Limits (`lim`, read by `ast` or regex like the toy): `refresh` 15, `stale` 30 (`engine.py:52-53`), `cvdWindow` 60
(`detectors.py:419`), `joinWindow` 60, `joinTicks` 8 (`config/iceberg-at-break.json:8,11`), `watchdog` 30
(`desk-watchdog.bat:242-243`; the regex is anchored to the loop label, `:sleep\s*\r?\ntimeout /t (\d+)`, because three earlier
`timeout /t` lines would otherwise be found first); the vote thresholds `obiVote` 0.30, `vwapTicks` 1 and `tick` 0.25
(`server/sentinel/core/indicators.py:30,31,28`), never printed: 01 gets the first two, 03 all three, and the generator votes
the alert case with all three (below). `<body>` carries `data-ah-refresh="%AH_LIM:refresh%"`,
`data-ah-stale="%AH_LIM:stale%"`, `data-ah-cvdwin="%AH_LIM:cvdWindow%"`, `data-ah-max="%AH_CFG:max%"`,
`data-ah-seed="%AH_CFG:seed%"`; 04's root carries `data-ah-timings="%AH_CFG:timings%"`, the config's `timings` object
`{"enter":620,"wire":480,"hold":2200,"fileDown":700}` as html-escaped JSON. Those are the only three `%AH_CFG` keys. 05 reads
`bellwether/config/grading_rules.json` directly (utf-8-sig, `_` keys stripped): `grade_bands` (:21-41) and `regime_bands`
(:44-77) verbatim as `bands`, `label_precedence` (:79-84) as `precedence`, both inside 05's `%AH_DESK%` object; a `text`
tripwire on `"version": "REGIME_GRADE_V1"` (:4) fails the build on a reshape.

Content placeholders (generator-written markup, so every still reads with script off): `%AH_TEXT:<key>%` anywhere in a piece,
from that piece's own `text` group (html-escaped; the entity form for `html: true`). `%AH_GUARD_PREMISE%` in 08: the
generated `premise` sentence, escaped, verbatim. The config's `roles` map turns each guard's path into a role word by longest
prefix, and the path never prints (`web/js/review` → "the review page", `probe/` → "the doctor and its probes"); an unmapped
path fails the build; `roles.omit` names prefixes whose guards print nowhere (the bot's folder: its one line is 04).
`%AH_GUARD_FAMILIES%` in 08: one `<li class="ah-g-fam" data-family data-count data-generated>` per entry of the config's
`families` (key, label, roles), in config order: its label, its generated count (the sum of its role words over published
guards less `omit`), its role words most guarded first as a secondary line (unguarded words left out), and a script-only
"shown this pass" tally (`.ah-live-only`; "shown", not "caught", so "6" under "194 guards" never reads as a catch rate). A role word the map produces that is in no family or in two, a family naming a word
the map does not produce, or no `families` list fails the build. `%AH_GUARD_EXAMPLES%` in 08: the first `cases.examples` (3)
example cases as `<article class="ah-g-case">`, each with its family label, "broken" (the role word, then the published
`mutation`), "caught by" (the test name, a `<wbr>` after each underscore) and a CAUGHT stamp. `%AH_GUARD_PASS%` in 08: the
staged pass as html-escaped JSON `{sec, reveal, stamp, hold, cases:[{f,w,t,m}]}` in the stage's `data-ah-pass`, up to
`cases.max` (36) cases, round-robin across the families in config order; specific sentence first, then file order inside
each; a test name staged once. "Specific" is any `mutation` other than the two catch-all sentences ("Replaces the protected
text with something plausible but wrong." and "Mutates the file in the way this guard exists to catch.",
`GENERIC_MUTATIONS` in the build). A repeated test name is dropped when it is picked, so a name published generic first and
specific later stages with the specific sentence. A family's next case is the first in its current group whose sentence
differs from the card staged just before it (the head of its queue when none does), so one sentence does not play twice in a
row (owner review 2026-09-29: in file order 22 of 36 staged cases read the generic sentence, four in a row at the end of each
pass; today all 36 are specific, 6 a family). Skipped:
`exists: false` and any case whose test name or mutation matches a `cases.skip` pattern (case-insensitive; today the broker
platform's two acronyms, which two published test names carry); never a path, never find/replace text. A skipped case, and a
repeated test name, still counts in its family's tile, and the build refuses a composed page or a page-folder file that
matches a skip pattern. 08's
tally (`.ah-g-tally`) prints one number, the staged count (`%AH_NUM:guards.cases%`), and the build refuses any other: the
status's "case N of M" reads M from the pass, so the two always agree. The cadence must hold `0 < reveal < stamp < seconds` and `hold > 0`,
else the build fails. The row tokens (`%AH_GUARD_ROWS%`, `%AH_GUARD_ROLES%`, `%AH_GUARD_TYPED%`) are retired: a part still
carrying one fails as an unfilled token. `%AH_ALERT_CASE%` in 03: two
`<div class="ah-alert" data-case="break|gap">`, each five children in order — `<p class="ah-alert-title">` (`title` filled,
prefixed by the capitalised direction word), `<p class="ah-alert-read">` (`read` filled, then the conviction's `_FLOW`
sentence), `<code class="ah-alert-line">` (`entry` filled), `<code class="ah-alert-line">` (the toy's parts line: `obi`, `px`,
`cvd`, `skew` + `regime`, joined by `sep`; a ✓ or ✗ after each factor, in `ah-aw-ok` / `ah-aw-bad`, none after the skew part),
`<p class="ah-alert-foot">` (`foot` filled, `SYMBOL` and the clock, HH:MM:SS as `AH.clock.et()` prints it, joined by `sep`,
then a space and the desk's zone word, text key `zone`). Values come from the config's `alertCase`: word fields are text KEYS
the generator resolves (`trig: "trigCodeHod"`, `trigName: "trigHod"`, `dir: "dirLong"`, `side: "sideBuy"`). Each card's ✓/✗
marks and its conviction word are derived from the example values under the desk's vote thresholds (`obiVote`, `vwapTicks`
and `tick`, read as limits): a factor with no vote counts as a fail (`rules.convFails` tripwires it), and 0, 1, or 2 or more
fails grade High, Building, Standard (`conv*`, `flow*`); the break card grades High, the gap card's two gaps Standard.
`alertCase.conviction` is a tripwire: it must equal the derived break word, or the build refuses. Synthetic values are the
toy's `EXAMPLE`, its OBI overridden by `alertCase.obi` (0.34), plus `alertCase.lvl` (5410.00) and `alertCase.clock`
(HH:MM:SS); the generator hands `fill` every field a format names, so a miss is a build error, never a browser throw. The
`gap` card is the toy's case 3 (no prints): `vwapNa`, `cvdNa` and the `ice` line with `noPrints`, each gap in
`<span class="ah-na">`, then one more `<code class="ah-alert-line ah-ghost">` with the zero-filled line, each zero in
`<span class="ah-z">`; its marks are voted from the zeros, OBI keeping its own. `%AH_BANDS%` in 05: `<ol class="ah-bands">`, one `<li data-grade
data-min>` per `grade_bands` entry ("A · 80"), then `<ul class="ah-regimes">`, one `<li data-label data-min>` per `regime_bands`
entry, source order, labels verbatim. Conditional regions: an element with `data-ah-if="monad"` is removed whole, descendants
and tokens with it, when `monadRoot` was not read; only tokens still in the page afterwards count for step 4. A number appears in a still only when a placeholder wrote it; an empty slot holds "—".

### 2.5 How numbers flow (Q5)
`scripts/evidence_sources.json` (integrator): point `sources[trading-desk].path` at the worktree folder; add to `scanExclude`
every worktree folder name `git worktree list` prints EXCEPT deskRoot's own, plus the lagging checkout folder (the commit scan
globs every `*/*/.git`, a worktree's `.git` file matches, and the desk history would be counted once per worktree). The
generator asserts no path part of deskRoot is in `scanExclude`, since `count_test_files()` and `scan_commits()` skip any path
with an excluded part and the desk's own tests would count zero. No new source id. Regenerate `data/evidence.json` (`--run` is
the integrator's call; without it the suite figure is `unavailable` and omitted) and `data/guards.json` (section 10 first).
`%AH_NUM:<key>%` resolves: `desk.tests.files` (evidence `sources[trading-desk].tests.files`, counted) · `desk.suite.passed`,
`desk.suite.skipped` (only when `suite.method` is executed and `green`) · `guards.published`, `guards.stale`
(`counts.published`, `counts.staleExcluded`) · `guards.cases` (the cases staged in 08's pass, printed as the denominator of
08's tally; its element carries `data-ah-num="guards.cases"`) ·
`evidence.generated` · `guards.generated` · `desk.commit`. An unavailable key
removes the element carrying it (`[data-ah-num]`), never prints 0. Each number sits beside its stamp: "counted <date> at desk
commit <short>". Consistency gate: `evidence sources[trading-desk].commit`, `guards.source.commit` and `read_desk().commit`
must be one hash, else exit 1 printing all three. guards.json fields used: `test`, `mutation`, `counts.*`, `source.commit`,
`generated`, `premise`, and `file` only as input to the `roles` map (never printed). After 10.1 the file holds no `find`,
`replace`, `append` or `mode` at all. `mutation` is one plain-words sentence `scripts/build_guards.py` decides from the case's
shape before it drops the inputs: a line-ending mode gets its own sentence (the mode's name never prints; a mode with none gets
the general sentence), an append its sentence, and a find/replace pair the first class its exact shape proves: deleted, a
line switched off by a comment marker, only a number changed, a condition replaced by true, part removed, kept and added to;
anything else keeps "Replaces the protected text with something plausible but wrong.", and a pair the parser cannot read
keeps the general sentence. The page's build refuses a mutation carrying a bracketed harness token (owner review 2026-09-29).

## 3. The core contract (js/core.js)
```js
window.AH = {
  REDUCED: Boolean,   // matchMedia("(prefers-reduced-motion: reduce)").matches, read ONCE at load
  register: function (piece) {},   pieces: {},   // adopt a piece, safe before or after boot · id → piece; the checks count ten
  tape: {   // the shared synthetic ES feed, advanced once per demo second; step() is core only
    TICK: 0.25, SPARK: 60, SYMBOL: "ES", sec: 0, price: 5412.25, mid: null, obi: null, vwap: null, cvd: null, rate: 0,
    skew: { ok: false, value: null, asof: null, regime: null, reason: null },
    // reason codes: null (a live read) | "held" (chain empty, inside stale; asof keeps the last good second)
    // | "stale" (last read older than the limit) | "none" (no chain); regime: "fear" | "inverted" | "neutral"
    absorption: null,   // the CURRENT event, or { side: "BID"|"ASK", price, shown, traded, ratio, held }; current 3–6 s, then null
    events: [],   // the last 8 landed absorption events, { sec, side, price, shown, traded, ratio, held }, newest last
    hist: [],   // last 60 steps of { sec, mid, obi, cvd, skew }; null = gap; 60 long after boot step 1
    outage: { book: false, prints: false, chain: false, period: 0, chainFor: 0 },   // sized from the limits at boot;
    // chainFor = the long outage's off-time, pre + floor(stale/refresh) × refresh + post (40 today)
    step: function () {}
  },
  clock: { sec: 0, t: 0, et: function () { return "HH:MM:SS"; } },   // demo clock from 09:30:00
  budget: { max: 3, live: [], candidates: [] },   rng: function () { return 0; },   // rng: mulberry32, seeded from body data-ah-seed
  // (a missing or non-numeric seed seeds 1; a piece that needs randomness between tape steps uses its own generator,
  // so the shared tape stays the same for a seed whatever is live)
  fmt: { fill: function (lit, vals) {}, num: function (v, spec) {} }   // the toy's formatter
};
var piece = {   // what register() takes; id is the key, unique; el is its root, the one the observer watches
  id: "board", el: document.getElementById("ah-board"),   always: false,   // always: true for 09 and 10 only, never counted against budget.max
  start: function () {}, stop: function () {},   // became live: size canvases, arm classes · left the live set: clear effects, content stays readable
  frame: function (t, dt) {}, tick: function (sec) {},   // optional; each frame while live (t s, dt clamped 0.05) · once per demo second, after tape.step()
  static: function () {}   // draw the complete still from tape.hist and tape.events; no timers, no animating classes
};
```
- `core.js` loads before every piece script, at the end of `<body>` (2.3 step 1), and defines `AH` synchronously. Each piece
  script is an IIFE that finds its root (already parsed), builds the object and calls `AH.register(piece)` inside try/catch; a
  piece that throws at load never registers and its markup stays complete. Every later piece call is wrapped too: a throw calls
  that piece's `stop()` in a second try/catch, sets `el.dataset.ah = "failed"`, drops it; the loop continues. CSS keys live enhancements on `[data-ah="on"]` only and never hides content.
- Boot runs on `DOMContentLoaded`. Step 1, both modes: seed `rng` from `body data-ah-seed`, read the body limits, size the
  outage script (below), step the tape 120 times — pure computation, no timer — so `tape.hist` holds its last 60 entries and
  `tape.events` at least six landed events (one lands every 7–15 s) before any piece draws. Step 2, if `REDUCED`: add
  `html.ah-reduced`, call every `static()` (each in try/catch), set `el.dataset.ah = "static"`, return; no IntersectionObserver,
  rAF, timeout or interval is created, and a later `register()` gets `static()` at once. Otherwise: add `html.ah-js`, create ONE
  IntersectionObserver (`rootMargin: "-10% 0px -10% 0px"`), observe every root, reconcile.
- Reconcile: candidates = intersecting pieces, plus `always` pieces while the tab is visible (09 only when `(pointer: fine)`
  matches). Sort by distance of the root's centre to the viewport centre; the first `budget.max` (`body data-ah-max`, default 3)
  plus the `always` pieces are the live set. Entering: `start()`, `el.dataset.ah = "on"`; leaving: `stop()`,
  `el.dataset.ah = "off"` (a never-live piece has no attribute; a piece that threw carries `"failed"`). Runs on every
  observer callback, on `resize`, and inside the frame loop every 0.5 s (no scroll listener).
- ONE `requestAnimationFrame` loop runs only while the live set is non-empty and the document is visible; `visibilitychange`
  and reconcile both call `sync()`. Per frame: `dt = min(0.05, elapsed)`, `clock.t += dt`; an accumulator fires `tape.step()`
  then `tick(clock.sec)` on every live piece each whole second; then `frame(t, dt)` on every live piece. No `setInterval` or
  `setTimeout` exists on the page.
- Tape step (port of `docs/tier-2-case/desk-toy.js:118-164`): price random walk in 0.25 ticks, floor 5300; OBI decays toward
  0; 2–7 prints a second feed VWAP and CVD over `cvdWindow`; a skew compute every `refresh` s, held then blank past `stale`. The
  outage script is sized from the body limits, never in fixed seconds: period `2 × (stale + refresh) + 30` s (120 today); `book`
  off 8 s a period (period/15, from 0.8 × period: 96–103 s today; mid, obi, absorption null); the chain off about 10 s around
  the one refresh nearest 0.625 × period (75 s today: one held read, a 15 s gap); every third period (`CUT.longEvery`) it stays
  off through floor(stale/refresh)+1 refreshes, so the hold ages past `stale` and the last compute finds no chain (held, then
  n/a: 45 s today). An absorption event lands every 7–15 s and is pushed onto `tape.events` (ring of 8). Null is a gap: one
  shaded band per run of missing seconds (core.css `.ah-gapband`: ink-2 at 6 %, dashed `--hair-fn` ends, a tag in `--ink` only
  where the word fits whole), laid over the chart at % positions from the last point drawn to the next, with a one-line
  `.ah-gapkey` under the chart; or "—" plus the reason. The band is how a gap reads as deliberate; it never holds a value.

## 4. The label rule
A band at the top of the page (precedent `demos/trading-desk/index.html:101`): mono `SYNTHETIC — NO LIVE DATA` and one
sentence, ground `#E0AC4E`, ink `#0B0E13` (9.37:1). It is `position: sticky; top: 0` in normal flow above cards and canvases (no
padding arithmetic), so a wrap at 320 px never covers the `<h1>`, script or no script. It is two blocks: the strip that
holds the mono line is the sticky one, at every width, so no scroll position shows a moving card without the word; the
sentence sits under it in the same gold and scrolls away, so what stays pinned is one line at 320 px. Every piece header carries
`<span class="ah-syn">` (mono 11 px, ≥ 8:1 on its card) whose text says what on that card is synthetic and what is generated,
so a label never sits over a real figure calling it invented: SYNTHETIC on 01, 02, 03, 06 and 07 (a synthetic feed, staged
cycles); REAL BANDS · SYNTHETIC SCORE on 05; REAL MAP · SYNTHETIC PIPS on 04; GENERATED FROM THE TEST HARNESS · PASS STAGED FROM THE PUBLISHED LIST, NOT A LIVE RUN on
08, whose cases, counts and stamp are real and only the cadence is staged. Every canvas is `aria-hidden="true"`; each feed
caption reads "synthetic feed · not market data". Generated figures carry their stamp inline (2.5). The footer words (`ro`, `roNote`) appear on 01 exactly as read.

## 5. The reduced-motion contract
`REDUCED` is read once; `html.ah-reduced` is the only signal pieces need. Under it the page is a complete still: every
`static()` draws the full information of the moving version from what boot step 1 put in `tape.hist` and `tape.events` (each
brief's Static line, section 9). `core.css` ends with `@media (prefers-reduced-motion: reduce)` killing every `animation` and
`transition`; no piece sheet runs a `@keyframes` outside `[data-ah="on"]`; 09 and 10 never draw under it. `.ah-live-only`
(core.css) is the one class allowed to hide anything: script-only controls and the two canvases, shown under `html.ah-js` only;
content never wears it. Its inverse, `.ah-reduced-only`, is worn by the shell's notice alone: shown under the media query and
under `html.ah-reduced`, because the notice's sentence is only true then. The shell's notice: "Motion is off because your
system asked for it. Nothing is missing."

## 6. Visual language
Tokens (hex · contrast on `--card` #131922, the lightest ground, WCAG relative luminance by script · job; ground and deep score higher):
`--ground` #0B0E13 the page · `--card` #131922 every content card, opaque · `--deep` #0E141C wells inside cards (ladder,
terminal) · `--hair` #24303E (1.32) decorative hairline only · `--hair-fn` #6C7A8C (4.03) functional borders, ≥ 3:1 · `--ink`
#EAF0F7 (15.38) body, headings, readouts · `--ink-2` #A9B6C6 (8.57) secondary AND inactive text (≥ 8:1) · `--ink-3` #8E9BAD
(6.25) captions, labels, never inactive states · `--up` #46C98A (8.39) bull, HEALTHY, ✓ · `--down` #F47265 (6.25) bear, DOWN,
✗ · `--gold` #E0AC4E (8.56) BUILDING, FEAR, the band · `--live` #39BDF8 (8.24) the page's accent, wires, pips · `--teal`
#4FD1CF (9.54) ice, absorption glow. The four state inks are the desk's dark set (`web/desk.tokens.css:302-332`); `--live` is
the site's tier-2 blue. The gap band (core.css `.ah-gapband`, 01 and 06): fill `rgba(169,182,198,.06)`, ink-2 at 6 %, 1.10:1
over `--deep` and `--card` (a shade, not a slab); dashed `--hair-fn` ends, 3.65:1 or better on the shade (functional); a tag in
`--ink`, 13.93:1 or better; the key under each chart (`.ah-gapkey`) in `--ink-2`, 8.57:1. Colour is never the only carrier: every state has a glyph or word (✓ ✗ — ◌, BULL/BEAR, the state
noun). Text below 4.5:1 on its own ground does not ship; nothing is dimmed by group opacity. Type: Google Fonts, two families —
Space Grotesk (display, UI, body) and JetBrains Mono (readouts, labels, terminal, band). Body 15.5 px/1.6; display
`clamp(2rem, 5vw, 4.2rem)`. Cards: opaque `--card`, 1 px `--hair`, radius 10 px, padding `clamp(16px, 3vw, 28px)`; canvases sit
behind (10) or above (09) them and carry no text that matters. Gutters `clamp(16px, 4vw, 32px)` on all four page edges at
320–1920; `html{overflow-x:clip}`; grids use `minmax(0, 1fr)`; tables stack below 640 px. Motion (ms), lifted from the cockpit
`web/live/styles.css`: tick glow 500 (:1095-1096), flash 550 (:1092), factor flip 700 (:1147), conviction pulse 1050 (:1152),
event entrance 450 (:873, lifted as `translateY` ONLY: the cockpit's `from{opacity:0}` stop is dropped), absorb pulse 2200 loop
(:802), frost shimmer 2600 (:812), radar sweep 14 s (:326), scan drift 26 s (:334). No lifted or written keyframe animates
`opacity` on a content element; the other eight lifted keyframes move text-shadow, background-color, box-shadow or filter only.
Tier-2 stage: card enter 620, wire draw 480, hold 2200, file-down 700, from 04's `data-ah-timings` (2.4). Typewriter (03 only) 18 ms a
character. 08: one case every `cases.seconds` (4.8 s): broken at 0, caught by at `reveal` (1.0), the stamp at `stamp` (1.8);
`hold` (6 s) after the last case; all from the config (owner review 2026-09-29: at 2.6 s CAUGHT held 1.1 s and a long test
name could not be read; now it holds 3 s). Needle: damped spring, settled within 1.2 s, no overshoot past the next band. Ease `cubic-bezier(.2,.7,.2,1)`. Ambient under 0.12 alpha.

## 7. The forbidden list (`scripts/after_hours.forbidden.json`)
Spelled out only there (under `scripts/`, not itself checked). Schema: `substrings` (case-insensitive), `caseSensitive`, `regex`
(case-sensitive patterns), `words` (whole word, case-insensitive), `allow` (exact literals removed from the text before
matching), `pageRegex` (case-insensitive patterns applied to the composed page and the page folder only, never to this file
or the two data files, which may hold the desk's own words for them in a test name or a module path that never reaches the
page). The broker platform's two acronyms are the class `pageRegex` is for; `cases.skip` (2.4) carries the same pattern, keeps
the two test names out of the pass and refuses a page that prints them, whether or not the list carries it. Start from the ten entries of the private desk-showcase repo's list (webhook path, machine name, two handles, three
key names, one account id, two user-profile path prefixes), then add — substrings: the operator's first name and surname, the
SME's first name (the critic's asset file :153), the two firm names in the critic's gap 9, the private tape repo's name and the
tape file suffix (asset file :159), the environment variable that names the machine (asset file :152), the two drive-root
prefixes (backslash and slash forms), the scheme prefix every URL starts with, the webhook path segment;
caseSensitive: the machine-name prefix, the decision-record prefix, the five clause-id prefixes named in the task; regex: the
tape stem pattern (asset file :159); words: the rule word, the m-word, the three job-title words. `allow`: the two font hosts'
stylesheet and preconnect literals and the SVG namespace string `createElementNS` needs. Also required: exactly one "order
authority" in index.html, zero `%AH_`. The list runs over the two data files too (2.3 step 5), so a regenerated
`data/guards.json` cannot carry the machine name in. Two exact literals were added to `allow` at integration (2026-09-29): the
names of two desk tests whose prose contains the environment variable's word (a guard that a hand-set value does not post);
a test name is the desk's own word, and the machine name itself stays forbidden. Remove them to make the build refuse again.

## 8. Render checks the integrator runs (from disk via file://, then once served)
1. Widths 320, 375, 768, 1024, 1440, 1920: `documentElement.scrollWidth === clientWidth`; every element
   `scrollWidth <= clientWidth + 1`; gutters ≥ 16 px on all four edges; no two pieces on a row; the band never covers the `<h1>`.
2. Reduced motion emulated: `html.ah-reduced`, `AH.tape.hist.length === 60`, `AH.tape.events.length >= 6`,
   `Object.keys(AH.pieces).length === 10`, `AH.budget.live.length === 0`, zero `requestAnimationFrame`, `setTimeout` or
   `setInterval` calls (wrap all three before load and count), every root `data-ah="static"`, stills visible.
3. Motion on: ten pieces registered; `AH.budget.live.length <= AH.budget.max + 2` at every scroll position; a hidden tab stops
   the loop and returning resumes it; within one period 06 shows held; within three periods (360 s today) held, then n/a past the limit, then n/a no chain. Console: zero errors or warnings, every width, both modes.
4. Scripting disabled: every piece shows heading, its header label (section 4), caption and the markup its brief names under
   "Markup"; nothing at `display:none`, `visibility:hidden` or `opacity:0` except `.ah-live-only` and `.ah-reduced-only`.
5. Resources: only `styles/`, `js/` and the two font hosts; no fetch, no module, no import.
6. `python scripts/build_after_hours.py` exits 0; the three commits agree. Head carries `noindex, nofollow` and `no-referrer`.
   The slug: no HTML page, JSON data file, template, registry or docs page outside `trading/after-hours/` links to it or names
   it; the only files outside the folder allowed to hold it are `scripts/build_after_hours.py`, `scripts/after_hours.config.json`
   and this file. Coarse pointer emulated: no scanner canvas starts. Every hex in 6 re-measured by script.

## 9. Piece briefs
**Markup** = what a reader sees with script off (builder-written; `%AH_TEXT:*%` for every desk word, "—" for every number).
**Static** = what `static()` adds from `tape.hist` and `tape.events` under reduced motion.
**01 board — the cockpit wakes** (~320 js · 220 css · 90 html). Deskbar and instrument rail assemble (transform only); then the
tape drives the last price with `tick-up`/`tick-down` glow, the `t/s` rate, three factor rows flipping on a vote change, the
confluence chip (HIGH BULL / HIGH BEAR / BUILDING n of 3 agree / MIXED), a conviction ring pulse when all three agree, the
read-only footer words. Stands for the live cockpit. Keyframes copied from `web/live/styles.css` (tickUp, tickDown, flash,
factorFlip, vpulse), never linked. Markup: the rail with "—" in every readout, the chip on `%AH_TEXT:mixed%`, the gap key under the three sparklines, the
footer `%AH_TEXT:ro%` · `%AH_TEXT:roNote%`. Static: one frame of readouts from `tape.hist`, chip on its word. Attributes: rows 01, "01, 03", `sep`, limits obiVote, vwapTicks.
**02 iceberg — the absorption ladder** (~260 · 180 · 70). Twenty price levels, SHOWN vs TRADED bars, the firing rung pulsing
(absorbPulse, bidInset/askInset, frostShimmer copied), events dropping into a feed with evIn as section 6 lifts it, translateY
only: "SELL ABSORPTION @ price · N absorbed into M shown · R× · ❄ held"; focus label BID/ASK ABSORPTION or NO LIVE ABSORPTION.
Stands for the absorption detector and the iceberg join (`joinWindow`, `joinTicks` drawn as the gate). Book outage: rungs "—",
label no live absorption. Markup: twenty rungs labelled "—", empty bars, the focus label `%AH_TEXT:noAbs%`, an empty feed.
Static: the ladder lit from the newest `tape.events` entry, the six newest events as feed rows. Attributes: row 02, `sep`, limits joinWindow, joinTicks.
**03 alertwire — the alert types itself** (~240 · 140 · 120). Adapts the toy's parts, factorParts and skewPart to the tape: on a
synthetic break a Discord-shaped card types title, read (`_FLOW` by conviction), entry line, factor line with ✓/✗ and the skew
part, the iceberg line, the foot (`foot` · SYMBOL · clock and `zone`); beside it the ghost card, what a desk that filled gaps with zero
would have posted. Stands for the alerting module. Every gap prints its named n/a. Markup and static: `%AH_ALERT_CASE%`, both
cards as 2.4 shapes them. Attributes: rows 03, "01, 03", `sep`, limits refresh, stale, cvdWindow, obiVote, vwapTicks, tick.
**04 mesh — the system tour** (~280 · 160 · 140). `docs/tier-2-case/stage.js` re-skinned dark, autoplay, chained: pips travel
three paths on one inline SVG — market (book → capture → engine → detectors → fan-out → live page), watchdog (30 s loop → health
answer → restart or standing down), and the bot path, which is ONE fenced line and no more: "A separate program has order
authority on sim/eval accounts only. It is fail-closed. Its design is not yet cleared, and it has sent no order." stage.js's
`after()`, `scheduleFileDown()` and `fileDown()` timers (:168-170, :178-180, :194) are not lifted: a step table advanced from
`tick(sec)` and `frame(t, dt)` on `AH.clock`, enter · wire · hold · fileDown read from the root's `data-ah-timings` JSON (2.4),
never hardcoded. Node words are module roles, no paths. Markup: the whole SVG, every node, wire and path name present; script
adds pips and lit classes only. Static: every node and wire lit. Attributes: `data-ah-timings` only; no desk text.
**05 regime — the grade dial** (~200 · 120 · 80). A damped-spring needle over the real grade bands (A 80 · B 65 · C 45 · D 30 ·
F 0), the eight regime labels on an outer ring; the grade line prints "C · SELECTIVE_RISK_ON" style, joined as
`web/regime.html:283` joins it. A synthetic score wanders every 9 s; every 5th read is INSUFFICIENT_DATA (from `precedence`):
needle parked, word shown, no number. Stands for the weekday regime grader. Markup: `%AH_BANDS%` (2.4), needle at rest,
`%AH_TEXT:gradeNow%` with "—". Static: needle parked on a band, its grade line. Attributes: `bands`, `precedence`, `gradeNow`.
**06 skew — the 0DTE sky** (~180 · 110 · 60). A 60 s sparkline of `tape.hist.skew` shifting once a second, seconds with no read
as shaded bands tagged with the reason (section 3), the regime word FEAR (gold) / INVERTED (down) / SUSPECT (ink-2) as the cockpit paints it, a stale bar filling
toward `stale`. Stands for the options skew engine. Chain outage: held once a period; held, then n/a with the reason, every third period
(section 3). Markup: the empty axis, `%AH_TEXT:SUSPECT%`, the caption, the gap key. Static: the 60 s line with its gaps and the word. Attributes: row 06, limits refresh, stale.
**07 heartbeat — the operator's ring** (~220 · 130 · 90). Four segments — doctor, watchdog, tape backup, update — lit per demo
cycle with a state word (the `st*` keys; `standingDown`, `notAnswering`; `regression`; the update verdicts) and the verdict
`vOk` / `vDegraded` / `vDown` in the centre. Words only, never a count. Stands for the doctor, the 30 s watchdog, the private
tape backup, the launcher's Update. Markup: the four segment names (`row*`) with their word lists as `%AH_TEXT:*%`, "—" in the
centre; the update segment is one element carrying `data-ah-if="monad"`, gone whole when `monadRoot` was not read (2.4).
Static: every segment lit on a word, the verdict shown. Attributes: the two rows 07, limit watchdog.
**08 guards — the sabotage terminal** (~200 js · 150 css · 60 html). A category wall and one live case (owner review
2026-09-29: the 64-row typed list was replaced; no list anywhere). One tile per family (label, generated count, role words,
where Review stands, section 1), and in the middle one card that plays one published case at a time on the core clock:
✗ broken (the role word and the harness's plain-words mutation) → caught by (the test name) → ✓ CAUGHT. That family's tile
flashes (box-shadow and background-color only) and its "shown this pass" tally ticks; "caught N of <guards.cases> staged
cases this pass" counts only the cases shown, against the cases the pass holds; after the last case the status reads "all
<guards.cases> shown" (no longer than "case N of M", so the bar keeps its height) until the pass restarts; paused off-screen. (Owner review 2026-09-29: with the published total as the
denominator, the end read "caught 36 of 728" beside "pass ends", which says 692 were missed. The published total prints only
in the header, beside its stamp.) The header prints its section-4 label, the generated `premise` and
`guards.published` with its stamp. Never a path. Stands for the adversarial CI pass (four shards). Markup and static: the tiles
with their counts and the first three example cases as static text. Attributes: none from the desk; numbers guards.published,
guards.stale, guards.generated; the pass in `data-ah-pass`.
**09 scanner — the reticle cursor** (~165 · 21 · 10). `makeScanner` from `js/cursor-fx.js:48-66` lifted inline as a script-tag
global on a fixed canvas; `always: true`; started only when `(pointer: fine)` matches; never under reduced motion. The tracer
is capped (owner review 2026-09-29): the last 8 points; a pair more than 60 px apart is never joined; the trail is emptied on
pointerleave (html), pointerout to nothing (window), window blur and visibilitychange, and the next move or press starts a new
trail with the ring snapped to the pointer. Each pair is stroked on its own so the age fade shows. Pointer events, mouse and
pen only; touch is ignored. Markup: the `.ah-live-only` canvas. Static: nothing drawn.
**10 ambient — the quant sky** (~140 · 20 · 10). `js/sky/quant.js` lifted inline (grid, sweep, candle tape, glyph columns, node
net) on a fixed canvas behind the cards; dpr capped 1.75, alpha under 0.12, `always: true`, colours from section 6 as "r, g, b" strings. Markup: the `.ah-live-only` canvas. Static: nothing drawn. The waived lane.
**00 shell** (~140 html · 260 css). Head (metas, the two font links, `core.css`, the styles marker; no script), the sticky band,
`<h1>`, one paragraph of dry copy, the pieces marker, the foot: the numbers strip (`%AH_NUM:*%` with stamps), one sentence on
the rule manual's enforcement grades (no ids), one on the board ("one post per item on a private board; a question tag stops
the item until it is answered"), `%AH_STAMP%`, the reduced-motion notice, the "Home" back-link; then, last in `<body>`, `<script src="js/core.js">` and the scripts marker.

## 10. Clear these before any build (integrator, with the parent)
Cleared 2026-09-29 (integrator): 1 — the generator reads `tests/sabotage.cases.ps1` when it exists, else the runner, and
publishes each case as `test`, `file`, `exists`, `mutation` (728 published, 0 stale at c7310dd; `source.file` names the file
read); 2 — `scanExclude` carries the eleven other worktree folders, the desk source points at the worktree, and the desk suite
was executed for the snapshot; 3 — the `roles` map covered every published path on the first build; 4 — checked by reading.
1. `scripts/build_guards.py:93` reads `tests/sabotage.ps1`; at c7310dd the cases live in `tests/sabotage.cases.ps1` (728 lines
   match its case regex, the old file none): run as-is it publishes 0 guards, a false zero. The parent owns that edit, and the
   SAME edit changes what is written: `find`, `replace`, `append` and `mode` feed `describe_mutation()` (:63-73) and are then
   dropped, so each published case carries `test`, `file`, `mutation` and `exists` only. Reason: at c7310dd one `find`/`replace`
   pair carries the machine name, ten fields the variable that names it, three the decision-record prefix and one the webhook
   segment; the page reads none of them. Step 5's check over `data/guards.json` proves the edit landed, it is not the fix: a regeneration made before it exits 1 there and is never committed.
2. The commit scan counts every worktree (2.5): fix `scanExclude` before regenerating; deskRoot's own folder never in it.
3. The config's `roles` map (2.4) is written before the first build; its generated order is the only rank stated (section 1).
4. Copy voice: dry, literal, short; no exclamation marks, no hype, no slogans, no person, no path.

## 11. Gaps the builders found, recorded at integration (2026-09-29)
Each line is a choice a builder made where this contract was silent or wrong. Sections 2, 3, 5, 7, 8 and 10 above were
corrected in place where a line was simply wrong; the rest stand here as the record. Nothing below changes a verdict. The
owner's review of 2026-09-29 (gap bands in 01 and 06, the outage cadence, the capped tracer in 09, 08 as a category wall with
one live case) was applied in place in sections 1–9; the builders' choices from it are recorded below.

**Shell and core (00).** `.ah-stage` is never a stacking context (no position, transform, filter or opacity on it or on body):
the fixed canvases are inserted inside it and a context there would lift the ambient canvas over the header's text; proven by
hit-test. A missing or non-numeric `data-ah-seed` seeds 1; a missing body limit fails boot and the markup is the page. The tape's
`absorption` is the landed event for 3–6 s, then null until the next landing 7–15 s later; none land while the book is out.
`AH.clock.sec` tracks `tape.sec`, so the first draw reads 09:32:00 (120 boot steps). Measured over 720 s after boot (seed
20260928): skew missing 20.8 %, book 6.7 % (the earlier script left the skew null about 37 % of the time, which read as a
broken engine); the boot still shows a held gap at 75–89 s and a book gap at 96–103 s. The review asked for about one 8–12 s
outage a period, split between held and none; under the desk's limits the shortest skew gap is one refresh (15 s held) and
the shortest that reaches none is 45 s, because the hold must age past `stale` first (the engine's smoother). So the script
runs a 15 s held gap every period and the 45 s held-then-none gap every third; `CUT.longEvery` in core.js is the one knob,
and held-only (none dropped from the loop) is the alternative.

**Generator.** `--dry-run` and `--selftest` exist (71 checks). `%AH_STAMP%` reads "desk commit <short>, read <date>[, with
uncommitted changes to the files read]". The ghost line marks the zero alone in `ah-z`, not the whole part as the toy's case 6
does. A guards file still carrying find/replace/append/mode refuses the build (2.5's last sentence is a gate, not a wish). The
report notes worktree folders missing from `scanExclude`; that is a note, since the commit figure is the front page's. The
superseded tier-2 drafts (`build_tier2_desk.py`, `build_tier2_slice.py`) read the dropped fields and would render no mutation
diffs if re-run; the live tier-2 builder reads `file` only. The alert foot ends with the zone word (`zone`) after the clock,
the same as the desk's footer, in `alert_case_markup` and in 03's `makeCase()` alike (2.4).

**01 board.** `sep` is listed for 01 but no cockpit readout prints it; the footer's single "·" is typed. The vote thresholds
(|OBI| ≥ 0.30; VWAP neutral band 1 tick) decide the chip; they arrive as `lim.obiVote` and `lim.vwapTicks` (2.4), and the
values typed from `indicators.py:30-31` are only the fallback, when the root carries none. Its tick stays typed (0.25).
The cockpit's visible verdict sub-line is the vote triplet with "n of 3 agree" as a tooltip; the board prints the agree /
noConsensus / aligned words and keeps the triplet in the factor rows. The contract's `tape.cvd` is the window delta (the desk's
vote input); the cockpit's own CVD readout is session-cumulative, which the contract does not expose, so the board prints the
delta. The ABS tally counts events seen while live or on `static()`; an off-screen stretch can miss some. Synthetic, labelled.
A run of missing seconds is one shaded band; its "no data" tag needs the whole word to fit (about 53 px), so on the 64 px
sparkline (44 px below 380 px) the tag does not show for the 8 s book gap and the key line under the three lines carries it.

**02 iceberg.** The two join limits are numbers, so they reach the still through `%AH_LIM:joinTicks%` and `%AH_LIM:joinWindow%`
in the markup (the generator resolves `%AH_LIM` page-wide); the raw part shows the tokens until the build. "Drawn as the gate"
became: a rail on every rung within ±joinTicks of the inside, a joinWindow pip strip above the feed (one pip per landed event,
sliding left), and a per-event "in range" / "out of range" tag judged against the inside and the clock, since the tape has no
break. The cockpit's focus-card flash on a change is copied as `iceFlash` (background-color, 550 ms), not named in the 02 list.
The feed's empty marker "—" becomes the line "newest first" once rows exist, so nothing on the card is ever display:none. At
320 px the column key wraps to three lines; no overflow.

**03 alertwire.** 2.4 shapes the break still with five children; the live and static break cards type the iceberg line
(`iceNone`) as a sixth, as brief 9 asks. 03's text group now holds `fear`, `inverted` and `neutral`, so the live word follows
the tape (`regime`, fear, is the fallback and the still's word). The still carries the ✓/✗ marks too, voted from the same
limits, so still and live grade one reading the same way. The script votes with `lim.obiVote`, `lim.vwapTicks` and the tape's
own `TICK`, not `lim.tick`; without the two vote limits it does not register and the markup is the still. The parts use three placeholder
conventions: bare tokens (02, 05), `data-ah-key` + `data-ah-word` beside a typed word (01, 06, 03's legend), `data-ah-text`
(07), and fenced stand-in regions (03's cards, 08); 2.4 names only the token form. The raw part shows a literal
`%AH_ALERT_CASE%` text node beside the stand-in cards; the build strips and replaces both.

**04 mesh.** `tick(sec)` stamps the demo clock beside the narration in the now-readout. The map is portrait (viewBox 500×560,
market down the left, watchdog down the right, the fenced bot bottom-right) so node labels stay about 10 px at 375 and 21 px at
1440; wire labels are secondary and the legend carries every name as text. The pop keyframe's duration is written on the root
as `--ahm-enter` from `data-ah-timings.enter`, so the sheet holds no number. The node and wire words (book and prints, cycle
input, market state, the break, state, signal feed, asks, no answer, server back, pause marker) and the watchdog branch
alternating each cycle are the builder's reading of brief 9; the watchdog's engine-restore step is not drawn.

**05 regime.** The eight regime labels print verbatim in the generated `ul.ah-regimes` beneath the dial; on the ring they sit
as labelled segments with cut ticks, because 18-character words on a semicircle fall under 7 px between 320 and about 900 px.
The dial face (arcs at the real cuts, letters, ticks) is typed; the cut numbers on the ring are written by the script from the
data attribute only (2.4: a number appears in a still only when data wrote it), so with script off the ring shows letters and
ticks and the ladders carry the cuts. The `gradeJoin` key (" · ") is used when present, else " · ". The no-data read prints
"— · INSUFFICIENT_DATA"; the desk's picker prints "?" for a missing grade. The score prints to one decimal.

**06 skew.** 06's attributes carry no desk string for the hold or its reason (the toy's hold and no-chain words are 03's keys),
so the state line's words (read N s ago · held · chain empty · n/a · no chain · past the limit) are page copy, dry and literal.
Adding the toy's `hold` format and `noChain` text to `pieces.skew` would let the piece print the desk's own wording. The neutral
chip word is `neutral` upper-cased, as the cockpit's flat contract does. The tape re-reads the chain every `refresh` s, so a held
block can be 31–44 s old before the next read; the piece renders such a hold as n/a past the limit, never as a held read beyond
it. Gaps are shaded bands (core.css), not gold (gold is FEAR's colour); one band per run on an HTML layer over the svg, slid
in step with the plot. The reason inside a past band is worked out as 03 does (the current run from `tape.skew.asof`, an
earlier run from the refresh of the last drawn point, kept per second); where neither is in view the tag is n/a. Inside a
band, a change of reason is a dotted cut, and each stretch gets the longest of its words that fits whole: held · past the
limit or n/a · no chain or n/a. They are the page's own words, as the state line's are; adding `"noChain"` to
`pieces.skew.text` and `"formats": ["hold"]` to `pieces.skew` in the config would make the tags read the desk's wording. A
resize listener (not a timer) re-lays the tags on the reduced-motion still. The lede's last sentence now reads "A second with
no read is a shaded gap in the line, never a zero."

**07 heartbeat.** Every desk word carries `data-ah-text="<key>"` with the typed literal as its text; the generator does not fill
`[data-ah-text]`, so with script off the typed word stands and the script repaints from `data-ah-desk` (one line in
`fill_piece` would refresh those words at build). Only three row keys name ring segments (server, watchdog, backup); the update
segment is named by the launcher's own literal label "Update"; `rowEngine` and `rowJob` print in the caption. The doctor's
desk-server row also has DOWN, DEGRADED and STARTING-OR-STUCK, which no 07 key reads; the ring prints DOWN through `vDown`.
07 draws from its own seeded generator, never `AH.rng` (section 3). With script off and the launcher region removed, the ring
keeps its four-way split with one empty quarter; the script re-spaces the arcs to the segments present. The tape-backup
refusal's `find` matches `backup-recordings.bat:383`, the design cites :385 (the same phrase two lines down).

**08 guards.** 2.4 said "a root-level file is its own" role word; the config's `roles.map` names every root-level file, so no
file name prints and the config's wording wins. The wall is one column below 560 px, then the card across the top with
tiles two a row, then from 1080 px three tiles down each side with the card in the middle; the `<ol>` is `display: contents`
with `role="list"`. With motion on, the script turns the first example into the player at load and takes the other two off
the stage, so the card does not shrink as it scrolls in; the player's min-height is measured for the tallest case at the
current width and re-measured when the width changes. `stop()` pauses the pass and `start()` resumes it; the frame overshoot
is carried, so the cadence does not drift. After the last case the card holds for `hold`, then the pass restarts from zero.
The tallies wear `.ah-live-only`, because they only mean something while the pass plays. The flash tints are capped so text
keeps its contrast floor at the flash peak (secondary text 8.2:1 on the tile flash, labels 5.4:1 or better on the row
flashes). The tiles sum to published less `omit` (726 of 728 at c7310dd; the two guards in the bot's folder print nowhere).
The counter's denominator is the staged count (36 at c7310dd), not the published total: a published denominator read as 692
missed when the pass ended, so 728 prints only in the header. The pass is not widened to the whole list: the omitted guards
would end it at 726 of 728, and `measure()` lays out every case. CAUGHT is staged; the caption says it shows what the harness requires of the case, not the
result of a run. Each tile's `guards.generated` stamp is a `data-generated` attribute; the visible stamp is the count line's
"counted <date> at desk commit <short>".

**09 scanner.** The brief lifts `makeScanner` only and is silent on the native cursor; the site's cursor sheet hides it. Kept
under this page's own class `html.ah-scanner-on { cursor: none }` (html, a, button), added on the first pointer move or press, and
removed on leave (page or window), window blur, a visibility change and `stop()`, so the arrow is hidden only while the reticle is drawn. Striking it is one CSS rule and two classList
calls.

**10 ambient.** "Alpha under 0.12" is read per draw call (every rgba and gradient stop the piece sets is ≤ 0.0996, proven by
wrapping the 2D context's setters); where strokes, fills and glyphs overlap, the composited pixel alpha reaches about 0.17–0.18
at dpr 1 and 0.22 at dpr 1.75. A lower cap in `ambient.js`, or a CSS opacity on `.ah-ambient`, gives the pixel reading. The
source's navy / green / oxblood map by role to `--live` (grid, glyph tails, node wires, formulas), `--up` (sweep, up-candles,
glyph heads) and `--down` (down-candles, node dots). The formula face is Space Grotesk (synthesised italic), since the type rule
allows two families. `size()` re-seeds the scene on any viewport change, so a phone's collapsing address bar resets it once per
collapse; a width-only reseed would be two lines. Static draws nothing, as sections 5 and 9 say.

**Harness notes (not gaps).** Headless Chrome on this machine will not open a window under 500 px; widths are set by device
metrics emulation. Its `--dump-dom` mode fires `requestAnimationFrame` at most twice and virtual time freezes rAF delivery, so
motion proofs drive the tape through the contract synchronously or use a live CDP session; the integrator's section-8 run used
the latter. The stub harnesses link no Google Fonts; the composed page was re-measured with the real fonts. 09's tracer proof: a
scratch harness records every segment each stroke draws on the scanner canvas plus a pixel scan of the jump line; 600 px
jumps, 80 to 90 px-per-frame flicks and leave/return all draw no segment over 60 px, where the pre-fix tracer drew 545 to
920 px lines under the same harness. Phone widths are checked as an iframe of the exact width inside a wider headless window.
