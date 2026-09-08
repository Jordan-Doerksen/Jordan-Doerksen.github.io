# Evidence snapshot — how to run it, and how to read it

The tier-2 page shows real figures. This is the only thing allowed to produce
them. `data/evidence.json` is **generated — never hand-edit it.**

## Run it

```bash
python scripts/build_evidence_snapshot.py
```

Counts test files and commits. Fast — a few seconds. Every configured suite is
recorded as `unavailable` because nothing was executed.

```bash
python scripts/build_evidence_snapshot.py --run
```

Also **executes** the suites configured in `scripts/evidence_sources.json` and
records what they actually reported. Slow — the desk suite alone takes about 70
seconds. **Run this before publishing a figure that claims a suite is green.**

```bash
python scripts/build_evidence_snapshot.py --check
```

Exits 0 if the snapshot exists and parses, 1 otherwise. For CI or a pre-publish
check.

Nothing here runs on a timer. You run it. (Standing rule: no background
schedulers on this machine.)

## Reading the output

Every figure carries a **`method`**, and the method is the point:

| method | means |
|---|---|
| `executed` | A suite actually ran and this is its reported result. The strongest claim. |
| `counted` | Files or commits were counted. Real, but it is not proof anything passes. |
| `unavailable` | **We could not look.** Never treat this as zero. |

Two more flags to respect:

- **`suspect: true`** on a test count — the count came back 0 *and* patterns
  were configured. That means either the repo has no tests **or the patterns
  are wrong**, and a count cannot tell those apart. Fix the patterns before
  publishing. `totals.suspectZeros` lists them.
- **`own: false`** — measured but excluded from every total. Warden's 1,345 test
  files came with the upstream Odysseus fork and are not Jordan's to claim
  (D-A18). They stay in the file so the exclusion is visible rather than silent.

## Adding a source

Edit `scripts/evidence_sources.json` — never the script, and never the output.
Give it `id`, `label`, `path` (relative to `projectsRoot`), `own`, and
`testPatterns`. Add a `suite` block only if you want it executed.

**Check the patterns against the repo's real filenames.** This is the one trap
here: `map-reading-trainer` first reported 0 because the config listed
`*.test.js` and the repo uses `*.test.ts`. The suspect flag now catches that
class of error, but it catches it *after* the fact.

## Logs

`scripts/logs/evidence-<timestamp>.log`, one per run, console and file.

The log deliberately records **what did not happen** — a skipped suite, a source
that was not found, a pattern that matched nothing — because a silent failure is
a defect. If a figure on the site looks wrong, read the log for that run first.

## Errors → fix

| What you see | Cause | Fix |
|---|---|---|
| `0 test files matched ... SUSPECT` | patterns wrong for that repo | check real filenames, fix `testPatterns` |
| `NOT FOUND at ... recorded unavailable` | repo moved or missing | fix `path`, or drop the source |
| `suite COLLECTED NOTHING (exit 5)` | test selection matched nothing | a renamed test — pytest exit 5 is not a pass |
| `suite TIMED OUT` | suite exceeded 900s | raise `SUITE_TIMEOUT_SEC` or drop the `suite` block |
| `projectsRoot ... does not exist` | config points at the wrong disk | fix `projectsRoot` |
| snapshot has stale numbers | you edited config but did not re-run | re-run, with `--run` if a suite figure is shown |
