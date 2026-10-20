# DECISIONS: the Stagecraft pages move to variant C (skin lab)

Intake item 12, chunk 1. Site Master Control, writer session on branch `site-stagecraft-c`
(worktree `C:\projects\web\jd-site-wt-stagecraft`), 2026-10-20, on the owner's go of 2026-10-20.
The site's own record is CR-23 in the repo's `DECISIONS.md`; this file is the working detail.

## What moved

The nine pages that load `styles/stagecraft.tokens.css`: `rail/`, `games/`, `trading/`, `studio/`,
`signals/`, `bots/`, `tools/`, `navigation/` and the atlas template `atlas/` (`/atlas/?p=<slug>`, every
documented project). The token file is the whole control panel; the eight section pages and the atlas
wear C's ground, panels, type, accent and glow while their composition is as it was (SKIN-01, D-A09).

Source of every value: `method/tokens.css` on `main` at `b2a3cfc` (variant C, Board, skin lab D-14).

## The token map

The Stagecraft token file carries no `sc-` prefix: its names are bare (`--ground`, `--signal`), and
base, compose, `styles/atlas.css` and `styles/desk.css` read those names, so the names stay and the
values move. "derived" = C has no such token; the value is built from C's palette, and the token file
says so beside the value.

| Stagecraft token | Value now | From `method/tokens.css` |
|---|---|---|
| `--ground` | `#061527` | `--md-ground` |
| `--ground-2` | `#040f1d` | `--md-ground-2` |
| `--ground-3` | `#0f2340` | `--md-panel-solid` |
| `--ink` | `#f4f7fb` | `--md-ink-strong` |
| `--ink-2` | `#d7deea` | `--md-ink` |
| `--muted` | `#a4b2c8` | `--md-ink-2` (8.55:1 on the ground) |
| `--hair` | `rgba(170,200,255,.18)` | `--md-line` |
| `--hair-soft` | `rgba(170,200,255,.09)` | derived: `--md-line` at half its alpha |
| `--hair-strong` (new) | `rgba(170,200,255,.32)` | `--md-line-strong` |
| `--signal` | `#7cb2ff` | `--md-accent` (8.45:1 on the ground) |
| `--signal-rgb` | `124,178,255` | the accent's channels |
| `--signal-soft` / `-tint` / `-line` | alphas .16 / .07 / .38 on `--signal-rgb` | derived: the same alphas the file had, on C's accent |
| `--on-signal` (new) | `#061527` | derived: text on a signal fill is the ground colour (the skip link) |
| `--panel` (new) | `rgba(16,34,62,.5)` | `--md-panel` |
| `--panel-hover` (new) | `rgba(22,44,78,.6)` | `--md-panel-hover` |
| `--blur` (new) | `blur(16px)` | `--md-blur` |
| `--bar-bg` (new) | `rgba(6,21,39,.62)` | `--md-bar-bg` |
| `--bar-blur` (new) | `blur(16px)` | `--md-bar-blur` |
| `--glow` (new) | the radial gradient at 22% 35% | `--md-glow` |
| `--glow-anim` (new) | `sc-drift` | `--md-glow-anim` (`md-drift`); the keyframe is in `stagecraft.base.css` |
| `--glow-dur` (new) | `18s` | `--md-glow-dur` |
| `--glow-size` (new) | `130% 100%` | `--md-glow-size` |
| `--sans` / `--display` / `--mono` | C's stacks | `--md-font-body` / `--md-font-display` / `--md-font-mono` |
| `--w-display` (new) | `600` | `--md-w-display` |
| `--w-label` (new) | `500` | `--md-w-label` |
| `--track-display` (new) | `-0.01em` | `--md-track-display` (was `-.035em`, hard-coded in compose) |
| `--track-head` (new) | `-0.01em` | `--md-track-head` (was `-.02em`, hard-coded in base) |
| `--track-label` (new) | `0.18em` | `--md-track-label` |
| `--t-label` | `11px` | `--md-t-label` (the same value as before) |
| `--r` (new) | `4px` | `--md-r` |
| `--r-sm` (new) | `4px` | `--md-r-sm` |
| `--m-confirm` | `200ms` | `--md-t-fast` (was 120ms; C has no faster duration) |
| `--m-orient` | `200ms` | `--md-t-fast` (was 280ms) |
| `--m-narrative` | `480ms` | `--md-t-reveal` (was 640ms) |
| `--ease` | `cubic-bezier(.2,.7,.3,1)` | `--md-ease` |
| `--ease-out` (new) | `cubic-bezier(.16,1,.3,1)` | `--md-ease-out` |
| `--lift` | `0 18px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07)` | `--md-shadow` + `--md-inner` |
| `--t-stage` … `--t-body`, `--measure*`, `--mar`, `--maxw`, `--rail` | unchanged | sizes, measures and spacing are composition (SKIN-01); C's own scale is for its one page |
| the compatibility bridge (`--paper`, `--accent*`) | unchanged | aliases; they follow the names above |

