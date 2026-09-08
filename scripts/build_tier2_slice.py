"""Generate the tier-2 evidence page (DECISIONS.md D-A19..D-A23).

Stdlib only. Reads data/guards.json + data/evidence.json and writes
docs/tier-2-slice/index.html.

STRUCTURE: "mutants rendered in the source", after the Stryker mutation-testing
report and mutation-testing-elements (github.com/stryker-mutator/mutation-testing-elements).
Results group by file; each guard shows the protected literal with the guarded
line marked, and DIRECTLY BENEATH IT the mutation as a two-line diff. The reading
unit is a delta held on screen, not an entry you open. Nothing is behind a toggle.

Honest limit on the precedent, stated rather than glossed: Stryker renders mutants
inside COMPLETE source files. This data holds only the protected fragment, so
"the file is the index" is weaker here than in the original.

Zero JavaScript. Position comes from a sticky filename, navigation from a
45-item ordinal index. The diff gutters are CSS content, so the delta survives
colour-blindness, printing and a failed font load.

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

HEADER_H = "3.25rem"

# Palette per D-A23: a per-tier token override, disposable. Swap this block and
# nothing else changes. The through-line is the type scale, spacing and
# component grammar below, which are NOT per-tier tweakables.
TOKENS = """
  --paper:#EFF2F6; --sheet:#FFFFFF; --deep:#E7EBF1;
  --ink:#0F1720; --ink-2:#3A4654; --muted:#4E5A68;
  --hair:#D3DCE8; --rule:#E9EEF4;
  --keep:#0D4FA0; --cut:#A82E10;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
