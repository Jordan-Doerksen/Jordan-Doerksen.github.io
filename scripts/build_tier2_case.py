"""Generate the tier-2 display case (DECISIONS.md CR-11).

Stdlib only. Reads the desk network graph plus the guard and finding data, and
writes docs/tier-2-case/index.html.

WHAT THIS IS. Tier 2 is a display case, not a tool. The desk itself is austere
because it is bound - read-only, fail-closed, no motion. The site is not bound
that way, and applying tool discipline to a display case was the category error
behind three discarded drafts.

WHAT IT SHOWS. One path at a time, not the whole topology. The source graph has
54 nodes and 78 links, which the owner judged "too large a section with too much
that nobody clicks". It also carries five curated TOURS, and a tour is the unit
here: the market data path is 9 steps, the order path is 3.

HOW IT MOVES. Pips travel the wire between steps, the connector draws itself in,
and the opening sentence reveals a clause at a time. All of it is CSS keyframes -
no JavaScript anywhere, and every animation is switched off wholesale under
prefers-reduced-motion. The tour switcher is radio inputs and :checked, so it
works with scripting fully disabled.

STATE ON THE NODES. Where a node's file appears in guards.json or findings.json,
its badges are real. Where it does not, NOTHING is shown - never a zero, because
this data cannot tell "no guards" from "no match" (the same rule as the evidence
snapshot's suspect-zero flag).

Usage:
    python scripts/build_tier2_case.py
"""

import html
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GRAPH = Path("C:/projects/trading/desk-network-map/data/graph-runtime.json")
OUT_PATH = REPO_ROOT / "docs" / "tier-2-case" / "index.html"


def esc(v):
    return html.escape(str(v) if v is not None else "", quote=True)


def load():
    g = json.loads(GRAPH.read_text(encoding="utf-8"))
    G = json.loads((REPO_ROOT / "data" / "guards.json").read_text(encoding="utf-8"))
    F = json.loads((REPO_ROOT / "data" / "findings.json").read_text(encoding="utf-8"))
    return g, G, F


def node_state(node, guard_files, finding_paths):
    """Real badges only. Absent stays absent - never a fabricated zero."""
    blob = " ".join(str(node.get(k, "")) for k in ("where", "what", "sub", "id", "label"))
    guards = sum(n for f, n in guard_files.items() if f and f.split("/")[-1] in blob)
    faults = [w for w in finding_paths
              if w and w.split(":")[0].split("/")[-1] in blob]
    return (guards or None), (len(faults) or None)


