# Fossil inventory

A generated list of every GitHub Pages site under the `Jordan-Doerksen` account. It is read-only.
The page `index.html` is unlisted (`noindex`). No page links to it.

## Regenerate

```
python docs/fossils/inventory.py
```

It needs Python 3 (standard library only) and the `gh` CLI, signed in. It writes
`inventory.json`, `index.html` and one log line per event to `logs/<date>.jsonl`.
It makes GET requests only. It changes nothing on GitHub.

To check the page without the network: `python docs/fossils/inventory.py --check`.
It compares `index.html` with a fresh render of `inventory.json`.

Exit codes: 0 done. 1 `--check` found a difference. 2 could not look (gh missing or not signed in).

Settings (owner, timeouts, page cap, stale days, owner rulings) are in `config.json`.

## Columns

| Column | Meaning |
|---|---|
| Site | Repository name and Pages URL. `[archived]` or `[private]` shows the repository state. |
| Last commit | Date of the newest commit on the default branch, and its age on the run date. |
| Live | The HTTP status of the Pages URL, fetched once. `live` = 200. `answers N` = another status. `could not look` = the fetch failed. It never means dead. |
| Inbound links | Pages on this account's `github.io` sites that link to this site. Each site's own HTML is read one level deep (the root page and the same-site pages it links to, up to `max_pages_per_site`). Links to the same site do not count. |
| Outbound links | Unique links from the site's read pages to anything else, and how many answer 4xx or 5xx (dead). Links that could not be fetched are counted as `could not look`, not as dead. |
| Proposed ruling | `keep`, `unlist` (noindex and off every index, like after-hours) or `archive` (archive the repository), with one reason. Two rows are the owner's rulings of 2026-10-20. The other rows follow the rule in `propose()`. |
| His ruling | Empty. The owner fills it. |

Limit: only static HTML is read. A link added by JavaScript is not seen, so "0 inbound" is not proof that nothing links to a site.

## When something goes wrong

| Symptom | Meaning | Fix |
|---|---|---|
| `could not look: gh is not on PATH` or `gh: To get started with GitHub CLI, please run: gh auth login`, exit 2 | `gh` is missing or not signed in. | Install `gh`, or run `gh auth login`, then run the command again. |
| Log line `rate_limit`, or `pages_unknown` with "rate limit" | GitHub refused calls for now. Those repositories are missing from the list. | Wait for the reset (`gh api rate_limit`), then run again. Do not trust the site count from that run. |
| `live` shows `could not look` for a site | The fetch timed out or failed (DNS, TLS). It does not mean the site is dead. | Run again. If it repeats, raise `fetch_timeout_s` in `config.json`, then open the URL by hand. |
| `--check` fails | `index.html` was edited by hand, or `inventory.json` changed. | Run the full command again. |
