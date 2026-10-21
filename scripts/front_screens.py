"""Screen bodies for Home, Rail software and the Tool Desk (docs/front-page-design/ARCHITECTURE.md).

The data model is built here too (load_model). The project rows are read once from data/registry.json
and data/desk.json, and every count on every page comes off those same rows, so the number in the
search placeholder, the line on Home and the Tool Desk lede cannot disagree with the table. No count
is typed anywhere.

Rules this file keeps:
  * A name links by the site's routing rule (ARCHITECTURE.md, Routing): a full-tier project goes to
    {root}atlas/?p=<slug>; an entry-tier project goes to its url, else its repo, else it is not a link.
  * desk.json's `mine` notes, ports and local paths are not written to the page (config desk.show_local
    is false; the flag exists, the code that would show them does not).
  * Absent is not zero: a figure that is missing is left off, and a link whose target is not part of
    this build is left off. Nothing is replaced by a stub.
  * Every string is escaped. Config copy may use **bold** and nothing else.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

from front_figures import figures, read_json
from front_log import CouldNotLook, Refused
from front_shell import Page, esc_attr, esc_text, fill, rich

_TOOL = re.compile(r'\{\s*cat:\s*"[^"]*"\s*,\s*name:\s*"((?:[^"\\]|\\.)*)"')
_CAT = re.compile(r'\{\s*id:\s*"[^"]*"\s*,\s*title:\s*"((?:[^"\\]|\\.)*)"')
_SCHEME = re.compile(r"^[a-z][a-z0-9+.-]*:", re.I)


# -- the data model ---------------------------------------------------------------------------------


@dataclass
class Row:
    slug: str
    name: str
    category: str
    section: str
    status: str
    blurb: str
    dest: tuple | None      # ("atlas", slug) | ("root", "games/x/") | ("abs", url) | None
    q: str                  # lower-case search text: name, section, status, blurb, tags
    unlisted: bool = False  # registry "unlisted": true; load_model drops such a row from every index (Home and Tool Desk)


@dataclass
class Model:
    rows: list
    sections: list          # [(slug, name, count)] in registry order
    statuses: list          # [(status, count)] in config order
    pinned: list            # [(name, dest)]
    figs: dict
    n_tools: int | None     # None when desk.toolkit_panel is false: no toolkit is read, so no count exists
    overlay: dict           # tool name -> {star, install, snippet}
    kit_repo: str | None

    @property
    def counts(self) -> dict:
        counts = {"projects": len(self.rows)}
        if self.n_tools is not None:
            counts["tools"] = self.n_tools  # absent, not zero, when the page has no toolkit (SAFE-04)
        return counts


def _dest(project: dict, atlas_dir: Path, log):
    """The routing rule. Returns None when a row has nowhere honest to go."""
    slug = project.get("slug")
    if project.get("tier") == "full" and slug:
        if (atlas_dir / ("%s.json" % slug)).is_file():
            return ("atlas", slug)
        # The write-up is missing, so /atlas/?p=<slug> would open an empty page. Fall through to url, repo, none.
        log.warn("atlas_entry_missing", slug=slug, reason="tier is 'full' but data/projects/%s.json does not exist" % slug)
    for key in ("url", "repo"):
        value = project.get(key)
        if not isinstance(value, str) or not value.strip():
            continue
        value = value.strip()
        if re.match(r"^https?://", value, re.I):
            return ("abs", value)
        if _SCHEME.match(value):
            continue                    # javascript:, data: and the like are never linked
        return ("root", value.lstrip("/"))
    return None


def resolve(dest, root: str):
    if dest is None:
        return None
    kind, value = dest
    if kind == "atlas":
        return "%satlas/?p=%s" % (root, quote(value, safe=""))
    if kind == "root":
        return root + value
    return value


def read_toolkit(path: Path):
    """(tool names, category titles) from data/toolkit.js, without running it.

    The file is a JavaScript object literal, so it is read with two patterns and cross-checked: the
    number of `{ cat:` entries must equal the number of names found, or the build stops (exit 2)
    rather than print a wrong count.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as err:
        raise CouldNotLook("cannot read %s: %s" % (path, err)) from err
    try:
        names = [json.loads('"%s"' % m.group(1)) for m in _TOOL.finditer(text)]
        titles = [json.loads('"%s"' % m.group(1)) for m in _CAT.finditer(text)]
    except ValueError as err:
        raise CouldNotLook("%s has a name this build cannot read: %s" % (path, err)) from err
    entries = len(re.findall(r"\{\s*cat:", text))
    if not names or len(names) != entries or not titles:
        raise CouldNotLook(
            "%s: read %d names for %d entries and %d categories; the pattern no longer fits the file"
            % (path, len(names), entries, len(titles))
        )
    return names, titles