C tokens with no Stagecraft reader (not carried): the state colours `--md-ok`, `--md-wait` and the
state-tinted panels (`--md-panel-gate` …), the wire tokens, the reveal distance and C's density scale.
They belong to the method page's diagrams; the hubs have no element that would read them.

## Decisions

| # | Decision | Rank | Why |
|---|---|---|---|
| D-01 | The names stay; the values move. No `sc-` rename. | low | Four stylesheets read the bare names; a rename would touch files the brief rules out and gain nothing a comment does not. |
| D-02 | Sizes, measures and the spacing scale do not move. | medium | SKIN-01: a skin gives colour and type, never composition. The stage statement at `9.2vw` is the hubs' typographic monument; C's `86px` display is sized for one explainer page. The brief lists colour, family, weight, tracking, radius, shadow, hairline and duration, and size is not in that list. |
| D-03 | **The light flip is C's light counterpart**, made here (OWN-05): ground `#f2f5fa` (near-white with C's navy hue), `--ground-2` white, `--ground-3 #e3eaf4`, ink `#0a1628` / `#22334d` / muted `#4a5b74` (6.32:1 on the ground), hairlines the navy at .18 / .09 / .32, the accent in a shade of the same hue that reads on paper, `#1a56c4` (6.06:1 on the ground, 6.62:1 on white; `#7cb2ff` is 2:1 on paper), `--on-signal` white (6.62:1), panels white at .55 / .72, the bar at .72, the glow at .16, a soft shadow. `color-scheme: light`. | medium | Defensible from the measured ratios, reversible by editing one block, and every value is a token. The research for the dark side is C's own (`docs/skin-lab/method/RESEARCH.md`); the light side had a quick pass against the ratios printed above and the checker's measure in both themes. There is no theme toggle in `js/shell/` (the brief said there was; a grep finds none): `html.light` is set by hand, as it was before this CR. |
| D-04 | **Hooks**: where a panel's glass, the chrome's glass, the ground glow, a radius or a tracking had no token reader, one line reads the token, commented `C skin: <what>, token <name>`. The full list is below. SKIN-04 holds: the token file writes no transform and no transition; the glow is a keyframe on `background-position` of `body::before` (the fixed ground canvas), stopped by the existing reduce block (`*::before { animation: none !important }`), and turned off per page by `data-ambient="off"` on `<html>` (never an "on" value anywhere). CR-2026-10-19-TIERS is approved as of 2026-10-20 (`AI-Brain\instructions\web-ui-law.md`, the tiers section at its end; the site declares its tier on one line in its own DECISIONS.md). | low | Without a reader, a token is a comment. Each hook is one declaration so the diff reads as a skin change. |
| D-05 | **Defect fixed, not skin: the hubs had no gutter.** `.stage { padding: <top> 0 <bottom> }` and `.chapter { padding: <y> 0 }` in compose, which loads after base, set the side padding to 0 and beat `.wrap`'s `padding: 0 var(--mar)` at the same specificity. On main every hub's stage, index and chapter head sat flush at the window edge at every width, while the chrome and the footer had their gutter (the BEFORE shots show it). `padding-block` on those three rules leaves the sides to `.wrap`. The atlas was not affected (its `main.wrap` holds no `.stage`). | medium | WEB-14 is law on both tiers and the brief names it. The fix restores the layout the stylesheet already declares; it is not a new composition. Found by the new checker; a checker for these pages was an open item on the Site card. The master can revert these two rules alone if he rules otherwise. |
| D-06 | **Defect fixed, not skin: the closed finder took Tab focus.** The veil is `opacity: 0; pointer-events: none` when closed, which leaves its `<input>` in the tab order; `finder.js` traps Tab inside the veil, so a keyboard user who tabbed past the footer landed on an invisible field and stayed there. `visibility: hidden` on the closed veil (with a delayed visibility transition so the fade-out stays) removes it from the tab order; `.veil.open` sets it visible with no delay. | medium | A keyboard walk with a visible ring is in the done-check; this could not pass honestly without the fix, and neutering the check is ruled out (GATE-11). One rule in base; `js/shell/` untouched. |
| D-07 | The checker allows one sideways scroll box, the atlas diagram well, and names it in its PASS line. | low | D-A09's survival rule: "the diagram scrolls inside its well and the page never scrolls sideways". The box exists on main today; the page's own `scrollWidth` must still equal the window, and anything else that scrolls sideways fails. |
| D-08 | Before shots were taken from main's files before any token changed; the before check record was re-run against the main checkout read-only (`--repo`) with the final checker, so both records come from the same script. | low | AUTO-06: evidence is the command and its literal output. The first draft of the checker had its own light-init bug; its output was discarded. |
| D-09 | Not touched: `styles/atlas.css` (its diagram well keeps a 12px radius and a solid `--ground-2` fill, both still read from tokens), every page's HTML (`theme-color` meta and the favicon still carry `#0b0b0d` and `#f0b429`), `js/shell/`, `styles/front/`, the generated pages, the project apps, the client pitch pages, the legacy annex. | low | The brief's ruled-out list; the HTML items are a follow-up for the master. |

