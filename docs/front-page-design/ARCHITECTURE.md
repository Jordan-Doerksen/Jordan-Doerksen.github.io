# Front page — architecture contract (D-A27, CR-21)

Read `DECISIONS.md` D-A27 (items 1 to 8) first. Then this file. Then open only the files you own.
This file is the contract between the parts. If you need to break it, stop and say so.

## What it is

Five stamped pages in the donor look: a sidebar, a rounded sheet, and a bar. A Python
generator writes them from one config and from data the site already has. The approved
mockup is in `docs/front-page-design/mockup/` (open `home.html` and `tool-desk.html`); the
real build matches it. Plain HTML, CSS and classic JavaScript. No framework, no new package.

Build in `docs/front-page/` for review. `--root` promotes to the repo root (owner's go only).

## Screens and URLs (config: `scripts/front_page.config.json` `screens[]`)

| id | URL | file under the output base | nav group | source of the body |
|---|---|---|---|---|
| home | `/` | `index.html` | Start | built here (owner's tier-1 text, verbatim) |
| trading | `/work/trading-desk/` | `work/trading-desk/index.html` | The work | carried: `docs/tier-2-case/index.html` |
| rail | `/work/rail-software/` | `work/rail-software/index.html` | The work | built here |
| games | `/work/games/` | `work/games/index.html` | The work | carried: `docs/tier-3/index.html` |
| desk | `/desk/` | `desk/index.html` | Reference | built here (parity with the old `desk/`) |

Hubs (`/trading/`, `/rail/`, `/games/`, ...), atlas pages and project pages are NOT touched.
Every page computes its own `root` prefix from its depth (`""`, `"../"`, `"../../"`), so the
same output works from `docs/front-page/` and from the repo root.

## Files and owners (one owner per file; never edit another owner's file)

| Path | Responsibility | Owner |
|---|---|---|
| `styles/front/front.tokens.css` | THE control panel: every colour, size, radius, shadow, duration. Light + dark. | S |
| `styles/front/front.shell.css` | reset, sidebar, sheet, bar, brand, nav, find, theme toggle, menu, focus, reduced motion | S |
| `styles/front/front.parts.css` | figures row, doors, panels, tables, status markers, ghost button, facet, popover | S |
| `styles/front/front.bridge.css` | aliases that map a carried piece's old variable names to the tokens | C |
| `styles/front/carry-trading.css`, `carry-games.css` | GENERATED from the tier pages. Never hand-edit. | C |
| `scripts/build_front_page.py` | orchestrator: load config, build, write, `--check`, `--root` | B |
| `scripts/front_shell.py` | the shell block (sidebar, bar) and the page wrapper | B |
| `scripts/front_screens.py` | home, rail and desk bodies | B |
| `scripts/front_figures.py` | figures from `data/evidence.json` (reads like `site_compose.figures()`) | B |
| `scripts/front_log.py` | JSON-line logger, crash trap, run id (shared by B, C, T) | B |
| `scripts/front_page.config.json` | screens, nav, brand, copy that is config, flags | B |
| `scripts/front_icons.json` | icon geometry by name (Lucide, ISC, inlined as paths) | B |
| `js/front/shell.js` | theme toggle, menu, `/` shortcut, unhide-on-script | B |
| `js/front/desk.js` | facets, filtering, toolkit render, copy-install | B |
| `scripts/front_carry.py`, `scripts/front_carry.config.json` | carry a tier page into a screen | C |
| `js/front/stage.js`, `desk-toy.js`, `wall.js` | copies of the tier scripts | C |
| `scripts/front_check.py` | static checks (stdlib) | T |
| `scripts/front_probe.mjs`, `front_probe.config.json`, `front_probe_fixtures/` | browser checks and their broken fixtures | T |
| `scripts/FRONT-PAGE.md` / `FRONT-PAGE-CARRY.md` / `FRONT-PAGE-CHECKS.md` | manual + errors-to-fix table | B / C / T |
| `docs/front-page/**` | GENERATED output. Never hand-edit. | B |

The 300-line review rule applies to every file. Split by 500.

## Tokens (`front.tokens.css`) — names are fixed

Light on `:root`, dark on `:root[data-theme="dark"]`. Values are the desk's measured port of the
donor (see `docs/front-page-design/mockup/mockup.css`; every ratio is in the desk's
`web/desk.tokens.css` header and must be re-measured here).

`--bg --bg-raised --bg-sunken --side-bg --edge --hairline --hairline-lit --ink --ink-dim
--ink-faint --good --warn --bad --live --primary --primary-ink --accent-bg --accent-ink
--surface-hover --shadow-1 --font-ui --font-mono --fs-micro --fs-label --fs-body --fs-lead
--fs-title --fs-fig --shell-side --shell-bar --shell-pad --shell-max --gap-tight --gap
--gap-wide --radius --radius-lg --t-state`

The agent that owns the tokens file may ADD a token it needs (for example `--shadow-pop`) and must
list it in its report; it may not rename or drop a listed one. `--shell-max` is 1280px (80rem at 16px; owner's call, D-A27 item 3). No raw colour, radius,
shadow or duration may appear in any other file. One exception, deliberate: a carried piece keeps its
own animation timings (`--enter`, `--draw`, keyframe durations) in the generated `carry-*.css`,
because they belong to the piece's choreography. Colours and radii in carried CSS are tokens. `color-scheme` follows the theme.

## Classes — every class starts with `fp-`

A generic local class that collides with a system class is the failure that started Stagecraft v2.
Carried pieces keep their own class names, but their CSS is scoped under `.fp-carry-<screen>`.

- Shell: `fp-skip fp-side fp-brandrow fp-brand fp-tile fp-tile-brand fp-two fp-nav fp-navgroup
  fp-navgroup-k fp-sidefoot fp-sheet fp-bar fp-crumb fp-end fp-find fp-theme fp-dot fp-menu-btn
  fp-main fp-track`
- Every page head: `fp-kicker` (small line above), `fp-title` (the one `h1`), `fp-lede` (the paragraph
  under it). No CSS selector styles a bare `h1`, `h2`, `p` or `table` inside `.fp-main`; every
  selector starts from an `fp-` class (the one reset block excepted). A carried piece must not be
  restyled by accident.
- Home: `fp-role fp-intro fp-figs fp-fig fp-stamp fp-doors fp-door fp-door-k fp-go fp-findline`
- Pages and Tool Desk: `fp-pagehead fp-pins fp-pins-k fp-ghost fp-toolbar fp-facet fp-fa fp-vsep
  fp-badge fp-pop fp-n fp-reset fp-panel fp-panel-head fp-meta fp-table fp-name fp-cat fp-blurb
  fp-inst fp-st fp-empty fp-copy fp-toggle fp-star`
  (`fp-meta` is the "N shown" text in a panel head. `fp-copy` is the copy-install button.
  `fp-toggle` is a rectangular on/off button using `aria-pressed`, used for "starred only".
  `fp-star` marks a starred tool with a shape, not only a colour.)
- A status marker is `<span class="fp-st" data-s="live">live</span>`. The word is always shown;
  the marker shape is a second channel. Statuses: live built active frozen superseded retired
  shelved private.
- No pill shape anywhere (owner, D-A27 item 7): corners are `--radius` (6px) or `--radius-lg`
  (12px, the sheet and panels). No `border-radius` of 999px or 50% except the round status dot.

## The shell block (B writes it once; every page carries the identical block)

```html
<body data-screen="desk">
<a class="fp-skip" href="#fp-main">Skip to the page</a>
<aside class="fp-side" data-chrome="identity_navigation" aria-label="Site">
  <div class="fp-brandrow">
    <a class="fp-brand" href="{root}"><span class="fp-tile fp-tile-brand">JD</span><span class="fp-two"><b>Jordan Doerksen</b><small>Trading, rail, games</small></span></a>
    <button type="button" class="fp-menu-btn" id="fp-menu-btn" aria-expanded="false" aria-controls="fp-nav" hidden>{icon:menu} Menu</button>
  </div>
  <nav class="fp-nav" id="fp-nav" aria-label="Sections"> ...groups from config, one aria-current="page"... </nav>
  <div class="fp-sidefoot">Figures as of {asof}</div>
</aside>
<div class="fp-sheet">
  <header class="fp-bar" data-chrome="orientation_progress">
    <span class="fp-crumb"><span>{group}</span><b>{title}</b></span>
    <div class="fp-end">
      <form class="fp-find" data-chrome="find" role="search" action="{root}desk/" method="get" hidden>...<input type="search" name="q" id="fp-q" ...></form>
      <button type="button" class="fp-theme" id="fp-theme" aria-pressed="false" hidden><span class="fp-dot"></span>Dark</button>
    </div>
  </header>
  <main class="fp-main" id="fp-main"><div class="fp-track">{screen body}</div></main>
</div>
```

- Exactly three `data-chrome` clusters: `identity_navigation`, `orientation_progress`, `find`. Every
  `position: fixed` or `sticky` element sits inside one. An open popover or the phone sheet is
  transient and is not a cluster.
- Anything that needs a script ships `hidden` (find, theme toggle, menu button, the Tool Desk
  toolbar). `shell.js` unhides it. With no script: all content, all rows and all nav links remain.
- A narrow screen (`max-width: 768px`) shows the Menu button and folds the nav. The number 768 is a
  literal in `front.shell.css` and in `shell.js` (a media query cannot read a token); a check
  asserts the two are equal.
- A carried piece must not nest a `<main>`. The carry step turns it into a `<div>`.
- `<head>` has an inline script that sets `data-theme="dark"` before paint (stored key `fp-theme`,
  else the system setting), wrapped in try/catch. Title is `<screen> · Jordan Doerksen`; Home is
  `Jordan Doerksen`.

## Screens

**Home.** The owner's tier-1 text verbatim (kicker from config `home.eyebrow`, h1, role line, the
intro paragraph with its bold opening), the figures row, the stamp line, three doors (text columns
separated by hairlines, no cards), and one line pointing to the Tool Desk. Figures come from
`data/evidence.json` the way `scripts/site_compose.py figures()` reads them. The desk-suite figure is
labelled "tests passing in the trading desk suite" and is omitted if the suite was not executed.
Absent is not zero.

**Rail software.** Kicker "Training", h1 "Rail software", the owner's Training paragraph verbatim,
then a typographic index of the registry's `rail` projects (name, status, blurb) and a link to
`/rail/`. It states no rule of its own (SAFE-03).

**Tool Desk (parity with the old `desk/`, plus the new controls).**
1. Pinned row (`desk.json` `pinned`), plain ghost buttons.
2. Toolbar (hidden until script): facet Section (8 registry sections), facet Status (8), Reset.
   Multi-select, a chosen value shows in a badge, Reset only while filtered, Escape and an outside
   click close a popover, one popover open at a time. On a phone the popover is a bottom sheet.
3. Projects panel: one static row per registry project (and `desk.json` `extra`), written at build
   time: name (link by the routing rule in this repo's `ARCHITECTURE.md`), section, status, blurb.
   Rows carry `data-c`, `data-s`, `data-q`. The panel header shows "N shown". Narrow: each row
   stacks (grid), never a scroll box.
4. Toolkit panel: 160 tools from `data/toolkit.js` (`window.IT_TOOLKIT`), rendered by `desk.js` with
   the star and install overlay from `desk.json` `toolkit`, inlined by the generator as
   `window.FP_TOOLKIT_OVERLAY`. Own category facet, a starred-only toggle, copy-install button for a
   tool with an install command. Without script: one sentence saying the list needs script, and a
   link to the it-toolkit repo.
5. The bar's search (`/` focuses) filters both panels. `?q=` pre-fills it.
6. `desk.json` `mine` notes, ports and local paths are NOT written to the page (config flag
   `desk.show_local` is `false`; the flag exists, the code that would show them does not yet).
7. Classic scripts only. No `fetch`, no ES modules, so the page works from `file://`.

## Carry-over contract (C)

`front_carry.carry(screen_id, ctx) -> {"body": html, "css": [paths], "scripts": [paths]}`.
`ctx` has `root` (prefix), `repo` (Path), `log` (front_log logger).

1. Read the tier page. Take its `<style>` blocks and `<body>`. Drop every `<script>`.
2. Scope every selector under `.fp-carry-<screen>` (reuse the idea in `site_compose.scope_css`; do not
   edit that file). `:root` rules become the scope class. `html` and `body` rules are dropped.
3. Remove the palette variable declarations (`--paper --sheet --deep --ink --ink-2 --muted --hair
   --live --warn --ok --wire --hot --display --sans --mono --signal --rule --correct`). Keep the
   timing and layout ones. `front.bridge.css` defines the dropped names from tokens.
4. Replace every hex or rgb literal with a token through the map in `front_carry.config.json`. A
   literal with no mapping is a build failure, logged as `carry_literal_unmapped`.
5. Rewrite relative paths (`../../games/`, `../../assets/`, `../../demos/`) for the output depth.
6. Turn a nested `<main>` into a `<div>`. Keep ids unique across the page.
7. Copy the scripts to `js/front/`. They run unchanged. The bridge must keep every colour that
   carries meaning distinct from the others, in both themes, and the pieces keep their own
   reduced-motion handling (the auto-playing tour must stand still and be complete when reduced
   motion is on).
8. Never edit `docs/tier-*/` or `scripts/build_tier*.py` or `scripts/site_compose.py`. The old page keeps
   working until promotion.

## Logging (observability law)

Every script uses `front_log.py`: JSON lines with `ts level severity_number run_id event ctx`,
written to `scripts/logs/front-page-YYYYMMDD.jsonl`, the resolved path printed as the first line of a
run, a crash trap (`faulthandler`, `sys.excepthook`), and an explicit final line. Log what did NOT
happen: `screen_skipped`, `tier_page_missing`, `carry_literal_unmapped`, `figure_unavailable`.
No `except: pass`. The Node probe writes the same five keys.

## Checks (T)

Static (`front_check.py`, stdlib, exit 0/1/2; 2 means could not look and is not a pass):
config schema · output equals a fresh build (`--check`) · nav block identical on every page except
`aria-current` · exactly one `aria-current` per page · every internal href and asset resolves ·
ids unique per page · every `fp-` class used is defined and every defined one is used · no raw colour,
radius, shadow or duration outside `front.tokens.css` · no `border-radius` pill · figures equal
`evidence.json` · row count equals the registry · 768 matches in CSS and JS · every status used has
a marker rule · no bare element selectors outside the reset and the `.fp-` scopes · no scripts
with `import`/`fetch` on the front page.

Browser (`front_probe.mjs`, Playwright resolved from an existing install, no new package) at 320,
375, 412, 768, 1024, 1280, 1920, both themes, every screen:
no sideways overflow (document or any rendered element with `overflow-x` auto or scroll that scrolls;
skip what is not rendered) · a gutter of at least 8px between content and all four window edges ·
at most three chrome clusters and every fixed or sticky element inside one · text 4.5:1 on its
effective ground and control edges 3:1, measured, not assumed · JavaScript off: all content and links
present, no visible dead control · reduced motion: no running infinite animation, tour static and
complete · keyboard: skip link first, every link and control reachable, a visible focus ring on each
stop, Escape closes menu and popover · no console error, no failed request · status markers draw a
shape. Every browser check has a deliberately broken fixture in `front_probe_fixtures/`, and
`--selftest` fails unless each one is caught.

## Promotion (owner's go only, later)

Copy `index.html` to `docs/legacy-three-tier.html` and `desk/index.html` to `docs/legacy-desk.html`
first. Then `python scripts/build_front_page.py --root`. Old URLs keep working: the hubs, the atlas,
the games and every redirect stub are untouched. `js/site/` stays for the legacy page.

## How to modify

Read `DECISIONS.md` D-A27 → this file → open only the owner's files for your change. A colour
change is `front.tokens.css` only. A nav change is `front_page.config.json` only. A copy change on
Home is `front_screens.py` only if it is not in config. Run `python scripts/build_front_page.py
--check`, `python scripts/front_check.py`, then the probe.
