# sources/ — local only (gitignored)

The source PDFs live here on the authoring machine and are **never committed**
(`.gitignore` blocks `sources/*.pdf`). They're no-redistribute material; only the
**cited digests** in `content/*.js` are public.

Drop these here to author/verify content:

- `Jan_2025_Canadian_rail_operating_rules_EN.pdf` — the CROR (primary source of truth)
- signal / seminar references as needed

Rule of the project: **never author rule content from memory.** Open the PDF,
quote/cite the rule, set `trust: 'rulebook' | 'S.I.' | 'SME'`. If it can't be
verified, stub it and flag it for an SME / firsthand check — don't guess.
