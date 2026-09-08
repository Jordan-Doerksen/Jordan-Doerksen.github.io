# DECISIONS.md — jordan-doerksen.github.io (Architecture Atlas redo)

## Core Goal
Rebuild the portfolio monorepo as a **technical architecture atlas**: the front door, 7 category hubs, and a documentation page per project, all driven from `C:\projects\_archive\notes\ARCHITECTURE-REFERENCE.md` (2026-07-06). The site itself is the proof of documentation and systems ability — README-shaped, not a pitch.

## Non-Negotiable Constraints
- **No build tools, no npm, no framework** for the shell/hub/atlas layer. Plain HTML/CSS/vanilla JS + JSON fetched at runtime.
- **The Award-Winning Web UI/UX Style Bible is LAW** (`C:\projects\reference\award-winning-web-ui-ux-style-bible`): composition zones, narrative sequence, the ≤3 persistent-cluster budget, the card policy, motion-has-a-job, responsive **re-authoring**, and accessibility/performance as art direction. Its visual layer on this site is **Stagecraft** (`styles/stagecraft.*`). Daybreak Editorial is **superseded here** and survives only for `docs/legacy-front-door.html`. `prefers-reduced-motion` is law.
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

### D-A08 — Front door is the Tool Desk (2026-07-08)
The front page is Jordan's daily driver, not a display case: sticky global search, filter chips, pinned tools, a dense "Mine" table (every registry project with status/port/local path, click-to-copy) and a "Toolkit" table (the ~160-tool it-toolkit catalog). The old atlas front door survives at `docs/legacy-front-door.html`; atlas pages, hubs, and project pages are unchanged.
**Change Rule:** desk-only data (pins, notes, ports, paths, stars, installs) lives in the `data/desk.json` overlay — `registry.json` stays canonical for project facts and is never forked. `data/toolkit.js` is a mirror: edit in `C:\projects\tools\it-toolkit`, copy over, never edit in place. Reverting to a presentation front door is a Change Request.

### D-A09 — The style bible governs composition; Stagecraft is its visual layer (2026-07-25)
Every public page on this site is composed against `award-winning-web-ui-ux-style-bible`:
one dominant idea per stage, a written narrative sequence, **at most three persistent
clusters** (identity+nav · scroll progress · find), cards only for genuinely peer-level
content, motion only where it orients/explains/confirms, and responsive breakpoints that
**re-author priority** rather than shrink the desktop layout. `styles/stagecraft.tokens.css`
is the single control panel — palette, type scale, measure, and motion durations.
**Change Rule:** breaking a bible non-negotiable (a fourth persistent cluster, a default
card grid, ambient motion, content that dies with JavaScript) is a Change Request that
names the principle broken and why. Retuning tokens inside the file is not.

### D-A10 — The catalogue is a typographic index, not a card grid (2026-07-25)
There are no per-project thumbnails in this repo, so 57 cards would be 57 empty
rectangles. The index leads with names, states role and status, reveals detail on hover
**and** focus, and renders an honest non-link row for anything private/frozen/retired.
Cards survive in exactly one place: the atlas "Components" list, where the items are
peers being compared.
**Change Rule:** introducing a second card surface requires either real per-project media
or a Change Request.

### D-A11 — Copy invites; it does not boast. And no museum words. (2026-07-25)
Two rules, one register.

**1. Register.** Every user-facing string reads as *"here's what I'd point you at"*, never
*"look what I built"*. Concretely: the page offers a starting point rather than presenting a
body of work · counts are context, not a scoreboard · a link says what the reader gets
("How it works →"), not what it cost to make ("Architecture entry →") · gaps are stated
plainly and never dressed up.

**2. Lexicon.** The site has **no collective name for itself** — it's Jordan Doerksen, and
the back-link is "Home". Museum vocabulary is out.

| Say this | Not this | Note |
|---|---|---|
| "how it works" | "atlas", "architecture entry" | `atlas` survives ONLY as the URL/template/stylesheet name — old URLs never break |
| "section" | "wing" | `data-wing` survives as the attribute name |
| "the list", "project" | "the index", "system" | `.index*` CSS classes survive — a typographic index is bible vocabulary |
| "Home" | "The Archive" | the site does not name itself |
| "written up" | "documented", "with an architecture entry" | `data-stat="documented"` survives as the key |
| "hand-drawn" | "hand-authored" | applies to the diagram SVGs |