def _clean_overlay(raw, tool_names: list, log) -> dict:
    """desk.json `toolkit` reduced to the three fields the page uses, each checked."""
    known = set(tool_names)
    out = {}
    for name, entry in (raw or {}).items():
        if name not in known:
            log.warn("overlay_unmatched", tool=name, reason="no tool of that name in data/toolkit.js")
            continue
        if not isinstance(entry, dict):
            log.warn("overlay_bad_entry", tool=name, reason="not an object")
            continue
        item = {}
        if entry.get("star") is True:
            item["star"] = True
        for key in ("install", "snippet"):
            value = entry.get(key)
            if isinstance(value, str) and value.strip():
                item[key] = value
            elif value is not None:
                log.warn("overlay_bad_field", tool=name, field=key, reason="not a non-empty string")
        out[name] = item
    return out


def _row(project: dict, blurb: str, dest, names: dict, order: dict, status_order: list) -> Row:
    for key in ("slug", "name", "category", "status"):
        if not isinstance(project.get(key), str) or not project[key]:
            raise CouldNotLook("a project has no usable %r: %r" % (key, project))
    if project["category"] not in order:
        raise Refused("project %r has category %r, which is not in data/registry.json categories[]" % (project["slug"], project["category"]))
    if project["status"] not in status_order:
        raise Refused(
            "project %r has status %r: add it to desk.status_order in scripts/front_page.config.json "
            "and give it a marker rule in styles/front/front.parts.css" % (project["slug"], project["status"])
        )
    tags = [t for t in (project.get("tags") or []) if isinstance(t, str)]
    section = names[project["category"]]
    search = " ".join([project["name"], section, project["status"], blurb] + tags).lower()
    return Row(project["slug"], project["name"], project["category"], section, project["status"], blurb, dest, search, project.get("unlisted") is True)


def load_model(repo: Path, cfg: dict, log) -> Model:
    data = repo / "data"
    registry = read_json(data / "registry.json")
    desk = read_json(data / "desk.json")
    try:
        categories = [(c["slug"], c["name"]) for c in registry["categories"]]
        projects = list(registry["projects"])
    except (KeyError, TypeError) as err:
        raise CouldNotLook("data/registry.json lacks categories[] or projects[]: %r" % (err,)) from err
    # desk.toolkit_panel false (owner's ruling, 2026-10-20): data/toolkit.js is not read and the Tool Desk has no
    # Toolkit panel. The file stays on disk as a mirror.
    toolkit_on = cfg["desk"].get("toolkit_panel", True)
    tool_names = read_toolkit(data / "toolkit.js")[0] if toolkit_on else []
    figs = figures(data / "evidence.json", log, data / "guards.json")

    order = {slug: i for i, (slug, _) in enumerate(categories)}
    names = dict(categories)
    status_order = cfg["desk"]["status_order"]
    atlas_dir = data / "projects"
    rows = [_row(p, p.get("blurb") or "", _dest(p, atlas_dir, log), names, order, status_order) for p in projects]

    taken = {r.slug for r in rows}
    for extra in desk.get("extra") or []:
        if extra.get("slug") in taken:
            log.warn("extra_ignored", slug=extra.get("slug"), reason="this slug is already a row (data/registry.json or an earlier extra)")
            continue
        template = cfg["desk"]["extra_blurbs"].get(extra.get("slug"))
        if template is None:
            log.warn("extra_blurb_missing", slug=extra.get("slug"), reason="no entry in desk.extra_blurbs, so the row has no description")
        blurb = fill(template, {"tools": len(tool_names)}) if template else ""
        rows.append(_row(extra, blurb, _dest(extra, atlas_dir, log), names, order, status_order))
        taken.add(extra.get("slug"))
    rows.sort(key=lambda r: (order[r.category], r.name.casefold(), r.name))

    # The owner's 2026-10-20 fossil rulings: a row marked "unlisted": true stays online at its own URL but is on no
    # index. This is the one filter; Home, the Tool Desk, the section counts and the pins all read the result.
    hidden = [r.slug for r in rows if r.unlisted]
    rows = [r for r in rows if not r.unlisted]
    if hidden:
        log.info("rows_unlisted", slugs=hidden)

    sections = [(slug, name, sum(1 for r in rows if r.category == slug)) for slug, name in categories]
    statuses = [(s, sum(1 for r in rows if r.status == s)) for s in status_order]

    by_slug = {r.slug: r for r in rows}
    pinned = []
    for slug in desk.get("pinned") or []:
        row = by_slug.get(slug)
        if row is None:
            log.warn("pin_unresolved", slug=slug, reason="not in data/registry.json or desk.json extra")
        elif row.dest is None:
            log.warn("pin_no_destination", slug=slug, reason="the project has no page, url or repo to link")
        else:
            pinned.append((row.name, row.dest))

    # The toolkit's repo link, if the data names one. The registry has no it-toolkit entry today.
    kit_repo = None
    for source in list(projects) + list(desk.get("extra") or []):
        if source.get("slug") == "it-toolkit":
            kit_repo = next((v for v in (source.get("repo"), source.get("url")) if isinstance(v, str) and re.match(r"^https?://", v)), None)
            if kit_repo:
                break
    if kit_repo is None and toolkit_on:
        log.warn("link_omitted", link="it-toolkit repository", reason="no it-toolkit repo URL in data/registry.json or desk.json extra")

    overlay = _clean_overlay(desk.get("toolkit"), tool_names, log) if toolkit_on else {}
    model = Model(rows, sections, statuses, pinned, figs, len(tool_names) if toolkit_on else None, overlay, kit_repo)
    log.info("model_loaded", projects=len(rows), registry=len(projects), unlisted=len(hidden), extras=len(desk.get("extra") or []), tools=model.n_tools, pinned=len(pinned))
    return model


