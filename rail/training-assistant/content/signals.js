// ==========================================================================
// CONTENT · SIGNALS — CROR 405–440 indications. Names + meanings are CROR
// rulebook text (sourced exact). The aspect drawings (`aspect`) are reproduced
// from a study source and cross-checked against the CROR — the rulebook governs;
// they render via js/signal.js. Ported from the audited cn-conductor-trainer
// Signal Reading module. Verify any aspect against the CROR + SME before relying on it.
// ==========================================================================

export const signals = [
 {
  "id": "sig-401",
  "domain": "signals",
  "ref": "CROR 401",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Location of Fixed Signals",
  "body": "Wherever practicable, fixed signals other than switches are located above, or to the right of, the track they govern; other placements are indicated by GBO or special instructions. Exception: a block or interlocking signal required to be placed to the left need not be indicated, provided that location does not place it to the right of another signalled track.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-401-1",
  "domain": "signals",
  "ref": "CROR 401.1",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Signal Displayed",
  "body": "The indications displayed on block and interlocking signals govern operation to the next signal or block-end sign. Unless special instructions specify otherwise, a signal to leave the main track for non-main track applies to the block-end sign, or until the leading end has passed entirely through the controlled location onto non-main track. Speed requirements protecting turnouts must be complied with until the entire movement has cleared the turnout.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-401-2",
  "domain": "signals",
  "ref": "CROR 401.2",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "No Advance Signal",
  "body": "Where there is no advance signal to the signal governing movements into CTC, or where movements are re-entering CTC from a siding, all movements must approach the governing signal prepared to stop until it can be observed displaying a more favourable indication than Stop.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-402",
  "domain": "signals",
  "ref": "CROR 402",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Positioning",
  "body": "Where conditions allow, block and interlocking signal heads are positioned with respect to the tracks whose movements they affect; bridges, cantilevers, dummy masts and other structures are used and must be illustrated in company instructions to ensure proper understanding of signal intent.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-403",
  "domain": "signals",
  "ref": "CROR 403",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Appearance of Colour Light Signals",
  "body": "Block and interlocking signal aspects are displayed by the colour, position, flashing of lights, or combinations thereof. The indication of such a signal may be qualified or modified by an attached arrow and/or plate.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-404",
  "domain": "signals",
  "ref": "CROR 404",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Standard Indications",
  "body": "The illustrations in Rules 405–440 are the standard aspects and indications. Other signal aspects and indications necessary will be illustrated in special instructions.",
  "tags": ["signals", "description"]
 },
 {
  "id": "sig-405",
  "domain": "signals",
  "ref": "CROR 405",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear",
  "body": "Proceed.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "G"
   ],
   "type": "mast"
  },
  "detail": "A SINGLE green — proceed (Clear), high mast or low. Also drawn green/red/red on a 3-head. (Two greens is NOT Clear.)"
 },
 {
  "id": "sig-406",
  "domain": "signals",
  "ref": "CROR 406",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Limited",
  "body": "Proceed, approaching next signal at LIMITED speed.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "Y",
    "Gf"
   ],
   "type": "mast"
  },
  "detail": "Yellow over FLASHING green — Clear to Limited (yellow = heads-up, flashing green = LIMITED at the next signal). Same Clear-to-[speed] family as 407/409/411. Also drawn 3-head green/red/flashing-green, or yellow/green with an L plate."
 },
 {
  "id": "sig-407",
  "domain": "signals",
  "ref": "CROR 407",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Medium",
  "body": "Proceed, approaching next signal at MEDIUM speed.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "Y",
    "G"
   ],
   "type": "mast"
  },
  "detail": "Yellow over green — Clear to MEDIUM: be prepared for MEDIUM speed at the next signal. (The whole Clear-to-[speed] family leads with a steady yellow: Clear to Slow = yellow/yellow, Clear to Stop = yellow/red — the yellow is the heads-up, the lower lamp is the speed.)"
 },
 {
  "id": "sig-408",
  "domain": "signals",
  "ref": "CROR 408",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Diverging",
  "body": "Proceed, approaching next signal at DIVERGING speed.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "Y",
    "Y"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "Two yellows with a DV plate — Clear to Diverging: be prepared for DIVERGING speed at the next signal. (= Clear to Slow plus a DV plate; the DV upgrades Slow→Diverging.)"
 },
 {
  "id": "sig-409",
  "domain": "signals",
  "ref": "CROR 409",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Slow",
  "body": "Proceed, approaching next signal at SLOW speed.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "Y",
    "Y"
   ],
   "type": "dwarf"
  },
  "detail": "Two yellows, no plate — Clear to Slow: be prepared for SLOW speed at the next signal. Also drawn yellow/yellow/red on a 3-head."
 },
 {
  "id": "sig-410",
  "domain": "signals",
  "ref": "CROR 410",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Restricting",
  "body": "Proceed, next signal is displaying restricting signal.",
  "tags": [
   "signals",
   "clear"
  ],
  "detail": "No standard aspect drawing in the source references used."
 },
 {
  "id": "sig-411",
  "domain": "signals",
  "ref": "CROR 411",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Clear to Stop",
  "body": "Proceed, preparing to stop at next signal.",
  "tags": [
   "signals",
   "clear"
  ],
  "aspect": {
   "heads": [
    "Y",
    "R"
   ],
   "type": "mast"
  },
  "detail": "Yellow over red — APPROACH (Clear to Stop): your block is clear, the next is occupied, prepare to stop at the next signal. (On a 3-head: yellow over red over red.)"
 },
 {
  "id": "sig-412",
  "domain": "signals",
  "ref": "CROR 412",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Advance Clear to Limited",
  "body": "Proceed, approaching second signal at LIMITED speed.",
  "tags": [
   "signals",
   "adv"
  ],
  "aspect": {
   "heads": [
    "Yf",
    "Gf"
   ],
   "type": "mast"
  },
  "detail": "FLASHING yellow over FLASHING green — Advance Clear to Limited: be prepared for LIMITED speed at the SECOND signal. (Flashing green = LIMITED.) Also drawn 3-head over a red."
 },
 {
  "id": "sig-413",
  "domain": "signals",
  "ref": "CROR 413",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Advance Clear to Medium",
  "body": "Proceed, approaching second signal at MEDIUM speed.",
  "tags": [
   "signals",
   "adv"
  ],
  "aspect": {
   "heads": [
    "Yf",
    "G"
   ],
   "type": "mast"
  },
  "detail": "FLASHING yellow over green — Advance Clear to Medium: be prepared for MEDIUM speed at the SECOND signal. (Also drawn staggered, and 3-head over a red.)"
 },
 {
  "id": "sig-414",
  "domain": "signals",
  "ref": "CROR 414",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Advance Clear to Slow",
  "body": "Proceed, approaching second signal at SLOW speed.",
  "tags": [
   "signals",
   "adv"
  ],
  "aspect": {
   "heads": [
    "Yf",
    "Y"
   ],
   "type": "mast"
  },
  "detail": "FLASHING yellow over steady yellow — Advance Clear to Slow: be prepared for SLOW speed at the SECOND signal. (Also drawn 3-head over a red.)"
 },
 {
  "id": "sig-414a",
  "domain": "signals",
  "ref": "CROR 414A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Advance Clear to Diverging",
  "body": "Proceed, approaching second signal at DIVERGING speed.",
  "tags": [
   "signals",
   "adv"
  ],
  "aspect": {
   "heads": [
    "Yf",
    "Y"
   ],
   "type": "mast",
   "plaque": "DV"
  },
  "detail": "FLASHING yellow over steady yellow with a DV plate — Advance Clear to Diverging. (= Advance Clear to Slow plus the DV upgrade.)"
 },
 {
  "id": "sig-415",
  "domain": "signals",
  "ref": "CROR 415",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Advance Clear to Stop",
  "body": "Proceed, prepared to Stop at second signal.",
  "tags": [
   "signals",
   "adv"
  ],
  "aspect": {
   "heads": [
    "Yf",
    "R"
   ],
   "type": "mast"
  },
  "detail": "FLASHING yellow over red — ADVANCE approach (Advance Clear to Stop): your block and the next are clear, the THIRD is occupied; prepare to stop at the second signal."
 },
 {
  "id": "sig-416",
  "domain": "signals",
  "ref": "CROR 416",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Clear",
  "body": "Proceed, LIMITED speed passing signal and through turnouts.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "R",
    "G",
    "R"
   ],
   "type": "mast",
   "plaque": "L"
  },
  "detail": "Red over green over red with an L plate — Limited to Clear. (Same lamps as Medium to Clear (422); the L plate upgrades Medium→LIMITED. Also drawn on a dwarf as flashing-green over red.)"
 },
 {
  "id": "sig-417",
  "domain": "signals",
  "ref": "CROR 417",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Limited",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, approaching next signal at LIMITED speed.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "R",
    "Gf",
    "Gf"
   ],
   "type": "mast"
  },
  "detail": "Red over FLASHING green over FLASHING green — Limited to Limited: LIMITED through the turnouts, prepared for LIMITED at the next signal (flashing green = limited, both heads)."
 },
 {
  "id": "sig-418",
  "domain": "signals",
  "ref": "CROR 418",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Medium",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, approaching next signal at MEDIUM speed.",
  "tags": [
   "signals",
   "limited"
  ],
  "detail": "No standard aspect drawing in the source references used."
 },
 {
  "id": "sig-419",
  "domain": "signals",
  "ref": "CROR 419",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Slow",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, approaching next signal at SLOW speed.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "R",
    "Gf",
    "Yf"
   ],
   "type": "mast"
  },
  "detail": "Red over FLASHING green over FLASHING yellow — Limited to Slow (flashing green = LIMITED through, flashing yellow = SLOW ahead). Also drawn on a dwarf as flashing-green over flashing-yellow."
 },
 {
  "id": "sig-419a",
  "domain": "signals",
  "ref": "CROR 419A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Diverging",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, approaching next signal at DIVERGING speed.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "Gf",
    "Yf"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "FLASHING green over FLASHING yellow with a DV plate (dwarf) — Limited to Diverging."
 },
 {
  "id": "sig-420",
  "domain": "signals",
  "ref": "CROR 420",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Restricting",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, next signal is displaying restricting signal.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "Gf",
    "Rf"
   ],
   "type": "mast",
   "stagger": true
  },
  "detail": "FLASHING green over FLASHING red, staggered — Limited to Restricting (flashing green = LIMITED). Steady green here would be Medium to Restricting (426). Also drawn 3-head red/yellow/flashing-red with an L plate."
 },
 {
  "id": "sig-421",
  "domain": "signals",
  "ref": "CROR 421",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Limited to Stop",
  "body": "Proceed, LIMITED speed passing signal and through turnouts, preparing to stop at next signal.",
  "tags": [
   "signals",
   "limited"
  ],
  "aspect": {
   "heads": [
    "R",
    "Y",
    "R"
   ],
   "type": "mast",
   "plaque": "L"
  },
  "detail": "Red over yellow over red with an L plate — Limited to Stop. The L plate upgrades the Medium-to-Stop aspect (427, same lamps no plate) to LIMITED."
 },
 {
  "id": "sig-422",
  "domain": "signals",
  "ref": "CROR 422",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Clear",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "R",
    "G",
    "R"
   ],
   "type": "mast"
  },
  "detail": "Red over green over red, NO plate — Medium to Clear: MEDIUM speed through the turnouts, then clear. (Add an L plate and it becomes Limited to Clear (416).)"
 },
 {
  "id": "sig-423",
  "domain": "signals",
  "ref": "CROR 423",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Limited",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, approaching next signal at LIMITED speed.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "G",
    "Gf"
   ],
   "type": "dwarf"
  },
  "detail": "Green over FLASHING green (dwarf) — Medium to Limited: steady green = MEDIUM through, flashing green = LIMITED at the next signal. Also drawn 3-head red/green/flashing-green."
 },
 {
  "id": "sig-424",
  "domain": "signals",
  "ref": "CROR 424",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Medium",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, approaching next signal at MEDIUM speed.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "R",
    "G",
    "G"
   ],
   "type": "mast"
  },
  "detail": "Red over green over green — Medium to Medium: MEDIUM speed through the turnouts, prepared for MEDIUM at the next signal."
 },
 {
  "id": "sig-425",
  "domain": "signals",
  "ref": "CROR 425",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Slow",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, approaching next signal at SLOW speed.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "R",
    "G",
    "Yf"
   ],
   "type": "mast"
  },
  "detail": "Red over green over FLASHING yellow — Medium to Slow (steady green = MEDIUM, flashing yellow = SLOW ahead). Also drawn on a dwarf as green over flashing-yellow."
 },
 {
  "id": "sig-425a",
  "domain": "signals",
  "ref": "CROR 425A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Diverging",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, approaching next signal at DIVERGING speed.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "G",
    "Yf"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "Green over FLASHING yellow with a DV plate (dwarf) — Medium to Diverging. (Steady green = MEDIUM; the DV makes the SLOW into DIVERGING. Flashing green here = Limited to Diverging, 419A.)"
 },
 {
  "id": "sig-426",
  "domain": "signals",
  "ref": "CROR 426",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Restricting",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, next signal is displaying restricting signal.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "G",
    "Rf"
   ],
   "type": "mast",
   "stagger": true
  },
  "detail": "Green over a FLASHING red, staggered — Medium to Restricting. (Flashing green instead = Limited to Restricting, 420. Also drawn 3-head red/yellow/flashing-red.)"
 },
 {
  "id": "sig-427",
  "domain": "signals",
  "ref": "CROR 427",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Medium to Stop",
  "body": "Proceed, MEDIUM speed passing signal and through turnouts, preparing to stop at next signal.",
  "tags": [
   "signals",
   "medium"
  ],
  "aspect": {
   "heads": [
    "R",
    "Y",
    "R"
   ],
   "type": "mast"
  },
  "detail": "Red over yellow over red, NO plate — Medium to Stop: MEDIUM through the turnouts, prepare to stop at the next signal. (Add an L plate and it upgrades to Limited to Stop, 421.)"
 },
 {
  "id": "sig-428",
  "domain": "signals",
  "ref": "CROR 428",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging to Clear",
  "body": "Proceed, DIVERGING speed passing signal and through turnouts.",
  "tags": [
   "signals",
   "diverging"
  ],
  "aspect": {
   "heads": [
    "R",
    "G"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "Red over green with a DV plate — Diverging to Clear. (The DV plate is what separates this from Slow to Clear (431), which is red/green with no plate.)"
 },
 {
  "id": "sig-429",
  "domain": "signals",
  "ref": "CROR 429",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging to Stop",
  "body": "Proceed, DIVERGING speed passing signal and through turnouts preparing to stop at next signal.",
  "tags": [
   "signals",
   "diverging"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "Red over FLASHING yellow with a DV plate — Diverging to Stop. (= Slow to Stop (435) plus the DV upgrade. The app draws an A plate on this one as a trap — there is NO A plate in Canada.)"
 },
 {
  "id": "sig-430",
  "domain": "signals",
  "ref": "CROR 430",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging",
  "body": "Proceed at REDUCED speed, not exceeding DIVERGING speed passing signal and through turnouts.",
  "tags": [
   "signals",
   "diverging"
  ],
  "aspect": {
   "heads": [
    "R",
    "Y"
   ],
   "type": "dwarf",
   "plaque": "DV"
  },
  "detail": "Red over yellow with a DV plate — Diverging: proceed at REDUCED speed, not over diverging speed. (Strip the DV plate and the same aspect downgrades to Slow.)"
 },
 {
  "id": "sig-432a",
  "domain": "signals",
  "ref": "CROR 432A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging to Limited",
  "body": "Proceed, DIVERGING speed passing signal and through turnouts, approaching next signal at LIMITED speed.",
  "tags": [
   "signals",
   "diverging"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf",
    "Gf"
   ],
   "type": "mast",
   "plaque": "DV"
  },
  "detail": "Red over FLASHING yellow over FLASHING green with a DV plate — Diverging to Limited. (= Slow to Limited (432) plus the DV upgrade.)"
 },
 {
  "id": "sig-433a",
  "domain": "signals",
  "ref": "CROR 433A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging to Medium",
  "body": "Proceed, DIVERGING speed passing signal and through turnouts, approaching next signal at MEDIUM speed.",
  "tags": [
   "signals",
   "diverging"
  ],
  "detail": "No standard aspect drawing in the source references used."
 },
 {
  "id": "sig-434a",
  "domain": "signals",
  "ref": "CROR 434A",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Diverging to Diverging",
  "body": "Proceed, DIVERGING speed passing signal and through turnouts, approaching next signal at DIVERGING speed.",
  "tags": [
   "signals",
   "diverging"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf",
    "Yf"
   ],
   "type": "mast",
   "plaque": "DV"
  },
  "detail": "Red over FLASHING yellow over FLASHING yellow with a DV plate — Diverging to Diverging. (Add the DV plate to Slow to Slow (434) and it upgrades to Diverging.)"
 },
 {
  "id": "sig-431",
  "domain": "signals",
  "ref": "CROR 431",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Slow to Clear",
  "body": "Proceed, SLOW speed passing signal and through turnouts.",
  "tags": [
   "signals",
   "slow"
  ],
  "aspect": {
   "heads": [
    "R",
    "G"
   ],
   "type": "mast"
  },
  "detail": "Red over green — Slow to Clear (slow = the proceed/green lamp sits low). Also drawn as a single green or red-over-green on a dwarf."
 },
 {
  "id": "sig-432",
  "domain": "signals",
  "ref": "CROR 432",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Slow to Limited",
  "body": "Proceed, SLOW speed passing signal and through turnouts, approaching next signal at LIMITED speed.",
  "tags": [
   "signals",
   "slow"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf",
    "Gf"
   ],
   "type": "mast"
  },
  "detail": "Red over FLASHING yellow over FLASHING green, NO plate — Slow to Limited. (Add a DV plate and it becomes Diverging to Limited, 432A.)"
 },
 {
  "id": "sig-433",
  "domain": "signals",
  "ref": "CROR 433",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Slow to Medium",
  "body": "Proceed, SLOW speed passing signal and through turnouts, approaching next signal at MEDIUM speed.",
  "tags": [
   "signals",
   "slow"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf",
    "G"
   ],
   "type": "mast"
  },
  "detail": "Red over FLASHING yellow over steady green — Slow to Medium: SLOW through the turnouts, prepared for MEDIUM at the next signal."
 },
 {
  "id": "sig-434",
  "domain": "signals",
  "ref": "CROR 434",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Slow to Slow",
  "body": "Proceed, SLOW speed passing signal and through turnouts, approaching next signal at SLOW speed.",
  "tags": [
   "signals",
   "slow"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf",
    "Yf"
   ],
   "type": "mast"
  },
  "detail": "Red over FLASHING yellow over FLASHING yellow, NO plate — Slow to Slow. (Same lamps as Diverging to Diverging (434A); the DV plate is the only difference.)"
 },
 {
  "id": "sig-435",
  "domain": "signals",
  "ref": "CROR 435",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Slow to Stop",
  "body": "Proceed, SLOW speed passing signal and through turnouts, preparing to stop at next signal.",
  "tags": [
   "signals",
   "slow"
  ],
  "aspect": {
   "heads": [
    "R",
    "Yf"
   ],
   "type": "dwarf"
  },
  "detail": "Red over FLASHING yellow, NO plate — Slow to Stop. (Add a DV plate and it becomes Diverging to Stop, 429.) Also seen as a single flashing yellow."
 },
 {
  "id": "sig-436",
  "domain": "signals",
  "ref": "CROR 436",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Restricting",
  "body": "Proceed at RESTRICTED speed.",
  "tags": [
   "signals",
   "special"
  ],
  "aspect": {
   "heads": [
    "R",
    "R"
   ],
   "type": "mast",
   "stagger": true,
   "plaque": "R"
  },
  "detail": "Two staggered reds WITH an R plate — Restricting: proceed at RESTRICTED speed. The R plate is the ONLY difference from Stop and Proceed (437). Also appears as red/red/yellow on a 3-head, or a single steady yellow on a dwarf."
 },
 {
  "id": "sig-437",
  "domain": "signals",
  "ref": "CROR 437",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Stop and Proceed",
  "body": "Stop, then proceed at RESTRICTED speed.",
  "tags": [
   "signals",
   "special"
  ],
  "aspect": {
   "heads": [
    "R",
    "R"
   ],
   "type": "mast",
   "stagger": true
  },
  "detail": "Two reds, STAGGERED, NO plate — the mark of a non-controlled (automatic) signal: stop, then proceed at restricted speed. (Those same two staggered reds WITH an R plate read as Restricting, 436.)"
 },
 {
  "id": "sig-438",
  "domain": "signals",
  "ref": "CROR 438",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Take or Leave Siding or Other Track",
  "body": "Indications will be specified in special instructions for each specific application of this signal.",
  "tags": [
   "signals",
   "special"
  ],
  "aspect": {
   "heads": [
    "R",
    "Rf"
   ],
   "type": "mast"
  },
  "detail": "Red over a FLASHING red — Take or Leave Siding or Other Track (indications per special instructions). Also drawn 3-head red/red/flashing-red, or a single flashing red on a dwarf."
 },
 {
  "id": "sig-439",
  "domain": "signals",
  "ref": "CROR 439",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Stop",
  "body": "Stop.",
  "tags": [
   "signals",
   "special"
  ],
  "aspect": {
   "heads": [
    "R"
   ],
   "type": "mast"
  },
  "detail": "A SINGLE red on a controlled signal (one the RTC holds at Stop) — absolute Stop, no proceeding. Also drawn as two or three reds on a multi-head mast."
 },
 {
  "id": "sig-440",
  "domain": "signals",
  "ref": "CROR 440",
  "source": "Canadian Rail Operating Rules — Jan 28, 2025",
  "trust": "rulebook",
  "title": "Direction Indicator",
  "body": "Flashing arrow indicators used in conjunction with block signals; when illuminated, identify that the route at the next controlled location is displaying a permissive signal and the route is lined and secured as indicated by the direction of the arrow.",
  "tags": [
   "signals",
   "special"
  ],
  "detail": "No standard aspect drawing in the source references used."
 }
];
