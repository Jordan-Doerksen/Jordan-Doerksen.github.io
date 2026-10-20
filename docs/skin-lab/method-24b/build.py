"""Write the three ride variants and the compare page (item 24b). Stdlib only.

The four gates and the record are read from method/index.html (the phase 2 page), never retyped, so the variants carry the
real content. Each variant gets its ride.json stamped into the page (the page never fetches).

    python docs/skin-lab/method-24b/build.py
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PAGE = (ROOT / "method" / "index.html").read_text(encoding="utf-8").replace("\r\n", "\n")

sec = re.search(r'<section id="md-gates".*?</section>', PAGE, re.S).group(0)
kicker = re.search(r'<span class="md-kicker">([^<]*)</span>', sec).group(1)
h2 = re.search(r'<h2 class="md-h2"[^>]*>([^<]*)</h2>', sec).group(1)
lead = re.search(r'<div class="md-head">.*?<p class="md-p">([^<]*)</p>', sec, re.S).group(1)
arrs = re.findall(r'<li class="md-arr">(.*?)</li>', sec.split('<div class="md-spine">')[0], re.S)
marks = re.findall(r'<li class="md-mark">(.*?)</li>', sec, re.S)
menu = re.findall(r'<li><a href="#([\w-]+)"><span class="md-mn">([^<]*)</span>([^<]*)</a></li>', PAGE)
assert len(arrs) == 4 and len(marks) == 4 and len(menu) == 11, (len(arrs), len(marks), len(menu))

RING = '<svg class="md-ring" aria-hidden="true"><rect pathLength="1"></rect></svg>'
CARDS = "\n".join('<li class="md-slot"><div class="md-card" id="gate-%d">%s%s</div></li>' % (i + 1, RING, a) for i, a in enumerate(arrs))
MARKS = "\n".join('<li class="md-mark">%s</li>' % m for m in marks)
LIST = "\n".join('<li><a href="../../../../method/#%s"><span class="md-mn">%s</span>%s</a></li>' % m for m in menu)

V = {
    "r1": ("R1", "Lazy river"),
    "r2": ("R2", "Rollercoaster"),
    "r3": ("R3", "Conveyor stage"),
}

HEAD = '''<header class="md-r-head">
  <span class="md-kicker">%s</span>
  <h2 class="md-h2" id="md-r-h">%s</h2>
  <p class="md-p">%s</p>
  <p class="md-status" role="status" aria-live="polite" data-idle="Press Start the ride. Each gate arrives at its own point." data-idle-still="Use Next and Back to step through the gates. Every gate is already shown." data-step="Gate {n} of {of}: {title}." data-held="Held while you read this gate. Move away and the ride goes on." data-done="Filed. Each gate left one record on disk.">Filed. Each gate left one record on disk.</p>
</header>''' % (kicker, h2, lead)

RECORD = '''<div class="md-record" id="record"><span class="md-n">The record on disk</span>
<ol class="md-marks" aria-label="What the four gates leave on disk">
%s
</ol></div>''' % MARKS

BODIES = {
    "r1": '''%s
<ol class="md-cards" aria-label="The four gates in order">
%s
</ol>
%s''' % (HEAD, CARDS, RECORD),
    "r2": '''%s
<div class="md-r2-stage">
<ol class="md-cards" aria-label="The four gates in order">
%s
</ol>
%s
</div>''' % (HEAD, CARDS, RECORD),
    "r3": '''<div class="md-r3-stage">
%s
<div class="md-r3-window"><ol class="md-belt" aria-label="The four gates in order">
%s
<li class="md-endcard"><span class="md-n">Filed</span><p class="md-p">Each gate left one record on disk. The record is at the top of the stage.</p></li>
</ol></div>
%s
</div>''' % (HEAD, CARDS, RECORD),
}

TPL = '''<!doctype html>
<html lang="en" data-ride="idle">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__NAME__, the four gates as a ride</title>
<meta name="description" content="Lab render of chapter 3 of the method page: the four gates. __V__ · __NAME__.">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../../../../method/tokens.css">
<link rel="stylesheet" href="../../../../method/method.css">
<link rel="stylesheet" href="../shared/ride-tokens.css">
<link rel="stylesheet" href="../shared/ride-base.css">
<link rel="stylesheet" href="ride.css">
</head>
<body class="md-skin md-skin-c md-r md-__K__" data-variant="c">
<a class="md-skip" href="#md-r-main">Skip to the content</a>
<header class="md-r-top" data-chrome="identity_navigation">
  <a class="md-brand" href="../index.html">Jordan Doerksen</a>
  <p class="md-r-tag">__V__ · __NAME__</p>
  <div class="md-r-ctls" data-ctls hidden>
    <div class="md-r-row">
      <button type="button" class="md-btn" data-act="go" data-start="Start the ride" data-pause="Pause" data-resume="Resume">Start the ride</button>
      <button type="button" class="md-btn" data-act="back">Back</button>
      <button type="button" class="md-btn" data-act="next">Next</button>
    </div>
    <button type="button" class="md-btn" data-act="all" aria-expanded="false" aria-controls="md-r-all">See all chapters</button>
  </div>
</header>
<div class="md-r-bar" aria-hidden="true"><span class="md-r-fill"></span><span class="md-r-lead"><span class="md-r-orbit"><i class="md-r-trail" data-i="3"></i><i class="md-r-trail" data-i="2"></i><i class="md-r-trail" data-i="1"></i><i class="md-r-orb"></i></span></span></div>
<main id="md-r-main" class="md-r-main" aria-labelledby="md-r-h">
__BODY__
</main>
<section id="md-r-all" class="md-r-all" aria-labelledby="md-r-all-h">
  <span class="md-kicker">The whole page</span>
  <h2 class="md-h2" id="md-r-all-h">All ten chapters</h2>
  <p class="md-p">Each link opens that chapter on the method page, as built in phase 2. Nothing here moves.</p>
  <ol class="md-r-list">
__LIST__
  </ol>
  <button type="button" class="md-btn" data-act="close">Close the list</button>
</section>
<footer class="md-r-foot"><p class="md-small">Lab render of one beat for the owner's pick (item 24b). Timings are in ride.json. The ride stops under reduced motion. The page reads the same with scripts off.</p></footer>
<script type="application/json" id="md-ride">__JSON__</script>
<script src="../shared/ride-core.js"></script>
<script src="ride.js"></script>
</body>
</html>
'''

for k, (v, name) in V.items():
    cfg = json.loads((HERE / k / "ride.json").read_text(encoding="utf-8"))
    assert cfg["dwell_ms"] >= 2200, "%s dwell_ms %s is under the law's reading pause" % (k, cfg["dwell_ms"])
    body = {kk: vv for kk, vv in cfg.items() if kk != "source"}
    out = (TPL.replace("__NAME__", name).replace("__V__", v).replace("__K__", k)
           .replace("__BODY__", BODIES[k]).replace("__LIST__", LIST).replace("__JSON__", json.dumps(body, separators=(",", ":"))))
    (HERE / k / "index.html").write_text(out, encoding="utf-8", newline="\n")
    print("wrote", k + "/index.html", len(out), "bytes")
