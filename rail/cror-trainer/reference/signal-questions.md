# Signal aspects — questions for a working conductor

**Purpose:** unblock the "Read the aspect" section of `modules/Signal Reading.html`. The
CROR *indications* (Rules 405–440, the words) are verified and solid. What's missing is
what each signal physically **looks like** — the lamps — so they can be drawn and signed off.

**Why this exists:** the only aspect source on hand is a third-party study chart
(`reference/CROR Signal Rules.pdf`, a Joseph Hoevet aid — "not an official reference") and
it has at least one confirmed error (it shows an **"A" / absolute plate, which does not
exist in Canada** — that's US practice; the CROR only names DV and R plates, Rules 403/573).
So aspects must be confirmed by an authoritative source or a working conductor before they
go in. Right now only 3 of 42 are encoded and the section is flagged `ASPECTS_DRAFT`.

**Who answers:** any current conductor. **CTC territory is ideal** — that's where the full
speed-signaling set (Limited / Medium / Diverging / Advance, plates, flashing) actually
appears. The questions don't change based on who answers.

---

## ⭐ The one ask (best case)

> Do you have CN's **official signal aspect chart** — the signal page in the GOI / special
> instructions / timetable? A clear **photo of that page** lets all 42 aspects be encoded
> correctly in one shot, from the authoritative source. If not, no problem — answer the
> questions below from what you actually see out there.

A photo of the real CN chart removes the correctness risk entirely. Everything below is the
fallback if the chart isn't handy.

---

## Answers captured (live)

> **UPDATE 2026-06-16 — authoritative source ARRIVED.** Jordan dropped **CROR Verbal Quiz** app
> screenshots in `reference/signal_screenshots/` (local-only; first ~26 shots, covering items 1–24
> of 136). Each shot fully specifies an aspect — **rule # + name + lamps top→bottom + a flash caption
> ("both flashing" / "red flashing" / "bottom two flashing") + plate + mast/dwarf** — so we now
> **encode directly from the shots.** They supersede the text guesses below, incl. the Restricting
> (436) conflict and the diverging/slow colours. (Bonus: the app confirms **no A plate** — it draws
> one as a trap on Rule 429 and captions it "not used.")

> **UPDATE 2026-06-16 (later) — the OFFICIAL source is in play.** Jordan also has the **official CN
> rulebook app** (the real CROR with the regulatory aspect diagrams). That's the **gold standard** and
> outranks the third-party quiz app. Each rule's official diagram shows **all the hardware forms** for
> the indication — e.g. **Rule 431 Slow to Clear = red/green (2-head), red/red/green (3-head),
> single-green (dwarf), red/green (dwarf).** It reveals the underlying rule: **the proceed (green)
> lamp's *position* encodes the speed** — green on top = Clear, green low = Slow. **Plan:** prefer the
> official diagrams as ground truth; the 5 quiz-app aspects (esp. 409 Clear to Slow) are **to be
> cross-checked** against the official before sign-off.

> **UPDATE 2026-06-16 (FULL PASS COMPLETE) — all 136 quiz-app shots read + encoded.** Jordan
> extracted the entire CROR Verbal Quiz set (137 files = 136 items, a couple dupes) into
> `reference/signal_screenshots/`. All read and parsed (working notes were in `%TEMP%\sigshots\parsed.md`).
> **`var ASPECTS` now holds 38 of 42 indications**, one card per indication with variants noted in the tip.
> Verified twice: a stubbed-DOM harness over the real `drawSignal` (lamp counts, per-head flash, plaque,
> no-A-plate, no dupes, every rule present in `IND`) and a live in-browser render of all 38 — 0 errors.
> `ASPECTS_DRAFT` stays **true** until the 4 gaps + the 407 question are closed.
>
> **System confirmed across the set:** green-low = slower speed; **flashing green = LIMITED, steady green =
> MEDIUM/CLEAR**; a **DV plate upgrades** the indication (e.g. 435 Slow-to-Stop + DV = 429 Diverging-to-Stop;
> 432 Slow-to-Limited + DV = 432A Diverging-to-Limited); an **L plate upgrades Medium→Limited** (427 Medium-to-Stop
> + L = 421 Limited-to-Stop; 422 Medium-to-Clear + L = 416 Limited-to-Clear); **two staggered reds + R plate =
> Restricting (436)** vs no plate = **Stop & Proceed (437)**. 429 is UN-HELD — clean shots (items 65/98/132)
> show R/Yf + DV.
>
> **4 NOT in the quiz app — and NOT encodable from the CROR (do NOT guess):**
> **410** Clear to Restricting · **418** Limited to Medium · **433A** Diverging to Medium · **440** Direction
> Indicator. **Checked the CROR rulebook (Jan 2025 PDF) 2026-06-16: the rule text gives only the INDICATION
> (the words) — there are NO lamp/aspect descriptions anywhere in the 106-page PDF** (zero "Aspect" chart in
> the text). So per Jordan ("unless there's a clear description in the CROR, don't guess") these stay
> **uncharted** until the official rulebook's aspect diagrams or a CTC conductor provide them. 440 is a
> flashing arrow that also needs a separate renderer fixture. (Earlier system-based hunches are NOT encoded.)
>
> **Conflicts — status:**
> 1. **407 Clear to Medium — RESOLVED 2026-06-16:** Jordan confirmed the app is right (he misremembered).
>    Encoded **Y/G** (yellow over green). **406 also aligned** to the yellow-top Clear-to-[speed] family (Y/Gf).
> 2. **421 dwarf** form (Yf/R, item 102) is visually identical to **415** (Yf/R) — primary kept as the 3-head R/Y/R+L.
> 3. The app's **dwarf forms often put yellow on top** where the mast form is green (also seen on 426) —
>    primaries use the mast/green forms.

Confirmed answers logged here as they arrive, so they don't get lost in the thread.

- **Framing correction (conductor, CTC territory):** the straight-route aspects are **not**
  "speed past the signal." They tell you **how many blocks ahead are clear before an
  occupancy** — how much warning you get. Speed only governs the turnout/diverging family.
- **Clear (405):** a **single** green (high mast or low). *(Jordan, firsthand — corrected himself:
  "all green" is **not** Clear; two greens is Clear to Medium.)* — **ENCODED**
- **Clear to Medium (407):** **green over green** (two greens). *(Jordan, firsthand)* — **ENCODED**
- **Clear to Stop (411):** **yellow over red.** Block you're entering clear, the next occupied;
  prepare to stop at the next signal. *(Jordan, firsthand)* — **ENCODED**
- **Advance Clear to Stop (415):** **flashing yellow over red.** Your block + next clear, the
  third occupied; prepare to stop at the second signal. *(Jordan, firsthand)* — **ENCODED**
  (renderer now flashes a single head via a `'f'` suffix, e.g. `"Yf"` = flashing yellow over steady red).
- **Grammar:** **single** green = Clear · **green over green** = Clear to Medium · green on top
  + a non-green lower head = a "Clear to [speed]". *(Jordan, firsthand)*

**Confirmed plate/flash logic (SME):**
- **Plates: only R and DV are used — NO "A" plate.** Conductor-confirmed, on top of the rulebook
  and the Robitaille deck (three independent sources).
- **DV plate is an upgrade:** a Diverging indication **always** carries a DV plate; **strip the DV
  plate and the same aspect downgrades to Slow.** (Matches Robitaille: "DV marker upgrades the indication.")
- **R plate splits 436 vs 437:** two staggered reds **no plate = Stop & Proceed (437)** *(encoded)*;
  the **same two staggered reds + R plate = Restricting (436)**.
- **Flashing indications:** Advance Clear to Stop (415, encoded) · the **Limited** family ·
  Diverging to Stop (429) · Slow to Stop (435). 429 flashes **with** a DV plate; 435 flashes
  **without** one — the plate is the only difference between those two.
- **Head count varies:** signals may be **single-aspect (one head) or dual-aspect (two heads)**.
- **440 Direction Indicator:** an *advance* that you're leaving the main track (a flashing **arrow**,
  a separate fixture — the lamp renderer would need an arrow shape; deferred).

