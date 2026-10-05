# jordan-doerksen.github.io

One static monorepo: a front page, eight section pages, a write-up page per
documented project, and the project apps themselves — all in the same repo, all
driven by JSON.

**Naming, since it trips people up:** `atlas` is the *technical* name of the
write-up URL, template, and stylesheet (`/atlas/?p=<slug>`), kept because old
URLs never break. Nothing a reader sees says "atlas" — the copy calls those
pages **"how it works"**. Same deal with `data-wing`: the copy says **"section"**.
The site has no collective name for itself; it's just Jordan Doerksen. See D-A11.

**No build tools. No npm. No frameworks.** Plain HTML, CSS, and JavaScript at
the shell layer — edit a file, push, and GitHub Pages redeploys. (Embedded
apps like `rail/clear-board/` ship their own build output; the shell never
needs one.)

## How it fits together

```
index.html                 front page, Home (generated): the opening, the figures, three doors
work/trading-desk/         the desk's path tour, parts diagram and toy (generated)
work/rail-software/        rail software and the rail projects (generated)
work/games/                the wall of ten attract screens (generated)
desk/index.html            the Tool Desk: 59 projects, 160 tools, filters, search (generated)
atlas/index.html           ONE template page: /atlas/?p=<slug> renders any project's
                           stack, diagram, data flow, components, and decisions
rail/ games/ trading/
studio/ signals/ bots/
tools/ navigation/         eight section pages (thin shells) + the project apps inside
data/registry.json         the list: 58 projects, card-level fields, tier full|entry
data/projects/<slug>.json  write-up content, one file per documented project
assets/diagrams/<slug>.svg hand-drawn data-flow diagram per documented project
scripts/build_front_page.py  writes the five pages above (--check compares, --root promotes);
                           manual: scripts/FRONT-PAGE.md
styles/front/ js/front/    the five pages' own CSS (tokens, shell, parts) and scripts
js/shell/                  boot · chrome · finder · index-list — shared by the sections + atlas
styles/stagecraft.*        the house style of the sections and atlas: tokens, base, composition primitives
css/ js/ sol-obscurus/
bedroom-weather/ forge/
warcraft/                  legacy annex — old Observatory pages, working but unlinked
```

## The style law

Composition on every public page is governed by the **Award-Winning Web UI/UX Style
Bible** (`C:\projects\reference\award-winning-web-ui-ux-style-bible`): one dominant idea per stage,
a written narrative sequence, at most three persistent clusters, cards only for genuinely
comparable peers, motion only where it orients or explains, and small screens that
**re-author priority** rather than shrink the desktop layout.

Its visual layer here is **Stagecraft** — archive-plate ground, one signal amber, and the
same three typefaces doing a different job. `styles/stagecraft.tokens.css` is the whole
control panel; `html.light` flips it to a paper ground.

**The five front-page screens are the exception (D-A27, CR-21, 2026-10-05).** They wear the
trading desk's donor look (a sidebar, a rounded sheet, warm neutrals, light and dark) in their own
stylesheet, `styles/front/`, with no Stagecraft CSS in it. Stagecraft's *rules* still apply and are
checked: three persistent clusters, no sideways scroll, measured contrast, nothing broken with
JavaScript off. The contract is `docs/front-page-design/ARCHITECTURE.md`; the checks are
`python scripts/front_check.py` and `node scripts/front_probe.mjs` (manual: `scripts/FRONT-PAGE-CHECKS.md`).
The previous front page and desk are kept as `docs/legacy-three-tier.html` and `docs/legacy-desk.html`
(byte-for-byte archive copies; their relative paths point at the repo root, so they are a record, not working pages).
Git history holds the originals.

Daybreak Editorial is **superseded for webpages**. Its files stay on disk and are loaded
by exactly one page, `docs/legacy-front-door.html`. Don't wire them into anything new.

Adding a project = one object in `registry.json`; documenting it = one JSON in
`data/projects/` plus one SVG in `assets/diagrams/`. No page code changes.

The working docs are co-equal artifacts: `DECISIONS.md` (the manifest) and
`ARCHITECTURE.md` (the map, including the registry/atlas schemas and the
diagram SVG contract). Read those before changing structure.

## Preview locally

The shell loads everything with `fetch()`, which browsers block on `file://`:

```bash
cd jordan-doerksen.github.io
python -m http.server 4530
```

Then open <http://localhost:4530>.

## House rules

- Statuses are honest — a row with nothing behind it says `private`,
  `frozen`, or `retired`, and isn't a link. Show nothing rather than
  something false.
- `prefers-reduced-motion` is law; every effect is skipped or static when set.
- Nothing essential hides behind JavaScript. Entrances animate position only,
  never opacity, so a dead script costs you 18 pixels — not the content.
- Old URLs never break: redirect stubs and the legacy annex stay reachable.
  (`/` is the front page again as of 2026-07-25; the desk moved to `/desk/`.)
- **The copy invites, it doesn't boast.** "Here's what I'd point you at" beats
  "look what I built". No collective noun for the site, no museum words. D-A11.
- No page carries a fourth persistent cluster. If something wants to live on
  screen forever, it has to displace identity, progress, or find.

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank index when opened from a folder | Use the local server — `fetch()` doesn't work on `file://` |
| Changes pushed but site looks old | Hard-refresh (`Ctrl+Shift+R`); Pages can take ~1–2 min |
| Animations not moving | Your OS has "reduce motion" on; the site respects it on purpose |
| An atlas URL shows "no atlas entry" | The slug has no `data/projects/<slug>.json` — entry-tier projects are index-only by design |
| The Tool Desk isn't at `/` any more | It moved to `/desk/` in CR-7; the link is in the sidebar |
| A front-page screen looks out of date | The five pages are generated. Run `python scripts/build_front_page.py --root`; `--check` says which page differs. Never edit one by hand. |
| The front-page checks say `UNKNOWN` | Exit 2 means a check could not look (missing page, no Playwright). It is not a pass. See `scripts/FRONT-PAGE-CHECKS.md`. |
| Want the old warm paper look | Add `class="light"` to `<html>` — the token file carries a contrast-checked light ground |
