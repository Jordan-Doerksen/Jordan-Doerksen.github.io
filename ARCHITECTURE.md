# ARCHITECTURE.md — jordan-doerksen.github.io (Architecture Atlas)

Static site, no build step. GitHub Pages from `main`. Local preview: `python -m http.server 8741` (launch preset `site`).

> **Naming (D-A11):** technical identifiers below keep their original names — `atlas`,
> `data-wing`, `.index*`, `data-stat="documented"` — because renaming them buys nothing and
> breaks URLs. **None of them appear in what a reader sees:** the copy says "how it works",
> "section", "the list", and "written up". If the two ever disagree on a page, the copy wins.

```
/
├── index.html              front page — stage → what this is → four worth starting with →
│                           the list → how the write-ups work → resolution
├── desk/index.html         the Tool Desk (moved from "/" in CR-7; same tables, new palette)
├── js/shell/               shared shell: boot.js (entry), chrome.js (progress + entrances),
│                           finder.js (the overlay finder), index-list.js (typographic index)
├── js/atlas/atlas.js       atlas render: opening stage + railed chapters
├── js/desk/                desk logic: desk.js (boot/merge), render.js, search.js, copy.js
├── docs/legacy-front-door.html   the retired atlas front door, preserved as-is — the ONLY
│                           page still loading the Daybreak files
├── atlas/index.html        ONE template page: ?p=<slug> → renders data/projects/<slug>.json + diagram
├── rail|games|trading|studio|signals|bots|tools/
│   ├── index.html          wing shell — stage + typographic index scoped by data-wing
│   └── <project>/          embedded project apps (UNTOUCHED by the atlas layer)
├── data/
│   ├── registry.json       INDEX: categories[] + projects[] (card-level fields only)
│   ├── desk.json           desk OVERLAY: pinned[], mine notes/ports/local paths, toolkit stars/installs
│   ├── toolkit.js          MIRROR of C:\projects\tools\it-toolkit's catalog (~160 tools) — edit there, copy over
│   └── projects/<slug>.json  full atlas content, one per full-tier project
├── assets/diagrams/<slug>.svg  hand-authored data-flow diagram per full-tier project
├── assets/diagram-live.js  hover lighting + IO-paced pulses (reduced-motion gated)
├── styles/
│   ├── stagecraft.tokens.css   THE control panel — palette, type scale, measure, motion
│   ├── stagecraft.base.css     reset, type, the 3 persistent clusters, footer, a11y, motion
│   ├── stagecraft.compose.css  composition primitives (stage / chapter / field / index / rail)
│   ├── atlas.css               diagram system + atlas-only layout
│   ├── desk.css                desk-only layout (reads the token bridge)
│   └── tokens.css, style.css, effects.js, shader.js, cmdk.js   DAYBREAK — legacy, loaded
│                               ONLY by docs/legacy-front-door.html. Do not wire to new pages.
├── projects/, <old-paths>  redirect stubs — old URLs never break
└── css/, js/, sol-obscurus/, bedroom-weather/, forge/, warcraft/   LEGACY ANNEX (working, unlinked)
```

## Style law (CR-7)

Composition is governed by `C:\projects\reference\award-winning-web-ui-ux-style-bible`; the visual
layer is **Stagecraft**. Every page declares three things and no more:

| Cluster | Element | Why it earns permanent space |
|---|---|---|
| identity_navigation | `.chrome .mark` + `.chrome-nav` | who this is, and the route home from any depth |
| orientation_progress | `.progress` hairline + `.folio` labels | position in a long document |
| primary_action | `.find` → the overlay finder | 57 systems; finding one IS the task |

Composition primitives map to `composition_zones/zones.json`: `.stage`→viewport_stage,
`.chapter`→content_band, `.field`→media_field, `.index`→content_band (typographic),
`.rail`→narrative_rail, `.note`→edge_annotation, `footer.site`→footer_resolution.

**Card policy:** `.peers` in the atlas Components chapter. Nowhere else.

**Survival rules** (each one is checked, not assumed): entrances animate transform only,
so no content is ever hidden behind an observer · the diagram scrolls inside its well and
the page never scrolls sideways · the finder is an accelerator whose every destination is
also a plain link · reduced motion hides the progress bar, resolves entrances, and stops
the diagram pulses, leaving complete static states.

## Schemas

`data/registry.json`
```json
{
  "categories": [{ "slug": "", "name": "", "num": "01", "desc": "" }],
  "projects": [{
    "slug": "", "name": "", "category": "rail|games|trading|studio|signals|bots|tools",
    "blurb": "", "tags": [""],
    "status": "live|built|active|frozen|retired|superseded|shelved|private",
    "tier": "full|entry",
    "url": "/cat/slug/ or null", "repo": "https://… or null",
    "featured": false, "spec": "SHORT · MONO · LABEL",
    "supersededBy": "slug or absent"
  }]
}
```

