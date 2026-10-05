# Carry step: trading desk and games

Takes two pages that other generators already build, `docs/tier-2-case/index.html` and `docs/tier-3/index.html`, and
turns them into the Trading desk and Games screens of the front page. Decision record: `DECISIONS.md` D-A27 (CR-21).
The contract: `docs/front-page-design/ARCHITECTURE.md`, "Carry-over contract". Python standard library only.

It does not edit the tier pages, their generators, or `scripts/site_compose.py`. The old page keeps working.

## Run it

It runs inside the page build. There is no separate command.

```
python scripts/build_front_page.py            # carries both screens, writes the files below, then the pages
python scripts/build_front_page.py --check    # carries in memory; exit 1 if any generated file differs
python scripts/build_front_page.py --only games
```

A second run changes nothing. `--check` writes nothing to the site (it appends to the log).

## What it writes

| File | What | Edit by hand? |
|---|---|---|
| `styles/front/carry-trading.css`, `carry-games.css` | The tier CSS, scoped and re-coloured. | No. Regenerated. |
| `js/front/stage.js`, `desk-toy.js`, `wall.js` | Byte copies of the tier scripts (LF). `wall.js` serves both screens. | No. Change the tier script. |
| `styles/front/front.bridge.css` | The old variable names, defined from the tokens. Hand-written. | Yes (it is not generated). |
| `scripts/front_carry.config.json` | Every decision the step makes, as data. | Yes. |

The page body comes back to the builder, which writes the page.

## What it does to the tier page

1. Takes the `<style>` blocks and the `<body>`. Drops every `<script>` and every HTML comment.
2. Moves the kicker, the `<h1>` and the lede out of the body into the shell's page head (`fp-pagehead`), so the page
   head matches Home and Rail software. The CSS rules for the removed elements are dropped (`drop_selectors`).
3. Scopes every selector under `.fp-carry-<screen>`. `:root` becomes the scope class. `html` and `body` rules are dropped.
   `@keyframes` names stay as they are.
4. Removes the palette variable declarations (`--paper --sheet --deep --ink --ink-2 --muted --hair --wire --live --warn
   --ok --hot --display --sans --mono --signal --rule --correct`). Timing and layout variables stay.
5. Turns `(min|max)-width` media queries into container queries on `.wrap`, because the sidebar makes the box narrower than
   the window. `prefers-reduced-motion` stays a media query.
6. Maps every colour literal to a token (see below). A literal with no mapping stops the build.
7. Rewrites `../../assets/`, `../../demos/` and `../../games/` to the page's root prefix, and checks each target exists.
   In the review build a bare directory URL gets `index.html` added, as the builder does for its own links: opened from
   disk, a bare directory shows a file listing, not the page.
8. Turns a nested `<main>` into a `<div>`, drops `src="about:blank"` from iframes (an iframe with no `src` is the same
   blank document), removes the text listed under `redact`, wraps the body in `<div class="fp-carry fp-carry-<screen>">`,
   and checks ids: unique, none starting `fp-`.
9. Refuses `position: fixed` or `sticky` unless the selector is listed in `allow_fixed` with a reason.

Nothing is written until all of that passed.

## The config, section by section

