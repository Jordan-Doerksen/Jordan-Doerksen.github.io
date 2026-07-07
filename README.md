# jordan-doerksen.github.io

The archive. One static monorepo: a document-shaped front door, seven category
hubs, an **architecture atlas** with one documented entry per system, and the
project pages themselves — all living in the same repo, all driven by JSON.

**No build tools. No npm. No frameworks.** Plain HTML, CSS, and JavaScript at
the shell layer — edit a file, push, and GitHub Pages redeploys. (Embedded
apps like `rail/clear-board/` ship their own build output; the shell never
needs one.)

## How it fits together

```
index.html                 front door — principles, three case studies, the full index
atlas/index.html           ONE template page: /atlas/?p=<slug> renders any project's
                           stack, diagram, data flow, components, and decisions
rail/ games/ trading/
studio/ signals/ bots/
tools/                     seven hubs (thin shells) + the project apps inside them
data/registry.json         the index: 53 projects, card-level fields, tier full|entry
data/projects/<slug>.json  full atlas content, one file per documented project
assets/diagrams/<slug>.svg hand-authored data-flow diagram per documented project
styles/                    Daybreak Editorial (copied from style-library) + atlas.css
css/ js/ sol-obscurus/
bedroom-weather/ forge/
warcraft/                  legacy annex — old Observatory pages, working but unlinked
```

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

- Statuses are honest — a card with nothing behind it says `private`,
  `frozen`, or `retired`, never a dead link. Show nothing rather than
  something false.
- `prefers-reduced-motion` is law; every effect is skipped or static when set.
- Old URLs never break: redirect stubs and the legacy annex stay reachable.
- `styles/tokens.css` / `style.css` / `effects.js` are copies from the
  `style-library` repo — edit the house style there, then re-copy.

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank index when opened from a folder | Use the local server — `fetch()` doesn't work on `file://` |
| Changes pushed but site looks old | Hard-refresh (`Ctrl+Shift+R`); Pages can take ~1–2 min |
| Animations not moving | Your OS has "reduce motion" on; the site respects it on purpose |
| An atlas URL shows "no atlas entry" | The slug has no `data/projects/<slug>.json` — entry-tier projects are index-only by design |
