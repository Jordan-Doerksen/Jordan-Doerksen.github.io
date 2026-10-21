"""The kind stage on Home (DECISIONS.md CR-32, Site card item 43 chunk 2).

Replaces the five typographic lists of the Home index with one container per index group (a "kind"). Each
container has a rail on the left (every running project of that kind in a fixed-height row) and a stage on
the right (one panel per project). The highlight steps down the rail and the stage follows; hover, focus or a
click takes over. The stepping is js/front/kind-stage.js; this module writes the markup it enhances.

Rules this file keeps:
  * The rows are the ones Home's index uses (front_screens.index_keep), handed in by the caller, so the bar,
    the sidebar counts and these containers cannot disagree.
  * A project's tier is the generator's own rule (build_project_sizes.tier_for) applied to
    data/project-sizes.json and the config thresholds and overrides. Nothing is typed here.
  * The display follows the tier and what is on disk, and nothing is faked (SAFE-04):
        large  = assets/shots/<slug>.png in the shell frame, else the medium display
        medium = assets/diagrams/<slug>.svg, else the small display
        small  = a facts card (name, kind, status, the first sentence of the blurb, the link)
    A project the measure could not see is small. A large project without a shot and a medium project without
    a diagram are logged at every build; the page never shows a blank for them.
  * With no script every rail row is a plain link to the project and the stage shows the first project. Every
    panel carries an "Open <project>" link (WEB-07). The pause button and the arrow-key help ship `hidden`.
  * The diagram is inlined, not an <img>. What failed: the files in assets/diagrams/ carry no styles of their
    own (atlas.css styles them by class), so an <img> draws them black on black. Why this fix: inlined, the
    page's own CSS (front.parts.css, Dusk tokens) styles them, and the SVG keeps its own role and aria-label.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from front_log import CouldNotLook, Refused
from front_shell import esc_attr, esc_text, fill

MIN_DWELL_MS = 2200   # DISP-03, the display law's reading pause: the build refuses a dwell below it
DISPLAYS = ("facts", "diagram", "shot")
_SVG_UNSAFE = re.compile(r"<script|<style|<foreignObject|<image|\son\w+\s*=|javascript:|\bhref\s*=", re.I)


# -- settings and data ----------------------------------------------------------------------------------


def settings(cfg: dict) -> dict:
    """home.stage_v2 reduced to what the renderer needs, each value checked. Refused (exit 1) on a broken rule."""
    st = cfg["home"].get("stage_v2")
    if not isinstance(st, dict):
        raise CouldNotLook("home.stage_v2 is missing from scripts/front_page.config.json")
    for key in ("dwell_ms", "step_min_projects", "assets", "script", "ui"):
        if key not in st:
            raise CouldNotLook("home.stage_v2.%s is missing" % key)
    dwell, minp = st["dwell_ms"], st["step_min_projects"]
    if not isinstance(dwell, int) or isinstance(dwell, bool) or dwell < MIN_DWELL_MS:
        raise Refused("home.stage_v2.dwell_ms is %r: the highlight must rest at least %d ms on a project (DISP-03)" % (dwell, MIN_DWELL_MS))
    if not isinstance(minp, int) or isinstance(minp, bool) or minp < 1:
        raise Refused("home.stage_v2.step_min_projects must be a whole number of 1 or more, got %r" % (minp,))
    ui = st["ui"]
    for key in ("open", "shot_alt", "pause", "play", "pause_aria", "play_aria", "rail_aria"):
        if not isinstance(ui.get(key), str) or not ui[key].strip():
            raise CouldNotLook("home.stage_v2.ui.%s is missing" % key)
    return st


def load_sizes(repo: Path) -> dict:
    """data/project-sizes.json -> {slug: entry}. Missing or unreadable is exit 2: the tiers cannot be computed."""
    path = repo / "data" / "project-sizes.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        projects = data["projects"]
    except (OSError, ValueError, KeyError, TypeError) as err:
        raise CouldNotLook("cannot read %s (run scripts/build_project_sizes.py): %s" % (path, err)) from err
    if not isinstance(projects, dict):
        raise CouldNotLook("%s: projects is not an object" % path)
    return projects


def tiers_for(cfg: dict, rows: list, sizes: dict, log) -> dict:
    """{slug: tier}. The one tier rule is build_project_sizes.tier_for (CR-32); it is imported here at call time because
    that module imports the front build's modules at its top, so a top-level import here would be a cycle."""
    from build_project_sizes import tier_for, tier_rules

    rules = tier_rules(cfg)
    out = {}
    for row in rows:
        entry = sizes.get(row.slug)
        if entry is None:
            # The snapshot predates this project. Small, never guessed up (SAFE-04); rerun the generator.
            log.warn("size_missing", slug=row.slug, reason="data/project-sizes.json has no entry; shown as small (run scripts/build_project_sizes.py)")
            entry = {"could_not_look": True, "commits": None}
        out[row.slug], _why = tier_for(row.slug, entry, rules)
    return out


