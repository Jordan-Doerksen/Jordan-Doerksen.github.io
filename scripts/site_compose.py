"""Compose the three tiers into one scrolling site (DECISIONS.md D-A26).

Stdlib only. Writes docs/site/index.html.

ONE SOURCE OF TRUTH. Tier 2 and tier 3 are not re-implemented here. Their own
generators still own them, and this reads their built pages, scopes their CSS to
a section, and drops the markup in. Rebuild a tier, rerun this, and the section
follows. Duplicating that markup would have meant two places to fix every bug.

THE SCOPER is the only clever part, and it is deliberately small. Each tier page
declares `:root{...}` tokens and class selectors that collide across tiers - both
tier 2 and tier 3 use .n, .t and .d. Every selector is therefore prefixed with
the section class, `:root` becomes that class, and `body`/`html` rules are
dropped because a section is not the document.

THE ATMOSPHERE is a section property, not a scroll effect (D-A26). Each section
paints its own ground, so the palette is right with JavaScript off and under
reduced motion. atmos.js only cross-fades the page-level wash between them.

Usage:
    python scripts/site_compose.py           # build at docs/site/ for review
    python scripts/site_compose.py --root    # promote: build as the site index

PROMOTION rewrites depth. docs/site/ sits two levels down, so the tier markup it
reuses carries `../../games/`, `../../demos/`, `../../assets/`. At the root those
prefixes are wrong, and the three scripts move to js/site/ so the index does not
reach up into docs/ for its behaviour.
"""

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "docs" / "site"
OUT_PATH = OUT_DIR / "index.html"

# The three behaviours the composed page loads. In root mode they are copied to
# js/site/ so the site index does not reach into docs/ for how it works.
SCRIPTS = [
    ("stage.js", REPO_ROOT / "docs" / "tier-2-case" / "stage.js"),
    ("wall.js", REPO_ROOT / "docs" / "tier-3" / "wall.js"),
    ("atmos.js", REPO_ROOT / "docs" / "site" / "atmos.js"),
]
EVIDENCE = REPO_ROOT / "data" / "evidence.json"

TIERS = [
    ("t2", REPO_ROOT / "docs" / "tier-2-case" / "index.html"),
    ("t3", REPO_ROOT / "docs" / "tier-3" / "index.html"),
]

STYLE_RE = re.compile(r"<style>(.*?)</style>", re.S)
BODY_RE = re.compile(r"<body>(.*?)</body>", re.S)
SCRIPT_RE = re.compile(r"<script[^>]*>.*?</script>", re.S)


def scope_css(css, cls):
    """Prefix every selector with `cls`. Small on purpose - see the note above."""
    out, i = [], 0
    while i < len(css):
        at = css.find("{", i)
        if at == -1:
            out.append(css[i:])
            break
        head = css[i:at]
        # Find the matching close brace, allowing one level of nesting (@media).
        depth, j = 1, at + 1
        while j < len(css) and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        block = css[at + 1:j - 1]

        stripped = head.strip()
        if stripped.startswith("@media") or stripped.startswith("@supports"):
            out.append(head + "{" + scope_css(block, cls) + "}")
        elif stripped.startswith("@"):
            out.append(head + "{" + block + "}")      # keyframes etc: leave alone
        else:
            sels = []
            for sel in stripped.split(","):
                s = sel.strip()
                if not s:
                    continue
                if s in (":root", "html", "body", "*", "html,body"):
                    sels.append(cls)
                else:
                    m = re.match(r"^(?:html|body)(?=$|[\s:.#\[>,])", s)
                    if m:
                        rest = s[m.end():]
                        # ATTACHED, not descendant. Writing `.t2 ::before` here
                        # was a real bug: tier 2's body::before is a fixed,
                        # full-viewport blue wash, and as a descendant selector
                        # it painted that wash on EVERY element inside the
                        # section - dozens of stacked full-screen layers over
                        # the whole page, tier 3 included.
                        if rest.startswith(":"):
                            sels.append(cls + rest)
                        else:
                            sels.append((cls + " " + rest.strip()) if rest.strip() else cls)
                    else:
                        sels.append(cls + " " + s)
            out.append(", ".join(sels) + "{" + block + "}")
        i = j
    return "".join(out)


def tier_parts(path, cls):
    """(scoped css, body markup) for one built tier page."""
    if not path.is_file():
        return None, None
    html = path.read_text(encoding="utf-8")
    css = "\n".join(STYLE_RE.findall(html))
    body = BODY_RE.search(html)
    body = body.group(1) if body else ""
    body = SCRIPT_RE.sub("", body)          # scripts are loaded once, by us
    return scope_css(css, "." + cls), body