"""


def esc(v):
    return html.escape(v if v is not None else "", quote=True)


def mutation_of(g):
    """What the sabotage puts in place of the protected text."""
    if g.get("replace") is not None:
        return g["replace"], "replaced"
    if g.get("append") is not None:
        return g["append"], "appended"
    if g.get("mode"):
        return g["mode"], "rewritten"
    return None, "removed"


def main():
    doc_guards = json.loads(GUARDS_PATH.read_text(encoding="utf-8"))
    guards = doc_guards["guards"]

    suite = None
    if EVIDENCE_PATH.exists():
        ev = json.loads(EVIDENCE_PATH.read_text(encoding="utf-8"))
        desk = next((s for s in ev["sources"] if s["id"] == "trading-desk"), None)
        if desk and desk.get("suite", {}).get("method") == "executed":
            s = desk["suite"]
            suite = "%d passed, %d skipped" % (s["passed"], s["skipped"])

    by_file = {}
    for g in guards:
        by_file.setdefault(g["file"] or "(whole tree)", []).append(g)
    files = sorted(by_file.items(), key=lambda kv: kv[0])

    nav, body, gnum = [], [], 0
    for fi, (filename, items) in enumerate(files, 1):
        fid = "f%02d" % fi
        nav.append('<li><a href="#%s">%s</a> <span>%d</span></li>'
                   % (fid, esc(filename), len(items)))
        body.append('<section class="file" id="%s">' % fid)
        body.append('<h2>%s <span class="n">%d guard%s</span></h2>'
                    % (esc(filename), len(items), "" if len(items) == 1 else "s"))

        for g in items:
            gnum += 1
            gid = "g%03d" % gnum
            kept = g.get("find")
            cut, verb = mutation_of(g)

            body.append('<article class="mutant" id="%s">' % gid)
            body.append('<div class="delta" role="region" tabindex="0" '
                        'aria-label="Guard %d: protected text and its sabotage">' % gnum)
            if kept:
                body.append('<pre class="keep"><mark>%s</mark></pre>' % esc(kept))
            else:
                body.append('<pre class="keep none">the whole file is rewritten — '
                            'no single protected literal</pre>')
            if cut is not None and kept:
                body.append('<pre class="cut">%s</pre>' % esc(cut))
            elif cut is not None:
                body.append('<pre class="cut">%s</pre>' % esc(cut))
            else:
                body.append('<pre class="cut">the protected text is deleted</pre>')
            body.append("</div>")
            body.append('<p class="test"><a href="#%s">%s</a><span class="verb">%s</span></p>'
                        % (gid, esc(g["test"]), esc(verb)))
            body.append("</article>")

        body.append("</section>")

    # Prescriptive closing section. Ranked by guard count, stated WITHOUT a
    # denominator claim: this data cannot say what coverage a file needs, only
    # how many guards it currently has.
    thin = [(f, len(i)) for f, i in files if len(i) == 1]
    thin_rows = "".join('<li><a href="#f%02d">%s</a></li>'
                        % ([n for n, (fn, _) in enumerate(files, 1) if fn == f][0], esc(f))
                        for f, _ in thin)

    page = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(gcount)d guards and their sabotage cases</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {%(tokens)s --hh:%(hh)s; }
*,*::before,*::after { box-sizing:border-box; }
html { overflow-x:clip; scroll-behavior:smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior:auto; } }
body { margin:0; background:var(--paper); color:var(--ink);
  font:400 15.5px/1.6 var(--sans);
  background-image:
    repeating-linear-gradient(to right, var(--rule) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(to bottom, var(--rule) 0 1px, transparent 1px 24px); }

.bar { position:sticky; top:0; z-index:3; height:var(--hh); display:flex;
  align-items:center; justify-content:space-between; gap:20px;
  padding:0 clamp(16px,4vw,40px); background:var(--paper);
  border-bottom:1px solid var(--hair); }
.bar .id { font:800 14px/1 var(--display); letter-spacing:-.03em; }
.bar a { font:500 12.5px/1 var(--sans); color:var(--muted); text-decoration:none; margin-left:18px; }
.bar a:hover, .bar a:focus-visible { color:var(--keep); }

.wrap { max-width:1120px; margin:0 auto; padding:clamp(30px,5vw,64px) clamp(16px,4vw,40px) 100px; }
.kicker { margin:0 0 14px; font:500 11px/1 var(--mono); letter-spacing:.16em;
  text-transform:uppercase; color:var(--muted); }
h1 { margin:0 0 20px; max-width:20ch; font:900 clamp(30px,5.4vw,56px)/.96 var(--display);
  letter-spacing:-.045em; }
.lede { margin:0 0 30px; max-width:66ch; color:var(--ink-2); font-size:16px; }
.lede b { color:var(--ink); font-weight:600; }

.counts { display:flex; flex-wrap:wrap; gap:clamp(18px,3vw,44px); padding:20px 0;
  border-top:1px solid var(--hair); border-bottom:1px solid var(--hair); margin-bottom:34px; }
.counts b { display:block; font:800 clamp(22px,2.4vw,30px)/1 var(--display);
  letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.counts span { display:block; margin-top:5px; font:400 10.5px/1.4 var(--mono);
  letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }

/* index — the JS-off navigation and the sitemap */
.index { margin:0 0 40px; }
.index h2 { margin:0 0 12px; font:500 11px/1 var(--mono); letter-spacing:.14em;
  text-transform:uppercase; color:var(--muted); }
.index ol { counter-reset:n; list-style:none; margin:0; padding:0;
  columns:2; column-gap:32px; }
@media (max-width:720px) { .index ol { columns:1; } }
.index li { counter-increment:n; break-inside:avoid; display:flex; gap:10px;
  align-items:baseline; padding:5px 0; border-bottom:1px solid var(--rule); }
.index li::before { content:counter(n,decimal-leading-zero);
  font:400 10.5px/1.7 var(--mono); color:var(--muted); }
.index a { flex:1; font:500 13px/1.5 var(--mono); color:var(--ink);
  text-decoration:none; word-break:break-all; }
.index a:hover, .index a:focus-visible { color:var(--keep); }
.index span { font:400 10.5px/1.7 var(--mono); color:var(--muted); }

/* one section per file; the filename is the position indicator */
.file { margin-bottom:40px; }
.file h2 { position:sticky; top:var(--hh); z-index:2; margin:0 0 14px;
  padding:10px 14px; background:var(--deep); border-left:2px solid var(--ink);
  font:500 13px/1.5 var(--mono); display:flex; justify-content:space-between;
  gap:14px; flex-wrap:wrap; word-break:break-all; }
.file h2 .n { color:var(--muted); font-size:10.5px; letter-spacing:.08em;
  text-transform:uppercase; }
.file { scroll-margin-top:calc(var(--hh) + 8px); }
.mutant { scroll-margin-top:calc(var(--hh) + 60px); }

/* the delta: protected text, then what the sabotage puts there */
.mutant { display:grid; grid-template-columns:1fr; gap:6px; margin:0 0 16px; }
.delta { overflow-x:auto; background:var(--sheet); border:1px solid var(--hair); }
.delta:focus-visible { outline:2px solid var(--keep); outline-offset:2px; }
pre { margin:0; padding:9px 12px 9px 30px; position:relative;
  font:400 12.5px/1.65 var(--mono); white-space:pre; }
pre::before { position:absolute; left:11px; font-weight:500; }
.keep { color:var(--ink); border-left:3px solid var(--keep); }
.keep::before { content:"\\2212"; color:var(--keep); }
.cut { color:var(--ink); border-left:3px solid var(--cut); background:#FDF6F4; }
.cut::before { content:"+"; color:var(--cut); }
.keep mark { background:#E6EDF9; color:inherit; padding:0 2px; }
.none, .cut:only-of-type { font-style:normal; color:var(--muted); }
.test { margin:0; font:400 11.5px/1.6 var(--mono); color:var(--muted);
  display:flex; gap:10px; flex-wrap:wrap; }
.test a { color:var(--muted); text-decoration:none; word-break:break-all; }
.test a:hover, .test a:focus-visible { color:var(--keep); text-decoration:underline; }
.test .verb { color:var(--cut); letter-spacing:.06em; text-transform:uppercase; font-size:10px; }

/* edge annotation at wide widths; normal flow below */
@media (min-width:56rem) {
  .mutant { grid-template-columns:1fr 15rem; column-gap:20px; align-items:start; }
  .test { justify-content:flex-start; padding-top:8px; }
}

.gaps { margin-top:48px; padding-top:22px; border-top:2px solid var(--ink); }
.gaps h2 { margin:0 0 8px; font:800 20px/1.2 var(--display); letter-spacing:-.03em; }
.gaps p { margin:0 0 14px; max-width:62ch; color:var(--ink-2); font-size:14.5px; }
.gaps ul { margin:0; padding:0; list-style:none; columns:2; column-gap:28px; }
@media (max-width:720px) { .gaps ul { columns:1; } }
.gaps li { break-inside:avoid; padding:4px 0; }
.gaps a { font:500 12.5px/1.6 var(--mono); color:var(--ink); text-decoration:none;
  word-break:break-all; }
.gaps a:hover, .gaps a:focus-visible { color:var(--keep); }

.stamp { margin-top:36px; padding-top:18px; border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono); color:var(--muted); max-width:74ch; }
.stamp b { color:var(--ink); font-weight:500; }
</style>
</head>
<body>

<div class="bar">
  <span class="id">JORDAN DOERKSEN</span>
  <nav><a href="../../">Home</a><a href="#index">Files</a><a href="#gaps">Thin cover</a></nav>
</div>

<div class="wrap">
  <p class="kicker">Tier 2 · the work</p>
  <h1>%(gcount)d guards, each one broken on purpose.</h1>
  <p class="lede">A test that has never failed proves nothing. Every guard below was driven
  into the failure it exists to catch, then the file was restored and the restore checked by
  SHA256. <b>Blue is the text the guard protects. Red is what the sabotage puts there
  instead.</b> If the guard does not go red, it does not ship.</p>

  <div class="counts">
    <div><b>%(gcount)d</b><span>guards</span></div>
    <div><b>%(fcount)d</b><span>files</span></div>
    <div><b>%(stale)d</b><span>stale, excluded</span></div>
    %(suite)s
  </div>

  <nav class="index" id="index">
    <h2>Files</h2>
    <ol>%(nav)s</ol>
  </nav>

%(body)s

  <section class="gaps" id="gaps">
    <h2>Thin cover</h2>
    <p>%(thincount)d of these files carry exactly one guard. That is a count, not a verdict —
    this data cannot say how many guards a file needs, only how many it has.</p>
    <ul>%(thin)s</ul>
  </section>

  <p class="stamp">
    Generated <b>%(gen)s</b> from <b>%(src)s</b> at commit <b>%(commit)s</b>. A stamped
    snapshot, not a live reading.<br>
    A guard whose test is no longer defined in the suite is excluded rather than shown —
    %(stalewords)s.<br>
    Structure after the Stryker mutation-testing report. Stryker renders mutants inside
    complete source files; this page holds only the protected fragment, so the file is a
    grouping here rather than the full index it is there.
  </p>
</div>

</body>
</html>
""" % {
        "tokens": TOKENS,
        "hh": HEADER_H,
        "gcount": doc_guards["counts"]["published"],
        "fcount": len(files),
        "stale": doc_guards["counts"]["staleExcluded"],
        "stalewords": ("this run found none" if doc_guards["counts"]["staleExcluded"] == 0
                       else "this run excluded %d" % doc_guards["counts"]["staleExcluded"]),
        "suite": ('<div><b>%s</b><span>last real run</span></div>' % esc(suite)) if suite else "",
        "nav": "".join(nav),
        "body": "\n".join("  " + b for b in body),
        "thin": thin_rows,
        "thincount": len(thin),
        "gen": esc(doc_guards["generated"][:10]),
        "src": esc(doc_guards["source"]["file"]),
        "commit": esc(doc_guards["source"]["commit"] or "unknown"),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  %d guards, %d files, %d with a single guard"
          % (doc_guards["counts"]["published"], len(files), len(thin)))
    print("  suite line: %s" % (suite or "NOT SHOWN — no executed run recorded"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