The split is deliberate: **technical identifiers keep their old names** (URLs, attributes,
CSS classes, data keys) so nothing breaks and no migration is needed; **only what a reader
sees changes.** Anywhere a technical name leaks into visible copy, the copy wins.
**Change Rule:** adding a collective noun for the site, or reintroducing a museum metaphor,
is a Change Request. Renaming a technical identifier to match the copy is also a Change
Request — it buys nothing and breaks URLs.

### D-A12 — Three tiers, because there are three visitors (2026-09-07)
The shell is rebuilt ground-up as **three tiers**, and the split is by *audience*, not by
depth. **Tier 1 — intro:** who Jordan is, what he's interested in, resume-*feeling* but not a
resume. **Tier 2 — the work:** real projects and tools, with code. **Tier 3 — games.**
They are lateral peers, not a hierarchy: nothing is "deeper" than anything else, and no tier
is a landing funnel into another. **Change Rule:** adding a fourth tier, or merging two, is a
Change Request — the whole design rests on one audience per tier.

### D-A13 — The audience is Jordan and other builders (2026-09-07, owner interview)
Not recruiters, not conversion. The owner considered and rejected optimising for a hiring
audience that does not exist yet, which is *why the previous shell felt hollow*. This is
consistent with the pre-existing rule that the site reads simple, honest and literal —
README-shaped, no slogans (see the Core Goal and D-A11). The overlap is deliberate: a site
that satisfies builders also satisfies a technical hiring manager. The only visitor
de-prioritised is the non-technical recruiter. **Change Rule:** any copy or layout added to
convert a visitor — a CTA funnel, a hire-me banner, testimonial furniture — is a Change
Request against this decision.

### D-A14 — New shell, same repo; the hosted work does not move (2026-09-07)
"Ground-up" applies to the **shell** — front door, tiers, navigation, visual system. It does
**not** apply to the ~30 project apps and pages this repo already hosts under `/games/`,
`/rail/`, `/trading/` and the rest. Those stay exactly where they sit. Rebuilding the stage
does not mean rebuilding the props, and the existing constraint stands: **old URLs never
break.** **Change Rule:** a proposal to re-host, move or re-slug any existing demo is a
separate Change Request with a redirect plan.

### D-A15 — Tier 2 is the centre of gravity (2026-09-07)
Given D-A13, tier 2 gets the depth, the care and the maintenance budget. Builders do not
linger on an intro. Tier 1 is short and confident; tier 3 is play. **The existing
architecture-atlas pages ARE tier 2's spine** — written-up projects with hand-drawn diagrams
is already the right artifact, so this is a re-frame of existing work, not a rebuild of it.
**Change Rule:** work that makes tier 1 longer or more elaborate at tier 2's expense inverts
this decision and needs a Change Request.

### D-A16 — Annotated excerpts, not repo links (2026-09-07)
Tier 2 shows **curated code excerpts with commentary, embedded in the page** — not links to
source repos. Three reasons, in order: a chosen block with the reasoning attached teaches more
than a repo nobody clones; it lets the strongest engineering appear on the site **without
making private trading repos public**; and it decouples the site from the repo list entirely.
Source links survive for a small showcase set only (currently `Ask-Johnny`, `clear-board`,
and this repo). **Change Rule:** adding a repo link to a card is a Change Request, and it must
name which repo becomes public and why.

### D-A17 — The risk budget goes to tier 3 (2026-09-07)
Motion and JS ambition are spent where failure costs least. **Tier 3 carries the showpiece.**
Tier 1 is layered and has movement, but it must remain fully legible and useful with JS,
canvas and motion dead — it is the page a stranger opens on a phone on a bad connection. This
is the bible's survival rule applied to the tier that matters most. The owner's first instinct
was the reverse (most risk on tier 1); it was reversed by argument, not by preference.
**Change Rule:** any tier-1 element that becomes load-bearing on JS is a Change Request.