def display_for(repo: Path, st: dict, slug: str, tier: str, log) -> tuple:
    """(display, asset path relative to the repo or None). Follows the tier, falls back one step at a time, logs each fall."""
    assets = st["assets"]
    shot = "%s/%s.%s" % (assets["shots_dir"], slug, assets["shot_ext"])
    diagram = "%s/%s.svg" % (assets["diagrams_dir"], slug)
    if tier == "large":
        if (repo / shot).is_file():
            return "shot", shot
        log.warn("large_without_shot", slug=slug, reason="tier is large and %s does not exist; the medium display is shown" % shot)
    if tier in ("large", "medium"):
        if (repo / diagram).is_file():
            return "diagram", diagram
        log.warn("medium_without_diagram", slug=slug, tier=tier, reason="%s does not exist; the facts card is shown" % diagram)
    return "facts", None


def read_svg(repo: Path, rel: str) -> str:
    text = (repo / rel).read_text(encoding="utf-8").replace("\r\n", "\n").strip()
    if not text.startswith("<svg "):
        raise Refused("%s does not start with <svg" % rel)
    bad = _SVG_UNSAFE.search(text)
    if bad:
        raise Refused("%s holds %r: a diagram that is inlined into Home may not carry script, style, links or event handlers" % (rel, bad.group(0)))
    return text.replace("<svg ", '<svg class="fp-ks-svg" focusable="false" ', 1)


# -- markup ---------------------------------------------------------------------------------------------


def _panel_id(slug: str) -> str:
    return "fp-ks-p-%s" % slug


def _rail_row(row, href: str | None, status_html: str, first: bool) -> str:
    cur = ' aria-current="true"' if first else ""
    attrs = 'class="fp-ks-link" data-slug="%s" aria-controls="%s"%s' % (esc_attr(row.slug), esc_attr(_panel_id(row.slug)), cur)
    inner = '<span class="fp-ks-name">%s</span>%s' % (esc_text(row.name), status_html)
    if href:
        return '      <li class="fp-ks-row"><a %s href="%s">%s</a></li>' % (attrs, esc_attr(href), inner)
    # No page, url or repo to go to: the row is plain text, and the script makes it selectable all the same.
    return '      <li class="fp-ks-row"><span %s>%s</span></li>' % (attrs, inner)


def _open_link(pg, st: dict, row, href: str | None) -> str:
    if not href:
        return ""        # a link to nowhere is a stub; leave it off (absent is not a blank)
    text = fill(st["ui"]["open"], {"name": row.name})
    return '<a class="fp-go fp-ks-open" href="%s">%s</a>' % (esc_attr(href), esc_text(text))


def _panel(pg, st, row, href, status_html, line, tier, display, asset, repo, first: bool) -> str:
    hidden = "" if first else " hidden"
    head = 'class="fp-ks-panel" id="%s" data-slug="%s" data-tier="%s" data-display="%s"%s' % (
        esc_attr(_panel_id(row.slug)), esc_attr(row.slug), esc_attr(tier), esc_attr(display), hidden)
    link = _open_link(pg, st, row, href)
    line_html = '<p class="fp-ks-line">%s</p>' % esc_text(line) if line else ""
    if display == "facts":
        return (
            '      <div %s>\n'
            '        <div class="fp-ks-facts"><p class="fp-ks-kind">%s</p><h3 class="fp-ks-title">%s</h3>%s%s%s</div>\n'
            '      </div>'
            % (head, esc_text(row.section), esc_text(row.name), status_html, line_html, link)
        )
    if display == "diagram":
        art = '<div class="fp-ks-art fp-ks-dia">%s</div>' % read_svg(repo, asset)
    else:
        alt = fill(st["ui"]["shot_alt"], {"name": row.name})
        art = (
            '<div class="fp-ks-art"><div class="fp-ks-frame"><div class="fp-ks-bar" aria-hidden="true"><i></i><i></i><i></i></div>'
            '<img class="fp-ks-shot" src="%s" alt="%s" loading="lazy" decoding="async"></div></div>'
            % (esc_attr(pg.root + asset), esc_attr(alt))
        )
    return (
        '      <div %s>\n'
        '        <div class="fp-ks-top"><h3 class="fp-ks-title">%s</h3><span class="fp-ks-sub">%s %s</span></div>\n'
        '        %s\n'
        '        <div class="fp-ks-foot">%s%s</div>\n'
        '      </div>'
        % (head, esc_text(row.name), esc_text(row.section), status_html, art, line_html, link)
    )


