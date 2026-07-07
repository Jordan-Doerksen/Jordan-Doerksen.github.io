# DECISIONS.md — jordan-doerksen.github.io (Architecture Atlas redo)

## Core Goal
Rebuild the portfolio monorepo as a **technical architecture atlas**: the front door, 7 category hubs, and a documentation page per project, all driven from `C:\projects\ARCHITECTURE-REFERENCE.md` (2026-07-06). The site itself is the proof of documentation and systems ability — README-shaped, not a pitch.

## Non-Negotiable Constraints
- **No build tools, no npm, no framework** for the shell/hub/atlas layer. Plain HTML/CSS/vanilla JS + JSON fetched at runtime.
- **Daybreak Editorial** (styles/ copied from style-library — never edited here beyond additive `atlas.css`). `prefers-reduced-motion` is law.
- **Show nothing rather than something false.** Status labels are honest (live / built / frozen reference / retired / superseded / shelved / private). Unverified claims don't ship.
- **Public-site privacy rules:** never present Jordan by a former job title (self-taught maker); private repos get minimal entries with no internal detail (no broker/prop-firm names, no account specifics); Sentinel family always labeled read-only.
- **Old URLs never break.** Existing project app folders, redirect stubs, and the four legacy spoke pages stay reachable.
- Embedded project apps (e.g. `rail/clear-board/`) are **not touched** by this redo.

## Decisions

### D-A01 — Full atlas redo (2026-07-06)
Front door, hubs, and per-project pages all rebuilt around the architecture reference.
**Change Rule:** scope changes (dropping hubs, changing the atlas concept) need operator sign-off.

### D-A02 — Coverage: everything in the reference
All ~50 repos get a registry entry. Canonical/active projects are **tier "full"** (atlas page + diagram); frozen/retired/superseded/shelved ones are **tier "entry"** (registry card only, honest status, `supersededBy` link where it applies).
**Change Rule:** moving a project between tiers is a one-line registry edit; adding hidden projects needs operator sign-off.

### D-A03 — Diagrams are hand-authored inline SVG
One committed Daybreak-styled SVG per full-tier project (`assets/diagrams/<slug>.svg`), drawn from the reference's Data-flow section. No diagram engine, no runtime deps. Entry-tier projects have no diagram.
**Change Rule:** switching to a JS renderer is a Change Request (new engine = new surface area).

### D-A04 — Data layer split: index vs pages
`data/registry.json` stays a lean index (categories + project cards). Full atlas content lives in `data/projects/<slug>.json`, one file per project, fetched only by that project's atlas page. Context economy: nothing loads 50 projects' architecture at once.
**Change Rule:** schema changes must update ARCHITECTURE.md and every consumer in the same change.

### D-A05 — One atlas template, not 50 pages
A single `atlas/index.html?p=<slug>` renders any project JSON + its SVG. Cards link to it; it links out to the live app and repo. Unknown/missing slug renders an explicit "no entry" state, never a blank or fake page.
**Change Rule:** per-project bespoke pages are a Change Request.

### D-A06 — Category mapping (reference 9 sections → 7 hubs)
1 Portfolio & Design → **studio** · 2–3 Sentinel/trading → **trading** · 4 Rail → **rail** · 5 Games + 6 Engines → **games** · 7 Discord bots → **bots**, news engines → **signals** · 8 Client pitches → **studio** · 9 Utilities → **tools**.
**Change Rule:** new hubs need operator sign-off (URL surface).

### D-A07 — Legacy Observatory becomes an unlinked annex
`css/`, `js/`, spoke data JSONs and the four spoke pages (sol-obscurus, bedroom-weather, forge, warcraft) are kept working but unlinked from the new site — frozen, not deleted (their URLs survive; deletion is a separate operator decision). `docs/EDITING.md`/`SECTIONS.md` marked legacy.
**Change Rule:** deleting the annex needs operator sign-off.

## Build Timeline
- C0 Manifest + ARCHITECTURE.md — this commit
- C1 Data layer: registry rebuild + ~50 `data/projects/*.json` (parallel agents, one per reference section)
- C2 Shell: new front door, atlas template + `styles/atlas.css`, hub updates
- C3 Diagrams: SVGs for all full-tier projects (parallel agents)
- C4 Cross-check: every slug resolves, every full page has JSON + diagram, local preview verified

## Open Questions
- Delete the legacy annex outright? (Operator decision, post-ship.)
- Should the site's own entry link this DECISIONS.md as a live example? (Nice-to-have.)

## Change Log
- 2026-07-07 — CR-4 (operator-approved): Warden § 01 gains a four-frame demo reel (FIG 01C) — hand-drawn SVG mock screens (sign in → workspace → desk dashboard → ask-the-tape chat). Shape-only rule enforced: all screens are invented (no real credentials, paths, ports, or live numbers), every frame carries a DEMO chip, caption states "mock screens, illustrative only." Auto-advance is gated off under prefers-reduced-motion and pauses on hover/focus; manual step stops it; fixed-aspect stage, no reflow.
- 2026-07-07 — CR-3 (operator-approved): front door reskinned "fintech light desk" — page-scoped token override in index.html only (cool white paper #f7f9fb, graphite ink, blue-teal accent #0e7490/#0d5c72 AA, cooled card/diagram shadows, tabular numerals). Goldenrod survives in the ✦ marks only; shared tokens.css and all other pages remain Daybreak-warm. Theme-color + favicon background updated to match.
- 2026-07-07 — CR-2 (operator-approved): front-door showcase recut to the four flagship systems. Warden promoted to § 01 and merged with the Sentinel Suite case study (one flagship chapter: Warden shell story + FIG 01, "engine room" Suite sub-section + FIG 01B, merged stack/decisions; `#sentinel-suite` anchor preserved on the sub-head). Fulfillment added as § 04 (Game) with a new sim/render-split diagram; Clear Board § 02 and Spectrum § 03 unchanged. TOC updated; still six sections total. Shape-only rule for Warden unchanged.
- 2026-07-06 — CR-1 (operator-approved): Warden added — full-tier atlas entry (trading) for the private self-hosted workspace with the Sentinel desk native inside it, plus a fourth front-door case study (§ 04, sections renumbered). Registry now 54 projects / 30 full-tier. Public entry documents shape only: no paths, ports, credentials, client names, or broker specifics; read-only posture stated throughout.
- 2026-07-06 — v2 atlas redo manifest created; scope/coverage/diagram decisions locked via operator interview.
- 2026-07-06 — C0–C4 complete: registry rebuilt (53 projects, 29 full-tier), `data/projects/` + `assets/diagrams/` populated, atlas template + `styles/atlas.css` shipped, hubs/front door rerouted, README rewritten, legacy docs bannered. Cross-check clean (schemas, SVG contract, all 29 pages resolve over HTTP); structural verification done in local preview; operator visually approved. Operator feedback applied before ship: principles section, start-link, and colophon removed from the front door. Pushed live 2026-07-06 (7848534).
