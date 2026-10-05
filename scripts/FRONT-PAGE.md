# Front page generator

Writes the five screens of the front page (Home, Trading desk, Rail software, Games, Tool Desk) from one
config and from data the site already has. Decision record: `DECISIONS.md` D-A27 (CR-21). The contract
between the parts: `docs/front-page-design/ARCHITECTURE.md`. Python standard library only.

## Run it

```
python scripts/build_front_page.py                 # review build: writes docs/front-page/
python scripts/build_front_page.py --check         # builds in memory, compares with disk, writes nothing
python scripts/build_front_page.py --only desk     # compares or writes one screen (the nav still comes from all)
python scripts/build_front_page.py --root          # promotion: writes the repo root. The owner's go only.
```

Only files that changed are written. A second run writes nothing. `--check` exits 1 if any file differs.

`--root` replaces the live `index.html` and `desk/index.html`. It refuses until `docs/legacy-three-tier.html`
and `docs/legacy-desk.html` exist and are byte-for-byte copies of the live pages. It never overwrites a file
this build did not write unless that copy exists.

Trading desk and Games are carried from the tier pages by `scripts/front_carry.py`. Until that module exists
(or while it raises `NotImplementedError`) the run logs `screen_skipped`, writes no page for the screen, and
leaves it out of the nav and out of the Home doors. A missing page is true. A stub page is not.

## What each file does

| File | Does |
|---|---|
| `scripts/build_front_page.py` | Orchestrator: loads config and data, builds every screen, writes or compares, sets the exit code. |
| `scripts/front_page.config.json` | Screens, nav groups, brand, UI strings, every sentence that is not computed. |
| `scripts/front_screens.py` | The data model (rows, facets, pins, overlay) and the bodies of Home, Rail software and the Tool Desk. |
| `scripts/front_shell.py` | The page wrapper and the shell block (sidebar, bar), written once. Escaping helpers. |
| `scripts/front_figures.py` | Figures from `data/evidence.json`, read the way `site_compose.figures()` reads them. `read_json()`. |
| `scripts/front_icons.json` | Lucide icon geometry (ISC licence), inlined into the pages. |
| `scripts/front_log.py` | JSON-line logger, crash trap, run id, exit-code constants. Shared with the carry step and the checks. |
| `js/front/shell.js` | Theme toggle, menu, `/` shortcut, unhides what needs a script. |
| `js/front/desk.js` | Facets, filtering, the toolkit rows, copy-install. |
| `docs/front-page/**` | Generated. Never edit by hand. |

Styles are `styles/front/` (not this tool's). The carry step is `scripts/front_carry.py` (not this tool's).

## Data it reads

| File | Used for |
|---|---|
| `data/evidence.json` | The Home figures and the date in the stamp and the sidebar. A figure that is missing is left off. |
| `data/registry.json` | One row per project, the Section facet, the Rail index, the routing of every name. |
| `data/desk.json` | `pinned`, `extra` (rows with no registry entry), `toolkit` (stars, install commands, snippets). |
| `data/toolkit.js` | Counted at build for the sentences ("160 tools"); loaded by the Tool Desk page and rendered by `desk.js`. |

The notes, ports and local paths in `desk.json` are not written to the page. `desk.show_local` is `false`; the
flag exists and the code that would show them does not.

## Change something

| You want | Edit |
|---|---|
| A sentence on Home, Rail or the Tool Desk | `front_page.config.json` (`home`, `rail`, `desk`) |
| A nav label, a group, a screen's title or description | `front_page.config.json` (`nav.groups`, `screens[]`) |
| A colour, size, radius, shadow, duration | `styles/front/front.tokens.css` only |
| A pinned tool | `data/desk.json` `pinned` (a slug) |
| A toolkit star or install command | `data/desk.json` `toolkit` (keyed by the exact tool name) |
| A project row | `data/registry.json` |
| The toolkit repo link in the no-script sentence | add `"repo": "https://..."` to the `it-toolkit` entry in `data/desk.json` `extra` |
| A new status | `desk.status_order`, then a marker rule in `styles/front/front.parts.css` |
| A new built screen | add it to `screens[]` with `"kind": "built"`, write its function in `front_screens.py`, add it to `BUILDERS` |
| A new carried screen | add it to `screens[]` with `"kind": "carried"`; `front_carry.py` has to know the id |