`data/projects/<slug>.json`
```json
{
  "slug": "", "name": "", "category": "", "status": "", "statusNote": "one honest sentence",
  "oneLiner": "",
  "stack": ["…"],
  "components": [{ "name": "", "desc": "" }],
  "dataFlow": ["step 1 …", "step 2 …"],
  "integrations": ["…"],
  "decisions": ["notable design decision, one line each"],
  "links": { "live": "url or null", "repo": "url or null" },
  "diagram": "/assets/diagrams/<slug>.svg or null"
}
```

## Data flow — front door + wings
1. `<html data-root>` gives the shell its depth (`""` at the root, `"../"` in a wing), so the
   same modules run at every level and the site survives being served from a subpath.
2. `js/shell/boot.js` fetches `data/registry.json` **once** and hands it to two consumers:
   `index-list.js` (rows, grouping, the filter field and wing chips) and `finder.js` (the
   overlay accelerator). Stage counts are derived from the same payload — no hand-kept number.
3. A wing restricts the same renderer with `<div class="index" data-wing="rail">`. There is
   one index implementation, not eight.
4. Registry unavailable → the index says so in place, the finder button disables itself, and
   every hard-coded link (selected systems, wings, footer) keeps working.

## Data flow — atlas
1. `js/atlas/atlas.js` reads `?p=<slug>`, fetches `data/projects/<slug>.json`, and builds the
   opening stage plus one chapter per populated field. The narrative rail is built **from the
   chapters that actually rendered**, so it can never list a section that is not there.
2. The diagram SVG is fetched and injected only after it is checked to start with `<svg`; a
   failed fetch removes both the chapter and its rail entry rather than leaving an empty well.
3. `assets/diagram-live.js` re-scans after injection for hover lighting and IO-paced pulses.
4. Missing slug / missing JSON → an explicit "no atlas entry" state, never a blank page.

## Data flow — desk
1. `desk/index.html` loads `data/toolkit.js` (script tag) and fetches `data/registry.json` + `data/desk.json` via `data-root`.
2. `js/desk/desk.js` merges: registry = canonical project facts, desk.json = overlay (pins, notes, ports, local paths, stars, installs), toolkit.js = the it-toolkit catalog.
3. `render.js` draws pinned daily drivers + the dense Mine and Toolkit tables; `search.js` drives the sticky global search + filter chips; `copy.js` handles click-to-copy (ports, paths, commands).
4. Nothing writes back — the overlay is edited in `data/desk.json` by hand; toolkit edits happen in it-toolkit and get mirrored.

## Routing
Full-tier project → `/atlas/?p=<slug>`. Entry-tier → its live URL, else its repo, else an
honest non-link row labelled with its real state. That single rule lives in
`destination()` in `js/shell/finder.js` and is shared by the index and the finder, so a
row and the finder can never disagree about where a project lives.

## Diagram SVG contract (uniformity)
Diagrams use one class-based system, styled by `styles/atlas.css` (no hardcoded colors in the SVG). CR-7 moved the colours to the Stagecraft ground; **no diagram file changed**:
- `viewBox="0 0 1000 <h>"`, no width/height attrs, transparent background; `role="img"` + a full `aria-label` describing the flow.
- Nodes: `<g class="dg-node" data-n="<id>"><rect rx="8"/><text class="n">NAME</text><text class="r">role</text></g>`.
- Edges: `<g class="dg-edge e-<from> e-<to>"><path marker-end="url(#<id>-m)"/><text>label</text></g>`; primary-flow edges add class `gold` (accent), secondary use default, dashed relations add `dash`. Markers defined per-SVG in `<defs>` with unique ids, paths `dg-arrow-a` (accent) / `dg-arrow-m` (muted).
- Callouts: `<text class="dg-callout">[ UPPERCASE FACT ]</text>` + `dg-callout-sub` lines; boundary lines `dg-bound`, container shells `dg-shell` + `dg-shell-label`.
- Left-to-right primary flow; fan-outs stack vertically. No animation, no external refs, no `<style>` inside the SVG.

## Cross-check (Definition of Done)
- Every registry project: valid category, tier, status; full-tier ⇒ `data/projects/<slug>.json` exists ∧ diagram file exists ∧ atlas page renders it.
- No row links to a 404. JSON all parses. Reduced-motion path verified.
- **Bible cross-check (since CR-7):** ≤3 persistent clusters on every page · no card grid
  outside atlas Components · no motion without a job · no horizontal page overflow at 375px
  · all text ≥4.5:1 on its own ground · every page still readable with JavaScript disabled
  (the index and atlas say what is missing; nothing silently disappears).
