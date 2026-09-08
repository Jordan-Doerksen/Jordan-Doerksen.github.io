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
                '<article class="card" data-label="%s"%s>'
                '<span class="idx">%02d</span>'
                '<h3>%s<span class="sub">%s</span></h3>'
                '<p class="what">%s</p>'
                '%s%s'
                '<details><summary>Where it lives</summary><p>%s</p></details>'
                '</article>'
                % (esc(n["label"]),
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
            '<ol class="done" aria-label="Parts already shown"></ol>'
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

    page = TEMPLATE
    for key, value in {
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
.done{list-style:none;margin:0;padding:0}

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
.stage[data-js="on"] .done{margin-top:16px;border-top:1px solid var(--hair);padding-top:12px}
.stage[data-js="on"] .done li{display:flex;gap:12px;align-items:baseline;padding:7px 0;
  border-bottom:1px solid var(--hair);font:500 13px/1.5 var(--mono);color:var(--ink-2);
  animation:land .4s ease both}
.stage[data-js="on"] .done li .b{font:400 10px/1 var(--mono);letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted)}

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
