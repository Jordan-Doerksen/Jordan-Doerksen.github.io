# ARCHITECTURE.md — jordan-doerksen.github.io (Architecture Atlas)

Static site, no build step. GitHub Pages from `main`. Local preview: `python -m http.server 8741` (launch preset `site`).

```
/
├── index.html              front door — atlas document (fetches registry)
├── atlas/index.html        ONE template page: ?p=<slug> → renders data/projects/<slug>.json + diagram
├── rail|games|trading|studio|signals|bots|tools/
│   ├── index.html          hub shell — fetches registry, filters by category, renders cards
│   └── <project>/          embedded project apps (UNTOUCHED by the atlas layer)
├── data/
│   ├── registry.json       INDEX: categories[] + projects[] (card-level fields only)
│   └── projects/<slug>.json  full atlas content, one per full-tier project
├── assets/diagrams/<slug>.svg  hand-authored data-flow diagram per full-tier project
├── styles/                 Daybreak Editorial copy (tokens.css, style.css, effects.js — from style-library)
│   └── atlas.css           additive atlas-layer styles only
├── projects/, <old-paths>  redirect stubs — old URLs never break
└── css/, js/, sol-obscurus/, bedroom-weather/, forge/, warcraft/   LEGACY ANNEX (working, unlinked)
```

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

## Data flow
1. Front door + hubs fetch `data/registry.json`, render cards client-side (status chip + tier-aware link).
2. Full-tier card → `/atlas/?p=<slug>`; entry-tier card → repo link or unlinked "private/retired".
3. Atlas template fetches `data/projects/<slug>.json`, inlines `assets/diagrams/<slug>.svg` via fetch (SVG injected inline so tokens/currentColor apply), renders: header → status → stack → diagram → components → data flow → decisions → links.
4. Missing slug/JSON → explicit "no atlas entry" state.
5. `styles/effects.js` injected after cards exist (documented workaround, unchanged).

## Diagram SVG contract (uniformity)
Diagrams use the same class-based system as the front-door case studies, styled by `styles/atlas.css` (no hardcoded colors in the SVG):
- `viewBox="0 0 1000 <h>"`, no width/height attrs, transparent background; `role="img"` + a full `aria-label` describing the flow.
- Nodes: `<g class="dg-node" data-n="<id>"><rect rx="8"/><text class="n">NAME</text><text class="r">role</text></g>`.
- Edges: `<g class="dg-edge e-<from> e-<to>"><path marker-end="url(#<id>-m)"/><text>label</text></g>`; primary-flow edges add class `gold` (accent), secondary use default, dashed relations add `dash`. Markers defined per-SVG in `<defs>` with unique ids, paths `dg-arrow-a` (accent) / `dg-arrow-m` (muted).
- Callouts: `<text class="dg-callout">[ UPPERCASE FACT ]</text>` + `dg-callout-sub` lines; boundary lines `dg-bound`, container shells `dg-shell` + `dg-shell-label`.
- Left-to-right primary flow; fan-outs stack vertically. No animation, no external refs, no `<style>` inside the SVG.

## Cross-check (Definition of Done)
- Every registry project: valid category, tier, status; full-tier ⇒ `data/projects/<slug>.json` exists ∧ diagram file exists ∧ atlas page renders it.
- No card links to a 404. JSON all parses. Preview verified on port 8741. Reduced-motion path verified.