# -- shared pieces ----------------------------------------------------------------------------------


def _name_cell(pg: Page, row: Row) -> str:
    href = resolve(row.dest, pg.root)
    inner = '<a href="%s">%s</a>' % (esc_attr(href), esc_text(row.name)) if href else esc_text(row.name)
    return '<td class="fp-name">%s</td>' % inner


def _status(status: str) -> str:
    """The marker is a shape plus the word. The word is always printed (state is never colour alone)."""
    return '<span class="fp-st" data-s="%s">%s</span>' % (esc_attr(status), esc_text(status))


def _head_cells(columns: list) -> str:
    return "<tr>%s</tr>" % "".join('<th scope="col">%s</th>' % esc_text(c) for c in columns)


def _link_line(pg: Page, spec: dict, href: str | None) -> str:
    """'before <a>link</a> after', with {placeholders} filled. No href means the link is plain text."""
    link = '<a href="%s">%s</a>' % (esc_attr(href), esc_text(spec["link"])) if href else esc_text(spec["link"])
    return esc_text(fill(spec["before"], pg.counts)) + link + esc_text(fill(spec["after"], pg.counts))


# -- Home -------------------------------------------------------------------------------------------


def _figure_items(pg: Page) -> list:
    labels, f = pg.cfg["home"]["figure_labels"], pg.model.figs

    def num(value):
        return "{:,}".format(value)

    items = []
    if f["commits"] is not None and f["since"]:
        items.append(("commits", num(f["commits"]), fill(labels["commits"], {"since": f["since"]})))
    elif f["commits"] is not None:
        pg.log.warn("figure_unavailable", figure="commits", reason="its label needs the 'since' date, which is missing")
    if f["repos"] is not None:
        items.append(("repos", num(f["repos"]), labels["repos"]))
    if f["tests"] is not None:
        items.append(("test_files", num(f["tests"]), labels["test_files"]))
    if f["suite_passed"] is not None:
        items.append(("suite", num(f["suite_passed"]), labels["suite"]))
    if f["guards"] is not None:
        items.append(("guards", num(f["guards"]), labels["guards"]))
    return items


def index_keep(model: Model, cfg: dict) -> list:
    """The listed rows the Home index shows: load_model has dropped the unlisted rows, then the index's statuses decide.
    One definition, read by the index, the stacked bar and the sidebar counts, so the three cannot disagree (CR-31)."""
    return [x for x in model.rows if x.status in cfg["home"]["index"]["statuses"]]


