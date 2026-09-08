"""Generate the tier-2 demonstration slice (DECISIONS.md D-A19..D-A23).

Stdlib only. Reads data/guards.json + data/evidence.json and writes
docs/tier-2-slice/index.html as REAL MARKUP - every guard, its protected text
and its sabotage case are in the document, not fetched.

Why generated rather than hand-authored: docs/tier-2.contract.json requires that
with JavaScript off, every guard is present and readable. A static page cannot
fetch, and this repo bans frameworks, so the markup is produced at author time
the same way build_cabinet_manifest.py produces its manifests.

There is NO JavaScript in the output at all. Select-a-guard is native
<details>/<summary>: keyboard-reachable, linkable by fragment, and unaffected by
prefers-reduced-motion because nothing animates.

Usage:
    python scripts/build_tier2_slice.py
"""

import html
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GUARDS_PATH = REPO_ROOT / "data" / "guards.json"
EVIDENCE_PATH = REPO_ROOT / "data" / "evidence.json"
OUT_PATH = REPO_ROOT / "docs" / "tier-2-slice" / "index.html"

# Palette E, "Drafting Monolith" (Stagecraft v2 x Monolith). Per D-A23 a palette
# is a per-tier token override and disposable - swap this block, change nothing
# else. The through-line is the type scale, spacing and component grammar below.
TOKENS = """
  --paper:#EFF2F6; --sheet:#FFFFFF; --deep:#E7EBF1;
  --ink:#0F1720; --ink-2:#3A4654; --muted:#4E5A68;
  --hair:#D3DCE8; --rule:#E3E9F1;
  --signal:#0D4FA0; --correct:#A82E10;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
"""


def esc(value):
    return html.escape(value if value is not None else "", quote=True)


def code(value):
    """Render a literal exactly, or say plainly that there isn't one."""
    if value is None or value == "":
        return '<span class="none">no literal — the whole file is rewritten</span>'
    return "<code>%s</code>" % esc(value)


def main():
    guards_doc = json.loads(GUARDS_PATH.read_text(encoding="utf-8"))
    guards = guards_doc["guards"]

    # The suite result is only quotable if a suite actually ran (D-A18/D-A21).
    suite_line = None
    if EVIDENCE_PATH.exists():
        ev = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        desk = next((s for s in ev["sources"] if s["id"] == "trading-desk"), None)
        if desk and desk.get("suite", {}).get("method") == "executed":
            s = desk["suite"]
            suite_line = "%d passed, %d skipped" % (s["passed"], s["skipped"])

    by_file = {}
    for g in guards:
        by_file.setdefault(g["file"] or "(whole tree)", []).append(g)
    files = sorted(by_file.items(), key=lambda kv: (-len(kv[1]), kv[0]))

    rows = []
    n = 0
    for filename, items in files:
        rows.append('<section class="plate">')
        rows.append('<h3 class="plate-h">%s <span class="cnt">%d guard%s</span></h3>'
                    % (esc(filename), len(items), "" if len(items) == 1 else "s"))
        for g in items:
            n += 1
            gid = "g-%s" % esc(g["test"]).replace("_", "-")
            rows.append(
                '<details id="%s" class="guard">'
                '<summary><span class="n">%03d</span>'
                '<span class="t">%s</span></summary>'
                '<div class="body">'
                '<p class="what">%s</p>'
                '<dl>'
                '<dt>Protects</dt><dd>%s</dd>'
                '<dt>Sabotage</dt><dd>%s</dd>'
                '</dl></div></details>'
                % (gid, n, esc(g["test"]), esc(g["mutation"]),
                   code(g["find"]),
                   code(g["replace"] if g["replace"] is not None
                        else (g["append"] if g["append"] is not None else g["mode"])))
            )
        rows.append("</section>")

    doc = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How the guards are proven — tier 2 slice</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {%(tokens)s
  --measure: 62ch;
}
*,*::before,*::after { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink);
  font:400 15.5px/1.65 var(--sans);
  background-image:
    repeating-linear-gradient(to right, var(--rule) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px 24px); }
.wrap { max-width:1020px; margin:0 auto; padding:clamp(28px,5vw,72px) clamp(20px,4vw,44px) 96px; }

/* --- persistent cluster 1 of 2: identity + navigation ------------------- */
.chrome { display:flex; justify-content:space-between; align-items:baseline; gap:20px;
  flex-wrap:wrap; padding-bottom:clamp(34px,5vw,64px); }
.chrome .id { font:800 16px/1 var(--display); letter-spacing:-.03em; }
.chrome nav a { font:500 13px/1 var(--sans); color:var(--muted); text-decoration:none; margin-left:20px; }
.chrome nav a:hover, .chrome nav a:focus-visible { color:var(--signal); }

.kicker { font:500 11px/1 var(--mono); letter-spacing:.16em; text-transform:uppercase;
  color:var(--muted); margin:0 0 16px; }
h1 { margin:0 0 22px; max-width:16ch; font:900 clamp(34px,6vw,62px)/.94 var(--display);
  letter-spacing:-.045em; }
.premise { margin:0 0 clamp(30px,4vw,44px); max-width:var(--measure);
  font-size:clamp(16px,1.4vw,18px); line-height:1.6; color:var(--ink-2); }
.premise b { color:var(--ink); font-weight:600; }