### D-A18 — Counts are evidence, never a scoreboard (2026-09-07)
Tier 2 may state real, verified figures — commits, test counts, guard counts — because for a
builder audience they *are* the evidence. They are presented as context, in the D-A11 register
("here's what I'd point you at"), never as a boast or a stat wall. **Every number on the site
must be reproducible from the repos on the day it ships**, and an unverifiable number does not
ship (the Core Goal's honesty constraint). Inherited figures are never claimed: e.g. Warden's
1,345 test files came with the upstream fork and are **not** Jordan's to count.

### D-A19 — One dominant idea PER TIER, and tier 2 leads (2026-09-07, owner interview)
The bible's rule is one dominant idea **per viewport**, not per site, so the three tiers take
three different patterns rather than competing for one. The owner wanted both the
systems-explainer and the spatial-canvas routes; the tier split is what makes that legal
instead of muddled.

| Tier | Dominant idea | Primary pattern |
|---|---|---|
| 1 — intro | A person worth reading, in one screen | restrained; `editorial_rhythm` |
| 2 — the work | **The systems prove themselves** | `interactive_explainer` + `anti_card_composition` |
| 3 — games | A world you move through | `spatial_canvas` + `portfolio_as_experience` |

**Tier 2 is built first.** The explainer is the proof and the brief; the tier-3 world is the
reward. Building the world first produces spectacle wrapped around nothing — which is the
bible's own stated failure mode for this pattern ("do not let the interface consume the
evidence it is meant to frame").

**Tier 2's centrepiece:** the guard suite, explained interactively — select a guard, see the
code it protects *and* the sabotage case that proves it bites, sourced from the real
`tests/sabotage.ps1`. The content already exists; none of it is invented for the page.

**Honest-data rule (with the no-build-tools constraint).** Figures ship as a **stamped JSON
snapshot generated from a real run**, with the run date shown on the page. Nothing is
presented as live that is not live, and nothing is fetched from a machine that is not
reachable. This is D-A18 applied to a static site.

**Change Rule:** giving a second tier the same dominant pattern, or moving the spatial canvas
out of tier 3, is a Change Request. So is any figure on the page that cannot be regenerated
from a real run on the day it ships.

### D-A20 — Tier 2's generation contract is written and binding (2026-09-07)
The bible requires a declared generation contract before any markup. Tier 2's lives at
**`docs/tier-2.contract.json`** in the bible's own vocabulary (zones from
`composition_zones/zones.json`, relationships from its allowed list, pattern ids from
`patterns/`). The reasoning that JSON cannot hold is recorded here.

**Two patterns, not three.** `interactive_explainer` + `anti_card_composition`. The budget
allows three; a third would compete with the explainer for the stage, and the stage is the
whole point of this tier.

**Two persistent clusters, not three.** `identity_navigation` + `orientation_progress`. There
is deliberately **no `primary_action` cluster** — D-A13 rules out conversion furniture, and
this tier asks nothing of the visitor. Under-spending the budget is a decision, not an
oversight; do not "complete" it later.

**The narrative order is fixed by the pattern, not by taste:** premise → overview →
demonstration → proof → index. The pattern's own rules require a plain-language opening, an
overview before detail, and sources kept beside results.

**The card policy resolves an apparent conflict.** D-A10 already ruled the catalogue is a
typographic index rather than a card grid, and `anti_card_composition` agrees when titles beat
thumbnails. Cards survive in exactly one place — a side-by-side guard comparison, where the
items are true peers being scanned at once, which is the one case the pattern explicitly
protects.

**Failure behaviour is specified, not assumed.** With JavaScript off, every guard, its code and
its sabotage case are real markup: the tier degrades to a long document, never a blank stage.
No canvas or WebGL appears in this tier at all — that is quarantined to tier 3. If the data
snapshot is missing, the page says so and shows no figures; it never substitutes an estimate.

**Change Rule:** changing a pattern, adding the third persistent cluster, introducing cards
outside the comparison view, or shipping a figure that cannot be regenerated from a real run
that day, is a Change Request against this contract. The contract file and this decision must
be updated together — the JSON is not a copy of the decision, it is half of it.

