# Front page checks

Two checkers guard the front page (D-A27). Neither changes a file.

| Command | What it does | Needs |
|---|---|---|
| `python scripts/front_check.py` | Static checks: 20 rules read from the files | Python 3 only |
| `python scripts/front_check.py --selftest` | Breaks 23 rules one at a time in a scratch copy; each check must fail | Python 3 only |
| `node scripts/front_probe.mjs` | Browser checks at 7 widths, 2 themes, keyboard, no script, reduced motion | Node, Playwright |
| `node scripts/front_probe.mjs --selftest` | Runs each check on a broken fixture; each must be caught | Node, Playwright |

Run the selftests after you change a check. A check that has never failed proves nothing.

Exit codes for both: `0` every check passed. `1` at least one failed. `2` something could not be looked at
(a missing page, no Playwright). Exit 2 is not a pass.

Useful flags: `front_check.py --require-all` (all five screens must exist), `--only <check>`;
`front_probe.mjs --pages desk/index.html --widths 375,1280 --themes light`.

Playwright is not installed in this repo, and the repo has no `package.json`. The probe loads it from an
existing install named in `scripts/front_probe.config.json` (`playwright_from`). If that path moves, change
the one line.

## What each check protects

| Check | Rule behind it | The failure it stops |
|---|---|---|
| overflow | No element scrolls sideways (WEB-14) | A table in a scroll box on a wide screen |
| gutter | A small margin to every window edge | Text flush to an edge |
| chrome | Three persistent clusters at most; fixed or sticky only inside one | A fourth bar that covers the content |
| contrast / edge | Text 4.5:1, control edge 3:1, measured from computed colours | A grey that looks fine and fails |
| markers | A status is a shape and a word | Colour as the only channel |
| skiplink / focus | Skip link first; a visible focus ring on every stop | A keyboard user who cannot see where they are |
| escape | Escape closes the menu and the filter list | A popover that traps the user |
| console | No script error, no failed request | A silent 404 on a stylesheet |
| motion | No loop still running under reduced motion | An animation the user turned off |
| deadcontrol / nocontent / hiddentext | With no script the page is complete and shows no dead control | A blank page when a script returns 404 |
| (static) fresh_build | The pages equal a fresh build | A hand-edited generated page |
| (static) no_raw_values | Tokens only; no pill; no sideways rule | A colour typed into a part |
| (static) selectors_scoped | Every selector holds an `fp-` class | The `.row` bug: a local class restyling a system class |
| (static) home_figures / desk_rows | Numbers equal the data | A typed number that went stale |
| (static) no_local_data | No local port or path on a page | A private path published |
| (static) local_data_gated | `data/desk-local.js` is generated, and only `desk.js` loads it, inside `isLocal()` | The owner's ports and paths reaching the public page |

## When something breaks

Logs: `scripts/logs/front-page-YYYYMMDD.jsonl` (static) and `scripts/logs/front-probe-YYYYMMDD.jsonl`
(browser). One JSON line each, with `ts level severity_number run_id event ctx`. The path is printed as
the first line of every run. A run with no `run_end` line was killed.

| You see | It means | Fix |
|---|---|---|
| `UNKNOWN Playwright did not load` | `playwright_from` points at a folder that is gone | Edit `scripts/front_probe.config.json` |
| `UNKNOWN no pages found` | The pages are not built | `python scripts/build_front_page.py` |
| `UNKNOWN the unbroken copy does not pass ...` (static selftest) | The real tree is already failing | Run `front_check.py` and fix that first |
| `FAIL fresh_build` | A generated page differs from a build | Rebuild; never hand-edit a generated page |
| `FAIL no_raw_values` | A colour, pill or sideways rule outside the token file | Move the value to `front.tokens.css` |
| `FAIL contrast` with a ratio | A text colour is too faint on its ground | Change the token, then re-measure every ground |
| `FAIL gutter` | Content within 8px of an edge | Add padding on the inner element, not margin on the page |
| `MISSED <check>` in a selftest | A check no longer catches its fixture | Someone weakened the check. Restore it. Do not edit the fixture. |
| `FAIL deadcontrol` | A control that needs a script is visible without one | Add the `hidden` attribute in the generator |
