"""Generate the tier-2 display case (DECISIONS.md D-A25, CR-11, CR-12).

Stdlib only. Reads the desk network graph, the guard and finding data, and the
stage timings, and writes docs/tier-2-case/index.html.

WHAT THIS IS. Tier 2 is a display case, not a tool. The desk is austere because
it is bound - read-only, fail-closed, no motion. The site is not bound that way,
and applying tool discipline to a display case was the category error behind
three discarded drafts (D-A25).

THE STAGE (CR-12). A screen-wide panel holds `batchSize` cards. They arrive one
at a time with a connector drawing to the next slot; when the batch is full it
files down into a running list below and the stage clears for the next batch.
Every arrival is a state that can be paused and resumed.

PROGRESSIVE ENHANCEMENT. The markup ships every card in document order, readable
with no JavaScript at all - that is the fallback, and it is the same complete
document the previous draft was. stage.js sets data-js="on"; only then does the
staged CSS apply. Under prefers-reduced-motion the stage stays static with every
card visible and no timer is created.

Config lives in scripts/tier2_stage.config.json and is emitted as data
attributes, so the page performs no runtime fetch.

Usage:
    python scripts/build_tier2_case.py
"""

import html
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GRAPH = Path("C:/projects/trading/desk-network-map/data/graph-runtime.json")
CONFIG = REPO_ROOT / "scripts" / "tier2_stage.config.json"
OUT_DIR = REPO_ROOT / "docs" / "tier-2-case"
OUT_PATH = OUT_DIR / "index.html"


def esc(v):
    return html.escape(str(v) if v is not None else "", quote=True)


def node_state(node, guard_files, finding_paths):
    """Real badges only. Absent stays absent - never a fabricated zero."""
    blob = " ".join(str(node.get(k, "")) for k in ("where", "what", "sub", "id", "label"))
    guards = sum(n for f, n in guard_files.items() if f and f.split("/")[-1] in blob)
    faults = [w for w in finding_paths if w and w.split(":")[0].split("/")[-1] in blob]
    return (guards or None), (len(faults) or None)


