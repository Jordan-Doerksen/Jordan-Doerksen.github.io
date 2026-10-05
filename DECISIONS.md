# DECISIONS.md — jordan-doerksen.github.io (Architecture Atlas redo)

## Core Goal
Rebuild the portfolio monorepo as a **technical architecture atlas**: the front door, 8 category hubs (7 until CR-18), and a documentation page per project, all driven from `C:\projects\_archive\notes\ARCHITECTURE-REFERENCE.md` (2026-07-06). The site itself is the proof of documentation and systems ability — README-shaped, not a pitch.

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

### D-A06 — Category mapping (reference 9 sections → 7 hubs; an eighth, navigation, by CR-18)
1 Portfolio & Design → **studio** · 2–3 Sentinel/trading → **trading** · 4 Rail → **rail** · 5 Games + 6 Engines → **games** · 7 Discord bots → **bots**, news engines → **signals** · 8 Client pitches → **studio** · 9 Utilities → **tools**. Map-skills training (Gridline) → **navigation**, section 08 (CR-18, 2026-09-23).
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
⚑ **Superseded for the front page by D-A27 / CR-21 (2026-10-05).** The three tiers became five stamped
pages (Home, Trading desk, Rail software, Games, Tool Desk). The audience split below stays true; the
layout is history. Tier 2 and tier 3 are still built by their own generators and are carried into the
Trading desk and Games screens.
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

**Amended by CR-19 (2026-09-27).** That comparison now has a named occupant: the desk toy's
alert card beside its zero-filled ghost — the same alert with the desk's absent-is-not-zero
guard and without it. With JavaScript off the toy degrades to its written-out cases. Both
sentences are mirrored in `docs/tier-2.contract.json` (`card_policy`,
`failure_behaviour.no_javascript`).

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

### D-A22 — The failure was the folder system, not the palette (2026-09-07, owner)
**Diagnosis, owner's, and it corrects the working assumption.** The shell was assumed to feel
stale because of identity carry-overs from Daybreak — the goldenrod, Space Grotesk, the ✦. It
does not. A skin lab (`docs/skin-lab/`, scratch) rendered five palettes over **identical
structure**: nav, hero, stat row, three-row index. The owner found essentially every palette
acceptable. The variable held constant is therefore the defect: **the site is a folder system
with good typography.**

The bible states this before any pattern or case study: *"Web layout is not a folder system."*
GitHub already renders the repos as a list; re-rendering that list in better type adds nothing
a visitor cannot get from the profile page. This is why a genuine re-composition (CR-7) still
read as the old site.

**Consequence.** A tier is not allowed to be an index of everything by default. D-A19's
`interactive_explainer` for tier 2 is the structural escape and is now load-bearing rather
than stylistic: **one system taken apart** — a guard, the code it protects, the sabotage that
proves it bites — not "here are my projects". The existing typographic index survives as a
*destination* for someone who wants the full list, never as the shape of a tier.

**Change Rule:** any tier whose primary composition is a list of projects is a Change Request,
and must state what dominant idea it carries other than enumeration.

### D-A23 — Palettes are per-tier and disposable; the through-line is structural (2026-09-07, owner)
Each tier may carry its own ground and accent. This is already supported: CR-3 page-scoped a
complete token override into `index.html` alone. Three audiences with three dominant ideas can
legitimately wear three palettes.

**The identity does not live in the paint.** A token file is ~123 lines (Stagecraft v1) and
swapping one costs an evening, so no skin decision is allowed to block structural work. The
owner's position, recorded because it is the reason this is safe: colour is not the uncertain
part, and multiple palettes are wanted, not tolerated.

**The constraint that keeps it one site.** Three palettes read as one site only if something
else is constant. **The through-line is the type scale, the spacing rhythm, and the component
grammar — not colour.** Those three are shared across all tiers and are NOT per-tier
tweakables.

**Change Rule:** a per-tier palette is a token override only. Any per-tier change to the type
scale, spacing rhythm or component grammar is a Change Request, because that is the layer
carrying the identity.

### D-A24 — Tier 2 is ONE project in depth, and its claim is "it holds up" (2026-09-08, owner)
**The two previous slices are discarded prototypes.** The accordion draft and the
mutants-in-source draft both failed the same test, which the owner named exactly: *"I look at
it and ask myself why it exists."* They were evidence with no claim attached. The format was
argued three times while the unanswered question was what the page should PROVE.

**Decided by interview.** After tier 2, a visitor should be able to say: **"he builds things
that hold up."** Rejected alternatives, recorded because they remain valid pages someone could
argue for later: "built a lot fast" (velocity — reads as vanity metrics), "makes things I'd
use" (artifacts — blocked, see assets below), "thinks clearly before building" (judgment —
text-heavy, and the owner asked for charts).

**Consequence: tier 2 covers ONE project, the trading desk, in depth.** Not 45 files, not 90
guards as a catalogue, and explicitly not a survey of everything. This also settles D-A22 from
the other direction — a single deep case study cannot become a list of projects.

