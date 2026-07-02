# Yard Conductor Trainer — Game Plan

A browser-based training game to help Jordan re-qualify as a CN freight conductor: stay CROR-compliant, read switch lists, and switch/build trains in a yard. Built to turn fear into reps — a safe place to make every mistake until the right move is automatic.

Source of truth: `Jan_2025_Canadian_rail_operating_rules_EN.pdf` (in this folder). Every rule taught in the game is verified against it.

---

## Design principles

1. **Safe to fail.** You can break every rule here with zero consequence. The only way to get un-scared is to do the thing a hundred times where it's free.
2. **Real wording, real rule numbers.** Feedback always cites the actual CROR rule (e.g., "Rule 113.4 — kicking prohibited on a siding"). You learn the rulebook, not a paraphrase.
3. **The referee explains.** Every mistake gets a one-line *why*, not just a red X. Understanding sticks; memorizing doesn't.
4. **Short reps, repeatable.** Designed for 5–10 minute sessions you'll actually come back to.
5. **Data-driven.** Questions, scenarios, switch lists, and yard layouts live in plain data, so adding content is easy and never touches the engine.

---

## The four skill domains (what the game must teach)

| Domain | What you practice | Core CROR rules |
|---|---|---|
| **Reading switch lists** | Decode the list; pull and spot cars in the right order, to the right tracks | (operational — wraps the rules below) |
| **CROR rules recall** | Definitions, restrictions, the right answer under pressure | Definitions, 104–115, 26, 105 |
| **Switching moves** | Coupling, uncoupling, kicking, running switch, shoving with point protection, securement | 104, 104.5, 108, 112, 113.0–113.7, 114, 115 |
| **Radio & hand signals** | Clean communication; positive ID; switching by radio; signal meanings | 12, 121, 122, 123, 123.1, 123.2 |

### Phase-1 rule scope (the yard/switching core)

- **Switches:** 104 (normal/reverse, lined & locked, examine points, crossovers, fouling point), 104.1 spring, 104.2 dual control, 104.5 derails
- **Operation:** 105 non-main track speed, 108 precautions while switching, 109 LE precautions
- **Securement:** 112 — the handbrake count table (trailing tons × grade %), testing for effectiveness, yard-track options
- **Coupling family:** 113.0 coupling, 113.1 uncoupling, 113.2 moving after coupling, 113.3 switching with air
- **Special moves:** 113.4 restrictions, 113.5 kicking, 113.6 running switch (3 employees), 113.7 gravity drop
- **Fouling & shoving:** 114 fouling other tracks, 115 shoving + point protection ("known to be clear")
- **Signals:** 12 hand signals, 13 bell, 14 whistle, 26 blue flag
- **Radio:** 121 positive ID, 122 brevity, 123 verification, 123.1 radio/hand signals, 123.2 switching by radio

**Expansion path (later phases):** OCS (301–315), CTC (560–578), ABS (505–515), interlockings (601–620), signal indications (401–440), TOPs (849–864). The engine is built so these drop in without a rewrite.

---

## The three modules

### Module 1 — Rule Drills  *(Phase 1, playable now)*
Fast scenario questions across all four domains. Pick a domain or go Mixed. Immediate feedback with the rule citation and the *why*. Tracks score, streak, and which ones you miss so you can re-drill weak spots.

*Examples:* "18,000 trailing tons on a 1.2% grade — minimum handbrakes?" · "You're shoving a cut toward an unseen track — what does Rule 115 require?" · "Hand signal swung in a circle at right angle to the track means…?"

### Module 2 — Switch List Reader  *(Phase 2)*
A realistic switch list plus a yard diagram. You read the list and choose the work order: which track to pull, which cars come off, where they spot, how the outbound is built in standing order. Teaches the literacy that ties everything together.

### Module 3 — Yard Switching Sim + Rules Referee  *(Phase 3)*
The real thing, on an interactive track diagram. Line switches, couple/uncouple, kick or shove, build the outbound, secure it with the correct handbrakes. A **rules referee** checks every action live against the CROR and flags violations the instant they happen — fouling a track with a switch lined wrong, shoving with no point protection, leaving a cut short on handbrakes, kicking on a prohibited track. Scenarios escalate from a 3-car spot to a full classification.

---

## Tech approach

- **Single self-contained HTML file**, vanilla JS + SVG. No install, no internet — double-click to play, works on any computer.
- **Separation of content and engine:** a `rules`/`questions`/`scenarios` data layer the engine reads. Adding a rule or a scenario = adding a data entry.
- **The referee** is a small rules engine: each CROR rule in scope becomes a check (precondition → violation message → citation). Reused by both the sim and the drill generator.
- **Progress** stored in the browser session; optional export later.

---

## Build roadmap

- **Phase 1 — Rule Drills prototype** ✅ delivered: `Yard Conductor Trainer.html` — ~30 verified questions across the four domains, scoring, streaks, explanations.
- **Phase 2 — Switch List Reader:** switch-list format + 3–4 yard layouts + work-order grading.
- **Phase 3 — Yard Sim + Referee:** interactive diagram, switching actions, live CROR checking, escalating scenarios.
- **Phase 4 — Expand & track:** broaden to full-CROR rules-exam coverage; add weak-spot tracking and a "mock exam" mode.

Each phase is playable on its own, so progress is always something you can sit down and use.