## Every hook added (one line each)

`styles/stagecraft.base.css`

1. `body::before` background: `var(--glow)`, `--glow-size`, no-repeat — the ground glow.
2. `body::before` animation: `var(--glow-anim) var(--glow-dur) var(--ease) infinite alternate` — the drift; plus `@keyframes sc-drift` (background-position 0% to 100%) and the off switch `html[data-ambient="off"] body::before { animation: none }` (SKIN-06's one attribute; the glow is ON by the token and the keyframe, the attribute's only value is `off`, and no file writes an `on` value, which the brain's SKIN-02 Doctor claim forbids in `index.html`).
3. `.skip` color: `var(--on-signal)`.
4. `h1,h2,h3,h4`: `font-weight: var(--w-display); letter-spacing: var(--track-head)`.
5. `.chrome` background: `var(--bar-bg)`.
6. `.chrome` backdrop-filter: `var(--bar-blur)` (with the `-webkit-` form).
7. `.find` border-radius: `var(--r)` (was a 999px pill).
8. `.find kbd` border-radius: `var(--r-sm)`.
9. `.finder` background and backdrop-filter: `var(--panel)`, `var(--blur)`.
10. `.finder` border-radius: `var(--r)` (was 14px).
11. `.finder li` border-radius: `var(--r)` (was 9px).
12. `:focus-visible` border-radius: `var(--r-sm)`.

`styles/stagecraft.compose.css`

13. `.stage h1` letter-spacing: `var(--track-display)`.
14. `.field-well` border-radius: `var(--r)` (was 12px).
15. `.field-well` background and backdrop-filter: `var(--panel)`, `var(--blur)`.
16. `.chip` border-radius: `var(--r)` (was a 999px pill).
17. `.peer` background and backdrop-filter: `var(--panel)`, `var(--blur)`.
18. `.tag` border-radius: `var(--r)` (was a 999px pill).

Defect fixes, commented in place with what failed and why this is the fix (DES-08): `.veil`
visibility (base); `.stage`, `.chapter`, `.chapter.quiet` padding-block (compose).

### Every changed line in base and compose, and why it is not a token

`git diff --stat` reports 34 lines in `stagecraft.base.css` and 19 in `stagecraft.compose.css`
(each count is added plus removed lines; a multi-line comment counts per line). Line by line, from
`git diff -U0`:

`stagecraft.base.css`

| Lines | Hook or fix | Why a token alone could not do it |
|---|---|---|
| `body::before` background (3 removed, 1 added) | hook 1, the ground glow | the old rule wrote two hard-coded gradients on `--signal-rgb`; a token has no reader until a declaration names it, and `background-size` and `-repeat` are properties, not values |
| `body::before` animation (1 added) | hook 2, the drift | an animation is a declaration on the element; the token carries the keyframe name and the duration |
| `@keyframes sc-drift` (1 added, plus its 1-line comment) | hook 2 | a keyframe cannot live in a custom property |
| `html[data-ambient="off"] body::before` (1 added) | hook 2, the SKIN-06 off switch | a selector; the master's ruling of 2026-10-20 |
| `.skip` color (1) | hook 3 | the value was a raw `#0b0b0d`; it now reads `--on-signal` |
| `h1,h2,h3,h4` weight and tracking (1) | hook 4 | the values were raw `600` and `-.02em` |
| `.chrome` background (1) | hook 5 | the value was a `color-mix()` on `--ground` at a raw 86% |
| `.chrome` backdrop-filter (1) | hook 6 | the value was a raw `saturate(140%) blur(9px)`; the `-webkit-` form is the same declaration for Safari |
| `.find` border-radius (1) | hook 7 | raw `999px` (a pill) |
| `.find kbd` border-radius (1) | hook 8 | raw `4px` |
| `.veil` transition and visibility (1 changed, 3 added of which 2 are comment) | fix D-06 | not skin: the closed finder's input took Tab focus |
| `.veil.open` (1) | fix D-06 | the open state's visibility and no delay |
| `.finder` background, blur, radius (1 removed, 2 added) | hooks 9 and 10 | raw `--ground-2` solid fill, no blur, raw `14px` |
| `.finder li` border-radius (1) | hook 11 | raw `9px` |
| `:focus-visible` border-radius (1) | hook 12 | raw `4px` |

`stagecraft.compose.css`

| Lines | Hook or fix | Why a token alone could not do it |
|---|---|---|
| `.stage` padding (1 removed, 3 added of which 2 are comment) | fix D-05 | not skin: the shorthand zeroed the gutter |
| `.stage h1` letter-spacing (1) | hook 13 | raw `-.035em` |
| `.chapter`, `.chapter.quiet` padding (2) | fix D-05 | the same shorthand |
| `.field-well` radius, fill, blur (1 removed, 2 added) | hooks 14 and 15 | raw `12px`, solid `--ground-2`, no blur |
| `.chip` border-radius (1) | hook 16 | raw `999px` (a pill) |
| `.peer` background and blur (1) | hook 17 | solid `--ground`, no blur |
| `.tag` border-radius (1) | hook 18 | raw `999px` (a pill) |

Every line above either replaces a raw value with a token read (the brief's one-line hook) or is one
of the two defect fixes (D-05, D-06). No line changes a layout rule other than the gutter fix, and no
line writes a transform or a transition from the token file (SKIN-04).

## The checks

`docs/skin-lab/stagecraft-c/check.mjs`, adapted from `method/check.mjs`. The shell fetches
`data/registry.json`, so the script starts `python -m http.server 4531` from the repo root and stops it.
Playwright is loaded from `C:/projects/map-reading-trainer/package.json` (the path in
`scripts/front_probe.config.json`); no package was added (GATE-03). Per page, per width (390, 1280),
per theme (dark; light = `html.light` added by an init script): the widest element and every sideways
scroll box (WEB-14); a margin between on-screen text and all four window edges plus the `.wrap`
gutter; WCAG text contrast from computed colours composited through every ancestor; the keyboard walk
(first stop the skip link, every stop with a ring on a visible element and on screen, the smooth scroll
waited for, and a walk that reaches the cap of 120 Tabs is a trap and fails); console
and script errors; the index rendered rows. Per page, per width: 0 running animations under
`prefers-reduced-motion: reduce` after a full scroll and a hover; with scripts off, the hand-written
prose and the list's notice (sections) or the atlas's no-script notice and the route home (atlas), and
nothing at `opacity: 0`. Then the comparison page: no sideways scroll at either width, 9 pages, 36
shots loaded. The whole literal output of each run is beside this file.

| Run | Command (from the worktree root) | Result |
|---|---|---|
| After, shots | `node docs/skin-lab/stagecraft-c/check.mjs --shots after` | `ALL PASS`, exit 0, 216 PASS lines; 36 shots written |
| After, record | `node docs/skin-lab/stagecraft-c/check.mjs --shots none --port 4533` | `check-after.txt`: `ALL PASS`, exit 0, including the comparison page (9 pages, 36 shots loaded, no sideways scroll at 390 and 1280) |
| Before, record | `node docs/skin-lab/stagecraft-c/check.mjs --repo C:/projects/web/jordan-doerksen.github.io --shots none --port 4532` | `check-before.txt` (main's files, read only): FAIL on every hub's gutter (the stage and chapters at 0px), on the light theme's skip link (3.69:1, every page), and on the keyboard walk (every page: the walk reaches the cap on the closed finder's input, which has a ring the viewer cannot see) |
| Front page, static | `python scripts/front_check.py` | `20 passed, 0 failed, 0 could not be checked` |
| Generated pages fresh | `python scripts/build_front_page.py --check` | `check review: 0 page(s) differ, 6 unchanged` |

Measured on the after run (from `check-after.txt`): lowest text contrast in dark 7.22:1 (the atlas
peer-card names), in light 5.88:1 (the same); 0 unmeasurable elements on every page; tab stops per
page between 17 and 32, every one with a ring; 0 animations under reduce on every page; the `.wrap`
gutter 20px at 390 and 64px at 1280 on every page.

## Change Log

| Date | Change | Request |
|---|---|---|
| 2026-10-20 | File created with D-01 to D-09 after the checks ran; the site's CR-23 carries the decision of record. | Intake item 12, chunk 1 (the brief) |

## Law cited

WEB-07, WEB-14, SKIN-01, SKIN-02, SKIN-03, SKIN-04, SKIN-06 (CR-2026-10-19-TIERS, approved 2026-10-20), SAFE-04,
SAFE-05, SAFE-07, SAFE-08, GATE-03, GATE-11, GATE-14, OWN-04, OWN-05, OWN-10, AUTO-06, DES-07, DES-08,
VOICE-01, VOICE-05. Index: `C:\projects\AI-Brain\LAW.md`.