def figures():
    """Real numbers only, from the stamped snapshot. Absent stays absent."""
    if not EVIDENCE.is_file():
        return None
    ev = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    desk = next((s for s in ev["sources"] if s["id"] == "trading-desk"), None)
    out = {
        "commits": ev["commitActivity"]["commits"],
        "repos": ev["commitActivity"]["repos"],
        "since": ev["commitActivity"]["earliest"],
        "tests": ev["totals"]["ownTestFiles"],
        "guards": None,
        "asOf": ev["generated"][:10],
    }
    if desk and desk.get("suite", {}).get("method") == "executed":
        out["guards"] = desk["suite"]["passed"]
    return out


def main():
    f = figures()
    if not f:
        print("ERROR: data/evidence.json missing - tier 1 will not invent figures")
        return 1

    stats = "".join(
        '<div class="stat"><b>%s</b><span>%s</span></div>' % (v, k)
        for k, v in [
            ("commits since %s" % f["since"], "{:,}".format(f["commits"])),
            ("repositories", f["repos"]),
            ("test files", f["tests"]),
        ] + ([("guards passing", f["guards"])] if f["guards"] else [])
    )

    sections, styles = [], []
    for cls, path in TIERS:
        css, body = tier_parts(path, cls)
        if css is None:
            print("  MISSING: %s - section skipped and reported" % path)
            continue
        styles.append("/* ---- %s ---- */\n%s" % (cls, css))
        sections.append('<section class="tier %s" id="%s" data-atmos="%s">%s</section>'
                        % (cls, cls, cls, body))

    page = TEMPLATE
    for k, v in {
        "tierstyles": "\n".join(styles),
        "sections": "\n".join(sections),
        "stats": stats,
        "asof": f["asOf"],
    }.items():
        page = page.replace("@@%s@@" % k, v)

    root_mode = "--root" in sys.argv[1:]
    if root_mode:
        # "../../" is correct from docs/site/ and wrong from the root. Do the
        # bare href FIRST: it means "the site root", which at the root is "/",
        # not the empty string.
        page = page.replace('href="../../"', 'href="/"')
        page = page.replace("../../", "")
        page = page.replace('src="../tier-2-case/stage.js"', 'src="js/site/stage.js"')
        page = page.replace('src="../tier-3/wall.js"', 'src="js/site/wall.js"')
        page = page.replace('src="atmos.js"', 'src="js/site/atmos.js"')

        js_dir = REPO_ROOT / "js" / "site"
        js_dir.mkdir(parents=True, exist_ok=True)
        for name, src_path in SCRIPTS:
            if src_path.is_file():
                js_dir.joinpath(name).write_text(
                    src_path.read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
            else:
                print("  WARNING: %s missing - the page would load a 404" % src_path)
        out = REPO_ROOT / "index.html"
    else:
        out = OUT_PATH

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s%s" % (out, "   [PROMOTED TO THE SITE INDEX]" if root_mode else ""))
    print("  %d tier sections composed | figures as of %s" % (len(sections), f["asOf"]))
    print("  tier 1 authored here; tiers 2 and 3 read from their own built pages")
    return 0


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Jordan Doerksen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;700&display=swap">
<style>
/* ============================================================================
   THE ATMOSPHERE (D-A26)
   Each section paints its own ground, so the palette is correct with no
   JavaScript and under reduced motion. atmos.js only cross-fades the
   page-level wash between them - it is never what makes a section the right
   colour.
   ========================================================================== */
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:#EFF2F6;color:#0F1720;
  font:400 15.5px/1.6 "IBM Plex Sans",system-ui,sans-serif;
  transition:background-color .9s ease}
.tier{position:relative}

/* ---- tier 1 · Stagecraft v2, light "Drafting Paper" ---------------------- */
.t1{--paper:#EFF2F6;--sheet:#FFFFFF;--deep:#E7EBF1;
  --ink:#0F1720;--ink-2:#3A4654;--muted:#4E5A68;
  --hair:#D3DCE8;--rule:#E3E9F1;--signal:#0D4FA0;--correct:#A82E10;
  --display:"Space Grotesk",Archivo,sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
  background:var(--paper);color:var(--ink);
  background-image:
    repeating-linear-gradient(to right,var(--rule) 0 1px,transparent 1px 24px),
    repeating-linear-gradient(to bottom,var(--rule) 0 1px,transparent 1px 24px)}
.t1 .wrap{max-width:1180px;margin:0 auto;
  padding:clamp(40px,9vh,110px) clamp(16px,4vw,40px) clamp(48px,8vh,96px)}
.t1 .eyebrow{margin:0 0 18px;font:500 11px/1 var(--mono);letter-spacing:.2em;
  text-transform:uppercase;color:var(--signal)}
.t1 h1{margin:0 0 6px;font:700 clamp(38px,7vw,76px)/.98 var(--display);
  letter-spacing:-.035em}