### D-A21 — One generator owns every figure on the site (2026-09-07)
`scripts/build_evidence_snapshot.py` (stdlib only, matching `build_cabinet_manifest.py`) reads
`scripts/evidence_sources.json` and writes `data/evidence.json`. **That file is generated and
must never be hand-edited**, and no number reaches a page by any other route. Manual:
`scripts/EVIDENCE-MANUAL.md`.

**Every figure carries its own `method`** — `executed` (a suite ran; this is its reported
result), `counted` (files or commits counted; real, but not proof anything passes), or
`unavailable` (**we could not look — never zero**). The distinction is the entire reason the
tool exists: "616 tests pass" and "616 test files exist" are different claims, and a static
page has no way to show the difference unless the generator records it.

**Suspect zeros.** A test count of 0 where patterns *were* configured is flagged
`suspect: true` and listed in `totals.suspectZeros`, because a count cannot distinguish "no
tests" from "wrong patterns". This is not hypothetical: on the first run
`map-reading-trainer` reported a confident 0 while holding 24 `*.test.ts` files, because the
config listed `*.test.js`. An unflagged zero would have gone onto the page as fact.

**Inherited work is measured and excluded, not hidden.** Warden stays in the snapshot with
`own: false` so the exclusion is visible in the data, not just asserted in prose (D-A18).

**First real run, 2026-09-07:** 575 own test files across 6 sources; trading-desk executed
green at 616 passed / 2 skipped / exit 0; 1,752 commits across 71 repos since 2025-09-07,
earliest 2026-05-18.

**Supersedes the ad-hoc figures in CR-10.** That entry quotes 1,663 commits across 66 repos
from a hand-run shell scan with a different depth and exclude list. The CR entry stands as a
dated record, but **the generator is now the only authority**; where they disagree, the
generator wins because it is the one that can be re-run.

**Change Rule:** adding a figure to any page without a source in
`evidence_sources.json` is a Change Request. So is publishing a run whose
`totals.suspectZeros` is non-empty. Editing `data/evidence.json` by hand is never permitted.

## Build Timeline
- C0 Manifest + ARCHITECTURE.md — this commit
- C1 Data layer: registry rebuild + ~50 `data/projects/*.json` (parallel agents, one per reference section)
- C2 Shell: new front door, atlas template + `styles/atlas.css`, hub updates
- C3 Diagrams: SVGs for all full-tier projects (parallel agents)
- C4 Cross-check: every slug resolves, every full page has JSON + diagram, local preview verified

## Open Questions
- Write atlas entries for `first-light`, `fulfillment-lite`, `holdout` and promote them back
  to tier `full`? (Needs real architecture content — three JSONs + three diagram SVGs.)
- Keep the dark archive-plate ground, or flip `<html class="light">`? The token file carries
  a contrast-checked paper ground either way; it's one attribute, not a rewrite.
- Delete the legacy annex outright? (Operator decision, post-ship.)
- Should the site's own entry link this DECISIONS.md as a live example? (Nice-to-have.)

## Change Log
- 2026-09-07 — **CR-10 (owner-interviewed, four answers): the shell is rebuilt ground-up as
  three tiers, for builders, with the work as evidence.** Decisions D-A12…D-A18.
  **Trigger.** The owner said he hates the current sites, wants one public-facing site rebuilt
  from the ground up rather than another surgical addition, and named the real brief:
  *"something that says I didn't waste the last year of my life."*
  **Why the previous shell failed.** Not craft — *aim*. It was built to present work to a
  hiring audience that has not arrived, so it reads hollow to the one person who uses it daily.
  D-A13 fixes the aim; the atlas work underneath it was never the problem.
  **The diagnosis that shaped the design.** A survey the same day found the visibility exactly
  inverted: 27 public repos with **zero tests between them**, while the work carrying 616
  passing guards, an 890-test regime grader and a sabotage harness that proves its own guards
  bite is all private. The site's job is to invert that — hence D-A15 (tier 2 is the centre)
  and D-A16 (excerpts, so private work can be shown without publishing private repos).
  **Verified evidence available to tier 2** (measured 2026-09-07, reproducible): **1,663
  commits across 66 repos**, the earliest from mid-May — roughly four months, not a year — and
  **~575 test files** that are Jordan's own (`trading-desk` 282, `oracle` 215, `sentinel-trader`
  26, `sentinel-pro-v3` 25, `map-reading-trainer` 24, `underwriter` 3). Warden's 1,345 are
  excluded as inherited from the upstream fork (D-A18).
  **Scope.** Shell only. The ~30 hosted demos, every project app folder, the redirect stubs and
  the legacy annex are untouched (D-A14); old URLs never break. The Core Goal is amended in
  spirit — the site is still README-shaped proof of systems ability, now organised by audience
  rather than as a single atlas; the atlas pages survive as tier 2's spine.
  **Not decided yet, deliberately:** which excerpts tier 2 carries; the tier-1 visual
  treatment; whether the remaining ~20 unlinked repos go private (that sweep is **paused** on
  purpose until the excerpt list exists, so nothing is hidden that tier 2 turns out to need).
  **Next:** read the style bible before any markup (Non-Negotiable Constraints), then the first
  tier-1 slice.