def nav_counts(model: Model, cfg: dict) -> dict:
    """{screen id: n} for the sidebar rows, from config screens[].count.source. Nothing is typed: 'index_all' is every row
    the index shows, 'index_group:<id>' the rows of one index group, 'rows_all' every listed row (the Tool Desk's rows)."""
    ix = cfg["home"]["index"]
    keep = index_keep(model, cfg)
    groups = {g["id"]: g for g in ix["groups"]}
    out = {}
    for s in cfg["screens"]:
        spec = s.get("count")
        if not spec:
            continue
        src = spec["source"]
        if src == "index_all":
            out[s["id"]] = len(keep)
        elif src == "rows_all":
            out[s["id"]] = len(model.rows)
        elif src.startswith("index_group:"):
            g = groups.get(src.split(":", 1)[1])
            if g is None:
                raise CouldNotLook("screen %r: count source %r names no group in home.index.groups" % (s["id"], src))
            out[s["id"]] = sum(1 for x in keep if x.category in g["cats"])
        else:
            raise CouldNotLook("screen %r: unknown count source %r" % (s["id"], src))
    return out


def _kind_bar(pg: Page) -> str:
    """CR-31: the whole at once. One segment per index group, flex-grow = the group's row count, a legend with the same numbers.
    The bar is decoration for the eye (aria-hidden); the legend list carries every number for everyone else."""
    h = pg.cfg["home"]
    keep = index_keep(pg.model, pg.cfg)
    segs, legend, total = [], [], 0
    for g in h["index"]["groups"]:
        n = sum(1 for x in keep if x.category in g["cats"])
        if not n:
            continue                    # an empty group has no segment (absent is not zero)
        total += n
        colour = esc_attr(g.get("seg") or "grey")
        segs.append('<i class="fp-seg" data-c="%s" style="flex-grow:%d"></i>' % (colour, n))
        legend.append('<li><i class="fp-dot" data-c="%s" aria-hidden="true"></i>%s <b>%d</b></li>' % (colour, esc_text(g["h2"]), n))
    if not segs:
        pg.log.warn("kind_bar_omitted", reason="no running project in any index group")
        return ""
    return (
        '<section class="fp-kinds" aria-label="%s"><p class="fp-kinds-t">%s</p>'
        '<div class="fp-stack" aria-hidden="true">%s</div><ul class="fp-legend">%s</ul></section>'
        % (esc_attr(h["bar"]["aria"]), esc_text(fill(h["bar"]["title"], {"n": total})), "".join(segs), "".join(legend))
    )


def _figures_block(pg: Page) -> list:
    """The figures row and its stamp, as HTML parts. Empty when no figure could be read (absent is not zero)."""
    h = pg.cfg["home"]
    out = []
    items = _figure_items(pg)
    if items:
        # CR-31: each figure is a Dusk gradient tile (data-tile names the colour, config home.figure_tiles). The class stays
        # exactly "fp-fig" and <b> stays first, so scripts/front_check.py home_figures reads the number the way it always did.
        tiles = h.get("figure_tiles") or {}
        cells = "".join(
            '<div class="fp-fig" role="listitem" data-tile="%s"><b>%s</b><span>%s</span></div>' % (esc_attr(tiles.get(key) or "grey"), esc_text(v), esc_text(k))
            for key, v, k in items
        )
        out.append('<div class="fp-figs" role="list" aria-label="%s">%s</div>' % (esc_attr(h["figures_aria"]), cells))
        if pg.asof:
            out.append('<p class="fp-stamp">%s</p>' % esc_text(fill(h["stamp"], {"asof": pg.asof})))
        else:
            pg.log.warn("stamp_omitted", reason="evidence.json has no generated date, so the figures carry no stamp")
    else:
        pg.log.warn("figures_omitted", reason="no figure could be read from data/evidence.json")
    return out


def _home_current(pg: Page) -> dict:
    cfg = pg.cfg
    h = cfg["home"]
    out = [
        # An empty eyebrow prints no line at all (D-A27 addendum a); an empty element would still take space.
        '<p class="fp-kicker">%s</p>' % esc_text(h["eyebrow"]) if h.get("eyebrow") else "",
        '<h1 class="fp-title">%s</h1>' % esc_text(cfg["brand"]["name"]),
        '<p class="fp-role">%s</p>' % esc_text(h["role"]),
        '<p class="fp-intro">%s</p>' % rich(h["intro"]),
    ]
    out += _figures_block(pg)

    doors = []
    for door in h["doors"]:
        href = pg.href(door["screen"])
        if href:
            go = '\n    <a class="fp-go" href="%s">%s</a>' % (esc_attr(href), esc_text(door["link"]))
        else:
            go = ""
            pg.log.warn("door_link_omitted", door=door["id"], screen=door["screen"], reason="that screen is not part of this build")
        doors.append(
            '  <div class="fp-door"><span class="fp-door-k">%s</span><h2>%s</h2>\n    <p>%s</p>%s</div>'
            % (esc_text(door["kicker"]), esc_text(door["h2"]), rich(door["p"]), go)
        )
    out.append('<div class="fp-doors">\n%s\n</div>' % "\n".join(doors))
    findline = _link_line(pg, h["findline"], pg.href("desk"))
    if h.get("methodline"):
        # CR-22: a hand page outside this build, so pg.href cannot resolve it; the path comes from config
        # and hangs off pg.root (the repo root from this page), the way the rail hub link does
        m = h["methodline"]
        findline += " " + _link_line(pg, m, pg.root + m["path"])
    out.append('<p class="fp-findline">%s</p>' % findline)
    return {"body": "\n".join(b for b in out if b), "css": [], "tail": []}