**✅ Restricting (436) — RESOLVED (quiz app, item 23, 2026-06-16):** the trusted quiz app draws **436 = red
over red over yellow (3-head mast), NO plate** — now encoded as the primary form. CROR allows multiple aspects,
so the earlier descriptions (single steady yellow; two staggered reds + R plate) stay legal alternates and are
noted in the card. Clean contrast with **437** (two STAGGERED reds, no plate) is preserved.

**Still need — the actual lamp colours (top→bottom), same format as 411/415:**
- Diverging (430) = ___/___ **+DV** · Diverging to Stop (429) = ___/___ **flashing +DV**
- Slow to Stop (435) = ___/___ **flashing** (= 429's aspect minus the DV plate)
- Limited to Clear (416) = ___/___ (flashing green on top?)
- **Hypothesis to confirm:** is the diverging/slow base **red over yellow**? (would make 430 = R/Y +DV,
  431 Slow to Clear = R/Y no plate, and the "to Stop" versions flash the lower lamp.)

**Encoded now (38 of 42 — verified stubbed-DOM harness + live renderer, see FULL PASS COMPLETE block above):**
405 · 406 · 407 · 408 · 409 · 411 · 412 · 413 · 414 · 414A · 415 · 416 · 417 · 419 · 419A · 420 · 421 · 422 · 423 ·
424 · 425 · 425A · 426 · 427 · 428 · 429 · 430 · 431 · 432 · 432A · 433 · 434 · 434A · 435 · 436 · 437 · 438 · 439.
**Not yet charted (4):** 410 Clear to Restricting · 418 Limited to Medium · 433A Diverging to Medium · 440 Direction Indicator.
**Batch 5 (2026-06-16) — items 19–25:** new cards **412** (Yf/Gf, flashing-green = Limited vs 413's steady-green = Medium),
**434 Slow to Slow** (R/Yf/Yf, = 434A minus the DV plate), **436 Restricting** (R/R/Y, no plate — resolves the conflict).
Variants folded into existing cards: **420** (3-head R/Y/R + L plate, bottom-red flashing), **428** (2-head mast form,
not just dwarf), **413** (3-head Yf/G/R). Pattern reconfirmed: **flashing green = Limited, steady green = Medium/Clear**.
**Resolved:** 430 Diverging = red/yellow + DV plate (confirms the earlier hypothesis). **New plate: "L"**
(Limited marker — a yellow *triangle* in the app; renders as a labelled box for now, could be made a
triangle later). 411's card now notes its 3-head (Y/R/R) form.
**SME sign-off (2026-06-16): Jordan confirmed the first 12 on the live site.** Policy: **one card per
indication, variants noted in the card** (Jordan's call) — e.g. 439's tip notes the 3-red 3-head form.
Useful pattern confirmed across shots: **flashing green = Limited, steady green = Medium/Clear**;
flashing yellow (bottom) = the "to Diverging/Slow" warning. (`ASPECTS_DRAFT` still true until the board is complete.)

**Source decision — the quiz app is trusted.** Jordan **passed his 2025 CROR conductor test using the
CROR Verbal Quiz app**, and the official rulebook (Rule 431) corroborated it. So we encode from the
`signal_screenshots/` shots with confidence; the official rulebook is a bonus cross-check where he can
grab it (it can't be screenshotted easily right now). No more "to-be-verified" asterisks.

**Flash semantics (important when reading the shots):** the quiz app *animates* flashing, so a frozen
screenshot can catch a flashing lamp **mid-off** (appears dark/olive). The **caption / Jordan's markup
is the source of truth for which lamp flashes** — not whether the lamp looks lit in that one frame.
(The official rulebook instead marks flashing with a **static symbol**, no animation — so a rulebook
shot needs no markup.)
`ASPECTS_DRAFT` stays **true** until the full set is in. Renderer handles N heads, dwarf, DV/R plates,
stagger, and per-head flash (`'f'` suffix) — covers everything the screenshots show so far.

**Remaining screenshots to encode (in `signal_screenshots/`):** ✅ DONE — all 136 items read + encoded (see the
FULL PASS COMPLETE block above). 429 is no longer held (clean R/Yf+DV shots confirmed). **Tip for any future shots:**
they're 1080×2424; downscale to ≤1400px tall first (`%TEMP%\sigshots`) or the image API rejects them once several are loaded.

**Still needed (next):**
- The **exact lower-head colour** for each "Clear to [speed]": Clear to Limited (406) /
  Medium (407) / Slow (409) / Diverging (408) / Restricting (410) — green over *what*?
- The **turnout/diverging family** (Limited / Medium / Diverging / Slow *to* ___) — first word is a real speed.
- **Restricting (436)**, **Diverging (430)**, **Direction Indicator (440)**, **Take/Leave (438)**.
- Confirm **Clear** on a 2-head mast: single green, or green-over-green?

---

## The question sheet (fallback)

**Paste this framing first:**

> I've got the CROR indications (Rules 405–440) word-for-word — that part's solid. What I
> need is what each signal physically LOOKS like, since you read CTC signals daily. Don't
> worry about rule numbers, just tell me the lamps. Where you're not 100% sure, say so —
> I'd rather have a gap than a wrong lamp.

### A — the system (this generates most of the 42)

> **Corrected by SME:** the straight-route aspects are **not** "speed past the signal." They
> tell you **how many blocks ahead are clear before an occupancy** — how much warning you get.
> Speed only governs the *turnout/diverging* family. So there are really two families:

1. **Hardware on your sub:** colour-light (separate R/Y/G lens per head), searchlight (one
   lens that changes colour), or position-light? Typical mast — **2 heads or 3?**

**A1 · Approach family ("Clear to ___") — block warning, normal speed:**
2. Walk the warning ladder, top→bottom lamps for each:
   - **Clear (405):** all clear ahead → single ___? (green?)
   - **Clear to Stop (411):** your block clear, next occupied → top lamp ___ (steady yellow?)
     over a ___ lower head?
   - **Advance Clear to Stop (415):** your block clear, next clear, third occupied →
     **flashing yellow on top** *(SME-confirmed)* over a ___ lower head?
   - For these — is it a **single head** showing the yellow, or **yellow over red** (2 heads)?
3. Same block-warning idea for **Clear to Limited / Medium / Slow / Diverging / Restricting** —
   what changes in the lamps vs Clear to Stop?

**A2 · Turnout/diverging family ("Limited / Medium / Diverging / Slow to ___") — speed through
the turnouts:**
4. Here the first word *is* a speed. What do these look like (top head colour, lower head,
   flashing) — e.g. **Medium to Clear (422)**, **Limited to Clear (416)**, **Slow to Clear
   (431)**, **Diverging (430)**? When does a **third (bottom) head** appear?
5. Which indications use a **flashing** lamp, and **which lamp** flashes? (Confirmed so far:
   flashing yellow top = Advance Clear to Stop. What else flashes?)

### B — the stand-alones (these break the grammar)
6. **Clear (405)** — single green, one head, right?
7. **Restricting (436)** — aspect? (flashing red / red-over-yellow / lunar white?) Does it
   carry an **R** plate on your sub?
8. **Stop and Proceed (437) vs Stop (439)** — describe exactly what your eyes use to tell an
   *absolute* Stop from a permissive (stop-then-proceed) one. Is it a **number plate
   present/absent**, the **two-red stagger**, or something else? **← the big one, say more here.**
9. **Diverging (430)** — aspect, and does it **always** carry a **DV** plate?
10. **Direction Indicator (440)** — the flashing arrow: separate fixture? colour?
    left / right / straight?
11. **Take or Leave Siding or Other Track (438)** — does GP / your territory even use it?
    If so, what's the aspect?

### C — plates & dwarfs
12. Plates you **actually** see out there: DV, R, anything else? And can you confirm you've
    **never seen an "A" (absolute) plate** — established there's no such plate in Canada,
    want a working conductor to back that.
13. **Dwarf (ground) signals** — which indications show as dwarfs, and do the colours differ
    from the mast version?

**Caveat to include:** some indications have more than one legal aspect — just give the one
you'd actually see on your territory, and note **which sub** that is.

---

## The 3 that must get nailed no matter what
Even a partial answer should cover these — they're what's blocking sign-off today:
1. **437 vs 439** — the physical tell for absolute vs permissive Stop.
2. **Plates** — confirm DV and R, and confirm **no "A" plate**.
3. **Flashing** — which indications flash, and which lamp.

---

## Appendix — how answers map to the encoding (for whoever encodes it)
Each aspect in `modules/Signal Reading.html` (`var ASPECTS`) is:

```js
{ r:"NNN", lvl:"basic|full",
  spec:{ heads:[ ... ],   // lamp colours TOP→BOTTOM: G green · R red · Y yellow · L lunar/white · D dark
         type:"mast|dwarf",
         stagger:true,     // optional — two heads offset L/R (the non-controlled tell)
         flash:true,       // optional — lamp(s) flash
         plaque:"DV|R" },  // optional — plate on the mast (NO "A" in Canada)
  tip:"one-line plain-language note" }
```

So from the answers: Q2/Q3/Q4 → the `heads` array · Q5 → `flash` · Q8 → `stagger` and/or
`plaque` · Q9/Q12 → `plaque` · Q13 → `type:"dwarf"`. Encode against the verified `IND`
table (the words) in the same file, then set `ASPECTS_DRAFT=false` only after a verify pass.