def render_index(pg, groups: list, href_of, status_of, line_of) -> str:
    """The whole Home index as kind containers. groups: [(group config, door href or None, [rows])], in config order.
    href_of(row) -> href or None; status_of(status) -> the status marker HTML; line_of(row) -> the short line."""
    cfg = pg.cfg
    st = settings(cfg)
    repo = pg.model.repo
    if repo is None:
        raise CouldNotLook("the model has no repository path, so the stage cannot look up the sizes or the displays")
    rows_all = [r for _g, _door, rows in groups for r in rows]
    tiers = tiers_for(cfg, rows_all, load_sizes(repo), pg.log)
    ix = cfg["home"]["index"]
    ui = st["ui"]
    containers = []
    tally = {"facts": 0, "diagram": 0, "shot": 0}
    for g, door, rows in groups:
        gid = g["id"]
        steps = len(rows) >= st["step_min_projects"]
        rail, panels = [], []
        for i, row in enumerate(rows):
            href = href_of(row)
            tier = tiers[row.slug]
            display, asset = display_for(repo, st, row.slug, tier, pg.log)
            tally[display] += 1
            sh = status_of(row.status)
            rail.append(_rail_row(row, href, sh, i == 0))
            panels.append(_panel(pg, st, row, href, sh, line_of(row), tier, display, asset, repo, i == 0))
        h2 = '<a href="%s">%s</a>' % (esc_attr(door), esc_text(g["h2"])) if door else esc_text(g["h2"])
        pause = (
            '<button type="button" class="fp-ks-pause" data-label-pause="%s" data-label-play="%s" data-aria-pause="%s" data-aria-play="%s" hidden>%s</button>'
            % (esc_attr(ui["pause"]), esc_attr(ui["play"]), esc_attr(fill(ui["pause_aria"], {"kind": g["h2"]})),
               esc_attr(fill(ui["play_aria"], {"kind": g["h2"]})), esc_text(ui["pause"]))
        ) if steps else ""
        containers.append(
            '  <section class="fp-ks" id="fp-ks-%s" data-kind="%s" data-count="%d" data-steps="%s" aria-labelledby="fp-ix-%s">\n'
            '    <header class="fp-ks-head"><h2 id="fp-ix-%s">%s</h2><span class="fp-meta">%s</span>%s</header>\n'
            '    <div class="fp-ks-body">\n'
            '      <ul class="fp-ks-rail" aria-label="%s">\n%s\n      </ul>\n'
            '      <div class="fp-ks-stage">\n%s\n      </div>\n'
            '    </div>\n'
            '  </section>'
            % (esc_attr(gid), esc_attr(gid), len(rows), "yes" if steps else "no", esc_attr(gid), esc_attr(gid), h2,
               esc_text(fill(ix["count"], {"n": len(rows)})), pause, esc_attr(fill(ui["rail_aria"], {"kind": g["h2"]})),
               "\n".join(rail), "\n".join(panels))
        )
    pg.log.info("kind_stage", containers=len(containers), projects=len(rows_all), facts=tally["facts"], diagram=tally["diagram"], shot=tally["shot"],
                tiers={t: sum(1 for v in tiers.values() if v == t) for t in ("small", "medium", "large")}, dwell_ms=st["dwell_ms"])
    return (
        '<div class="fp-ksx" role="region" aria-label="%s" data-dwell="%d" data-min-steps="%d">\n%s\n</div>'
        % (esc_attr(ix["aria"]), st["dwell_ms"], st["step_min_projects"], "\n".join(containers))
    )
