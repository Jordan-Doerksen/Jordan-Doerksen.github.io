"""Generate the tier-2 desk case study (DECISIONS.md D-A24).

Stdlib only. Reads data/guards.json, data/findings.json and data/evidence.json
and writes docs/tier-2-desk/index.html.

D-A24: tier 2 is ONE project in depth and its claim is "it holds up". The page is
an argument in five steps, and every step leads with an aggregate:

  1 what it is        2 what can go wrong     3 what catches it
  4 proof it bites    5 what is still broken

Charts are generated inline SVG - no library, no build step, no JavaScript.
Every bar carries its value as text, so nothing depends on colour or on the SVG
rendering at all. The code deltas appear only in step 4, as drill-down.

Usage:
    python scripts/build_tier2_desk.py
"""

import html
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = REPO_ROOT / "docs" / "tier-2-desk" / "index.html"
HH = "3.25rem"

TOKENS = """
  --paper:#EFF2F6; --sheet:#FFFFFF; --deep:#E7EBF1;
  --ink:#0F1720; --ink-2:#3A4654; --muted:#4E5A68;
  --hair:#D3DCE8; --rule:#E9EEF4;
  --keep:#0D4FA0; --cut:#A82E10; --ok:#1D6F42;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
"""

SEVERITY_ORDER = ["breaks-now", "wrong-output", "breaks-later", "cosmetic", "unrecorded"]


def esc(v):
    return html.escape(v if v is not None else "", quote=True)


def bars(rows, accent, caption):
    """Horizontal bar chart as inline SVG. Every value is also text."""
    rows = [r for r in rows if r[1] > 0]
    if not rows:
        return ""
    top = max(r[1] for r in rows)
    rh, gap, lw = 26, 8, 190
    h = len(rows) * (rh + gap)
    parts = ['<svg class="chart" viewBox="0 0 640 %d" role="img" aria-label="%s">'
             % (h, esc(caption))]
    for i, (label, value) in enumerate(rows):
        y = i * (rh + gap)
        w = int((value / top) * (640 - lw - 46))
        parts.append(
            '<text x="0" y="%d" class="bl">%s</text>'
            '<rect x="%d" y="%d" width="%d" height="%d" fill="%s" rx="1"/>'
            '<text x="%d" y="%d" class="bv">%d</text>'
            % (y + 18, esc(label), lw, y, max(w, 2), rh, accent,
               lw + max(w, 2) + 8, y + 18, value)
        )
    parts.append("</svg>")
    return "".join(parts)


def mutation_class(g):
    if g.get("mode"):
        return "file rewritten"
    if g.get("append") is not None:
        return "line appended"
    r = g.get("replace")
    if r is None:
        return "text removed"
    rs = r.strip().lower()
    if rs == "" or rs.startswith("rem ") or rs.startswith("#"):
        return "text disabled"
    return "text replaced"


def main():
    G = json.loads((REPO_ROOT / "data" / "guards.json").read_text(encoding="utf-8"))
    F = json.loads((REPO_ROOT / "data" / "findings.json").read_text(encoding="utf-8"))
    ev_path = REPO_ROOT / "data" / "evidence.json"
    suite = None
    if ev_path.exists():
        ev = json.loads(ev_path.read_text(encoding="utf-8"))
        d = next((s for s in ev["sources"] if s["id"] == "trading-desk"), None)
        if d and d.get("suite", {}).get("method") == "executed":
            suite = d["suite"]

    guards = G["guards"]
    findings = F["findings"]
    counts = F["counts"]

    # --- step 3 aggregate: guards by mutation class -----------------------
    klass = {}
    for g in guards:
        k = mutation_class(g)
        klass[k] = klass.get(k, 0) + 1
    klass_rows = sorted(klass.items(), key=lambda kv: -kv[1])

    # --- step 5 aggregates ------------------------------------------------
    sev = counts["bySeverity"]
    sev_rows = [(k, sev[k]) for k in SEVERITY_ORDER if k in sev]
    sev_rows += [(k, v) for k, v in sev.items() if k not in SEVERITY_ORDER]
    found_rows = sorted(counts["byFoundBy"].items(), key=lambda kv: -kv[1])
    found_rows = [(k if len(k) < 34 else k[:31] + "…", v) for k, v in found_rows]

    # --- step 4 drill-down: a sample of deltas, not all 90 ----------------
    sample = [g for g in guards if g.get("find") and g.get("replace")][:12]
    deltas = []
    for i, g in enumerate(sample, 1):
        deltas.append(
            '<article class="mutant" id="d%02d">'
            '<div class="delta" role="region" tabindex="0" aria-label="Guard %d, protected text and sabotage">'
            '<pre class="keep">%s</pre><pre class="cut">%s</pre></div>'
            '<p class="test"><span class="f">%s</span>%s</p></article>'
            % (i, i, esc(g["find"]), esc(g["replace"]), esc(g["file"]), esc(g["test"]))
        )

    # --- step 5 list ------------------------------------------------------
    def frow(f):
        st = f["status"]
        sev_l = f.get("severity") or "unrecorded"
        return ('<li class="f-%s"><span class="sev s-%s">%s</span>'
                '<span class="ft">%s</span>'
                '<span class="meta">%s%s</span></li>'
                % (esc(st), esc(sev_l.replace(" ", "-")), esc(sev_l),
                   esc(f["title"]),
                   esc(f.get("where") or ""),
                   ("  ·  " + esc(f["foundBy"])) if f.get("foundBy") else ""))

    open_f = [f for f in findings if f["status"] == "open"]
    fixed_f = [f for f in findings if f["status"] != "open"]

    page = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The trading desk — does it hold up?</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root {%(tokens)s --hh:%(hh)s; }
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.62 var(--sans);
  background-image:
    repeating-linear-gradient(to right,var(--rule) 0 1px,transparent 1px 24px),
    repeating-linear-gradient(to bottom,var(--rule) 0 1px,transparent 1px 24px)}