# -- Home, recomposed three ways (DECISIONS.md CR-25) -----------------------------------------------


def _first_sentences(text: str, n: int) -> str:
    """The first n sentences of a registry blurb: one line for the index. A blurb with no full stop is kept whole."""
    parts = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    return " ".join(parts[:n]).strip()


def _entry_href(pg: Page, entry: dict) -> str | None:
    """A stage entry points at a built screen (`screen`) or at a page outside this build (`path`, from the repo root)."""
    if entry.get("screen"):
        return pg.href(entry["screen"])
    if entry.get("path"):
        return pg.root + entry["path"]
    return None


def _stage_panel(pg: Page, entry: dict, lead: bool) -> str:
    href = _entry_href(pg, entry)
    if href is None:
        # A panel that links nowhere is a stub; the stage leaves the entry off instead (absent is not a blank).
        pg.log.warn("stage_entry_omitted", entry=entry.get("id"), reason="its screen is not part of this build")
        return ""
    return (
        '  <div class="fp-sp"%s><span class="fp-sp-k">%s</span><h2>%s</h2>\n    <p>%s</p>\n    <a class="fp-go" href="%s">%s</a></div>'
        % (' data-lead="1"' if lead else "", esc_text(entry["kicker"]), esc_text(entry["title"]), esc_text(entry["line"]),
           esc_attr(href), esc_text(entry["go"]))
    )


def _stage(pg: Page, layout: str) -> str:
    h = pg.cfg["home"]
    panels = [_stage_panel(pg, e, lead=(layout == "lead" and i == 0)) for i, e in enumerate(h["stage"])]
    panels = [x for x in panels if x]
    if not panels:
        return ""
    return (
        '<section class="fp-stage" aria-label="%s"><div class="fp-stage-grid" data-layout="%s">\n%s\n</div></section>'
        % (esc_attr(h["stage_aria"]), esc_attr(layout), "\n".join(panels))
    )


def _ix_row(name: str, href: str | None, blurb: str, status: str | None) -> str:
    link = '<a class="fp-ix-name" href="%s">%s</a>' % (esc_attr(href), esc_text(name)) if href else '<span class="fp-ix-name">%s</span>' % esc_text(name)
    top = '<span class="fp-ix-top">%s%s</span>' % (link, _status(status) if status else "")
    tail = '<span class="fp-ix-blurb">%s</span>' % esc_text(blurb) if blurb else ""
    return '    <li class="fp-ix-row">%s%s</li>' % (top, tail)


def _ix_group(pg: Page, gid: str, heading: str, door_href: str | None, rows: list, lead: bool = False) -> str:
    ix = pg.cfg["home"]["index"]
    h2 = '<a href="%s">%s</a>' % (esc_attr(door_href), esc_text(heading)) if door_href else esc_text(heading)
    return (
        '<section class="fp-ix-group"%s aria-labelledby="fp-ix-%s">\n'
        '  <header class="fp-ix-head"><h2 id="fp-ix-%s">%s</h2><span class="fp-meta">%s</span></header>\n'
        '  <ul class="fp-ix-list">\n%s\n  </ul>\n</section>'
        % (' data-lead="1"' if lead else "", esc_attr(gid), esc_attr(gid), h2, esc_text(fill(ix["count"], {"n": len(rows)})), "\n".join(rows))
    )