**The argument, in order.** The page is a claim with proof, not a catalogue:
1. What the desk is, and the diagram.
2. What can go wrong — the real failure classes.
3. What catches each one — the 90 guards, **aggregated into a chart first**.
4. Proof the guards bite — the sabotage deltas, as drill-down beneath the aggregate.
5. **What is still broken** — the open findings, with severity and status.

**Step 5 is the load-bearing one.** `trading-desk/docs/FINDINGS-OPEN.md` (886 lines) carries
numbered findings with severity, OPEN/FIXED status, dates, and how each was discovered. The
most credible proof that something holds up is showing precisely where it does not. It also
satisfies the 2026 prescriptive-not-descriptive requirement recorded in CR-10.

**Aggregate before detail (owner, 2026-09-08).** "People don't read code." Every section leads
with a number or a chart from real data; code appears only as drill-down. This overrules the
earlier ranking that put the source-rendered mutants first.

**Assets, checked 2026-09-08:** `trading-desk` has **zero screenshots**, so any design
requiring product screens is blocked on a capture pass that cannot happen on this machine.
`assets/diagrams/warden.svg` exists; the desk is its successor and may need its own.

**Change Rule:** adding a second project to tier 2 is a Change Request — the depth is the
point. Removing the open-findings section is also a Change Request: without it the page
asserts reliability instead of evidencing it, which is the failure this decision exists to fix.

### D-A25 — Tier 2 is a display case, not a tool (2026-09-08, owner. Reverses D-A17/D-A19/D-A24 in part)
**The owner's argument, which is correct and which three drafts got wrong.** The desk,
underwriter and the rest are austere *because they are bound* — read-only, fail-closed, no
motion, honest when they cannot answer. **The site is not bound that way.** Applying tool
discipline to a display case is a category error, and it is the single reason the accordion,
the mutants-in-source and the aggregate-evidence drafts were all rejected on sight.

It also satisfies the bible's `portfolio_as_experience` rule "make the interface prove a
relevant capability": the desk cannot demonstrate that its author builds sophisticated
interactive UI. Only the site can. **Flash is the point of this tier, not a lapse.**

**What this reverses.** D-A17 gave the whole risk budget to tier 3 — tier 2 now takes a share.
D-A19 assigned tier 2 `interactive_explainer` with legibility as the dominant idea. D-A24's
FORMAT (aggregate-first evidence page) is withdrawn.

**What survives, deliberately.** D-A24's *claim* stands — the tier still proves "he builds
things that hold up", now by showing the system working rather than by tabulating evidence.
The generators and their data (`guards.json`, `findings.json`, `evidence.json`) survive
untouched: a display case still needs something true to display.

**Subject: one path at a time.** The source graph (`trading/desk-network-map`) holds 54 nodes
and 78 links. The owner's ruling on it: *"a good draft but too large a section with too much
that nobody clicks."* So the unit is the graph's own curated **tour** — the market data path is
9 parts, the order path is 4 parts and 3 hops. Five tours, one visible at a time.

**Technical ruling, made explicitly rather than silently.** The diagram layer is **SVG/CSS, not
WebGL.** It delivers everything asked for — flowcharts, pips travelling the wires, expanding
windows, animated lines and text — while keeping text crisp, selectable and reachable. WebGL
earns its place for particles and 3D, which is tier 3. An ambient canvas layer *behind* the
diagram remains available later without changing this.

**The one non-negotiable that does NOT bend.** "Essential content survives JS, canvas and
WebGL failure" is law in this manifest's Non-Negotiable Constraints. The built page has **zero
JavaScript**: the tour switcher is radio inputs and `:checked`, the motion is CSS keyframes,
and every animation stops under `prefers-reduced-motion`.

**Honesty rules carried over unchanged.** A node shows guard and defect badges only where its
file genuinely matched real data. **A node with no badge is unmatched, not clean** — the same
absent-is-not-zero discipline as the evidence snapshot's suspect-zero flag. The private-repo
line from D-A24 also stands.

**Change Rule:** giving tier 2 a JavaScript dependency for anything load-bearing is a Change
Request, and must state what a visitor loses with scripting off. Adding a second tour on screen
at once is also a Change Request — one path at a time is the answer to "too much nobody clicks".

### D-A26 — The tiers become sections of one scroll, and the atmosphere changes between them (2026-09-08, owner)
⚑ **Superseded for the front page by D-A27 / CR-21 (2026-10-05):** the one scroll and the per-section
palettes retired; one donor look, five stamped pages. The old page is archived at
`docs/legacy-three-tier.html`. Kept below as history.
The three tiers stop being three pages and become three **sections of one continuous
scroll**: the intro, then the work, then the games. The palette changes as you move between
them, so each tier has its own atmosphere.

**This does not overturn D-A12 or D-A23, it completes them.** D-A12 split the tiers by
audience; that split survives, and each section still carries one dominant idea. D-A23
already permitted a per-tier palette and named the through-line as the type scale, the
spacing rhythm and the component grammar — not colour. A scroll that changes ground colour
between sections is exactly the case D-A23 was written for.