def main():
    g = json.loads(GRAPH.read_text(encoding="utf-8"))
    G = json.loads((REPO_ROOT / "data" / "guards.json").read_text(encoding="utf-8"))
    F = json.loads((REPO_ROOT / "data" / "findings.json").read_text(encoding="utf-8"))
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))

    guard_files = {}
    for x in G["guards"]:
        guard_files[x["file"]] = guard_files.get(x["file"], 0) + 1
    finding_paths = [f.get("where") or "" for f in F["findings"] if f["status"] == "open"]

    nodes = {n["id"]: n for n in g["nodes"]}
    links = {(e["from"], e["to"]): e for e in g["links"]}
    tours = g.get("tours", [])
    if not tours:
        print("ERROR: no tours in the graph - nothing to display")
        return 1

    batch = int(cfg["batchSize"])
    stage_attrs = (
        'data-batch="%d" data-enter="%d" data-draw="%d" data-hold="%d" '
        'data-batchhold="%d" data-filedown="%d" data-autoplay="%s" data-loop="%s"'
        % (batch, cfg["cardEnterMs"], cfg["lineDrawMs"], cfg["holdMs"],
           cfg["batchHoldMs"], cfg["filedownMs"],
           str(bool(cfg["autoplay"])).lower(), str(bool(cfg["loop"])).lower())
    )

    radios, tabs, panels = [], [], []
    for ti, t in enumerate(tours):
        tid = esc(t["id"])
        radios.append('<input type="radio" name="tour" id="t-%s" class="t-radio"%s>'
                      % (tid, " checked" if ti == 0 else ""))
        tabs.append('<label for="t-%s" class="tab"><b>%s</b><span>%d parts</span></label>'
                    % (tid, esc(t["label"]), len(t["steps"])))

        cards, prev = [], None
        for si, sid in enumerate(t["steps"]):
            n = nodes.get(sid)
            if not n:
                continue
            link = links.get((prev, sid)) if prev else None
            prev = sid
            gcount, fcount = node_state(n, guard_files, finding_paths)

            badges, badge_text = "", ""
            if gcount:
                badges += '<span class="badge g">%d guard%s</span>' % (gcount, "" if gcount == 1 else "s")
                badge_text = "%d guard%s" % (gcount, "" if gcount == 1 else "s")
            if fcount:
                badges += '<span class="badge f">%d open</span>' % fcount
                badge_text = (badge_text + " · " if badge_text else "") + "%d open" % fcount

            flow = ('<span class="flow">%s</span>' % esc(link["label"])) if link and link.get("label") else ""

            cards.append(
                '<article class="card" data-node="%s" data-label="%s"%s>'
                '<span class="idx">%02d</span>'
                '<h3>%s<span class="sub">%s</span></h3>'
                '<p class="what">%s</p>'
                '%s%s'
                '<details><summary>Where it lives</summary><p>%s</p></details>'
                '</article>'
                % (esc(sid), esc(n["label"]),
                   (' data-badge="%s"' % esc(badge_text)) if badge_text else "",
                   si + 1, esc(n["label"]), esc(n.get("sub", "")),
                   esc(n.get("what", "")), badges, flow, esc(n.get("where", "—")))
            )

        panels.append(
            '<section class="tour" id="p-%s" aria-label="%s">'
            '<p class="blurb">%s</p>'
            '<div class="stage" %s>'
            '<div class="slots">%s</div>'
            '<div class="controls" hidden>'
            '<button type="button" class="btn btn-play" aria-pressed="false">Play</button>'
            '<button type="button" class="btn btn-step">Step</button>'
            '<button type="button" class="btn btn-reset">Reset</button>'
            '<span class="readout" role="status" aria-live="polite"></span>'
            '</div>'
            '</div></section>'
            % (tid, esc(t["label"]), esc(t.get("blurb", "")), stage_attrs, "".join(cards))
        )

    idea = g.get("dominant_idea", "")
    clauses = [c.strip() for c in idea.replace(" and leaves", ", and leaves").split(",") if c.strip()]
    idea_html = "".join('<span style="--d:%dms">%s</span>' % (i * 420, esc(c))
                        for i, c in enumerate(clauses))

    css_tabs = "\n".join(
        '#t-%s:checked ~ .tabs label[for="t-%s"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}\n'
        '#t-%s:checked ~ .panels #p-%s{display:block}'
        % (esc(t["id"]), esc(t["id"]), esc(t["id"]), esc(t["id"])) for t in tours)

    # ---- the mesh -------------------------------------------------------
    # One shared diagram under every tour. Positions come from the graph's own
    # col/row - not invented here - and rows are re-packed per column so the
    # 26 nodes the tours actually use do not sit in a sparse 17-row canvas.
    # Nodes and links start hidden; stage.js lights each one as its card files
    # down, and a link lights only when BOTH its ends are already lit. Running a
    # second tour therefore draws the joins to nodes the first one placed, which
    # is where the mesh comes from.
    # ROW_H carries the label now that it sits ABOVE its dot rather than beside
    # it: with the name off to the right, every horizontal track running at a
    # node's own y drove straight through some other node's text.
    # PAD_TOP is deeper than PAD on purpose: a blocked row-0 run lifts into the
    # channel half a row ABOVE row 0, which lands at y=0 without headroom - a
    # track drawn flush along the panel's top edge.
    COL_W, ROW_H, PAD, PAD_TOP, R = 172, 68, 34, 52, 6.5
    CLEAR, CH_GAP = R + 3.0, 96.0
    tour_ids = []
    for t in tours:
        for sid in t["steps"]:
            if sid in nodes and sid not in tour_ids:
                tour_ids.append(sid)

    by_col = {}
    for sid in tour_ids:
        by_col.setdefault(nodes[sid].get("col", 0), []).append(sid)
    pos = {}
    for col, ids in by_col.items():
        ids.sort(key=lambda s: nodes[s].get("row", 0))
        for idx, sid in enumerate(ids):
            # Stagger alternate columns by half a row. This is what makes the
            # routing simple: with every column sharing rows, a straight wire
            # from column 0 lands exactly on a dot in column 2, so the router
            # had to jog around it. Offset the columns and that stops happening
            # by construction - the layout does the work, not the router.
            stagger = (col % 2) * (ROW_H / 2.0)
            pos[sid] = (PAD + col * COL_W, PAD_TOP + idx * ROW_H + stagger)

    mesh_w = PAD * 2 + (max(by_col) + 1) * COL_W
    mesh_h = PAD_TOP + PAD + max(len(v) for v in by_col.values()) * ROW_H + ROW_H / 2.0

    shared = {sid for sid in tour_ids
              if sum(1 for t in tours if sid in t["steps"]) > 1}

    # ---- track routing --------------------------------------------------
    # THE RULE (owner): wires may cross each other. Wires may NOT pass through a
    # part. Nothing else is enforced.
    #
    # The previous router also kept every wire in its own channel, so parallel
    # runs never overlapped. That second constraint bought nothing a reader
    # cares about and cost a ladder of jogs - "overly complex for no reason".
    #
    # Now each wire takes the SIMPLEST orthogonal shape that clears every other
    # part: a straight run if it can, then a single corner, then two. Crossings
    # between wires are allowed and are not counted.
    CORNER = 7.0

    def clears(points, a, b):
        """True when no segment passes within CLEAR of a part that is not an end."""
        for i in range(len(points) - 1):
            (px, py), (qx, qy) = points[i], points[i + 1]
            lo_x, hi_x = min(px, qx), max(px, qx)
            lo_y, hi_y = min(py, qy), max(py, qy)
            for sid, (nx, ny) in pos.items():
                if sid in (a, b):
                    continue
                if (lo_x - CLEAR < nx < hi_x + CLEAR
                        and lo_y - CLEAR < ny < hi_y + CLEAR):
                    return False
        return True

    def route(a, b):
        """Simplest orthogonal route from a to b that clears every other part."""
        x1, y1 = pos[a]
        x2, y2 = pos[b]
        sx, ex = x1 + R, x2 - R
        gut = (COL_W - CH_GAP) / 2.0        # the empty band between two columns

        candidates = []
        if abs(y1 - y2) < 0.5:
            candidates.append([(sx, y1), (ex, y2)])          # straight
        candidates.append([(sx, y1), (ex, y1), (ex, y2)])    # one corner, turn late
        candidates.append([(sx, y1), (sx, y2), (ex, y2)])    # one corner, turn early
        # two corners: drop into the gutter just past the source, then across
        cx = x1 + COL_W - gut
        candidates.append([(sx, y1), (cx, y1), (cx, y2), (ex, y2)])
        # two corners the other way: across first, down the target's gutter
        cx2 = x2 - gut
        candidates.append([(sx, y1), (cx2, y1), (cx2, y2), (ex, y2)])
        for pts in candidates:
            if clears(pts, a, b):
                return pts

        # Nothing simple fits, so find a clear LANE rather than inventing another
        # bespoke shape. Lanes sit between rows, searched outward from the source;
        # the first one that clears wins. This is what a long wire spanning three
        # columns needs - live-session -> r-live had no simple route at all.
        # Consider EVERY lane in the panel, nearest to the wire first. Searching
        # only from the source's own row left a three-column wire with no lane
        # once the panel bounds were enforced; the lane it needed existed, just
        # not at a whole-row offset from where it started.
        # A lane outside the panel is not a lane - the SVG does not clip, and an
        # unbounded search drew a wire above the top border.
        top = PAD_TOP - ROW_H / 2.0 + 8.0
        bottom = max(p[1] for p in pos.values()) + ROW_H / 2.0 - 8.0
        lanes = []
        ry = top
        while ry <= bottom:
            lanes.append(ry)
            ry += ROW_H / 2.0
        lanes.sort(key=lambda v: abs(v - (y1 + y2) / 2.0))
        for ry in lanes:
            pts = [(sx, y1), (cx, y1), (cx, ry), (cx2, ry), (cx2, y2), (ex, y2)]
            if clears(pts, a, b):
                return pts
        return candidates[-1]

    def path_of(points):
        """Rounded orthogonal path through the corner points."""
        pts = [points[0]]
        for q in points[1:]:
            if abs(q[0] - pts[-1][0]) > 0.1 or abs(q[1] - pts[-1][1]) > 0.1:
                pts.append(q)
        if len(pts) < 2:
            return "M%.1f %.1f" % points[0]
        d = ["M%.1f %.1f" % pts[0]]
        for i in range(1, len(pts) - 1):
            (px, py), (cx, cy), (nx, ny) = pts[i - 1], pts[i], pts[i + 1]
            dx1, dy1 = cx - px, cy - py
            dx2, dy2 = nx - cx, ny - cy
            l1 = max(abs(dx1), abs(dy1)) or 1.0
            l2 = max(abs(dx2), abs(dy2)) or 1.0
            r = min(CORNER, l1 / 2.0, l2 / 2.0)
            d.append("L%.1f %.1f" % (cx - dx1 / l1 * r, cy - dy1 / l1 * r))
            d.append("Q%.1f %.1f %.1f %.1f"
                     % (cx, cy, cx + dx2 / l2 * r, cy + dy2 / l2 * r))
        d.append("L%.1f %.1f" % pts[-1])
        return " ".join(d)

    ordered = [(a, b, e) for (a, b), e in links.items() if a in pos and b in pos]

    mesh_links = []
    for a, b, e in ordered:
        mesh_links.append(
            '<path class="mlink" id="l-%s--%s" data-a="%s" data-b="%s" d="%s">'
            '<title>%s</title></path>'
            % (esc(a), esc(b), esc(a), esc(b), path_of(route(a, b)),
               esc(e.get("label") or (a + " to " + b))))

    # Self-check reads the SAME route(), so it cannot drift from what is drawn.
    # Wire-to-wire crossings are deliberately not counted - they are allowed.
    crossings = [(a, b) for a, b, _e in ordered if not clears(route(a, b), a, b)]
    corners = sum(max(0, len(route(a, b)) - 2) for a, b, _e in ordered)

    def mesh_label(n):
        """A node name a person can read.

        Some labels in the source are URL paths, not names: `p-live` is labelled
        "/" because that is where the live cockpit is served. A slash is not a
        node name, so when a label carries fewer than two letters the `sub`
        stands in. The full "label · sub" is kept in the <title> either way.
        """
        lab = (n.get("label") or "").strip()
        if sum(c.isalpha() for c in lab) < 2:
            lab = (n.get("sub") or "").strip() or n["id"]
        return lab[:19] + "…" if len(lab) > 20 else lab

    mesh_nodes = []
    for sid in tour_ids:
        x, y = pos[sid]
        n = nodes[sid]
        lab = mesh_label(n)
        mesh_nodes.append(
            '<g class="mnode%s" id="n-%s"><circle cx="%.1f" cy="%.1f" r="%.1f"/>'
            '<text x="%.1f" y="%.1f">%s</text><title>%s</title></g>'
            % (" joint" if sid in shared else "", esc(sid), x, y, R,
               x - R + 1, y - 13, esc(lab),
               esc(" · ".join(p for p in [n.get("label"), n.get("sub")] if p))))

    mesh_svg = (
        '<svg class="meshsvg" viewBox="0 0 %d %d" role="img" '
        'aria-label="The desk as a network. Parts light as each path runs.">'
        '<g class="links">%s</g><g class="nodes">%s</g></svg>'
        % (mesh_w, mesh_h, "".join(mesh_links), "".join(mesh_nodes)))

    page = TEMPLATE
    for key, value in {
        "mesh": mesh_svg,
        "meshcount": str(len(tour_ids)),
        "meshlinks": str(len(mesh_links)),
        "joints": str(len(shared)),
        "csstabs": css_tabs,
        "idea": idea_html,
        "radios": "\n  ".join(radios),
        "tabs": "".join(tabs),
        "panels": "".join(panels),
        "nodes": str(len(g["nodes"])),
        "links": str(len(g["links"])),
        "batch": str(batch),
        "lastslot": str(batch - 1),
        "cols": str(batch),
        "enter": str(cfg["cardEnterMs"]),
        "draw": str(cfg["lineDrawMs"]),
        "filedown": str(cfg["filedownMs"]),
    }.items():
        page = page.replace("@@%s@@" % key, value)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  %d tours | batch %d | %d nodes, %d links in source"
          % (len(tours), batch, len(g["nodes"]), len(g["links"])))
    if crossings:
        print("  WARNING: %d wire(s) pass through a part:" % len(crossings))
        for a, b in crossings[:8]:
            print("    %s -> %s" % (a, b))
    else:
        print("  no wire passes through a part (%d checked)" % len(ordered))
    # Elegance metric: bends. Wire-to-wire crossings are allowed and uncounted.
    print("  %d bends across %d wires (%.2f per wire); %d wires are straight"
          % (corners, len(ordered), corners / float(len(ordered) or 1),
             sum(1 for a, b, _e in ordered if len(route(a, b)) == 2)))
    print("  stage.js present: %s" % (OUT_DIR / "stage.js").is_file())
    return 0


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The desk, one path at a time</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#0B0E13; --sheet:#131922; --deep:#0E141C;
  --ink:#EAF0F7; --ink-2:#A9B6C6; --muted:#6E7E92;
  --hair:#1E2733; --wire:#24303E;
  --live:#39BDF8; --warn:#F2994A; --ok:#4ADE80;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
  --enter:@@enter@@ms; --draw:@@draw@@ms; --filedown:@@filedown@@ms;
}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.6 var(--sans)}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(60rem 40rem at 70% -10%,rgba(57,189,248,.10),transparent 60%)}
.wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto;
  padding:clamp(28px,5vw,60px) clamp(16px,4vw,40px) 100px}