.bar{position:sticky;top:0;z-index:3;height:var(--hh);display:flex;align-items:center;
  justify-content:space-between;gap:18px;padding:0 clamp(16px,4vw,40px);
  background:var(--paper);border-bottom:1px solid var(--hair)}
.bar .id{font:800 14px/1 var(--display);letter-spacing:-.03em}
.bar a{font:500 12.5px/1 var(--sans);color:var(--muted);text-decoration:none;margin-left:16px}
.bar a:hover,.bar a:focus-visible{color:var(--keep)}
.wrap{max-width:900px;margin:0 auto;padding:clamp(30px,5vw,60px) clamp(16px,4vw,40px) 100px}
.kicker{margin:0 0 12px;font:500 11px/1 var(--mono);letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted)}
h1{margin:0 0 18px;max-width:18ch;font:900 clamp(30px,5.4vw,54px)/.97 var(--display);
  letter-spacing:-.045em}
.lede{margin:0 0 32px;max-width:64ch;color:var(--ink-2);font-size:16px}
.lede b{color:var(--ink);font-weight:600}
section{margin:0 0 clamp(40px,6vw,64px);scroll-margin-top:calc(var(--hh) + 10px)}
h2{margin:0 0 6px;font:800 clamp(20px,2.5vw,26px)/1.15 var(--display);letter-spacing:-.03em}
h2 .step{display:block;font:500 10.5px/1.8 var(--mono);letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted)}
.say{margin:0 0 20px;max-width:62ch;color:var(--ink-2);font-size:15px}
.headline{display:flex;flex-wrap:wrap;gap:clamp(18px,3vw,40px);padding:18px 0;margin:0 0 20px;
  border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.headline b{display:block;font:800 clamp(24px,2.8vw,34px)/1 var(--display);letter-spacing:-.03em;
  font-variant-numeric:tabular-nums}
.headline span{display:block;margin-top:5px;font:400 10.5px/1.4 var(--mono);
  letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.chart{width:100%%;height:auto;display:block;margin:0 0 6px;background:var(--sheet);
  border:1px solid var(--hair);padding:12px}
.chart .bl{font:500 12px/1 var(--mono);fill:var(--ink)}
.chart .bv{font:500 12px/1 var(--mono);fill:var(--muted);font-variant-numeric:tabular-nums}
figcaption{margin:0 0 22px;font:400 11.5px/1.6 var(--mono);color:var(--muted)}
.mutant{display:grid;gap:5px;margin:0 0 12px}
.delta{overflow-x:auto;background:var(--sheet);border:1px solid var(--hair)}
.delta:focus-visible{outline:2px solid var(--keep);outline-offset:2px}
pre{margin:0;padding:8px 12px 8px 28px;position:relative;font:400 12.5px/1.6 var(--mono);white-space:pre}
pre::before{position:absolute;left:10px;font-weight:500}
.keep{border-left:3px solid var(--keep)} .keep::before{content:"\\2212";color:var(--keep)}
.cut{border-left:3px solid var(--cut);background:#FDF6F4} .cut::before{content:"+";color:var(--cut)}
.test{margin:0;font:400 11px/1.6 var(--mono);color:var(--muted);display:flex;gap:10px;flex-wrap:wrap}
.test .f{color:var(--ink)}
ul.findings{list-style:none;margin:0 0 8px;padding:0}
ul.findings li{display:grid;grid-template-columns:7.5rem 1fr;gap:4px 14px;padding:11px 0;
  border-bottom:1px solid var(--rule)}
.sev{font:500 10px/1.7 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  align-self:start;padding:1px 6px;border:1px solid currentColor;justify-self:start}
.s-breaks-now{color:var(--cut)} .s-wrong-output{color:#8A5A00}
.s-breaks-later{color:var(--keep)} .s-cosmetic{color:var(--muted)} .s-unrecorded{color:var(--muted)}
.ft{font-size:14.5px;line-height:1.5}
.meta{grid-column:2;font:400 11px/1.6 var(--mono);color:var(--muted);word-break:break-all}
.f-fixed .ft{color:var(--muted)}
.f-fixed .sev{color:var(--ok)}
@media (max-width:620px){ul.findings li{grid-template-columns:1fr}.meta{grid-column:1}}
.stamp{margin-top:40px;padding-top:18px;border-top:2px solid var(--ink);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:74ch}
.stamp b{color:var(--ink);font-weight:500}
</style>
</head>
<body>
<div class="bar">
  <span class="id">JORDAN DOERKSEN</span>
  <nav><a href="../../">Home</a><a href="#risk">Risks</a><a href="#guards">Guards</a><a href="#open">Open</a></nav>
</div>
<div class="wrap">

  <p class="kicker">Tier 2 · the work · one project</p>
  <h1>The trading desk. Does it hold up?</h1>
  <p class="lede">A read-only market desk. It never places an order. The interesting question
  is not what it does — it is whether it can be trusted when it says something.
  <b>This page is the evidence, including the parts that fail.</b></p>

  <div class="headline">
    <div><b>%(guards)d</b><span>guards</span></div>
    <div><b>%(tests)s</b><span>tests passing</span></div>
    <div><b>%(open)d</b><span>defects open</span></div>
    <div><b>%(fixed)d</b><span>found and fixed</span></div>
  </div>

  <section id="risk">
    <h2><span class="step">Step 1</span>What can go wrong</h2>
    <p class="say">A desk that reports the wrong number quietly is worse than one that crashes.
    These are the failure classes the harness actually mutates, and how many guards stand
    against each.</p>
    <figure>
      %(klass_chart)s
      <figcaption>Guards by the kind of damage they are tested against. %(guards)d guards
      across %(files)d files.</figcaption>
    </figure>
  </section>

  <section id="guards">
    <h2><span class="step">Step 2</span>What catches it</h2>
    <p class="say">Every guard was driven into the failure it exists to catch, then the file
    was restored and the restore checked by SHA256. A test that has never failed proves
    nothing.%(suitesay)s</p>
  </section>

  <section id="proof">
    <h2><span class="step">Step 3</span>Proof they bite</h2>
    <p class="say">Blue is the text a guard protects. Red is what the sabotage puts there
    instead. If the test does not go red, the guard does not ship. %(sampled)d of %(guards)d
    shown.</p>
    %(deltas)s
  </section>

  <section id="open">
    <h2><span class="step">Step 4</span>What is still broken</h2>
    <p class="say">%(open)d defects are open right now, %(bn)d of them severe enough to break
    something on use. They are listed because a reliability claim with a curated defect list is
    worth nothing.</p>
    <figure>
      %(sev_chart)s
      <figcaption>All %(total)d findings by severity, open and fixed together.</figcaption>
    </figure>
    <figure>
      %(found_chart)s
      <figcaption>How each defect was discovered. Most came from deliberate sweeps rather
      than from something breaking in use.</figcaption>
    </figure>
    <ul class="findings">%(open_list)s</ul>
    <h2 style="margin-top:34px"><span class="step">Closed</span>Found and fixed</h2>
    <ul class="findings">%(fixed_list)s</ul>
  </section>

  <p class="stamp">
    Guards from <b>%(gsrc)s</b> at commit <b>%(gcommit)s</b>. Findings from
    <b>%(fsrc)s</b> at commit <b>%(fcommit)s</b>. Generated <b>%(gen)s</b> — a stamped
    snapshot, not a live reading.<br>
    The desk is a private repo. Titles, severity, status, discovery method and file references
    are published; the failure analyses and fixes are not.<br>
    No diagram of the desk exists yet, so this page carries none rather than reusing the
    retired Warden one.
  </p>
</div>
</body>
</html>
""" % {
        "tokens": TOKENS, "hh": HH,
        "guards": len(guards),
        "files": len(set(g["file"] for g in guards)),
        "tests": ("%d" % suite["passed"]) if suite else "—",
        "open": counts["open"], "fixed": counts["fixed"], "total": counts["total"],
        "bn": counts["bySeverity"].get("breaks-now", 0),
        "klass_chart": bars(klass_rows, "#0D4FA0", "Guards by mutation class"),
        "sev_chart": bars(sev_rows, "#A82E10", "Findings by severity"),
        "found_chart": bars(found_rows, "#4E5A68", "Findings by discovery method"),
        "deltas": "\n".join("    " + d for d in deltas),
        "sampled": len(sample),
        "suitesay": (" The suite last ran green at %d passed, %d skipped."
                     % (suite["passed"], suite["skipped"])) if suite else "",
        "open_list": "".join(frow(f) for f in open_f),
        "fixed_list": "".join(frow(f) for f in fixed_f),
        "gsrc": esc(G["source"]["file"]), "gcommit": esc(G["source"]["commit"] or "?"),
        "fsrc": esc(F["source"]["file"]), "fcommit": esc(F["source"]["commit"] or "?"),
        "gen": esc(F["generated"][:10]),
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  guards %d in %d classes | findings %d (%d open, %d fixed) | deltas shown %d"
          % (len(guards), len(klass_rows), counts["total"], counts["open"],
             counts["fixed"], len(sample)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