Config text may use `{projects}`, `{tools}`, `{asof}`, `{since}` and `{n}`, and `**bold**`. A placeholder the
build cannot fill stops the build (exit 2). Numbers are never typed.

## How links are written

Every page has two prefixes. `base` goes from the page to the output folder: nav, brand, Home doors and the
search form use it. `root` goes from the page to the repo root: `styles/`, `js/`, `data/`, `atlas/` and the
hubs use it. In a `--root` build they are equal. In the review build `root` is `base` plus `../../`, so the
review pages link to each other and still reach `/atlas/`.

In the review build a link to a screen ends in `index.html`, so the pages also navigate when opened from disk.
A `--root` build uses clean URLs. The review build adds `noindex` to every page. In a `--root` build only
screens with `"robots"` in the config get it (the Tool Desk keeps the `noindex` the old desk had).

Because the prefixes depend on depth, the nav block is byte-identical only between pages of the same depth.
Compare resolved URLs, not strings.

## The carry step (`scripts/front_carry.py`)

`carry(screen_id, ctx)` returns `{"body": html, "css": [repo-relative paths], "scripts": [repo-relative paths]}`.
`ctx` holds `root`, `base`, `repo` (a Path), `log` (a bound logger), `mode` (`"review"` or `"root"`), `write`
(`False` during `--check`: do not write files then) and `screen` (the config entry). The bound logger can log,
but `finish()` on it does nothing: only the build ends the run. A raised `NotImplementedError` skips the screen.
Any other exception is logged as `screen_failed`, the build writes nothing and exits 1.

## When something breaks

**Where the logs are.** `scripts/logs/front-page-YYYYMMDD.jsonl`, one file per day, shared by this tool, the
carry step and the checks (the folder is gitignored). The path is the first line every run prints. One JSON
object per line, five keys: `ts`, `level` with `severity_number`, `run_id`, `event`, `ctx`. The tool name is in
`ctx.tool`. One process is one `run_id`. `severity_number >= 17` is an error.

**Triage, cheapest first.**
1. The last console lines: the summary (`build review: 3 page(s) written, ...`) and the exit code.
2. The errors in the log: `Select-String -Path scripts\logs\front-page-*.jsonl -Pattern '"severity_number": (1[7-9]|2[0-4])'`
3. `python scripts/build_front_page.py --check`: which pages differ from a fresh build, and the first line that differs.
4. The page itself. Every page names its generator in the comment under the doctype.

**A run with no `run_end` line was killed.** A hard fault (a segfault) also leaves plain-text lines from
`faulthandler` in the same file. They are not JSON; skip them when parsing.