/* --- overview before detail (contract narrative_sequence) --------------- */
.overview { display:flex; flex-wrap:wrap; gap:clamp(20px,3vw,48px);
  padding:22px 0; border-top:1px solid var(--hair); border-bottom:1px solid var(--hair);
  margin-bottom:clamp(30px,4vw,46px); }
.ov b { display:block; font:800 clamp(24px,2.6vw,32px)/1 var(--display);
  letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.ov span { display:block; margin-top:6px; font:400 11px/1.4 var(--mono);
  letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }

/* --- the demonstration -------------------------------------------------- */
.plate { background:var(--sheet); border:1px solid var(--hair); border-radius:3px;
  margin-bottom:18px; }
.plate-h { margin:0; padding:14px 18px; border-bottom:1px solid var(--hair);
  font:500 13px/1.4 var(--mono); color:var(--ink); display:flex;
  justify-content:space-between; gap:16px; flex-wrap:wrap; }
.plate-h .cnt { color:var(--muted); font-size:11px; letter-spacing:.06em;
  text-transform:uppercase; }
.guard { border-bottom:1px solid var(--rule); }
.guard:last-child { border-bottom:0; }
summary { display:flex; gap:14px; align-items:baseline; cursor:pointer;
  padding:12px 18px; list-style:none; }
summary::-webkit-details-marker { display:none; }
summary:hover { background:#F4F7FB; }
summary:focus-visible { outline:2px solid var(--signal); outline-offset:-2px; }
.guard[open] summary { background:#F4F7FB; }
.n { font:400 11px/1.7 var(--mono); color:var(--muted); font-variant-numeric:tabular-nums; }
.t { font:500 14px/1.5 var(--mono); color:var(--ink); word-break:break-word; }
.body { padding:2px 18px 18px 46px; }
.what { margin:0 0 14px; max-width:var(--measure); color:var(--ink-2); font-size:14.5px; }
dl { margin:0; display:grid; grid-template-columns:6.5rem 1fr; gap:8px 16px; }
dt { font:500 10.5px/1.7 var(--mono); letter-spacing:.1em; text-transform:uppercase;
  color:var(--muted); }
dd { margin:0; min-width:0; }
code { display:block; overflow-x:auto; padding:9px 11px; background:var(--deep);
  border-left:2px solid var(--signal); font:400 12.5px/1.6 var(--mono);
  color:var(--ink); white-space:pre-wrap; word-break:break-word; }
dd:last-of-type code { border-left-color:var(--correct); }
.none { font:400 12.5px/1.6 var(--mono); color:var(--muted); }

.stamp { margin-top:clamp(34px,4vw,52px); padding-top:20px;
  border-top:2px solid var(--ink); font:400 12px/1.7 var(--mono); color:var(--muted); }
.stamp b { color:var(--ink); font-weight:500; }

@media (max-width:600px) {
  .body { padding-left:18px; }
  dl { grid-template-columns:1fr; gap:5px; }
  dt { margin-top:8px; }
}
</style>
</head>
<body>
<div class="wrap">

  <header class="chrome">
    <span class="id">JORDAN DOERKSEN</span>
    <nav><a href="../../">Home</a><a href="../skin-lab/">Skin lab</a></nav>
  </header>

  <p class="kicker">Tier 2 · slice 1 · the work</p>
  <h1>A green light of unknown wiring.</h1>
  <p class="premise">A test that has never failed is not a guard. To find out whether one
  actually bites, you have to break the thing it protects on purpose and watch it go red.
  <b>%(published)d guards below, across %(filecount)d files.</b> Each one is driven into the
  failure it exists to catch, then the tree is restored — and the restore is proven by SHA256,
  because a sabotage run that leaves a stray character behind is worse than none.</p>

  <div class="overview">
    <div class="ov"><b>%(published)d</b><span>guards proven to bite</span></div>
    <div class="ov"><b>%(filecount)d</b><span>files protected</span></div>
    <div class="ov"><b>%(stale)d</b><span>stale, excluded</span></div>
    %(suite)s
  </div>

%(rows)s

  <p class="stamp">
    Generated <b>%(generated)s</b> from <b>%(srcfile)s</b> at commit <b>%(commit)s</b>.
    This is a stamped snapshot, not a live reading.<br>
    A guard whose test no longer exists is excluded rather than shown —
    %(stalewords)s.
  </p>

</div>
</body>
</html>
""" % {
        "tokens": TOKENS,
        "rows": "\n".join("  " + r for r in rows),
        "published": guards_doc["counts"]["published"],
        "stale": guards_doc["counts"]["staleExcluded"],
        "stalewords": ("this run found none"
                       if guards_doc["counts"]["staleExcluded"] == 0
                       else "this run excluded %d" % guards_doc["counts"]["staleExcluded"]),
        "filecount": len(files),
        "generated": esc(guards_doc["generated"][:10]),
        "srcfile": esc(guards_doc["source"]["file"]),
        "commit": esc(guards_doc["source"]["commit"] or "unknown"),
        "suite": ('<div class="ov"><b>%s</b><span>last real run</span></div>'
                  % esc(suite_line)) if suite_line else "",
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(doc, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  %d guards, %d files, %d stale excluded"
          % (guards_doc["counts"]["published"], len(files),
             guards_doc["counts"]["staleExcluded"]))
    print("  suite line: %s" % (suite_line or "NOT SHOWN - no executed run in evidence.json"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