| Section | Atmosphere | State |
|---|---|---|
| 1 · intro | **Stagecraft v2**, light "Drafting Paper" — `#EFF2F6`, drafting blue `#0D4FA0` | **BUILT AND LIVE** (2026-09-08, refined 2026-09-09) |
| 2 · the work | Drafting Monolith, dark `#0B0E13` — the stage and the mesh | built (CR-12, CR-14) |
| 3 · games | `#2A1E18` / near-black, hot `#FF6B4A` — the wall of attract screens | built (CR-15) |

~~**Built at `/docs/site/` first, promoted to the root after review** (owner's call). The live
front door is not touched while tier 1 — which has never been built — takes its passes.~~

⚑ **Row and note corrected 2026-09-22.** Tier 1 was promoted to the root on 2026-09-08 and refined
on 2026-09-09, so both "not built" and "the live front door is not touched" were stale for two
weeks. `index.html:27-38` carries the `.t1` Drafting Paper block. See **CR-17** below.

**The transition is a section property, not a scroll effect.** Each section paints its own
ground, so the palette is correct with JavaScript off and under reduced motion; a script only
cross-fades the page-level wash between them. **Change Rule:** if the palette of a section
depends on a scroll listener to be correct, that is a defect, not a feature.

**Weight is the real risk.** One document would hold the tier-2 stage, the mesh, and ten game
iframes. Tier 3's reconcile already refuses to mount a panel that is not near the viewport, so
the games cost nothing until reached — that behaviour is now load-bearing for the whole page,
not just for tier 3.

### D-A27 — The front page is rebuilt as a shell of five screens on the donor look (2026-10-04, owner interview)
The owner asked to rebuild the front page from zero with the Stagecraft changes adopted on
2026-10-04 (stagecraft-v2 D-016 to D-019) and the donor template (satnaing/shadcn-admin, MIT,
re-themed as `C:\projects\web\desk-ui`). Eight answers came from forks put to him one at a time:

1. **Job: both.** A visitor's Home, and the Tool Desk (D-A08) as one sidebar screen. D-A08 comes
   back as a *screen*, not as the front door.
2. **Screen model: separate pages, one shell stamped onto each.** Each screen is its own HTML
   file with its own URL and works with JavaScript off. A Python generator in `scripts/` writes
   the shell once (as the desk does in its D-7). No new package, no framework.
3. **Width: capped at 80rem, like the donor** (`--shell-max`, the donor's `7xl`). This breaks the
   width half of WEB-14 ("desktop uses all of the width"). It is a Change Request against WEB-14
   (CR-21). The other half of WEB-14 stands: **no element scrolls sideways at any width**, and
   tables reflow inside the cap.
4. **Palette: one donor look everywhere, light by default, a dark toggle.** Donor values as
   measured on the desk: light ground `#FBFAF6`, ink `#1D1A13`, primary `#365900`; dark ground
   `#0D0B08`, primary `#BEF050`. All values live in one token file. The embedded games keep their
   own looks inside their frames. The D-A23 per-section palettes retire for the front page.
5. **Built pieces: carried over, restyled.** The desk's path tour and parts mesh, the "Absent is
   not zero" toy (CR-19) and the lazy-mounted games wall keep their logic, data and build-time
   checks (their generators stay). Only the skin changes.
6. **Scope: the front page only.** Hubs, atlas pages and project pages keep their looks and
   get the shell in a later Change Request. A visitor sees a seam past the front page until then.
7. **Controls: no pill shapes (mockup review, 2026-10-04).** The first mockup drew about 26
   pill-shaped chips and the owner rejected them. Four rendered options were put to him and he
   chose **A, the donor's data-table toolbar.** Filters are two square-cornered buttons (Section,
   Status) with dashed edges. Each opens a checklist with counts, and a chosen value shows inside
   the button. Reset appears only while something is filtered. Pinned items are plain buttons with
   no outline. On a phone the nav folds into one Menu button, and the filter checklist opens as a
   bottom sheet. Every control that needs a script ships `hidden`, and the script shows it, so a
   failed script leaves no dead control. The table and the nav links work with no script. **For the
   chrome-budget test:** an open popover or sheet is transient, not a fourth cluster.
8. **Style base: Stagecraft contributes rules, not CSS** (owner: "more like donor and less like
   Stagecraft; Stagecraft was me trying to re-invent the wheel, but I found some good rules worth
   keeping"). The page has its own plain stylesheet in the donor look, ported the way the trading
   desk ported it (its `desk.tokens.css`, measured). **No Stagecraft v1 or v2 CSS is copied in.**
   The instrument-mode neutrals (D-018) and the `sc-` classes do not appear. The donor's React code
   is not adopted either; only the look is ported.

**The five screens (proposed, confirmed at the mockup):** Home · Trading desk · Rail software ·
Games · Tool Desk. **Persistent clusters (3):** the sidebar (`identity_navigation`), the bar
(`orientation_progress`, with the theme toggle), and find (global search, `/` focuses it).
**Home copy:** the owner's tier-1 text, verbatim. Figures come from the existing generator
(D-A21), re-run at build; none is typed.

**The Stagecraft rules that stay** (each is checked by `scripts/front_check.py` or
`scripts/front_probe.mjs`, not only stated): raw values live in the token file only (a carried
piece keeps its own animation timings, which `scripts/front_carry.py` leaves in the generated
carry CSS) · the chrome budget is three clusters (D-019) · a part follows the box it sits in, by
container query, and the one window query is the 768px sidebar rule · no element scrolls sideways
· text is 4.5:1 and a control edge is 3:1 on every ground it sits on · state is never carried by
colour alone · reduced motion leaves a complete static page · a script that fails leaves no dead
control and no missing content · a class never collides with a system class (the `.row` bug), so
every class on this page is prefixed `fp-` and a carried piece's CSS sits under
`.fp-carry-<screen>`. One narrow-screen decision from the carry-over: the parts-mesh diagram
(26 labels in a 1272-wide drawing) is replaced by a note below an 830px container, because its
labels would draw under 8px; the five path tabs list the same parts.

**Conflicts, named:**
- **D-A12 / D-A26** (three-tier scroll, ruled right on 2026-09-22): replaced for the front page
  only. The old page is kept at `docs/legacy-three-tier.html` on promotion; no URL breaks.
- **stagecraft-v2 D-020** ("Stagecraft does not follow the desk's look"): this is the public
  site, not the desk. Recorded here as its own decision, so D-020 is not silently crossed.
- **WEB-14:** see item 3.
- **CR-20:** the hidden after-hours page is untouched, unlinked and still `noindex`.

**Build order, each step shown before the next:** (0) this record, then `ARCHITECTURE.md`
changes; (1) tokens and the shell, as a real-numbers HTML mockup of Home and Tool Desk in
Downloads; (2) the generator and the five screens in `docs/front-page/`; (3) the measuring
suite, which runs against the built pages using an existing Playwright install (it resolves
from `map-reading-trainer/node_modules`; stagecraft-v2 has no `node_modules` of its own, and
this repo gets no new package);
(4) the owner looks, then the page is promoted to the root.

**Change Rule:** a fourth persistent cluster, the 64rem board threshold, or a second palette on
the front page is a decision of its own. A new package is the owner's call, by exact name. Any
copy that names a former job title, or raises the rail career, stays out (SAFE-07).

## Build Timeline
- C0 Manifest + ARCHITECTURE.md — this commit
- C1 Data layer: registry rebuild + ~50 `data/projects/*.json` (parallel agents, one per reference section)
- C2 Shell: new front door, atlas template + `styles/atlas.css`, hub updates
- C3 Diagrams: SVGs for all full-tier projects (parallel agents)
- C4 Cross-check: every slug resolves, every full page has JSON + diagram, local preview verified

## Open Questions
- Front page (D-A27): the Home eyebrow reads "Winnipeg". Keep, change, or drop? Ask at the mockup.
- Front page (D-A27): confirm the five screen names and the sidebar order at the mockup.
- Front page (D-A27): the public Tool Desk omits `desk.json` local paths and ports by default.
  Show them, or keep them off? Ask before the page is promoted to the root.
- Front page (D-A27): the generator's label for the desk suite's 1,244 passing tests said "guards
  passing"; `guards.json` counts 728 guards. The new page says "tests passing". Confirm before
  promotion.
- Write atlas entries for `first-light`, `fulfillment-lite`, `holdout` and promote them back
  to tier `full`? (Needs real architecture content — three JSONs + three diagram SVGs.)
- Keep the dark archive-plate ground, or flip `<html class="light">`? The token file carries
  a contrast-checked paper ground either way; it's one attribute, not a rewrite.
- Delete the legacy annex outright? (Operator decision, post-ship.)
- Should the site's own entry link this DECISIONS.md as a live example? (Nice-to-have.)

## Change Log
- 2026-10-05 — **CR-21 (owner ruling, eight interview answers): rebuild the front page from zero as a
  five-screen shell on the donor look, with Stagecraft's rules and none of its CSS.** Full record in
  D-A27. **Principles broken, and why:** (1) WEB-14, the width half: the main area caps at 80rem as
  the donor does, which leaves side margins on wide screens; the owner chose the donor's look over
  that rule. (2) D-A26's one-scroll model for the front page: the scroll retires for five
  stamped pages so each works with JavaScript off. **Not touched:** atlas, hubs, project pages,
  the embedded apps, the hidden after-hours page (CR-20) and every old URL. **Status: promoted to
  the live root on 2026-10-05 on the owner's word ("push it live").** Archive copies of the replaced
  pages: `docs/legacy-three-tier.html` (was `index.html`) and `docs/legacy-desk.html` (was
  `desk/index.html`); git history holds both. Written by `scripts/build_front_page.py --root`.
  Checked before the push: `front_check.py` 19 of 19 (selftest 20 of 20 breakages caught),
  `front_probe.mjs` clean at 7 widths, both themes, keyboard, Escape, JavaScript off and reduced
  motion (selftest 15 of 15). **Defaults the owner did not rule on, shipped as they were:** the Home
  eyebrow keeps "Winnipeg" (`home.eyebrow` in `scripts/front_page.config.json`); the Tool Desk shows
  no local ports or paths (`desk.show_local`); the 1,244 figure reads "tests passing in the trading
  desk suite". **Rollback:** `git revert` the promotion commit; the previous front page is at
  `27429e8`.
- 2026-09-28 — **CR-20 (owner ruling, five interview answers): a hidden showcase page of the
  trading-desk system, dark and motion-heavy, with the Stagecraft skin rules and the
  ambient-motion ban waived for that one page.** The owner asked for a flashy, live-feeling page
  showing the desk system and all its functions, reachable only by its link, with permission to
  break every Stagecraft rule needed; interviewed down to five verdicts before building.
  **The verdicts.** (1) A synthetic feed drives every moving part; the words, formats and limits
  it prints are the desk's own, read from the desk's source at build and checked against it, a
  miss failing the build. No screenshots, no desk start, no replay. (2) The Stagecraft skin rules
  (tokens-only colour, the `sc-` namespace) and D-A09's idle-motion ban are waived for this page
  only. The bible's bones stay: content on opaque cards, one director per viewport, at most three
  clusters, contrast, content in markup, no sideways scroll, `prefers-reduced-motion` a complete
  still with no timer. (3) Scope: the desk and its satellites — cockpit, absorption ladder, alert
  wire, system mesh, regime dial, 0DTE skew, doctor/watchdog/backup ring, sabotage terminal, a
  reticle cursor and an ambient canvas; the trading bot is exactly one fenced sentence; the rule
  manual is one sentence on enforcement grades, no identifiers. (4) A hidden page: `noindex,
  nofollow` and `no-referrer`, zero inbound links, in no registry, data file, template, footer or
  docs page; this entry names no path on purpose. Hidden means unlinked, not private. (5) Numbers
  generated only, under D-A21: `data/evidence.json` and `data/guards.json` regenerated against the
  desk at its current commit and printed with their stamps; anything ungenerated is omitted.
  **Labels and gates.** Every moving or synthetic element carries a visible SYNTHETIC label and a
  sticky band says so for the page; absent data draws as a gap, never as zero; no third-party
  script, Google Fonts only. The page has its own composer under `scripts/`, which injects the desk
  strings and runs a forbidden-strings check over every file it touches and the two data files,
  refusing the build on a hit; its design contract sits under `docs/`.
  **Side effects on the site's data.** `scripts/evidence_sources.json` now points the desk source
  at the worktree on the desk's main line and excludes the other worktree folders from the commit
  scan (the desk history was otherwise counted once per worktree). `scripts/build_guards.py` reads
  the split case list (`tests/sabotage.cases.ps1`) and publishes each guard as test, file,
  mutation and exists only, dropping the raw find/replace text: no live page reads it, and the two
  superseded tier-2 drafts that did are left on disk as before. Both data files are regenerated;
  the front page's figures change when `site_compose.py` next runs.
  Everything else in force. The owner eyeballs the motion from disk before any push.
- 2026-09-27 — **CR-19 (owner ruling): "Absent is not zero", a playable desk toy in tier 2 — a
  second JavaScript dependency under D-A25's Change Rule, and the Change Request D-A21's rule
  requires for figures with no source in `evidence_sources.json`.**
  **Trigger.** The owner asked for the flair of a friend's site's playable "Privacy Lane" demo on
  his own page. Interviewed down: a playable demo → the trading desk → "absent is not zero" →
  tier 2, with a Change Request. He approved the mockup
  (`Downloads\desk-toy-mockup\absent-is-not-zero.html`) and this CR on 2026-09-27, with five
  changes: the written-out examples stay visible with scripting on; no timer under reduced motion,
  and an "Advance 10 s" button shown to everyone; the timer stops offscreen and in a hidden tab;
  the ghost card is de-emphasised by colour, never opacity; and the build reads the desk's limits
  and strings, prints the check, and fails if any has gone.
  **The design.** A `<figure class="az">` between the mesh and the bench. A synthetic ES feed with
  three native radio switches (order book full / top / off; trade prints on / none on this feed;
  options chain live / frozen / no 0DTE chain), a table of what the desk sees, a 60 s SVG
  sparkline of the mid where a missing book is a gap, and a button that renders the reversal alert
  the desk would post, shaped like its Discord embed (title, read, one code line per part). Beside
  it, a dashed "If gaps were filled with zero" card: the real alert and its zero-filled ghost are
  the side-by-side comparison D-A20's card policy permits, and D-A20 and the contract now name it.
  Under the toy, "Every case, written out": six cases as plain markup, always visible. Square
  corners and mono uppercase buttons to match tier 2's component grammar (D-A23); the mockup's
  rounded corners were not carried over. No canvas, no keyframes, no transitions. Markup, CSS and
  check: `scripts/tier2_desk_toy.py`; behaviour: `docs/tier-2-case/desk-toy.js`, the fourth script
  `site_compose.py` loads (SCRIPTS list, TEMPLATE tag, root-mode rewrite to `js/site/`).
  **What a visitor loses with scripting off — nothing of the content.** Every case the toy can
  produce is written out beneath it in the desk's own format, with a zero-filled comparison, and
  the script never hides that record: it only reveals the live part by setting `data-js="on"`
  after boot, and a throw at boot or in any later handler removes the flag and clears the timer.
  Without scripting a visitor loses the switches, the running feed and its sparkline, and firing
  at a moment of their choosing. Under `prefers-reduced-motion` no timer is ever created and
  "Advance 10 s" is the clock. The 1 s timer runs only while the toy is on screen
  (IntersectionObserver), the tab is visible and the visitor has not paused it (WCAG 2.2.2).
  **Desk facts, verified** (read-only, desk commit `124f9a1`, paths under `server/sentinel/`):
  - No book: `mid` is None and `update()` returns before any signal check
    (`alerting/detectors.py:417-420`). No alert. Confirmed.
  - Top of book only: OBI is None unless the source is depth (`alerting/detectors.py:566-567`,
    `core/models.py:101`), printed `OBI n/a` (`alerting/discord.py:175`). Confirmed.
  - No trade prints: VWAP None (`core/bars.py:75-76`; the live VWAP is that accumulator,
    `engine/runner.py:107-110`) and CVD None (`alerting/detectors.py:584-585`), printed `VWAP n/a`
    and `CVD n/a` (`alerting/discord.py:176-178`). **A reversal still fires**: `_reversal` reads
    only the mid (`alerting/detectors.py:669-695`) and the pump has no feed-health gate
    (`alerting/pump.py:57-73`). The toy fires.
  - Iceberg on a reversal with no prints: `iceberg: not checked (no trade prints on this feed)`
    (`alerting/iceberg_watch.py:138-139, 321-333`; `alerting/discord.py:296-299`); reversals are in
    the configured kinds (`config/iceberg-at-break.json:26`). Prints on and nothing found: no line
    (`alerting/discord.py:300-301`). Confirmed.
  - Skew prints a number only while its age is not over `SKEW_STALE_AFTER_S` (a strict `>`,
    `alerting/discord.py:221`), which is the engine's own `stale_after_s` (`alerting/discord.py:62`);
    past it, `skew n/a (stale Ns)`. A suspect skew prints its reason (`alerting/discord.py:224-225`).
    "Frozen" matches the mockup: refreshes stop, the connector keeps serving its last good block,
    and the number prints until it is 30 s old (`alerting/discord.py:53-61`).
  - **Corrected: the regime word.** A current skew reads `skew +0.103 fear`, not `skew +0.045`:
    the part appends the regime (`alerting/discord.py:223`), the smoother sets it on every good
    compute (`skew/engine.py:233`), and the live path always smooths (`capture/live_tws.py:519-520`).
  - **Corrected: the hold.** An empty chain is not named at once. Within 30 s of the last good
    compute the smoother returns the held block as not data_ok, reason
    `holding last (Ns): no 0DTE chain` (`skew/engine.py:208-217`), and the alert never prints a
    not-data_ok skew as a number (`alerting/detectors.py:574-577`). So it reads
    `skew n/a (holding last (15.0s): no 0DTE chain)`, then `(30.0s)`, then
    `skew n/a (no 0DTE chain)`. The mockup printed the plain reason at once; the toy now runs the
    hold on the refresh grid.
  - **Corrected: CVD is a whole number.** The desk's CVD is an int (`core/models.py:164`,
    `core/trackers.py:67-69`), so the line reads `CVD +312.00`, never `+312.40`.
  - **Corrected: "prints off" means a feed that never had one.** VWAP and CVD read n/a only until
    the first print: `tick_count` is cumulative (`core/trackers.py:73`) and the VWAP accumulator is
    never reset (`core/bars.py:78-91`). The switch reads "none on this feed" and restarts the demo
    feed's prints instead of pausing them.
  - **Found, not fixed (the desk is read-only to this repo):** if prints stop partway through a
    session, VWAP keeps its last value and, once the 60 s window (`alerting/detectors.py:413`)
    passes with no print, CVD prints `+0.00` — a flat reading standing in for a missing feed. Not
    in the desk's docs. The lede is scoped to "every case shown" rather than claiming the desk
    never prints a zero. For the owner to rule on, on the desk side.
  - Formats `OBI {obi:+.3f}`, `px {px:.2f} vs VWAP {vwap:.2f}`, `CVD {cvd:+.2f}`,
    `skew {skew:+.3f}`, joined by `"  ·  "` (`alerting/discord.py:175-182`). Titles and reads:
    `alerting/detectors.py:679-681, 689-691`. Live skew cadence: every `iv_every` = 15 cycles
    (`core/config.py:58`) at the live 1 s cycle (`core/config.py:139`), scheduled at
    `live_session.py:651-653` — the 15 s of `refresh_secs` that the toy draws.
  **Config.** `scripts/tier2_desk_toy.config.json` names every desk fact the toy uses: 3 limits
  (`SkewConfig.refresh_secs` and `stale_after_s` read with `ast`, the CVD window by regex),
  12 strings, 7 format strings and 17 behaviour lines, each a file and the literal that must be in
  it. The format strings are the templates: the build fills them with Python's own `format()` for
  the written-out cases, and desk-toy.js fills the same literals from the figure's `data-desk`
  attribute, so the drawing and the check read the same values (display-case law §8).
  `build_tier2_case.py` runs the check before anything else; on any miss it names each one and
  exits 1 without writing the page.
  **Why not D-A21's route.** The snapshot is a point-in-time measurement, and this claim must be
  re-checked on every page build or it can go stale between the two; running
  `build_evidence_snapshot.py` rewrites every other figure on the front page (commit and test
  counts, and without `--run` it drops the executed-suite figure), so two constants would drag an
  unrelated refresh along; and these are constants and strings read from source, which the
  snapshot's executed / counted / unavailable vocabulary has no word for. The smallest honest
  alternative is the one above: a declared config, read at build time, checked, and printed.
  **Verified:** before any edit the three generators reproduced the committed outputs with no diff.
  After: all three ran, and the tier-2 build printed `skew limits 15 s / 30 s; CVD window 60 s`,
  `desk strings: 12/12`, `desk formats: 7/7`, `desk rules: 17/17`. Three broken configs (a
  reworded string, a renamed limit, a missing desk repo) each exited 1 naming the miss, with the
  page untouched. `node --check` passes. A 41-check smoke test against a hand-built DOM stub (no
  jsdom on this machine): boot, pause, hidden tab, offscreen and reduced motion (zero
  `setInterval` and `setTimeout` calls; Advance moves the clock 10 s); every alert case, including
  frozen at 30 s (number) and 40 s (`stale 40s`) and the hold at 15.0 s, 30.0 s, then the plain
  reason; a missing `data-desk` leaves `data-js` unset. Composed index: the toy once, inside `.t2`,
  between the mesh and the bench; all six cases present; four script tags, all resolving at the
  root; zero `../`; `docs/site/` equals the root after the depth rewrite; all 65 toy selectors
  scoped under `.t2`. Served from `127.0.0.1:8741`: the index and all four scripts 200, then the
  server was stopped. Contrast of every text pair the toy uses, lowest first: warn on sheet
  7.93:1, live on sheet 8.24, warn on deep 8.31, ink-2 on sheet
  8.57, live on deep 8.64, warn on paper 8.68, ink-2 on deep 8.98, ink-2 on paper 9.38, the Fire
  button's #04060B on live 9.47, ink on the selected switch 13.22, ink on sheet 15.38, deep 16.12,
  paper 16.85. **Not verified:** rendering in a browser or at 375 px (no browser tools on this
  machine, by rule). From the CSS: no fixed widths, every row flex-wraps, alert lines are
  `pre-wrap` with `overflow-wrap:anywhere`, and there is no inner scroll box.
- 2026-09-23 — **CR-18 (owner ruling, recorded in map-reading-trainer D-061 and D-069): an eighth
  section, Navigation.** D-A06's Change Rule needs operator sign-off for a new hub; the owner gave
  it on 2026-09-22 ("New section: Navigation", D-061) and asked for the site fix first ("Fix both,
  then publish", D-069).
  - `data/registry.json`: category `navigation`, number 08, "Map reading and navigation
    training."; project `gridline`, tier `full`, url `/navigation/gridline/`, repo `null` (the
    code repository is private). Its write-up `data/projects/gridline.json` and diagram
    `assets/diagrams/gridline.svg` follow the full-tier rule. The registry blurb and the
    write-up's oneLiner carry the build's own description, "An unofficial trainer for Canadian
    topographic map skills.", and describe the app only.
  - `navigation/index.html`: the wing shell with `data-wing="navigation"`. Every section page
    now counts eight sections, and every section footer (the eight wings, the write-up page and
    `front-door-stagecraft.html`) lists Navigation. Tools' "next" link leads to it.
    `docs/legacy-front-door.html` is left as preserved (D-A07).
  - `.gitattributes`: `navigation/gridline/** -text`. Gridline's service worker checks every
    file it precaches against a SHA-256 list, so git must store the built files byte for byte.
  - `rail/cror-signals/sw.js` and `rail/training-assistant/sw.js`: activate now deletes only
    that app's own caches (`cror-signals-v<n>`, `cror-v<n>`); before, each deleted every cache on
    the origin, Gridline's included. The same one-line fix is in both standalone repositories.
  - `navigation/gridline/` holds a copy of Gridline's build (0.3.0-g2), written by that
    repository's `npm run publish:site`; the source stays private.
- 2026-09-22 — **CR-17 (owner ruling): tier 1 on Stagecraft v2 is APPROVED against D-A09, and the
  rule is narrowed to ambient motion.** The Change Request D-A09's own Change Rule required was
  never filed. CR-16 promoted the scroll to the root on 2026-09-08 and tier 1 shipped carrying
  Stagecraft v2's Drafting Paper palette, but D-A09 names `styles/stagecraft.tokens.css` as "the
  single control panel" and tier 1 declares its palette as raw hex inside a 404-line inline block
  in `index.html:27-38`. Two days later, on 2026-09-10, six governance files in `AI-Brain` were
  written to say the monorepo "can NEVER adopt v2" and "the live site keeps Stagecraft v1" —
  describing a page that had already changed.
  **Owner ruling, 2026-09-22: the site is right and the law was wrong.** Ratified here rather than
  reverted.
  - **What D-A09 actually forbids is a bible non-negotiable, and ambient motion is the one at
    issue.** v2's Tier 3 is ambient; it is opt-in through `data-ambient="on"` and OFF by default.
    Tier 1 does not enable it, so it never broke the rule. **Tier 3 stays banned on this repo
    without a further Change Request.**
  - **Accepted debt, recorded rather than fixed:** tier 1's palette is inline hex, not tokens, so
    D-A09's single-control-panel clause is genuinely broken for that section. Fixing it means
    extracting a `styles/stagecraft-v2.tokens.css`. Not done here; this CR records it so it is a
    known exception and not a discovery.
  - Six `AI-Brain` files corrected the same day: `CLAUDE.md`, `AGENTS.md`, `instructions/me.md`,
    `instructions/design-system.md`, `instructions/web-ui-law.md`, `workflows/coding.md`.
  - D-A26's state table is corrected above: tier 1 reads BUILT AND LIVE, not "not built."
- 2026-09-08 — **CR-16 (owner ruling): the three-tier scroll is PROMOTED to the site index.**
  D-A26 built it at `/docs/site/` and said it would move to the root after review. Reviewed,
  approved, moved. `index.html` is now the composed scroll; `docs/site/` stays as the review
  copy and both are produced by the same generator (`--root` rewrites depth and relocates the
  three behaviours to `js/site/`).
  ⚑ **The previous front door was six weeks of UNCOMMITTED work and promotion would have
  destroyed it.** The working copy of `index.html` was the CR-7 Stagecraft rebuild — 10,168
  bytes against 2,403 in HEAD — never committed since 2026-07-25. It is preserved verbatim at
  **`front-door-stagecraft.html`**, kept at root depth so its `styles/` and `js/` paths still
  resolve, and committed here so it finally exists somewhere other than one disk.
  **Only the files the promotion needed were committed.** The other seventeen modified files
  and five untracked directories from CR-7 are left exactly as they were (`PROFILE.md`: never
  tidy or commit a dirty tree on your own initiative).
  Verified after promotion: zero leftover `../` paths, all three scripts 200, and every
  referenced demo, attract screen, asset and archived page resolves 200 from the root.
- 2026-09-08 — **CR-12 (owner ruling): the stage — tier 2 takes its first JavaScript
  dependency, under D-A25's Change Rule.**
  **Trigger.** The vertical pipeline from CR-11 was rejected: *"they don't feel connected, they
  feel like erroneous distractions."* The pips animated between cards that were already all on
  screen, so the motion decorated the layout instead of describing a flow.
  **The owner's design, built as specified.** A screen-wide panel holds three cards. They arrive
  one at a time with a connector drawing toward the next slot; when the batch is full it files
  down into a running list below and the stage clears for the next three. Every arrival is a
  state that can be paused on and resumed from.
  **What a visitor loses with scripting off — the answer D-A25's Change Rule demands: nothing
  of the content.** The markup ships every part of every path in document order and is fully
  readable with `stage.js` absent, blocked or throwing. The script sets `data-js="on"` and only
  then does the staged CSS apply; its boot is wrapped so a thrown error falls back to every card
  visible rather than to a half-built stage. Verified by deleting the flag at runtime: all 9
  parts of the market path remain visible. Under `prefers-reduced-motion` the stage stays static,
  the controls are hidden and **no timer is ever created**.
  **Config.** `scripts/tier2_stage.config.json` holds batch size and all six timings, read at
  build time and emitted as data attributes — no runtime fetch, so a missing config cannot
  break the page. The reading pause (`holdMs`) is called out there as the number that matters.
  **Verified:** pause holds through 4s against a 2.6s cadence; step advances exactly one; reset
  clears both stage and list; a full batch files down; 3 columns at desktop and 1 at 375px with
  connectors suppressed and no horizontal scroll.
- 2026-09-08 — **CR-11 (owner ruling): tier 2 becomes a display case; D-A17/D-A19/D-A24
  partly reversed.** Decision D-A25.
  **Trigger.** Three tier-2 drafts were rejected in a row — an accordion, mutants rendered in
  source, and an aggregate-first evidence page. The owner named the cause: *"the actual tools
  obey the laws and can't break, this shit is a display case so let's start treating it like
  one."* Every draft had applied the tools' austerity to a page that is not a tool.
  **Built.** `docs/tier-2-case/` from `scripts/build_tier2_case.py`. The subject is the desk's
  own runtime graph, shown one curated tour at a time rather than as 54 nodes: pips travel the
  wire between parts, the connector draws in, the opening sentence reveals a clause at a time,
  and each part expands for detail. Guard and defect badges are joined onto the nodes where the
  data genuinely matches — 3 guard badges and 4 defect badges across the shown paths.
  **Zero JavaScript**, verified: 5 tours, radio switcher, 52 pips, all CSS.
  **Withdrawn.** D-A24's aggregate-first FORMAT. Its claim, its honesty rules and its
  private-repo line all stand.
  **Not done, deliberately:** the three superseded drafts (`docs/tier-2-slice/`,
  `docs/tier-2-desk/`) are left on disk rather than deleted, pending the owner's call.
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
