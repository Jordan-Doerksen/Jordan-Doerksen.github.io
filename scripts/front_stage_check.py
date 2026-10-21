"""Does Home's kind stage equal its data? (CR-32, item 43 chunk 2). Stdlib only.

Run: python scripts/front_stage_check.py

Recomputes, from the data and the files on disk, and NOT from the generator's code (scripts/front_kindstage.py is not
imported, and neither is build_project_sizes.tier_for: the tier rule is written out again below), what Home's
containers must hold, and compares it with the built pages (docs/front-page/index.html and the repo root's index.html):

  * every row Home's index keeps (a registry or desk.json project, not unlisted, with a status in home.index.statuses)
    has exactly one rail row and exactly one panel, in the container of its kind, and nothing else is there;
  * the rail and the panels of a container are in the same order;
  * each panel's tier equals the tier rule (an override with its reason, else could-not-look is small, else
    commits >= large_from is large, < small_below is small, else medium), and its display equals the display rule
    (large = assets/shots/<slug>.png if the file exists, else medium; medium = assets/diagrams/<slug>.svg if it
    exists, else small; small = a facts card), and its content is what the display names (an <svg> with the diagram's
    own viewBox, an <img> of the shot with alt text, a facts card);
  * every rail link resolves (a file or folder in the repo, an atlas entry with a data file, or an absolute URL), and
    the panel's "Open" link is the rail row's link;
  * the wrapper's dwell equals home.stage_v2.dwell_ms and is not below 2200 ms.

It prints one line per comparison and ends with the number of mismatches. Exit 0 = 0 mismatches. 1 = at least one.
2 = could not look (an input is missing); not a pass.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

REPO = Path(__file__).resolve().parent.parent
MIN_DWELL = 2200


class CouldNotLook(Exception):
    pass


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").replace("\r\n", "\n")
    except OSError as err:
        raise CouldNotLook("missing input: %s (%s)" % (path, err)) from err


def _json(path: Path):
    try:
        return json.loads(_read(path))
    except ValueError as err:
        raise CouldNotLook("%s is not valid JSON: %s" % (path, err)) from err


def expected(repo: Path):
    """(groups, rules) from the data: groups = [(group id, [slug...])] in config order, then per-slug tier and display."""
    cfg = _json(repo / "scripts" / "front_page.config.json")
    st = cfg["home"]["stage_v2"]
    reg = _json(repo / "data" / "registry.json")
    desk = _json(repo / "data" / "desk.json")
    sizes = _json(repo / "data" / "project-sizes.json")["projects"]
    cats = [c["slug"] for c in reg["categories"]]
    rows = [p for p in reg["projects"] + (desk.get("extra") or []) if p.get("unlisted") is not True]
    # The model sorts by category order, then name; the index keeps the listed statuses.
    rows.sort(key=lambda p: (cats.index(p["category"]), p["name"].casefold(), p["name"]))
    ix = cfg["home"]["index"]
    keep = [p for p in rows if p["status"] in ix["statuses"]]
    groups = []
    for g in ix["groups"]:
        slugs = [p["slug"] for p in keep if p["category"] in g["cats"]]
        if slugs:
            groups.append((g["id"], slugs))
    lo, hi = st["tiers"]["small_below"], st["tiers"]["large_from"]
    over = st.get("overrides") or {}
    a = st["assets"]

    def tier(slug):
        if slug in over:
            return over[slug]["tier"]
        e = sizes.get(slug)
        if e is None or e.get("could_not_look"):
            return "small"
        n = e["commits"]
        return "large" if n >= hi else "small" if n < lo else "medium"

    def display(slug, t):
        shot = repo / a["shots_dir"] / ("%s.%s" % (slug, a["shot_ext"]))
        dia = repo / a["diagrams_dir"] / ("%s.svg" % slug)
        if t == "large" and shot.is_file():
            return "shot"
        if t in ("large", "medium") and dia.is_file():
            return "diagram"
        return "facts"

    want = {s: (tier(s), display(s, tier(s))) for _g, ss in groups for s in ss}
    return groups, want, st, a


def _resolves(repo: Path, page: Path, href: str, fallback: Path | None = None) -> bool:
    if re.match(r"^https?://", href):
        return True
    u = urlparse(href)
    if u.path.endswith("/atlas/") or u.path.endswith("atlas/") or u.path.endswith("/atlas"):
        slug = (parse_qs(u.query).get("p") or [""])[0]
        return (repo / "data" / "projects" / ("%s.json" % slug)).is_file()
    target = (page.parent / u.path).resolve()
    if target.is_dir():
        target = target / "index.html"
    if not target.exists() and fallback is not None and repo in target.parents:
        # The selftest's scratch tree holds part of the site; a link out of it is looked up in the real one.
        target = fallback / target.relative_to(repo)
        if target.is_dir():
            target = target / "index.html"
    return target.exists()


SECTION = re.compile(r'<section class="fp-ks" id="fp-ks-([\w-]+)"[^>]*>(.*?)</section>', re.S)
ROW = re.compile(r'<li class="fp-ks-row"><(?:a|span) class="fp-ks-link" data-slug="([\w-]+)"[^>]*?(?: href="([^"]*)")?>', re.S)
PANEL = re.compile(r'<div class="fp-ks-panel" id="fp-ks-p-([\w-]+)" data-slug="([\w-]+)" data-tier="(\w+)" data-display="(\w+)"[^>]*>(.*?)\n      </div>', re.S)


def check_page(repo: Path, page: Path, label: str, lines: list, bad: list, fallback: Path | None = None) -> None:
    groups, want, st, assets = expected(repo)
    html = _read(page)

    def cmp(what, got, exp):
        ok = got == exp
        lines.append("%s  %-70s page=%s data=%s" % ("ok      " if ok else "MISMATCH", "%s %s" % (label, what), got, exp))
        if not ok:
            bad.append("%s %s" % (label, what))

    wrap = re.search(r'<div class="fp-ksx"[^>]*data-dwell="(\d+)"[^>]*data-min-steps="(\d+)"', html)
    cmp("wrapper present", bool(wrap), True)
    if wrap:
        cmp("dwell = home.stage_v2.dwell_ms", int(wrap.group(1)), st["dwell_ms"])
        cmp("dwell is at least %d ms" % MIN_DWELL, int(wrap.group(1)) >= MIN_DWELL, True)
        cmp("min steps = home.stage_v2.step_min_projects", int(wrap.group(2)), st["step_min_projects"])
    sections = SECTION.findall(html)
    cmp("containers (kind ids, in order)", [s[0] for s in sections], [g for g, _ in groups])
    for gid, body in sections:
        slugs = dict(groups).get(gid)
        if slugs is None:
            continue
        rows = ROW.findall(body)
        panels = PANEL.findall(body)
        cmp("%s rail rows (slugs, in order)" % gid, [r[0] for r in rows], slugs)
        cmp("%s panels (slugs, in order)" % gid, [p[1] for p in panels], slugs)
        cmp("%s one rail row per panel id" % gid, [p[0] for p in panels], [p[1] for p in panels])
        cmp("%s steps only when it has %d or more" % (gid, st["step_min_projects"]),
            ("fp-ks-pause" in body), len(slugs) >= st["step_min_projects"])
        by_slug_href = {r[0]: r[1] for r in rows}
        for _pid, slug, tier, disp, inner in panels:
            if slug not in want:
                cmp("%s panel %s is a kept row" % (gid, slug), False, True)
                continue
            wt, wd = want[slug]
            cmp("%s/%s tier" % (gid, slug), tier, wt)
            cmp("%s/%s display" % (gid, slug), disp, wd)
            if disp == "facts":
                cmp("%s/%s holds a facts card" % (gid, slug), "fp-ks-facts" in inner and "<svg" not in inner and "<img" not in inner, True)
            elif disp == "diagram":
                svg = _read(repo / assets["diagrams_dir"] / ("%s.svg" % slug))
                vb = re.search(r'viewBox="([^"]*)"', svg)
                got = re.search(r'<svg class="fp-ks-svg"[^>]*viewBox="([^"]*)"', inner)
                cmp("%s/%s holds the diagram (its own viewBox)" % (gid, slug), got.group(1) if got else None, vb.group(1) if vb else None)
            else:
                m = re.search(r'<img class="fp-ks-shot" src="([^"]*)" alt="([^"]+)"', inner)
                cmp("%s/%s holds the shot with alt text" % (gid, slug),
                    bool(m) and m.group(1).endswith("%s/%s.%s" % (assets["shots_dir"], slug, assets["shot_ext"])), True)
            href = by_slug_href.get(slug)
            opn = re.search(r'<a class="fp-go fp-ks-open" href="([^"]*)"', inner)
            cmp("%s/%s Open link = the rail link" % (gid, slug), opn.group(1) if opn else None, href or None)
            if href:
                cmp("%s/%s rail link resolves" % (gid, slug), _resolves(repo, page, href, fallback), True)
    seen = [s for _g, body in sections for s in [r[0] for r in ROW.findall(body)]]
    cmp("every kept row has exactly one rail row (count)", len(seen), sum(len(s) for _g, s in groups))
    cmp("no rail row twice", len(seen), len(set(seen)))


def run(repo: Path, pages: list) -> tuple:
    """(lines, bad). pages: [(path, label)]. Raises CouldNotLook when an input is missing."""
    lines, bad = [], []
    for path, label in pages:
        check_page(repo, path, label, lines, bad)
    return lines, bad


def main() -> int:
    try:
        lines, bad = run(REPO, [(REPO / "docs/front-page/index.html", "review"), (REPO / "index.html", "root  ")])
    except (CouldNotLook, KeyError) as err:
        print("UNKNOWN  %s: %s" % (type(err).__name__, err))
        return 2
    print("\n".join(lines))
    print("\n%d comparisons, %d mismatches" % (len(lines), len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