| Key | Holds |
|---|---|
| `palette_names` | Variables the carried CSS may not declare. |
| `rgb_tokens` | `rgba(R,G,B,a)` washes: the triple names the token, the alpha becomes the percentage in `color-mix()`. |
| `literals` | Hex literals, by value and optionally by selector and property, each with the token it becomes and why. |
| `rewrites` | Substitutions inside a declaration (selector regex, property regex, `from`, `to`). |
| `screens.<id>.source`, `css_out`, `scripts` | Where the page is, where the CSS goes, which scripts are copied. |
| `screens.<id>.head` | Regexes that find the kicker, title and lede. `text` replaces the kicker. |
| `screens.<id>.container` | The box the container queries measure. Leave it out when the CSS has no width query. |
| `screens.<id>.overrides` | Declarations forced on a rule (the `.wrap` width and padding). |
| `screens.<id>.allow_fixed` | Selectors allowed to be fixed or sticky, each with the reason. |
| `screens.<id>.redact` | Text removed from the body (a path on the owner's machine), each with the reason. Delete the entry to show it again. |
| `screens.<id>.insert` | Markup the tier page does not have, put in front of an anchor string (`before`, `html`, `why`). Used once: a note that stands in for the parts-mesh diagram on a narrow screen. |
| `screens.<id>.extra_css` | Rules added to the tier CSS (corner radii from the tokens, the mesh label size, the narrow-screen swap). Scoped like the rest. |

Top-level `literals` and `rewrites` apply to every screen; the same keys inside a screen are added after them.

| You want | Edit |
|---|---|
| A colour to change | `styles/front/front.tokens.css`. Nothing here. |
| A tier colour mapped to a different token | `literals`, or `rgb_tokens` for a wash. |
| A control edge to reach 3:1 | `rewrites`: `var(--hair)` to `var(--wire)` for that selector. |
| A new carried screen | A `screens.<id>` entry, then the screen in `front_page.config.json` with `"kind": "carried"`. |
| Another tier script | `screens.<id>.scripts`. |

## When something breaks

**Where the log is.** Same file as the page build: `scripts/logs/front-page-YYYYMMDD.jsonl`, the path is the first line of
every run. The carry's lines have `ctx.tool` `build_front_page` and `ctx.screen` set. Errors have `severity_number >= 17`.

**Triage.** Run `python scripts/build_front_page.py`. Read the lines that start with `ERROR`: each names the selector, the
property and the literal, or the file. The carry reports every fault it finds in one run, then stops before writing.

| What you see | What it means | Fix |
|---|---|---|
| `carry_literal_unmapped` literal=`#123456` selectors=`[".x"]` | The tier CSS (or an inline attribute) has a raw colour the config has no mapping for. The build stops. | Add a `literals` entry (value, selector, property, token) or, for an `rgba()` wash, an `rgb_tokens` triple. Better: change the tier generator to use a variable. |
| `StaleCarry` / `carry_file_stale` (`--check`, exit 1) | A generated file is missing or differs from a fresh carry. The log names it. | Run the build without `--check`. If you edited a generated file by hand, move the edit into the config or the script. |
| `tier_page_missing` | `docs/tier-2-case/index.html` or `docs/tier-3/index.html` is not in the repo. The build stops (exit 1). | Run the tier generator (`scripts/build_tier2_case.py`, `scripts/build_tier3_wall.py`) or restore the file. |
| `tier_script_missing` | A script named in `screens.<id>.scripts` is not in the repo. | Restore it, or fix the path in the config. |
| `page head: 'lede' matched nothing` | The tier page no longer has the element the `head` regex looks for. | Update the pattern in `screens.<id>.head`. |
| `carry_fixed_position` | The tier CSS has a `position: fixed` or `sticky` rule that is not allowed. The shell has three chrome clusters. | Remove the rule in the tier CSS, or list the selector in `allow_fixed` with a reason (a transient overlay is the only good one). |
| `carry_path_missing` | A link, image or frame points at a file that is not in the repo. | Restore the file, or fix the tier page. |
| `carry_path_unresolved` | The tier page has a relative path other than `../../`. It would break at the new depth. | Use `../../` in the tier page, or extend the rewrite in `front_carry.py`. |
| `carry_id_clash` | An id appears twice, or starts with `fp-`. | Rename it in the tier page. |
| `carry_at_rule_unsupported` | The tier CSS has an `@font-face`, `@import` or similar. | Handle it in `_at_rule`, or take it out of the tier CSS. |
| `carry_css_malformed` | A declaration has no `:`. | Fix the tier CSS. |
| `carry_config_unused` (warning) | A `literals`, `rewrites` or `overrides` entry matched nothing. The tier CSS probably changed. | Delete the entry or update it. The build goes on. |
| `carry_fixed_kept` (info) | A fixed rule was kept because it is in `allow_fixed`. | None. |
| `screen_skipped` | The screen id is not in `front_carry.config.json`. | Add it. |
| `screen_failed` | The carry raised. The error text and traceback are in the log. | Read the line above it. |

**Known silent spots.**
- `container-type` is set on `.wrap` only, never on `.fp-carry-<screen>`. A container box becomes the containing block of
  anything fixed inside it, and the games player is fixed. If a tier change moves the player inside `.wrap`, it will cover
  the box and not the window.
- `color-mix()` needs Chrome 111, Safari 16.2 or Firefox 113. Older browsers drop the declaration that holds it (the wash
  is missing; text and borders are unaffected).
- With scripting off (`@media (scripting: none)`, Chrome 120, Safari 17, Firefox 113) the opening lines of the Trading desk
  page show at once; elsewhere they fade in over about two seconds from CSS alone.
- The Holdout game loads ES modules, which a browser refuses on `file://`. Opened from disk it shows a black frame; online it
  loads. Nothing in the carry can change that.
- Whether the result looks right is not checked here. The browser checks in `scripts/front_check.py` and the probe do that.
- The mesh diagram (`.meshsvg`) is one SVG scaled to its box. On a phone its labels are about 3px tall. The tier page has
  the same limit. The same names are in the cards above it.

## Exit codes

The carry does not set them; the build does. A carry fault is exit 1 (`screen_failed`), nothing written.
