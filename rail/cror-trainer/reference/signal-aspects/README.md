# Signal-aspect screenshots — drop zone

This folder is where Jordan's **signal-aspect screenshots** go — the authoritative source for
encoding the "Read the aspect" section of `modules/Signal Reading.html`. ~136 applicable combos
(more than the 42 named indications, because each can appear as single- vs dual-head, with/without
a plate, etc.).

## Local-only — the raw shots are gitignored
The image files here are **not committed** (`.gitignore` keeps `reference/signal-aspects/*` except
this README). Reasons: the source is likely copyrighted (treat like the rulebook PDF — don't
republish), and 136 images would bloat the repo + the deployed Pages site. **What ships is the
encoded data** — `var ASPECTS` inside the module. If these are your own field photos and you'd
rather track them, say so and we'll flip the ignore.

## How to name / mark them (so encoding is fast + accurate)
- **Start each filename with the CROR rule number** — `429_...`, `430_...`, `436_...`. That alone
  maps each image to its indication (names/meanings live in the verified `IND` table).
- **Variants** of the same rule → add a short tag: `_single` / `_dual` (head count),
  `_rplate` / `_dvplate` / `_noplate`, `_lowmast` / `_dwarf`.
- **Mark the flashing bulb** right in the shot (circle/arrow), or tag it: `_flashTop` / `_flashBot`.
  Steady is the default; I only need to know which lamp(s) move.
- Example: `429_diverging-to-stop_dual_dvplate_flashBot.png`.

## Workflow
1. **Upload a small batch first (5–10).** We lock the naming/marking convention on those before you
   grind through all 136 — cheaper to fix the format early.
2. Claude encodes each into `ASPECTS` (lamps top→bottom, plate, per-head flash via the `'f'` suffix),
   keeps `ASPECTS_DRAFT = true` until the set is complete, and verifies every one with the
   stubbed-DOM harness (asserts flash-vs-steady per head).
3. The live answer log / open questions are in `reference/signal-questions.md`.
