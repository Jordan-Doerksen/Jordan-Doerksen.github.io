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

Settings (owner, timeouts, page cap, owner rulings, and the ruling rule with its thresholds and reason texts) are in `config.json`.

## Columns

| Column | Meaning |
|---|---|
| Site | Repository name and Pages URL. `[archived]` or `[private]` shows the repository state. |
| Last commit | Date of the newest commit on the default branch, and its age on the run date. |
| Live | The HTTP status of the Pages URL, fetched once. `live` = 200. `answers N` = another status. `could not look` = the fetch failed. It never means dead. |
| Inbound links | Links to this site from the home site and from the other Pages sites. Three sources: (1) the static crawl: each site's own HTML, one level deep (root page plus the same-site pages it links to, up to `max_pages_per_site`); (2) `data/registry.json` in the site repo: a row whose `url` or `repo` points at the Pages site or its repo counts as one link, named by the row; (3) `data/desk.json`: a row whose slug equals the repo name counts as one link, marked "slug match" (a name match, not a link). The home site builds its project links in the browser from (2) and (3), so the crawl cannot see them. "not seen" means a site that builds its links in the browser (scripts, no anchors in its HTML) could not be read, so the count is not known. It is never shown as 0. |
| Outbound links | Unique links from the site's read pages to anything else, and how many answer 4xx or 5xx (dead). Links that could not be fetched are counted as `could not look`, not as dead. |
| Proposed ruling | `keep`, `unlist` (noindex and off every index, like after-hours) or `archive` (archive the repository), with one reason that names the branch of the rule and its numbers. See the rule below. |
| His ruling | The owner's word for the row, read from `rulings.json` (keys are repo names). Empty when he has not ruled. A regeneration keeps it. |

## The ruling rule

The rule, its threshold (`archive_after_days`, default 60), the named picks and the reason texts are in `config.json` under `rule` and `overrides`. The first branch that matches wins.

1. Owner ruling (`overrides`): sentinel-field-manual = unlist. it-toolkit = keep public, off every index.
2. The home site itself = keep.
3. A named pick (`rule.named_picks`) = keep. The picks are design-first and fulfillment-architecture-guide. The method page is a path on the home site, and the trading desk has no Pages repo, so neither is a row.
4. Linked from the home site (registry, desk or static crawl) = keep.
5. Not linked from the home site, last commit within `archive_after_days` = unlist.
6. Not linked from the home site, last commit older than `archive_after_days` = archive.
7. Not linked and the commit date unknown = unlist.

Limit: only static HTML is read, plus the two home data files. A link added by JavaScript on another site is not seen.

## When something goes wrong

| Symptom | Meaning | Fix |
|---|---|---|
| `could not look: gh is not on PATH` or `gh: To get started with GitHub CLI, please run: gh auth login`, exit 2 | `gh` is missing or not signed in. | Install `gh`, or run `gh auth login`, then run the command again. |
| Log line `rate_limit`, or `pages_unknown` with "rate limit" | GitHub refused calls for now. Those repositories are missing from the list. | Wait for the reset (`gh api rate_limit`), then run again. Do not trust the site count from that run. |
| `live` shows `could not look` for a site | The fetch timed out or failed (DNS, TLS). It does not mean the site is dead. | Run again. If it repeats, raise `fetch_timeout_s` in `config.json`, then open the URL by hand. |
| `--check` fails | `index.html` was edited by hand, or `inventory.json` changed. | Run the full command again. |