def _index(pg: Page, comp: dict) -> tuple:
    """(html, shown, visible). One group per home.index.groups entry, rows in registry order; C opens with the four stage picks."""
    h = pg.cfg["home"]
    ix = h["index"]
    # load_model has already dropped the unlisted rows (owner's 2026-10-20 fossil rulings), so every row here is listed
    # and the "more in the Tool Desk" count never counts a hidden one.
    visible = pg.model.rows
    keep = index_keep(pg.model, pg.cfg)
    grouped = {c for g in ix["groups"] for c in g["cats"]}
    orphans = sorted({x.slug for x in keep if x.category not in grouped})
    if orphans:
        # Nothing may vanish quietly: a running project in no group would be missing from Home.
        raise Refused("home.index.groups has no group for the category of: %s" % ", ".join(orphans))
    groups = []
    if comp["start_group"]:
        picks = []
        for e in h["stage"]:
            href = _entry_href(pg, e)
            if href is None:
                pg.log.warn("stage_entry_omitted", entry=e.get("id"), reason="its screen is not part of this build")
                continue
            picks.append(_ix_row(e["title"], href, e["line"], None))
        if picks:
            groups.append(_ix_group(pg, "start", h["start_group_h2"], None, picks, lead=True))
    shown = 0
    for g in ix["groups"]:
        rows = [x for x in keep if x.category in g["cats"]]
        if not rows:
            pg.log.warn("index_group_empty", group=g["id"], reason="no running project in its categories")
            continue
        door = pg.href(g["door"]) if g.get("door") else None
        if g.get("door") and door is None:
            pg.log.warn("door_link_omitted", door=g["id"], screen=g["door"], reason="that screen is not part of this build")
        html = [_ix_row(x.name, resolve(x.dest, pg.root), _first_sentences(x.blurb, ix.get("blurb_sentences", 1)), x.status) for x in rows]
        groups.append(_ix_group(pg, g["id"], g["h2"], door, html))
        shown += len(rows)
    body = '<div class="fp-ix" role="region" aria-label="%s">\n%s\n</div>' % (esc_attr(ix["aria"]), "\n".join(groups))
    return body, shown, len(visible)


def _link_line_with(spec: dict, href: str | None, values: dict) -> str:
    link = '<a href="%s">%s</a>' % (esc_attr(href), esc_text(spec["link"])) if href else esc_text(spec["link"])
    return esc_text(fill(spec["before"], values)) + link + esc_text(fill(spec["after"], values))


def _home_composed(pg: Page, key: str) -> dict:
    cfg = pg.cfg
    h = cfg["home"]
    comp = h["compositions"][key]
    if comp["stage"] not in ("lead", "row", "none"):
        raise CouldNotLook("home.compositions.%s.stage must be 'lead', 'row' or 'none'" % key)
    if comp.get("hero_line"):
        out = ['<h1 class="fp-title">%s</h1>' % esc_text(cfg["brand"]["name"]), '<p class="fp-role">%s</p>' % esc_text(comp["hero_line"])]
    else:
        # C: the name alone, set as a monument (typographic_monument)
        out = ['<h1 class="fp-title fp-monument">%s</h1>' % esc_text(cfg["brand"]["name"])]
    # CR-31: the stacked bar, then the figures as tiles, under the heading (CR-25 had the figures at the foot).
    out.append(_kind_bar(pg))
    out += _figures_block(pg)
    if comp["stage"] != "none":
        out.append(_stage(pg, comp["stage"]))
    index_html, shown, total = _index(pg, comp)
    out.append(index_html)
    # footer_resolution: how many more the Tool Desk holds, the method line, then the proof row
    values = {"more": total - shown, "projects": pg.counts["projects"]}
    foot = _link_line_with(h["index"]["more"], pg.href("desk"), values)
    if h.get("methodline"):
        m = h["methodline"]
        foot += " " + _link_line_with(m, pg.root + m["path"], values)
    out.append('<p class="fp-findline">%s</p>' % foot)
    return {"body": "\n".join(b for b in out if b), "css": [], "tail": []}


def home(pg: Page) -> dict:
    key = pg.cfg["home"].get("composition", "current")
    return _home_current(pg) if key == "current" else _home_composed(pg, key)


# -- Rail software ----------------------------------------------------------------------------------