.t1 .role{margin:0 0 26px;font:400 clamp(17px,2vw,22px)/1.4 var(--display);
  color:var(--muted);letter-spacing:-.01em}
.t1 .intro{margin:0 0 30px;max-width:60ch;font-size:clamp(16px,1.5vw,18px);
  line-height:1.65;color:var(--ink-2)}
.t1 .intro b{color:var(--ink);font-weight:600}
.t1 .stats{display:flex;flex-wrap:wrap;gap:clamp(20px,3.4vw,52px);
  padding:22px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);
  margin:0 0 30px}
.t1 .stat b{display:block;font:700 clamp(24px,2.8vw,34px)/1 var(--display);
  letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--ink)}
.t1 .stat span{display:block;margin-top:6px;font:400 10.5px/1.4 var(--mono);
  letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.t1 .what{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  gap:clamp(14px,2vw,26px);margin:0 0 30px}
.t1 .what h2{margin:0 0 6px;font:600 15px/1.3 var(--sans)}
.t1 .what p{margin:0;color:var(--ink-2);font-size:14.5px}
.t1 .what .k{display:block;margin:0 0 8px;font:500 10.5px/1 var(--mono);
  letter-spacing:.14em;text-transform:uppercase;color:var(--signal)}
.t1 .onward{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.t1 .onward a{font:500 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;
  color:var(--ink);text-decoration:none;border:1px solid var(--hair);
  background:var(--sheet);padding:11px 16px}
.t1 .onward a:hover,.t1 .onward a:focus-visible{border-color:var(--signal);color:var(--signal)}
.t1 .stamp{margin:26px 0 0;font:400 11px/1.6 var(--mono);color:var(--muted)}

/* ---- the two built tiers, scoped ---------------------------------------- */
@@tierstyles@@

/* A section's ambient wash must be BOUNDED BY ITS SECTION.
   Each tier page declares its wash as a fixed, full-viewport body::before,
   which is right for that page on its own. Composed into one scroll it is not:
   the layer exists for the whole document, so tier 2's blue sat over tier 1 and
   tier 3 as well. `.tier` is position:relative, so absolute confines each wash
   to the section that owns it. Written here, after the tier styles, rather than
   inside the scoper - the tier pages stay correct on their own. */
.tier::before,.tier::after{position:absolute}
</style>
</head>
<body>

<section class="tier t1" id="t1" data-atmos="t1">
  <div class="wrap">
    <p class="eyebrow">Winnipeg</p>
    <h1>Jordan Doerksen</h1>
    <!-- "maker" dropped at the owner's instruction, 2026-09-08. The noun was
         doing no work: the next clause already says what he builds. -->
    <p class="role">Self-taught. I build read-only trading instruments, rail training
    software, and games.</p>

    <!-- "The games are small and finish" was a false claim and the owner caught it:
         none of them is finished. Removed rather than softened. The honest line is
         that they run, which is a different and smaller claim. -->
    <!-- "The trading tools are read-only" was too broad: the analysis side is,
         the execution side is not. Corrected by the owner, 2026-09-08. -->
    <p class="intro">Most of what I build watches something and refuses to guess. The
    analysis tools are read-only by design; the ones that act fail closed. The training
    software cites the rule it is drilling. <b>Everything below runs; nothing here is a
    mockup.</b> Running is not the same as finished, and the games are where that shows.</p>

    <div class="stats">@@stats@@</div>

    <div class="what">
      <div><span class="k">Instruments</span>
        <h2>Market analysis, and the bots that act on it</h2>
        <p>Read-only analysis and depth-of-book recording on one side; execution
        algorithms on the other. <b>The analysis never places an order</b> — that is built
        in, not configured. The execution side fails closed. Both are guarded heavily and
        tested hard.</p></div>
      <div><span class="k">Training</span>
        <h2>Rail software</h2>
        <p>CROR rule drills, switching, signals, and general railroad safety.
        <b>Every answer cites the exact rule it came from.</b> The rulebook governs, not
        recall.</p></div>
      <div><span class="k">Games</span>
        <h2>Ten experiments</h2>
        <p>Ideas I wanted to see run — to play, or to find out whether I could. The method
        moved from single HTML files that need no installation to config-driven, typed,
        systems-heavy builds. <b>None is finished.</b> All of them run.</p></div>
    </div>

    <div class="onward">
      <a href="#t2">The work ↓</a>
      <a href="#t3">The games ↓</a>
    </div>

    <p class="stamp">Figures measured @@asof@@ from the repositories on this machine, and
    reproducible from them. Nothing here is estimated.</p>
  </div>
</section>

@@sections@@

<script src="../tier-2-case/stage.js"></script>
<script src="../tier-3/wall.js"></script>
<script src="atmos.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