| What you see | What it means | Fix |
|---|---|---|
| `could_not_look  missing input: ...evidence.json` | An input file is not there. Exit 2. | Restore it, or run `python scripts/build_evidence_snapshot.py`. |
| `could_not_look  cannot read ...: Expecting ...` | An input is not valid JSON. The message names the file and the position. | Fix the JSON. |
| `could_not_look  ...toolkit.js: read N names for M entries` | `data/toolkit.js` changed shape and `read_toolkit()` no longer reads it. | Restore the mirror from `tools/it-toolkit`, or update the two patterns at the top of `front_screens.py`. |
| `could_not_look  front_page.config.json: ...` | The config is missing a section or a screen key. | Add the key it names. |
| `could_not_look  config text ... has a placeholder this build cannot fill` | A `{name}` in the config has no value. | Use `{projects}`, `{tools}`, `{asof}`, `{since}` or `{n}` where each is allowed. |
| `could_not_look  --only X: not a screen id` | Typo in the id. | Use one of the ids it lists. |
| `refused  project 'x' has status 'y'` | The registry has a status the page has no marker for. Exit 1, nothing written. | Add it to `desk.status_order` and draw its marker in `front.parts.css`. |
| `refused  project 'x' has category 'y'` | The project's category is not in `registry.json` `categories`. | Fix the project or add the category. |
| `refused  promotion: copy index.html to docs/legacy-three-tier.html first` | `--root` would replace a live page that is not yet kept. | Copy the live page to the path named, then run `--root` again. |
| `screen_skipped` | `front_carry.py` does not exist, or raised `NotImplementedError`. | Write the carry step. Until then the screen has no page and is not in the nav. |
| `screen_failed` | The carry step raised. The traceback is in the log. Exit 1, nothing written. | Fix the carry step. |
| `door_link_omitted` | A Home door points at a screen that is not part of this build. | Build that screen. |
| `asset_missing` | A page links a CSS or JS file that is not in the repo yet. The build goes on. | Write the file (`styles/front/` or `js/front/`). |
| `figure_unavailable` | `evidence.json` lacks that figure, so the page leaves it off. | Rebuild the snapshot. The desk-suite figure needs `--run`: `python scripts/build_evidence_snapshot.py --run`. |
| `atlas_entry_missing` | A project is tier `full` but `data/projects/<slug>.json` does not exist, so its name would open an empty atlas page. The row falls back to its url, then its repo, then no link. | Write the entry, or set the tier to `entry`. |
| `overlay_unmatched` | A `desk.json` `toolkit` key matches no tool name in `toolkit.js`. | Fix the name; it is matched exactly. |
| `pin_unresolved` or `pin_no_destination` | A pinned slug is not a project, or the project has nowhere to link. | Fix `desk.json` `pinned`. |
| `link_omitted  it-toolkit repository` | No repo URL for it-toolkit in the registry or in `desk.json` `extra`. The sentence stays; the link does not. | Add a `repo` to the `extra` entry. |
| `extra_blurb_missing` | A `desk.json` `extra` row has no description in `desk.extra_blurbs`. | Add one. |
| `stale_page_on_disk` | A screen was skipped this run but an older page is on disk. Not deleted. | Delete it by hand if it is stale. |
| `check_differs` (exit 1) | A page on disk is not what a fresh build writes. | Run without `--check` to rewrite it, or put back the hand edit's source in the config. |
| `crash` (FATAL, exit 2) | A bug. The traceback is in the log. | Send the log file named on the first line of the run. |
| `cannot write the log` | `scripts/logs/` is not writable. The build does not run without a log. | Fix the folder's permissions. |
| A page loads with no styles | A stylesheet it links does not exist (`asset_missing`). | See above. |
| The toolkit panel says the list did not load | `data/toolkit.js` failed to load on that page (wrong path or a blocked file). | Check the page's network tab for `toolkit.js`. |
| Copy button says "Selected. Press Ctrl+C." | The browser refused the clipboard write (no permission, or an insecure origin). The command is selected. | Press Ctrl+C. Nothing is broken. |

**Known silent spots.**
- `--check` writes nothing to the site, but it does append to the log.
- The inline theme script in `<head>` and `shell.js` ignore a storage error on purpose: with storage blocked the
  theme lasts for the page. Nothing is logged because a browser has no log to write to.
- `desk.js` reports to the console only if the toolkit rows cannot be built. A tool that is in `toolkit.js` but
  has a bad URL is shown as text without a link.
- Whether the page looks right is not checked here. `scripts/front_check.py` and the browser probe check that.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Built; or `--check` found every file identical. |
| 1 | `--check` found a difference, a carried screen failed, or the content broke a rule (`refused`). |
| 2 | Could not look: an input is missing or invalid, the log cannot be written, or the tool crashed. Never a pass. |