def rail(pg: Page) -> dict:
    cfg = pg.cfg
    r = cfg["rail"]
    door = next((d for d in cfg["home"]["doors"] if d["id"] == r["door"]), None)
    if door is None:
        raise CouldNotLook("rail.door %r is not the id of a door in home.doors" % r["door"])
    out = [
        '<div class="fp-pagehead"><div><p class="fp-kicker">%s</p><h1 class="fp-title">%s</h1>' % (esc_text(r["kicker"]), esc_text(pg.screen["title"])),
        '<p class="fp-lede">%s</p></div></div>' % rich(door["p"]),
    ]
    rows = [x for x in pg.model.rows if x.category == "rail"]
    if rows:
        body = "\n".join(
            "<tr>%s<td>%s</td><td class=\"fp-blurb\">%s</td></tr>" % (_name_cell(pg, x), _status(x.status), esc_text(x.blurb)) for x in rows
        )
        out.append(
            '<section class="fp-panel" aria-labelledby="fp-h-rail">\n'
            '  <header class="fp-panel-head"><h2 id="fp-h-rail">%s</h2><span class="fp-meta">%s</span></header>\n'
            '  <table class="fp-table"><thead>%s</thead><tbody>\n%s\n</tbody></table>\n</section>'
            % (esc_text(r["panel_title"]), esc_text(fill(r["count"], {"n": len(rows)})), _head_cells(r["columns"]), body)
        )
    else:
        pg.log.warn("rail_index_omitted", reason="data/registry.json has no project in the rail section")
    hub = pg.root + "rail/"
    out.append('<p class="fp-findline">%s</p>' % _link_line(pg, r["hub"], hub))
    return {"body": "\n".join(out), "css": [], "tail": []}


# -- Tool Desk --------------------------------------------------------------------------------------


def _facet(pg: Page, key: str, label: str, options: list) -> str:
    """One faceted filter. options: [(value, display, count, is_status)]. Counts are of all rows."""
    inner = []
    for value, display, count, is_status in options:
        shown = _status(value) if is_status else esc_text(display)
        inner.append(
            '<label data-name="%s"><input type="checkbox" value="%s">%s<span class="fp-n">%d</span></label>'
            % (esc_attr(display), esc_attr(value), shown, count)
        )
    # The tool-category facet is filled by desk.js from window.IT_TOOLKIT, so it ships empty and hidden.
    hidden = " hidden" if key == "k" else ""
    return (
        '<details class="fp-facet" data-f="%s"%s><summary class="fp-fa">%s %s<span class="fp-vsep" hidden></span>'
        '<span class="fp-badge" hidden></span></summary><div class="fp-pop" role="group" aria-label="%s">%s</div></details>'
        % (key, hidden, pg.icon("plus"), esc_text(label), esc_attr(label), "".join(inner))
    )


def _toolbar(pg: Page) -> str:
    d, m = pg.cfg["desk"], pg.model
    labels = d["facets"]
    facets = [
        _facet(pg, "c", labels["c"], [(slug, name, n, False) for slug, name, n in m.sections if n]),
        _facet(pg, "s", labels["s"], [(s, s, n, True) for s, n in m.statuses if n]),
    ]
    if pg.cfg["desk"].get("toolkit_panel", True):
        facets.append(_facet(pg, "k", labels["k"], []))
    return (
        '<div class="fp-toolbar" id="fp-toolbar" role="group" aria-label="%s" data-selected="%s" hidden>%s\n'
        '  <button type="button" class="fp-toggle" id="fp-starred" aria-pressed="false" hidden>%s %s</button>\n'
        '  <button type="button" class="fp-reset" id="fp-reset" hidden>%s %s</button>\n</div>'
        % (esc_attr(d["filters_aria"]), esc_attr(d["selected"]), "".join(facets), pg.icon("star"), esc_text(d["starred_only"]), esc_text(d["reset"]), pg.icon("x", 14))
    )


def _pins(pg: Page) -> str:
    d = pg.cfg["desk"]
    links = "".join(
        '<a class="fp-ghost" href="%s">%s%s</a>' % (esc_attr(resolve(dest, pg.root)), pg.icon("pin", 14), esc_text(name))
        for name, dest in pg.model.pinned
    )
    if not links:
        return ""
    return '<div class="fp-pins"><span class="fp-pins-k">%s</span>%s</div>' % (esc_text(d["pinned_label"]), links)