def main():
    g, G, F = load()

    guard_files = {}
    for x in G["guards"]:
        guard_files[x["file"]] = guard_files.get(x["file"], 0) + 1
    finding_paths = [f.get("where") or "" for f in F["findings"] if f["status"] == "open"]

    nodes = {n["id"]: n for n in g["nodes"]}
    links = {}
    for e in g["links"]:
        links[(e["from"], e["to"])] = e

    tours = g.get("tours", [])
    if not tours:
        print("ERROR: no tours in the graph - nothing to display")
        return 1

    # ---- switcher -------------------------------------------------------
    radios, tabs, panels = [], [], []
    for ti, t in enumerate(tours):
        tid = esc(t["id"])
        checked = " checked" if ti == 0 else ""
        radios.append('<input type="radio" name="tour" id="t-%s" class="t-radio"%s>'
                      % (tid, checked))
        # "parts", not "steps": the order path lists 4 nodes and its own blurb says
        # "three steps long" - 4 parts, 3 hops. Labelling these as steps put a
        # visible contradiction on the page.
        tabs.append('<label for="t-%s" class="tab"><b>%s</b><span>%d parts</span></label>'
                    % (tid, esc(t["label"]), len(t["steps"])))

        steps = []
        prev = None
        for si, sid in enumerate(t["steps"]):
            n = nodes.get(sid)
            if not n:
                continue
            link = links.get((prev, sid)) if prev else None
            prev = sid
            gcount, fcount = node_state(n, guard_files, finding_paths)

            wire = ""
            if si:
                wire = ('<div class="wire" style="--d:%dms">'
                        '<span class="pip"></span><span class="pip p2"></span>'
                        '%s</div>'
                        % (si * 220,
                           ('<span class="wlabel">%s</span>' % esc(link["label"]))
                           if link and link.get("label") else ""))

            badges = ""
            if gcount:
                badges += '<span class="badge g">%d guard%s</span>' % (
                    gcount, "" if gcount == 1 else "s")
            if fcount:
                badges += '<span class="badge f">%d open defect%s</span>' % (
                    fcount, "" if fcount == 1 else "s")

            steps.append(
                '%s<article class="step" style="--d:%dms">'
                '<div class="dot"></div>'
                '<div class="card">'
                '<h3>%s<span class="sub">%s</span></h3>'
                '<p class="what">%s</p>'
                '%s'
                '<details><summary>Where it lives</summary><p>%s</p></details>'
                '</div></article>'
                % (wire, si * 220, esc(n["label"]), esc(n.get("sub", "")),
                   esc(n.get("what", "")), badges, esc(n.get("where", "—")))
            )

        panels.append(
            '<section class="tour" id="p-%s" aria-label="%s">'
            '<p class="blurb">%s</p>%s</section>'
            % (tid, esc(t["label"]), esc(t.get("blurb", "")), "".join(steps)))

    idea = g.get("dominant_idea", "")
    clauses = [c.strip() for c in idea.replace(" and leaves", ", and leaves").split(",") if c.strip()]
    idea_html = "".join('<span style="--d:%dms">%s</span>' % (i * 420, esc(c))
                        for i, c in enumerate(clauses))

    css_tabs = "\n".join(
        "#t-%s:checked ~ .tabs label[for=\"t-%s\"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}\n"
        "#t-%s:checked ~ .panels #p-%s{display:block}" % (esc(t["id"]), esc(t["id"]), esc(t["id"]), esc(t["id"]))
        for t in tours)

    page = """<!doctype html>
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
}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.6 var(--sans)}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(60rem 40rem at 70% -10%,rgba(57,189,248,.10),transparent 60%)}
.wrap{position:relative;z-index:1;max-width:920px;margin:0 auto;
  padding:clamp(28px,5vw,64px) clamp(16px,4vw,40px) 100px}

.kicker{margin:0 0 14px;font:500 11px/1 var(--mono);letter-spacing:.18em;
  text-transform:uppercase;color:var(--live)}
h1{margin:0 0 22px;max-width:16ch;font:900 clamp(30px,5.6vw,58px)/.97 var(--display);
  letter-spacing:-.045em}
.idea{margin:0 0 34px;max-width:60ch;font-size:clamp(16px,1.5vw,19px);line-height:1.55;color:var(--ink-2)}
.idea span{display:block;opacity:0;animation:rise .7s cubic-bezier(.2,.7,.3,1) forwards;
  animation-delay:var(--d)}
.idea span:first-child{color:var(--ink);font-weight:600}
@keyframes rise{from{opacity:0;transform:translateY(.5em)}to{opacity:1;transform:none}}

.t-radio{position:absolute;opacity:0;pointer-events:none}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 26px}
.tab{cursor:pointer;border:1px solid var(--hair);background:var(--sheet);
  padding:9px 13px;display:flex;flex-direction:column;gap:2px;line-height:1.2}
.tab b{font:600 13px/1.3 var(--sans)}
.tab span{font:400 10px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.tab:hover{border-color:var(--live)}
.t-radio:focus-visible ~ .tabs label{outline:2px solid var(--live);outline-offset:2px}
.tour{display:none}
@@csstabs@@

.blurb{margin:0 0 22px;max-width:58ch;color:var(--muted);font:400 14.5px/1.6 var(--sans)}
.step{position:relative;padding:0 0 0 34px;animation:in .55s ease both;animation-delay:var(--d)}
@keyframes in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
.dot{position:absolute;left:6px;top:16px;width:11px;height:11px;border-radius:50%;
  background:var(--live);box-shadow:0 0 0 4px rgba(57,189,248,.15)}
.wire{position:relative;height:46px;margin-left:11px;border-left:2px solid var(--wire);
  animation:grow .5s ease both;animation-delay:var(--d)}
@keyframes grow{from{height:0}to{height:46px}}
.wlabel{position:absolute;left:14px;top:13px;font:400 10.5px/1 var(--mono);
  letter-spacing:.06em;color:var(--muted);white-space:nowrap;max-width:60vw;overflow:hidden;
  text-overflow:ellipsis}
.pip{position:absolute;left:-4px;top:0;width:6px;height:6px;border-radius:50%;
  background:var(--live);animation:flow 2.4s linear infinite;animation-delay:var(--d)}
.pip.p2{animation-delay:calc(var(--d) + 1.2s);opacity:.55}
@keyframes flow{from{transform:translateY(-4px);opacity:0}
  12%{opacity:1} 88%{opacity:1} to{transform:translateY(44px);opacity:0}}

.card{background:var(--sheet);border:1px solid var(--hair);padding:14px 16px}
.card h3{margin:0 0 6px;font:600 16px/1.3 var(--sans);display:flex;gap:10px;
  align-items:baseline;flex-wrap:wrap}
.card h3 .sub{font:400 11px/1.4 var(--mono);color:var(--live);letter-spacing:.04em}
.what{margin:0 0 10px;color:var(--ink-2);font-size:14.5px;max-width:62ch}
.badge{display:inline-block;margin:0 6px 0 0;padding:2px 8px;font:500 10.5px/1.7 var(--mono);
  letter-spacing:.06em;text-transform:uppercase;border:1px solid currentColor}
.badge.g{color:var(--ok)} .badge.f{color:var(--warn)}
details{margin-top:10px;border-top:1px solid var(--hair);padding-top:8px}
summary{cursor:pointer;font:500 11px/1.6 var(--mono);letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted)}
summary:hover,summary:focus-visible{color:var(--live)}
details p{margin:8px 0 0;color:var(--ink-2);font-size:14px;max-width:62ch}

.foot{margin-top:48px;padding-top:18px;border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:74ch}
.foot b{color:var(--ink-2);font-weight:500}

@media (prefers-reduced-motion:reduce){
  .idea span,.step,.wire{animation:none;opacity:1;transform:none;height:46px}
  .pip{display:none}
}
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

  <p class="foot">
    Topology read out of the running code: <b>@@nodes@@ parts, @@links@@ connections</b>,
    of which one path is shown at a time. Guard and defect badges appear only where a node's
    file matched real data — <b>a node with no badge is unmatched, not clean</b>.<br>
    Five tours, zero JavaScript. The switcher is radio inputs; the motion is CSS and stops
    entirely under reduced-motion.
  </p>
</div>
</body>
</html>
"""

    for key, value in {
        "csstabs": css_tabs,
        "idea": idea_html,
        "radios": "\n  ".join(radios),
        "tabs": "".join(tabs),
        "panels": "".join(panels),
        "nodes": str(len(g["nodes"])),
        "links": str(len(g["links"])),
    }.items():
        page = page.replace("@@%s@@" % key, value)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  %d tours | %d nodes, %d links in source | badges from %d guard files, %d open findings"
          % (len(tours), len(g["nodes"]), len(g["links"]), len(guard_files), len(finding_paths)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