- 2026-08-16 — **CR-9 (owner-interviewed, three answers): the Fulfillment manual's design pass —
  `games/fulfillment/manual.css` goes from structural placeholder to the technical-print-manual
  skin, and this entry also BACKFILLS the generation contract the 2026-08-15 build owed.** The
  spec (`fulfillment/docs/specs/manual-and-box-2026-08-15.md`) required its contract recorded
  here as a CR *before* markup; the manual shipped in the four held-back commits without it.
  Recorded late rather than never, and flagged as such.
  - **Layout contract (from the spec, verbatim):** `site_type` editorial · `dominant_idea`
    "A company-issue manual that teaches a job intending to kill you." · `primary_patterns`
    editorial_rhythm + anti_card_composition · `narrative_sequence` the one rule → what you fly
    → the field → who comes for you → requisition → what is out there → between shifts →
    reference · `persistent_clusters` identity_navigation + chapter_progress + primary_action ·
    `card_policy` cards ONLY for the three hulls (M-5) · `responsive_transformations` single
    column throughout; plates re-measure; **desktop-only is a recorded owner departure**
    (2026-08-15: PC game, audience is at the machine) · `reduced_motion_equivalent` no motion
    is load-bearing anywhere; the page is static.
  - **Visual layer — the manual's own token sheet** (`games/fulfillment/manual.tokens.css`;
    spec §6.5 — it does not adopt Stagecraft). Interview answers (owner, 2026-08-16):
    **S-1** sans heads + serif body + mono for anything the game prints (system stacks, zero
    font downloads) · **S-2** ONE spot ink `#b8432a`, the game's management-ink coral
    `#ff7a5c` darkened to print — 4.9:1 AA on the paper; numerals, links, warnings and figure
    marks only, never body prose · **S-3** gameplay screenshots break the measure to 66rem
    (evidence at scale, per the IBM SG 60/60 case study); `fig_*` teaching diagrams hold the
    46rem measure. Distinguished by filename via `:has()`; browsers without it get every plate
    at the measure — a complete quieter page, not a broken one.
  - **Found and fixed the same day:** `build_manual.py` never closed a chapter's `<section>`
    before opening the next, so chapters nested in the DOM. Generator fixed in the game repo,
    manual regenerated (22 opens / 22 closes). The stylesheet keeps its class-selectors-only
    discipline anyway.
  - No content changed, no identifier changed, no JS added. The page still reads with CSS off.
- 2026-07-25 — **CR-8 (operator-approved, three interview answers): copy pass — the voice
  moves from "look what I did" to "here's what's worth a look", and the museum vocabulary
  goes.** New decision D-A11 carries the full lexicon table. Interview answers: the site gets
  **no collective noun** (was "The Archive") · write-up pages are **"how it works"** (was
  "atlas" / "Architecture entry") · groupings are **"sections"** (was "wings").
  - Front page: `<title>` is now just "Jordan Doerksen" · h1 "Some of this / is worth a look."
    (was "Built the tool. / Then documented it.") · cue "Four I'd point you at first" (was
    "Start with the four that matter") · "Where I'd start" (was "Selected systems") · "The rest
    of it" (was "The index") · counts read "57 projects · 30 written up · 22 you can open right
    now" · footer "Made in Winnipeg, one at a time."
  - Section pages regenerated from the same template; write-up pages, the finder, the desk
    back-link, and every JS-generated string swept to match.
  - **No identifier changed.** `/atlas/?p=` URLs, `data-wing`, `.index*` classes, and the
    `data-stat` keys all kept their names on purpose — copy-only change, zero migration, no
    broken URLs. The one exception is the front page's own `#systems` anchor → `#start`,
    which shipped in CR-7 the same day and was never published.