def _projects_panel(pg: Page) -> str:
    p = pg.cfg["desk"]["projects"]
    loc = pg.cfg["desk"]["local"]
    rows = "\n".join(
        '<tr data-slug="%s" data-c="%s" data-s="%s" data-q="%s">%s<td class="fp-cat">%s</td><td>%s</td><td class="fp-blurb">%s</td></tr>'
        % (esc_attr(r.slug), esc_attr(r.category), esc_attr(r.status), esc_attr(r.q), _name_cell(pg, r), esc_text(r.section), _status(r.status), esc_text(r.blurb))
        for r in pg.model.rows
    )
    # The page names the data file and the labels. It holds no port and no path. desk.js requests the file only
    # when the page is opened from localhost, 127.0.0.1 or a file (D-A27 addendum b).
    local_attrs = ' data-local-src="%s" data-local-port="%s" data-local-path="%s" data-local-open="%s" data-local-copy="%s" data-local-copied="%s"' % (
        esc_attr(pg.root + loc["data_file"]), esc_attr(loc["port_label"]), esc_attr(loc["path_label"]),
        esc_attr(loc["open_label"]), esc_attr(loc["copy"]), esc_attr(loc["copied"]))
    return (
        '<section class="fp-panel" aria-labelledby="fp-h-proj">\n'
        '  <header class="fp-panel-head"><h2 id="fp-h-proj">%s</h2>'
        '<span class="fp-meta" id="fp-proj-count" role="status" data-fmt="%s">%s</span></header>\n'
        '  <table class="fp-table" id="fp-proj-table"%s><thead>%s</thead><tbody id="fp-proj-rows">\n%s\n</tbody></table>\n'
        '  <p class="fp-empty" id="fp-proj-none" hidden>%s</p>\n</section>'
        % (
            esc_text(p["title"]),
            esc_attr(p["shown"]),
            esc_text(fill(p["shown"], {"n": len(pg.model.rows)})),
            local_attrs,
            _head_cells(p["columns"]),
            rows,
            esc_text(p["none"]),
        )
    )


def _toolkit_panel(pg: Page) -> str:
    t = pg.cfg["desk"]["toolkit"]
    repo = pg.model.kit_repo
    after = ""
    if repo:
        after = '%s<a href="%s">%s</a>%s' % (esc_text(t["repo"]["before"]), esc_attr(repo), esc_text(t["repo"]["link"]), esc_text(t["repo"]["after"]))
    return (
        '<section class="fp-panel" aria-labelledby="fp-h-kit">\n'
        '  <header class="fp-panel-head"><h2 id="fp-h-kit">%s</h2>'
        '<span class="fp-meta" id="fp-kit-count" role="status" data-fmt="%s" hidden></span></header>\n'
        '  <p class="fp-empty" id="fp-kit-note"><span id="fp-kit-msg" data-failed="%s">%s</span>%s</p>\n'
        '  <div id="fp-kit" data-copy="%s" data-copied="%s" data-selected="%s" data-starred="%s" hidden>\n'
        '    <table class="fp-table"><thead>%s</thead><tbody id="fp-kit-rows"></tbody></table>\n'
        '    <p class="fp-empty" id="fp-kit-none" hidden>%s</p>\n  </div>\n</section>'
        % (
            esc_text(t["title"]),
            esc_attr(t["shown"]),
            esc_attr(t["failed"]),
            esc_text(t["nojs"]),
            after,
            esc_attr(t["copy"]),
            esc_attr(t["copied"]),
            esc_attr(t["selected"]),
            esc_attr(t["starred"]),
            _head_cells(t["columns"]),
            esc_text(t["none"]),
        )
    )


def _overlay_script(overlay: dict) -> str:
    """window.FP_TOOLKIT_OVERLAY = {...}. `</` and `<!--` are escaped so the data cannot end the script."""
    text = json.dumps(overlay, ensure_ascii=False, separators=(",", ":"))
    return "window.FP_TOOLKIT_OVERLAY=%s;" % text.replace("</", "<\\/").replace("<!--", "<\\u0021--")


def desk(pg: Page) -> dict:
    cfg = pg.cfg
    d = cfg["desk"]
    if d.get("show_local"):
        raise CouldNotLook("desk.show_local is true (ports and paths printed for everyone). That is not built and was not chosen; the on-this-machine columns are desk.local (D-A27 addendum b)")
    lede = esc_text(fill(d["lede"], pg.counts)) + '<span data-needs-js hidden>%s</span>' % rich(d["lede_script"])
    body = [
        '<div class="fp-pagehead"><div><p class="fp-kicker">%s</p><h1 class="fp-title">%s</h1>' % (esc_text(d["kicker"]), esc_text(pg.screen["title"])),
        '<p class="fp-lede">%s</p></div></div>' % lede,
        _pins(pg),
        _toolbar(pg),
        _projects_panel(pg),
    ]
    tail = [("src", d["scripts"]["desk"])]
    if d.get("toolkit_panel", True):
        body.append(_toolkit_panel(pg))
        tail = [("src", d["scripts"]["toolkit_data"]), ("inline", _overlay_script(pg.model.overlay))] + tail
    return {"body": "\n".join(b for b in body if b), "css": [], "tail": tail}


BUILDERS = {"home": home, "rail": rail, "desk": desk}