.kicker{margin:0 0 14px;font:500 11px/1 var(--mono);letter-spacing:.18em;
  text-transform:uppercase;color:var(--live)}
h1{margin:0 0 20px;max-width:16ch;font:900 clamp(30px,5.6vw,56px)/.97 var(--display);letter-spacing:-.045em}
.idea{margin:0 0 30px;max-width:62ch;font-size:clamp(16px,1.5vw,19px);line-height:1.55;color:var(--ink-2)}
.idea span{display:block;opacity:0;animation:rise .7s cubic-bezier(.2,.7,.3,1) forwards;animation-delay:var(--d)}
.idea span:first-child{color:var(--ink);font-weight:600}
@keyframes rise{from{opacity:0;transform:translateY(.5em)}to{opacity:1;transform:none}}

.t-radio{position:absolute;opacity:0;pointer-events:none}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.tab{cursor:pointer;border:1px solid var(--hair);background:var(--sheet);padding:9px 13px;
  display:flex;flex-direction:column;gap:2px;line-height:1.2}
.tab b{font:600 13px/1.3 var(--sans)}
.tab span{font:400 10px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.tab:hover{border-color:var(--live)}
.t-radio:focus-visible ~ .tabs label{outline:2px solid var(--live);outline-offset:2px}
.tour{display:none}
@@csstabs@@
.blurb{margin:0 0 18px;max-width:60ch;color:var(--muted);font:400 14.5px/1.6 var(--sans)}

/* ---------- no JS: every card in document order. This IS the fallback. ---- */
.slots{display:grid;gap:14px}
.card{position:relative;background:var(--sheet);border:1px solid var(--hair);padding:15px 17px}
.idx{position:absolute;top:12px;right:14px;font:500 10px/1 var(--mono);color:var(--muted)}
.card h3{margin:0 0 6px;font:600 16px/1.3 var(--sans);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.card h3 .sub{font:400 11px/1.4 var(--mono);color:var(--live);letter-spacing:.04em}
.what{margin:0 0 10px;color:var(--ink-2);font-size:14.5px}
.badge{display:inline-block;margin:0 6px 0 0;padding:2px 8px;font:500 10.5px/1.7 var(--mono);
  letter-spacing:.06em;text-transform:uppercase;border:1px solid currentColor}
.badge.g{color:var(--ok)} .badge.f{color:var(--warn)}
.flow{display:block;margin-top:8px;font:400 10.5px/1.5 var(--mono);color:var(--muted)}
details{margin-top:10px;border-top:1px solid var(--hair);padding-top:8px}
summary{cursor:pointer;font:500 11px/1.6 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
summary:hover,summary:focus-visible{color:var(--live)}
details p{margin:8px 0 0;color:var(--ink-2);font-size:14px}
.controls{display:flex;gap:8px;align-items:center;margin:16px 0 0;flex-wrap:wrap}

/* ---------- the mesh: one shared diagram under every tour --------------- */
.mesh{margin:26px 0 0;padding:18px;border:1px solid var(--hair);background:var(--deep)}
.mesh figcaption{margin:0 0 12px;font:400 11.5px/1.6 var(--mono);color:var(--muted)}
.meshsvg{width:100%;height:auto;display:block;overflow:visible}
.mnode circle{fill:var(--sheet);stroke:var(--wire);stroke-width:1.5}
/* A wire must never make a name hard to read. The label is painted stroke-first
   in the panel's own background colour, which knocks a halo out of anything
   passing behind the glyphs. Text still sits above the links group as well;
   the halo is what handles a wire crossing directly under a letter. */
.mnode text{font:500 11px/1 var(--mono);fill:var(--muted);
  paint-order:stroke fill;stroke:var(--deep);stroke-width:3.5px;
  stroke-linejoin:round;stroke-linecap:round}
.mnode.joint circle{stroke-dasharray:2 2}
.mlink{fill:none;stroke:var(--wire);stroke-width:1.5}
/* No JS: the finished diagram stands as a static picture of the whole system. */

/* ---------- JS on: the stage ------------------------------------------- */
.stage[data-js="on"] .slots{
  position:relative;grid-template-columns:repeat(@@cols@@,1fr);
  gap:0 clamp(26px,3.4vw,54px);align-items:start;
  min-height:clamp(230px,30vw,300px);
  padding:18px;border:1px solid var(--hair);background:
    linear-gradient(180deg,rgba(57,189,248,.05),transparent 60%),var(--deep)}
.stage[data-js="on"] .card{display:none;grid-row:1}
.stage[data-js="on"] .card.in{display:block;grid-column:calc(var(--slot) + 1);
  animation:land var(--enter) cubic-bezier(.2,.75,.3,1) both}
@keyframes land{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}

/* the live line: draws from a landed card toward the next slot */
.stage[data-js="on"] .card.in::after{content:"";position:absolute;top:50%;left:100%;
  height:2px;width:0;background:linear-gradient(90deg,var(--live),rgba(57,189,248,.15));
  animation:draw var(--draw) ease-out forwards;animation-delay:var(--enter)}
.stage[data-js="on"] .card.in[data-slot="@@lastslot@@"]::after{content:none}
@keyframes draw{to{width:clamp(26px,3.4vw,54px)}}
.stage[data-js="on"] .card.in::before{content:"";position:absolute;top:50%;left:100%;
  width:7px;height:7px;margin-top:-2.5px;border-radius:50%;background:var(--live);
  opacity:0;animation:travel 1.1s ease-in-out infinite;animation-delay:calc(var(--enter) + var(--draw))}
.stage[data-js="on"] .card.in[data-slot="@@lastslot@@"]::before{content:none}
@keyframes travel{0%{opacity:0;transform:translateX(0)}
  20%{opacity:1} 80%{opacity:1}
  100%{opacity:0;transform:translateX(clamp(26px,3.4vw,54px))}}

.stage[data-js="on"] .card.filing{animation:file var(--filedown) ease-in forwards}
@keyframes file{to{opacity:0;transform:translateY(40px) scale(.96)}}

.btn{cursor:pointer;background:var(--sheet);color:var(--ink);border:1px solid var(--hair);
  padding:7px 14px;font:500 12px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.btn:hover{border-color:var(--live);color:var(--live)}
.btn:focus-visible{outline:2px solid var(--live);outline-offset:2px}
.readout{font:400 11px/1 var(--mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase}

/* JS on: the mesh starts unlit and lights part by part as cards file down.
   A node that is not yet reached is DE-EMPHASISED, never illegible. Fading the
   whole <g> was the bug: it took the label's knockout halo down with it, so the
   name ended up muted grey at 18% on near-black and could not be read at all.
   The two states are carried by colour and by the circle's fill instead, and
   the text never drops below --ink-2. */
.mesh[data-js="on"] .mnode{opacity:1}
.mesh[data-js="on"] .mnode circle{fill:var(--deep);stroke:var(--wire);
  transition:fill .5s ease,stroke .5s ease}
.mesh[data-js="on"] .mnode text{fill:var(--ink-2);transition:fill .5s ease}
.mesh[data-js="on"] .mlink{opacity:.22;transition:opacity .6s ease}
.mesh[data-js="on"] .mnode.on circle{fill:var(--live);stroke:var(--live);
  animation:pop .5s cubic-bezier(.2,.8,.3,1) both}
.mesh[data-js="on"] .mnode.on text{fill:var(--ink)}
.mesh[data-js="on"] .mnode.joint.on circle{fill:var(--warn);stroke:var(--warn)}
.mesh[data-js="on"] .mlink.on{opacity:1;stroke:var(--live);
  stroke-dasharray:var(--len);stroke-dashoffset:var(--len);
  animation:wire .7s ease-out forwards}
@keyframes pop{from{transform:scale(.2);transform-origin:center}to{transform:none}}
@keyframes wire{to{stroke-dashoffset:0}}

@media (max-width:820px){
  .stage[data-js="on"] .slots{grid-template-columns:1fr;gap:14px;min-height:0}
  .stage[data-js="on"] .card.in{grid-column:1;grid-row:auto}
  .stage[data-js="on"] .card.in::after,.stage[data-js="on"] .card.in::before{content:none}
}
@media (prefers-reduced-motion:reduce){
  .idea span{animation:none;opacity:1;transform:none}
  .stage .card,.stage .done li{animation:none!important}
  .stage[data-js] .card{display:block!important;grid-column:auto!important;grid-row:auto!important}
  .stage[data-js] .slots{grid-template-columns:1fr!important;gap:14px!important;min-height:0!important}
  .card::after,.card::before{content:none!important}
}
.foot{margin-top:44px;padding-top:18px;border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:78ch}
.foot b{color:var(--ink-2);font-weight:500}
</style>
</head>
<body>
<div class="wrap">
  <p class="kicker">Tier 2 · the display case</p>
  <h1>The desk, one path at a time.</h1>
  <p class="idea">@@idea@@</p>

  @@radios@@
  <div class="tabs">@@tabs@@</div>
  <div class="panels">@@panels@@</div>

  <figure class="mesh">
    <figcaption>The same @@meshcount@@ parts as one system. Each lights when its path
    reaches it, and a wire appears once both ends are lit — so running a second path draws
    the joins to parts the first one already placed. @@joints@@ parts sit on more than one
    path; those are the joints.</figcaption>
    @@mesh@@
  </figure>

  <p class="foot">
    Topology read out of the running code: <b>@@nodes@@ parts, @@links@@ connections</b>,
    shown @@batch@@ at a time. Guard and defect badges appear only where a part's file matched
    real data — <b>a part with no badge is unmatched, not clean</b>.<br>
    The stage is an enhancement. With JavaScript off, every part of every path is present as a
    plain document, and under reduced-motion nothing animates and nothing auto-advances.
  </p>
</div>
<script src="stage.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