- 2026-07-25 — **CR-7 (operator-approved, two interview answers): the whole public shell is
  re-authored under the Award-Winning Web UI/UX Style Bible, and the bible supersedes
  Daybreak Editorial for webpages.** New decisions D-A09 + D-A10.
  - **Layout contract** (the bible's generation contract, recorded before building):
    `site_type` interactive_archive / individual_portfolio · `dominant_idea` "one maker,
    57 systems, every one documented" · `primary_patterns` portfolio_as_experience +
    editorial_rhythm + typographic_monument (three, the cap) · `narrative_sequence`
    promise → what this is → four selected systems → the full index → how it's documented →
    resolution · `persistent_clusters` identity_navigation + orientation_progress +
    primary_action · `card_policy` "atlas Components only" · `responsive_transformations`
    index sheds its description column then its folio, chrome sheds section links, atlas
    rail collapses into section heads · `reduced_motion_equivalent` progress hidden,
    entrances resolved, diagram pulses off — every state static and complete.
  - **Visual layer — STAGECRAFT** (`styles/stagecraft.tokens.css` + `.base.css` +
    `.compose.css`): archive-plate ground `#0b0b0d`, ink `#f4f2ee`, ONE signal `#f0b429`
    (the Goldenrod thread re-pitched — 10.5:1 on the ground, so no second text shade).
    Type trio unchanged (Space Grotesk / Inter / JetBrains Mono) — already loaded, legible,
    and the display face now has a compositional job rather than only a larger size.
    A contrast-checked `html.light` block flips the whole system back to a paper ground.
  - **Pages:** front door rebuilt as a composed public archive (D-A08's Tool Desk moves to
    `/desk/`, unchanged in function, wearing the new palette); the 7 wings re-authored
    around the typographic index with an editorial transition cue to the next wing; the
    atlas template re-authored as railed chapters (`js/atlas/atlas.js`). Shell behaviour
    split into `js/shell/{boot,chrome,finder,index-list}.js`.
  - **Retired from the shell:** the drifting sun, the marquee ticker, the ink cursor, the
    3D card tilt, and `styles/{effects,shader,cmdk}.js` — ambient motion with no job, per
    the bible. `styles/tokens.css` + `style.css` + those scripts stay on disk, now loaded
    only by `docs/legacy-front-door.html`.
  - **Fixed while building:** entrances animate transform ONLY (a fade gated on an
    observer could hide content if JS or compositing failed — a bible non-negotiable);
    narrow chrome re-authored instead of overflowing; `.railed > *{min-width:0}` so a wide
    diagram scrolls inside its well instead of pushing the page sideways.
  - **Registry correction found by the cross-check** (D-A02's Change Rule: a tier move is a
    one-line registry edit): `first-light`, `fulfillment-lite`, and `holdout` were tier
    `full` with **no `data/projects/*.json`** — pre-existing debt, not introduced here. Their
    rows promised an architecture entry and delivered "no atlas entry". Demoted to tier
    `entry`, so they now route to their live apps, which all exist. Registry is 57 projects /
    **30 full-tier**. Writing the three missing atlas entries is open work, not a blocker.
  - Diagram SVG contract, `data/projects/*.json`, embedded project apps, the legacy annex,
    and every old URL are untouched. `/` still resolves; the desk gained a URL rather than
    losing one.
- 2026-07-08 — CR-6: front door pivots from presentation portfolio to personal Tool Desk (D-A08). Rationale: Jordan daily-drives the page as a database / tool search / reference, not a display case — the atlas already carries the presentation load. New `index.html` shell + `styles/desk.css` + `js/desk/{desk,render,search,copy}.js`; data = `registry.json` (canonical facts) + `data/desk.json` (overlay: pinned, mine notes/ports/paths, toolkit stars/installs) + `data/toolkit.js` (mirror of it-toolkit). Old front door preserved at `docs/legacy-front-door.html`. Atlas pages, hubs, project pages, and registry.json untouched.
- 2026-07-07 — CR-4 (operator-approved, three layers picked by interview): front door comes alive. (1) House signatures at doc scale — drifting sun restored (`#sun`, desk-teal via tokens), kinetic word-rise on the h1 (now `id="hero-h"`), grain nudged .035→.05, page-scoped. (2) Living diagrams — new shared `assets/diagram-live.js` (hover lighting moved there from both pages + a gold-path traveling pulse per edge, IntersectionObserver-paced, one per figure chain), soft node press; loaded by the front door and the atlas template (post-render scan). (3) Alive index — springy row nudge + accent-derived hover tint, magnetic mono links, TOC number roll-up. Every layer gated on prefers-reduced-motion (and hover:none where pointer-based); scene props declined.
- 2026-07-07 — CR-5 (operator-approved): style-library sync — Daybreak reference-pass upgrades applied. `styles/style.css` re-synced from the canonical style-library (adds the interactive state matrix: disabled/loading/pressed/aria-current, plus command-palette styles); new `styles/shader.js` (canvas noise blobs inside `#sun`, static single frame under reduced motion) wired into the 7 category hubs; new `styles/cmdk.js` (accessible Ctrl/Cmd-K palette) wired into the front door, searching all 54 registry projects + categories + sections (data injected after the registry fetch, section/category fallback if the fetch fails; full-tier projects route to their atlas entry). Front door deliberately does NOT get shader.js — it has no `#sun` (README-shape rule). External idea sources cataloged in style-library/REFERENCES.md.
- 2026-07-07 — CR-4 (operator-approved): Warden § 01 gains a four-frame demo reel (FIG 01C) — hand-drawn SVG mock screens (sign in → workspace → desk dashboard → ask-the-tape chat). Shape-only rule enforced: all screens are invented (no real credentials, paths, ports, or live numbers), every frame carries a DEMO chip, caption states "mock screens, illustrative only." Auto-advance is gated off under prefers-reduced-motion and pauses on hover/focus; manual step stops it; fixed-aspect stage, no reflow.
- 2026-07-07 — CR-3 (operator-approved): front door reskinned "fintech light desk" — page-scoped token override in index.html only (cool white paper #f7f9fb, graphite ink, blue-teal accent #0e7490/#0d5c72 AA, cooled card/diagram shadows, tabular numerals). Goldenrod survives in the ✦ marks only; shared tokens.css and all other pages remain Daybreak-warm. Theme-color + favicon background updated to match.
- 2026-07-07 — CR-2 (operator-approved): front-door showcase recut to the four flagship systems. Warden promoted to § 01 and merged with the Sentinel Suite case study (one flagship chapter: Warden shell story + FIG 01, "engine room" Suite sub-section + FIG 01B, merged stack/decisions; `#sentinel-suite` anchor preserved on the sub-head). Fulfillment added as § 04 (Game) with a new sim/render-split diagram; Clear Board § 02 and Spectrum § 03 unchanged. TOC updated; still six sections total. Shape-only rule for Warden unchanged.
- 2026-07-06 — CR-1 (operator-approved): Warden added — full-tier atlas entry (trading) for the private self-hosted workspace with the Sentinel desk native inside it, plus a fourth front-door case study (§ 04, sections renumbered). Registry now 54 projects / 30 full-tier. Public entry documents shape only: no paths, ports, credentials, client names, or broker specifics; read-only posture stated throughout.
- 2026-07-06 — v2 atlas redo manifest created; scope/coverage/diagram decisions locked via operator interview.
- 2026-07-06 — C0–C4 complete: registry rebuilt (53 projects, 29 full-tier), `data/projects/` + `assets/diagrams/` populated, atlas template + `styles/atlas.css` shipped, hubs/front door rerouted, README rewritten, legacy docs bannered. Cross-check clean (schemas, SVG contract, all 29 pages resolve over HTTP); structural verification done in local preview; operator visually approved. Operator feedback applied before ship: principles section, start-link, and colophon removed from the front door. Pushed live 2026-07-06 (7848534).
