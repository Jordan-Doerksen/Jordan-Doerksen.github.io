# DECISIONS: the method page (skin lab)

Intake item 11, Site Master Control, writer session on branch `site-method-page`, 2026-10-20.
Nothing here is committed by the writer; the files sit on the branch for the owner's pick.

## Generation contract (the web bible's fast contract, WEB-11)

| Field | Value |
|---|---|
| site_type | explainer (a single long page that teaches one system; the bible's "interactive explainer" is the nearest class, used in its non-interactive form) |
| dominant_idea | Work moves through four gates, around two loops, held by six rules, and every step leaves a record on disk. |
| zone schema | `persistent_chrome` (one cluster: identity and section links, sticky), `hero_field` (the promise), `content_band` x4 (words, gates, loops, rules), `narrative_rail` (the numbered kickers, in flow), `footer_resolution` (notes and the footnote). No `media_field`, no `overlay_layer`, no `background_canvas` except variant C's one glow, which carries nothing. |
| primary_patterns | `editorial_rhythm` (dense band, quiet band, recurring kickers), `interactive_explainer` (overview before detail; the plain-language premise first; a readable non-interactive explanation is the whole page), `anti_card_composition` (the words and the rules are typographic lists, not cards) |
| narrative_sequence | promise, the three words, the gates in order, the two loops, the rules, notes |
| persistent_clusters | one: `identity_navigation` (the top bar). Two below budget. |
| card_policy | Panels only for genuine peers: the four gates (same shape: asks, stops, leaves), the three stations of the build loop, the layers of the control loop. The three words and the six rules are typographic lists. The comparison page uses one panel per variant because the variants are peers by construction. |
| responsive_transformations | gate and loop rows become columns at phone width; the arrow connectors turn to point down; the top bar's links wrap; the text measure caps a column, never the page (WEB-14) |
| reduced_motion_equivalent | every reveal is already in its final place (translate only, never opacity, WEB-07); transitions and the one ambient glow stop; the page is identical at rest |

## Decisions

| # | Decision | Rank | Why |
|---|---|---|---|
| D-01 | Slug: the page's final home is `/method/`, top-level like `/desk/` and `/atlas/`. | medium | Made by the master (OWN-05). The `work/` pages are generated, `tools/design-first/` is the kit's product page; this page explains the practice, so it sits beside the product, not under it. No nav link in item 11 (touching other pages is ruled out); reachable by URL until item 12 wires it. Nothing is created at `/method/` until the owner picks. |
| D-02 | Content is written once, as one HTML body (`content.html`), and stamped into three variant pages by `build.mjs`. Each variant is a complete copy; no page fetches anything. | low | The site's hand pages must open from `file://`. One source keeps the three variants word-identical, so the pick is about skin, not copy. |
| D-03 | Structure and layout live in one shared `method.css`; each variant has ONE token file (`a/tokens.css`, `b/tokens.css`, `c/tokens.css`). No raw colour, duration, radius, shadow or blur outside the token file. Every class carries the `md-` namespace. | low | SKIN-03. A skin gives colour and type only (SKIN-01); the composition is the same in all three. The density axis is a token (spacing scale, type scale), so it stays a skin value. |
| D-04 | The three variants differ on axes found in `RESEARCH.md`: ground tint, panel fill and blur, hairline strength, type pairing, display weight and track, accent count, radius, density, motion. Not on a swatch. | high | OWN-10: a high-rank decision gets recon first. The table at the end of `RESEARCH.md` is the contract. |
| D-05 | Diagrams are HTML nodes with wrapping text. SVG is used only for the connectors: inline, static, in flow, so the page reads complete with JavaScript off. The build-loop return wire is one inline SVG path that stretches with its row. | low | Brief rule; WEB-07. A JS-drawn wire vanishes with JS off; an inline one does not. |
| D-06 | Motion tier: OPEN (owner, 2026-10-19). Variant A: hover only. B: reveal (translate, never opacity) and hover. C: reveal, hover, and one ambient glow drift behind the hero. The OS `prefers-reduced-motion` flag stops all of it on every variant, and the quiet state is the final state. | medium | SAFE-05 as reworded by the owner. The motion axis is real in the research (Vercel 2 animations, Linear 96). An entrance from zero opacity is ruled out (WEB-07). |
| D-07 | Fonts: each variant links its Google Fonts family with `display=swap` and a full system fallback stack in the token file. Offline, the page renders in the fallback with the same layout. | low | Type pairing is an axis; a link tag is not a content fetch. The existing skin lab page does the same. |
| D-08 | Top bar: one sticky cluster (`data-chrome="identity_navigation"`), four section links and the Home back-link. No other fixed or sticky element. | low | WEB-04 cluster budget; the site's back-link is "Home" (D-A11). |
| D-09 | Controls: 6px radius or plain text. No pills anywhere, including the comparison page. | low | Owner rule (no pill buttons). The research found pills everywhere on the five fronts; the rule stands. |
| D-10 | Copy: dry, plain, ASD-STE100. No exclamation marks, no "maker", no job title, no rail history, no AI jargon in the body. One footnote line says the parts are AI sessions and the shape would hold with people. Law ids appear in one footnote only. | low | VOICE-01, VOICE-02, SAFE-07. The owner's voice; the fan voice is for the chat only (OWN-09). |
| D-11 | Checks: `check.mjs` beside the pages walks every element for width at 390 and 1280, checks the gutter on all four edges, the sideways scroll, the keyboard walk with a visible ring, the text contrast from computed colours, the no-script content, and the animation count under `prefers-reduced-motion: reduce`. It also takes the screenshots into `shots/`. Playwright is loaded from `map-reading-trainer` (the path in `scripts/front_probe.config.json`); the site gets no package. | low | AUTO-06: evidence is the command and its literal output. GATE-03: no new package. The front page's probe covers only its five pages, so this folder carries its own. |
| D-12 | The comparison page `index.html` renders the three variants as real pages in iframes side by side at desktop width, stacked at phone width, with a plain link per variant to open it full-screen and a one-line note naming its axes. It wears no variant's skin: a plain near-black ground and system type, so it does not vote. | low | GATE-14: a decision about appearance is asked only after real options are rendered side by side on one page. |
| D-13 | Comparison-page iframes are scaled copies of the variant pages (a CSS transform on the frame, not a width change), so each frame shows the real desktop composition. | low | Three 1280px pages do not fit in 1280px. A scaled frame keeps the real composition; the full-screen link shows it at size. |

## Variant axes (one line each, repeated on the comparison page)

- **A, Ledger.** Neutral near-black ground; flat panels with a 10% hairline, no blur; one sans (Inter) with mono labels; display 400 tracked -4%; one accent; 6px radius; tight density; hover only. The Vercel and Linear line.
- **B, Terminal.** Cool blue-black ground; 3% panel fill with a 12% hairline, blur on the bar only; IBM Plex Sans and Plex Mono; display 500 tracked -2%; one accent plus two state colours; 8px radius; medium density; reveal and hover. The Kalshi and HRT line.
- **C, Board.** Navy ground; 50% panel fill with blur on every panel and an 18% hairline; Space Grotesk display over Inter body; display 600 tracked -1%; one accent plus two state colours that also tint the panels; 4px radius; airy sections with dense panels; reveal, hover and one ambient glow. The Polymarket and IMC line.

## The pick

| # | Decision | Rank | Why |
|---|---|---|---|
| D-14 | **Variant C, Board, is the pick** (owner, 2026-10-20, in the writer's chat, after the three were rendered side by side on `index.html`). It becomes `/method/` and the skin the rest of the site moves to (Intake item 12). A and B stay under `docs/skin-lab/method/` as the record. | high | GATE-14 satisfied: three real options on one page, one question, the recommendation (B) first with reasons; the owner chose C. |
| D-15 | **Resolved 2026-10-20 (the promote step): the glow ships ON.** C's one ambient glow is ambient motion on the portfolio monorepo, which SKIN-06 gates behind a Change Request against the site's motion decision. The owner ruled on 2026-10-19 that public pages are OPEN tier: ambient motion may be on by default, and the OS `prefers-reduced-motion` flag is honoured with a quiet state. That ruling approves the glow; the site's `DECISIONS.md` records it as CR-22, so the record is there when CR-2026-10-19-TIERS lands. `--md-glow-anim` stays `md-drift`; the reduced-motion block in `method.css` stops it. | medium | Recorded here so it does not vanish between sessions; settled by the owner's ruling, not by the writer. |

## Change Log

| Date | Change | Request |
|---|---|---|
| 2026-10-20 | File created with D-01 to D-13 before any markup (WEB-11). Not a change to an earlier decision: this folder had no manifest. | Intake item 11 (the brief) |
| 2026-10-20 | D-14 (the pick) and D-15 (the glow CR line) added after the owner's answer. | The owner's word in the chat |
| 2026-10-20 | Variant C promoted to `/method/` (site CR-22): `method/index.html`, `method/tokens.css`, `method/method.css` and `method/check.mjs` are copies from this folder with the links fixed for the new depth; D-15 resolved, the glow ships on. This folder stays as the record; `shots/method-1280.png` and `shots/method-390.png` are the live page's screenshots. | Intake item 11, the promote brief |

## Law cited

WEB-02, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, WEB-10, WEB-11, WEB-14, SKIN-01, SKIN-02,
SKIN-03, SAFE-05, SAFE-07, SAFE-08, GATE-03, GATE-14, OWN-04, OWN-05, OWN-10, AUTO-06, VOICE-01,
VOICE-02. Index: `C:\projects\AI-Brain\LAW.md`.
