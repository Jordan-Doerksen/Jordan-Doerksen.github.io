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


@dataclass
class Model:
    rows: list
    sections: list          # [(slug, name, count)] in registry order
    statuses: list          # [(status, count)] in config order
    pinned: list            # [(name, dest)]
    figs: dict
    n_tools: int
    overlay: dict           # tool name -> {star, install, snippet}
    kit_repo: str | None

    @property
    def counts(self) -> dict:
        return {"projects": len(self.rows), "tools": self.n_tools}


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
    return Row(project["slug"], project["name"], project["category"], section, project["status"], blurb, dest, search)


def load_model(repo: Path, cfg: dict, log) -> Model:
    data = repo / "data"
    registry = read_json(data / "registry.json")
    desk = read_json(data / "desk.json")
    try:
        categories = [(c["slug"], c["name"]) for c in registry["categories"]]
        projects = list(registry["projects"])
    except (KeyError, TypeError) as err:
        raise CouldNotLook("data/registry.json lacks categories[] or projects[]: %r" % (err,)) from err
    tool_names, _ = read_toolkit(data / "toolkit.js")
    figs = figures(data / "evidence.json", log)

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
    if kit_repo is None:
        log.warn("link_omitted", link="it-toolkit repository", reason="no it-toolkit repo URL in data/registry.json or desk.json extra")

    model = Model(rows, sections, statuses, pinned, figs, len(tool_names), _clean_overlay(desk.get("toolkit"), tool_names, log), kit_repo)
    log.info("model_loaded", projects=len(rows), registry=len(projects), extras=len(rows) - len(projects), tools=len(tool_names), pinned=len(pinned))
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
        items.append((num(f["commits"]), fill(labels["commits"], {"since": f["since"]})))
    elif f["commits"] is not None:
        pg.log.warn("figure_unavailable", figure="commits", reason="its label needs the 'since' date, which is missing")
    if f["repos"] is not None:
        items.append((num(f["repos"]), labels["repos"]))
    if f["tests"] is not None:
        items.append((num(f["tests"]), labels["test_files"]))
    if f["guards"] is not None:
        items.append((num(f["guards"]), labels["suite"]))
    return items


def home(pg: Page) -> dict:
    cfg = pg.cfg
    h = cfg["home"]
    out = [
        '<p class="fp-kicker">%s</p>' % esc_text(h["eyebrow"]),
        '<h1 class="fp-title">%s</h1>' % esc_text(cfg["brand"]["name"]),
        '<p class="fp-role">%s</p>' % esc_text(h["role"]),
        '<p class="fp-intro">%s</p>' % rich(h["intro"]),
    ]
    items = _figure_items(pg)
    if items:
        cells = "".join('<div class="fp-fig" role="listitem"><b>%s</b><span>%s</span></div>' % (esc_text(v), esc_text(k)) for v, k in items)
        out.append('<div class="fp-figs" role="list" aria-label="%s">%s</div>' % (esc_attr(h["figures_aria"]), cells))
        if pg.asof:
            out.append('<p class="fp-stamp">%s</p>' % esc_text(fill(h["stamp"], {"asof": pg.asof})))
        else:
            pg.log.warn("stamp_omitted", reason="evidence.json has no generated date, so the figures carry no stamp")
    else:
        pg.log.warn("figures_omitted", reason="no figure could be read from data/evidence.json")

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
    out.append('<p class="fp-findline">%s</p>' % _link_line(pg, h["findline"], pg.href("desk")))
    return {"body": "\n".join(out), "css": [], "tail": []}


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
        _facet(pg, "k", labels["k"], []),
    ]
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
    rows = "\n".join(
        '<tr data-c="%s" data-s="%s" data-q="%s">%s<td class="fp-cat">%s</td><td>%s</td><td class="fp-blurb">%s</td></tr>'
        % (esc_attr(r.category), esc_attr(r.status), esc_attr(r.q), _name_cell(pg, r), esc_text(r.section), _status(r.status), esc_text(r.blurb))
        for r in pg.model.rows
    )
    return (
        '<section class="fp-panel" aria-labelledby="fp-h-proj">\n'
        '  <header class="fp-panel-head"><h2 id="fp-h-proj">%s</h2>'
        '<span class="fp-meta" id="fp-proj-count" role="status" data-fmt="%s">%s</span></header>\n'
        '  <table class="fp-table"><thead>%s</thead><tbody id="fp-proj-rows">\n%s\n</tbody></table>\n'
        '  <p class="fp-empty" id="fp-proj-none" hidden>%s</p>\n</section>'
        % (
            esc_text(p["title"]),
            esc_attr(p["shown"]),
            esc_text(fill(p["shown"], {"n": len(pg.model.rows)})),
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
        raise CouldNotLook("desk.show_local is true, but the code that shows local paths and ports does not exist yet")
    lede = esc_text(fill(d["lede"], pg.counts)) + '<span data-needs-js hidden>%s</span>' % rich(d["lede_script"])
    body = [
        '<div class="fp-pagehead"><div><p class="fp-kicker">%s</p><h1 class="fp-title">%s</h1>' % (esc_text(d["kicker"]), esc_text(pg.screen["title"])),
        '<p class="fp-lede">%s</p></div></div>' % lede,
        _pins(pg),
        _toolbar(pg),
        _projects_panel(pg),
        _toolkit_panel(pg),
    ]
    tail = [("src", d["scripts"]["toolkit_data"]), ("inline", _overlay_script(pg.model.overlay)), ("src", d["scripts"]["desk"])]
    return {"body": "\n".join(b for b in body if b), "css": [], "tail": tail}


BUILDERS = {"home": home, "rail": rail, "desk": desk}
