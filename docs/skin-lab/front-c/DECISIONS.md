# DECISIONS: the five front-page screens move to variant C (skin lab)

Intake item 12, chunk 2. Writer session on branch `site-front-c` (worktree
`C:\projects\web\jd-site-wt-front`), 2026-10-20. The site's record is CR-24 in the repo's `DECISIONS.md`;
this file is the working detail. Source of every value: `method/tokens.css` (C, dark) and
`styles/stagecraft.tokens.css` (C's dark values and its light counterpart, CR-23).

Pages: Home (`index.html`), `work/trading-desk/`, `work/rail-software/`, `work/games/`, `desk/`.
Composition did not move (SKIN-01, D-A27). Shots: `shots/before-*` from `main` `98bdef8` before any edit,
`shots/after-*` after; 5 pages x 1280 and 390 x light and dark = 20 each. Taken by `shots.mjs`
(headless Chromium through Playwright, never the preview pane of the app).

## The token map (`styles/front/front.tokens.css`)

| Front token | Dark | Light | From |
|---|---|---|---|
| `--side-bg` | `#061527` | `#f2f5fa` | `--md-ground` / stagecraft `--ground` |
| `--bg` (sheet, resting colour) | `#0b1c33` | `#f9fbfd` | derived: C's panel fill (.5 / .55) composited on the ground |
| `--bg-raised` | `#0f2340` | `#ffffff` | `--md-panel-solid` / light `--ground-2` |
| `--bg-sunken` | `#1a3257` | `#e3eaf4` | derived, one step above the panel; light = stagecraft light `--ground-3` |
| `--surface-hover` | `#112b4d` | `#edf1f8` | derived: C's panel-hover composited on the ground |
| `--accent-bg` | `#1d3453` | `#dee7f6` | derived: the accent at .16 / .12 over the sheet |
| `--edge` | `rgba(170,200,255,.18)` | `rgba(6,21,39,.18)` | `--md-line` |
| `--hairline` / `--hairline-lit` | `#6a83a8` / `#8aa2c6` | `#6a80a0` / `#566d8f` | derived: solid, because a control edge needs 3.0 on every ground and `--md-line-strong` reaches 2.0 |
| `--ink` / `--ink-dim` / `--ink-faint` | `#f4f7fb` / `#d7deea` / `#a4b2c8` | `#0a1628` / `#22334d` / `#4a5b74` | `--md-ink-strong` / `--md-ink` / `--md-ink-2` |
| `--live`, `--primary` | `#7cb2ff` | `#1a56c4` | `--md-accent` / light `--signal` (the one accent; the donor green is gone) |
| `--primary-ink` | `#061527` | `#ffffff` | stagecraft `--on-signal` |
| `--accent-ink` | `#d6e6ff` | `#0f3a8a` | derived: the accent, lightened or darkened to pass on `--accent-bg` |
| `--good` / `--warn` / `--bad` | `#3ddc97` / `#f0b64a` / `#ff8f84` | `#0a6b4d` / `#7a5500` / `#b3261e` | `--md-ok` / `--md-wait` / derived (C has no red); light shades derived to pass |
| `--panel` (sheet glass) | `rgba(16,34,62,.5)` | `rgba(255,255,255,.55)` | `--md-panel` / light `--panel` |
| `--panel-raised` (panel glass) | `rgba(20,42,76,.55)` | `rgba(255,255,255,.7)` | derived: lands on `--bg-raised` over the sheet |
| `--bar-bg` | `rgba(6,21,39,.62)` | `rgba(242,245,250,.72)` | `--md-bar-bg` / light `--bar-bg` |
| `--blur`, `--bar-blur` | `blur(16px)` | same | `--md-blur`, `--md-bar-blur` |
| `--glow`, `--glow-anim`, `--glow-dur`, `--glow-size` | C's gradient at .26, `fp-drift`, `18s`, `130% 100%` | gradient at .16 | `--md-glow*` / light `--glow` |
| `--shadow-1`, `--shadow-pop` | C's `0 18px 44px` plus the inner highlight | soft navy shadow | `--md-shadow` + `--md-inner` |
| `--font-ui`, `--font-display`, `--font-mono` | Inter, Space Grotesk, JetBrains Mono | same | `--md-font-body`, `--md-font-display`, `--md-font-mono` |
| `--w-display`, `--track-head` | `600`, `-0.01em` | same | `--md-w-display`, `--md-track-head` |
| `--radius`, `--radius-md`, `--radius-lg` | `4px` | same | `--md-r` (was 6, 8, 12) |
| Sizes, gaps, `--shell-*`, `--fs-*`, `--t-state` | unchanged | unchanged | composition (SKIN-01) |

The measured ratios on all six grounds are in the token file header. The lightest glow state
(`#173060` in dark) was measured as well: ink 12.00, ink-faint 6.01, live 5.94.

## Decisions

| # | Decision | Rank | Why |
|---|---|---|---|
| D-01 | Theme default is dark; the head script sets `data-theme="dark"` unless the stored choice is `light`. It no longer reads the system setting. | medium | The site master's call under the OPEN-tier ruling (CR-24). One line in `scripts/front_shell.py`, the generator, never a generated page. The cost: a visitor whose system says light gets dark until they press the toggle. |
| D-02 | Without a script the page shows the light `:root` block. | low | It is the one fallback that needs no code; the toggle and the dark default both need script. Dark in `:root` would flip every selector the toggle uses. |
| D-03 | `scripts/front_probe.mjs` stores `fp-theme=light` before its light run (3 lines). | low | With dark as default the colour-scheme emulation alone no longer reaches light; without this the probe would measure dark twice. No check was weakened (GATE-11); the probe passed on both themes. |
| D-04 | The glow rules sit inside the RESET block of `front.shell.css`. | low | `selectors_scoped` demands an `fp-` class on every selector outside that block, and `body::before` has none. The generator was not changed to add a class. |
| D-05 | The sheet is glass without blur; the bar and the panels have blur. | medium | `backdrop-filter` on an ancestor makes it the containing block of any fixed descendant, and the narrow layout's filter list is `position: fixed` inside the sheet. The sheet fill is translucent so the glow shows through; blur over a smooth gradient adds nothing there. |
| D-06 | The popover list (`.fp-pop`) and the form controls keep solid grounds. | low | A list drawn over a table must be readable over any row; glass would let the rows show through. |
| D-07 | Fonts load by `@import` at the top of the token file. | low | Brief: change the one token file. It is the same request `/method/` makes, with `display=swap`. |
| D-08 | Corners are 4px everywhere (C's `--md-r`), the sheet too. | low | The brief and the owner's no-pill rule. `--radius-dot` stays for the status and theme dots. |

## Every hook added (one line each)

`styles/front/front.shell.css`

1. `body::before`: `background: var(--glow) 0 50% / var(--glow-size) no-repeat`, `animation: var(--glow-anim) var(--glow-dur)` (in the RESET block), plus `@keyframes fp-drift`.
2. `html[data-ambient="off"] body::before { animation: none }`, the off switch.
3. `@media (prefers-reduced-motion: reduce) { body::before { animation: none } }`.
4. `.fp-side` background: `none`, so the glow shows through.
5. `.fp-sheet` background: `var(--panel)`.
6. `.fp-bar` background and backdrop-filter: `var(--bar-bg)`, `var(--bar-blur)`.

`styles/front/front.parts.css`

7. `.fp-panel` background and backdrop-filter: `var(--panel-raised)`, `var(--blur)`.
8. One rule: `.fp-main .fp-title, .fp-main .fp-door h2, .fp-main .fp-fig b, .fp-main .fp-panel-head h2, .fp-bar .fp-crumb b` read `--font-display`, `--w-display`, `--track-head`.

`styles/front/front.bridge.css`

9. `--display: var(--font-display)` on `.fp-carry`, so carried headings use the display face.

Not hooks: `scripts/front_shell.py` (the theme script, D-01) and `scripts/front_probe.mjs` (D-03).
No file carries the value "on" for `data-ambient`.

## The checks

Run from the worktree root; the literal output of each is in the session report.

| Check | Command | Result |
|---|---|---|
| Static | `python scripts/front_check.py` | 20 passed, 0 failed, 0 could not be checked |
| Selftest | `python scripts/front_check.py --selftest` | 23 of 23 breakages caught |
| Fresh | `python scripts/build_front_page.py --check` | 0 page(s) differ |
| Browser | `node scripts/front_probe.mjs` | exit 0, 5 pages x 7 widths x 2 themes |

## Law cited

SKIN-01, SKIN-02, SKIN-03, SKIN-04, SKIN-06, WEB-07, WEB-14, SAFE-05, GATE-03, GATE-11, DES-07, DES-08,
VOICE-01, VOICE-05, AUTO-06. Index: `C:\projects\AI-Brain\LAW.md`.
