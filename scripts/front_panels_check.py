"""Do the panels on Home and the trading-desk page equal their data? (CR-31, item 41). Stdlib only.

Run: python scripts/front_panels_check.py

Recomputes, from the data and not from the generator's code, every number the panels show, and compares each with the
built page:

  * every sidebar count (all five rows, on every built page, in docs/front-page and at the repo root): from
    data/registry.json and data/desk.json (unlisted rows dropped) and the statuses and groups in
    scripts/front_page.config.json;
  * every segment of Home's stacked bar (its flex-grow), every legend number, the total in its title;
  * every Home figure tile: from data/evidence.json and data/guards.json (the rule scripts/front_check.py home_figures reads);
  * the trading-desk path tiles (label tiles and buttons), the bar's segments, its legend and its "parts in all":
    from the tier page's own tours (cards per <section class="tour"> and the diagram's nodes), and, when the desk's
    network map is on this machine, from that map's tours as well.

It prints one line per comparison and ends with the number of mismatches. Exit 0 = 0 mismatches. 1 = at least one.
2 = could not look (an input is missing); not a pass.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GRAPH = Path("C:/projects/trading/desk-network-map/data/graph-runtime.json")

lines, bad = [], []


def read(rel):
    p = REPO / rel
    if not p.is_file():
        print("UNKNOWN  missing input: %s" % rel)
        sys.exit(2)
    return p.read_text(encoding="utf-8").replace("\r\n", "\n")


def jread(rel):
    return json.loads(read(rel))


def cmp(what, got, want):
    ok = got == want
    lines.append("%s  %-62s page=%s data=%s" % ("ok      " if ok else "MISMATCH", what, got, want))
    if not ok:
        bad.append(what)


# -- the data -----------------------------------------------------------------------------------------------

cfg = jread("scripts/front_page.config.json")
registry = jread("data/registry.json")
desk = jread("data/desk.json")
rows = [p for p in registry["projects"] + (desk.get("extra") or []) if p.get("unlisted") is not True]
ix = cfg["home"]["index"]
keep = [p for p in rows if p["status"] in ix["statuses"]]
groups = {g["id"]: g for g in ix["groups"]}


def group_count(gid):
    return sum(1 for p in keep if p["category"] in groups[gid]["cats"])


def want_nav(spec):
    src = spec["source"]
    if src == "index_all":
        n = len(keep)
    elif src == "rows_all":
        n = len(rows)
    else:
        n = group_count(src.split(":", 1)[1])
    return spec["label"].format(n="{:,}".format(n))


# -- sidebar counts, every page, both trees -----------------------------------------------------------------

NAV_ITEM = re.compile(r'<li><a href="[^"]*"[^>]*><span class="fp-ico"[^>]*>.*?</span><span class="fp-nav-t"><span class="fp-nav-n">(.*?)</span>(?:<small class="fp-nav-c">(.*?)</small>)?</span></a></li>', re.S)
SCREEN_OUT = {s["id"]: s["out"] for s in cfg["screens"]}
trees = {"docs/front-page/": "docs/front-page/", "root/": ""}
want_by_title = {s["title"]: want_nav(s["count"]) for s in cfg["screens"] if s.get("count")}
for label, prefix in trees.items():
    for sid, out in SCREEN_OUT.items():
        html = read(prefix + out)
        items = {t: c for t, c in NAV_ITEM.findall(html)}
        for title, want in want_by_title.items():
            cmp("sidebar %-13s %-14s %s" % (label, sid, title), items.get(title), want)

# -- Home: bar, legend, figure tiles ------------------------------------------------------------------------

want_groups = [(g["h2"], g.get("seg"), group_count(g["id"])) for g in ix["groups"] if group_count(g["id"])]
ev = jread("data/evidence.json")
want_figs = [ev["commitActivity"]["commits"], ev["commitActivity"]["repos"], ev["totals"]["ownTestFiles"]]
dsk = next((s for s in ev["sources"] if s["id"] == "trading-desk"), {})
if dsk.get("suite", {}).get("method") == "executed":
    want_figs.append(dsk["suite"]["passed"])
gj = jread("data/guards.json")
n = (gj.get("counts") or {}).get("published")
if isinstance(n, int) and isinstance(gj.get("guards"), list) and len(gj["guards"]) == n and str(gj.get("generated", ""))[:10] == str(ev.get("generated", ""))[:10]:
    want_figs.append(n)

for label, prefix in trees.items():
    html = read(prefix + "index.html")
    kinds = re.search(r'<section class="fp-kinds" .*?</section>', html, re.S)
    if not kinds:
        cmp("home %s stacked bar present" % label, None, "present")
        continue
    k = kinds.group(0)
    segs = [(c, int(g)) for c, g in re.findall(r'<i class="fp-seg" data-c="([^"]*)" style="flex-grow:(\d+)"', k)]
    cmp("home %s bar segments (colour, width)" % label, segs, [(s, n) for _, s, n in want_groups])
    leg = [(name, int(num)) for name, num in re.findall(r'aria-hidden="true"></i>(.*?) <b>(\d+)</b>', k)]
    cmp("home %s legend (name, count)" % label, leg, [(h, n) for h, _, n in want_groups])
    title = re.search(r'<p class="fp-kinds-t">(.*?)</p>', k).group(1)
    cmp("home %s bar title total" % label, title, cfg["home"]["bar"]["title"].format(n=sum(n for _, _, n in want_groups)))
    cmp("home %s bar total = sidebar Home count" % label, sum(n for _, n in segs), len(keep))
    figs = [int(v.replace(",", "")) for v in re.findall(r'<div class="fp-fig" role="listitem" data-tile="[^"]*"><b>([\d,]+)</b>', html)]
    cmp("home %s figure tiles" % label, figs, want_figs)
    cmp("home %s figures sit above the index" % label, html.index('class="fp-figs"') < html.index('class="fp-ix"'), True)

# -- trading desk: path tiles, bar, legend ------------------------------------------------------------------

tier = read("docs/tier-2-case/index.html")
tour_ids = re.findall(r'<section class="tour" id="p-([\w-]+)"', tier)
want_paths = []
for tid in tour_ids:
    sec = re.search(r'<section class="tour" id="p-%s"[^>]*>(.*?)</section>' % re.escape(tid), tier, re.S).group(1)
    want_paths.append((tid, len(re.findall(r'<article class="card"', sec))))
distinct = len(re.findall(r'<g class="mnode', tier))
if GRAPH.is_file():
    g = json.loads(GRAPH.read_text(encoding="utf-8"))
    cmp("path data: tier page tours = the desk map's tours", want_paths, [(t["id"], len(t["steps"])) for t in g["tours"]])
else:
    lines.append("note      the desk map is not on this machine; the tier page's tours are the only path data read")

for label, prefix in trees.items():
    html = read(prefix + "work/trading-desk/index.html")
    labels = re.findall(r'<label for="t-([\w-]+)" class="fp-ptile"><span class="fp-pt" data-tile="[^"]*"><span class="fp-pt-k">.*?</span><span class="fp-pt-n">(\d+)</span>', html)
    buttons = re.findall(r'<button type="button" class="fp-ptile" data-tour="([\w-]+)" aria-pressed="false"><span class="fp-pt" data-tile="[^"]*"><span class="fp-pt-k">.*?</span><span class="fp-pt-n">(\d+)</span>', html)
    cmp("trading %s label tiles (path, number)" % label, [(a, int(b)) for a, b in labels], want_paths)
    cmp("trading %s button tiles (path, number)" % label, [(a, int(b)) for a, b in buttons], want_paths)
    bar = re.search(r'<section class="fp-kinds fp-pbar".*?</section>', html, re.S)
    if not bar:
        cmp("trading %s path bar present" % label, None, "present")
        continue
    b = bar.group(0)
    cmp("trading %s bar segments (width)" % label, [int(x) for x in re.findall(r'class="fp-seg" data-c="[^"]*" style="flex-grow:(\d+)"', b)], [n for _, n in want_paths])
    cmp("trading %s legend counts" % label, [int(x) for x in re.findall(r'</i>[^<]* <b>(\d+)</b>', b)], [n for _, n in want_paths])
    m = re.search(r"Parts on each path\. (\d+) parts in all", b)
    cmp("trading %s bar 'parts in all' = diagram nodes" % label, int(m.group(1)) if m else None, distinct)

print("\n".join(lines))
print("\n%d comparisons, %d mismatches" % (len(lines) - sum(1 for x in lines if x.startswith("note")), len(bad)))
sys.exit(1 if bad else 0)
