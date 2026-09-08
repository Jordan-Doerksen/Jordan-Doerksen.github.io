"""Generate the tier-3 arcade floor (DECISIONS.md CR-13).

Stdlib only. Reads data/registry.json and scripts/tier3_floor.config.json and
writes docs/tier-3-floor/index.html.

SAME GRAMMAR AS TIER 2, DIFFERENT EXECUTION (display-case-law.md rule 3):
things arrive one at a time, every arrival is a pausable state, and a record
accumulates below. On tier 2 the arriving thing was a part of a system and the
record was a network diagram. Here the arriving thing is a REAL GAME running its
own attract screen, and the record is a floor of plates - each plate a frame
captured off that game while it ran.

WHY THE GAMES ARE NOT SCREENSHOTS. There are none, anywhere in the repo. But all
eleven are live and playable at their own URLs, so a picture of a game would be
strictly worse than the game. The floor runs them.

PROGRESSIVE ENHANCEMENT. This file ships every game as a real link with its name
and description - a plain index that works with no JavaScript at all, where each
game is still one click away and still fully playable. floor.js adds the
cabinets. Iframes are created by script rather than shipped, because eleven
canvas games in the markup would start eleven animation loops at once.

Usage:
    python scripts/build_tier3_floor.py
"""

import html
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "data" / "registry.json"
CONFIG = REPO_ROOT / "scripts" / "tier3_floor.config.json"
OUT_DIR = REPO_ROOT / "docs" / "tier-3-floor"
OUT_PATH = OUT_DIR / "index.html"


def esc(v):
    return html.escape(str(v) if v is not None else "", quote=True)


def main():
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))

    games = [p for p in reg["projects"]
             if p.get("category") == "games"
             and p.get("status") == "live"
             and p.get("url")]
    if not games:
        print("ERROR: no live playable games in the registry - nothing to build")
        return 1

    attrs = ('data-slots="%d" data-poweron="%d" data-run="%d" data-powerdown="%d" '
             'data-capture="%s" data-autoplay="%s" data-loop="%s"'
             % (cfg["liveSlots"], cfg["powerOnMs"], cfg["runMs"], cfg["powerDownMs"],
                str(bool(cfg["captureFrames"])).lower(),
                str(bool(cfg["autoplay"])).lower(), str(bool(cfg["loop"])).lower()))

    cabs = []
    for n, gme in enumerate(games, 1):
        url = "../.." + gme["url"]          # docs/tier-3-floor/ -> repo root
        cabs.append(
            '<article class="cab" data-name="%s" data-url="%s">'
            '<div class="screen" aria-hidden="true"></div>'
            '<div class="plate">'
            '<span class="n">%02d</span>'
            '<h3><a href="%s">%s</a></h3>'
            '<p>%s</p>'
            '<p class="spec">%s</p>'
            '</div></article>'
            % (esc(gme["name"]), esc(url), n, esc(url), esc(gme["name"]),
               esc(gme.get("blurb", "")), esc(gme.get("spec", "")))
        )

    page = TEMPLATE
    for key, value in {
        "attrs": attrs,
        "cabs": "\n    ".join(cabs),
        "count": str(len(games)),
        "slots": str(cfg["liveSlots"]),
        "runsec": "%.0f" % (cfg["runMs"] / 1000.0),
    }.items():
        page = page.replace("@@%s@@" % key, value)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")
    print("wrote %s" % OUT_PATH)
    print("  %d playable games | %d live cabinets at a time | %ss each"
          % (len(games), cfg["liveSlots"], cfg["runMs"] // 1000))
    print("  frame capture: %s" % ("on" if cfg["captureFrames"] else "off"))
    print("  floor.js present: %s" % (OUT_DIR / "floor.js").is_file())
    return 0


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The floor — @@count@@ games, all playable</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#08090C; --sheet:#11141A; --deep:#0C0E13;
  --ink:#F2F4F8; --ink-2:#AEB6C4; --muted:#6B7484;
  --hair:#1C212A;
  --hot:#FF4D3D; --live:#39BDF8; --warm:#FFB020;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.6 var(--sans)}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(50rem 30rem at 15% -5%,rgba(255,77,61,.10),transparent 60%),
    radial-gradient(46rem 30rem at 85% 5%,rgba(57,189,248,.09),transparent 60%)}
.wrap{position:relative;z-index:1;max-width:1200px;margin:0 auto;
  padding:clamp(26px,5vw,58px) clamp(16px,4vw,40px) 100px}
.kicker{margin:0 0 12px;font:500 11px/1 var(--mono);letter-spacing:.2em;
  text-transform:uppercase;color:var(--hot)}
h1{margin:0 0 16px;max-width:14ch;font:900 clamp(32px,6.4vw,64px)/.94 var(--display);
  letter-spacing:-.045em}
.lede{margin:0 0 26px;max-width:60ch;color:var(--ink-2);font-size:16.5px}
.lede b{color:var(--ink);font-weight:600}

.floor-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 20px}
.btn{cursor:pointer;background:var(--sheet);color:var(--ink);border:1px solid var(--hair);
  padding:8px 15px;font:500 12px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.btn:hover{border-color:var(--hot);color:var(--hot)}
.btn:focus-visible{outline:2px solid var(--hot);outline-offset:2px}
.readout{font:400 11px/1 var(--mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase}

/* ---- no JS: a plain index of playable games. This IS the fallback. -------- */
.cab{border:1px solid var(--hair);background:var(--sheet);padding:16px 18px;margin:0 0 12px}
.screen{display:none}
.plate .n{font:400 10.5px/1.7 var(--mono);color:var(--muted)}
.plate h3{margin:2px 0 6px;font:600 17px/1.25 var(--sans)}
.plate h3 a{color:var(--ink);text-decoration:none}
.plate h3 a:hover,.plate h3 a:focus-visible{color:var(--hot);text-decoration:underline}
.plate p{margin:0 0 6px;color:var(--ink-2);font-size:14.5px;max-width:56ch}
.plate .spec{font:400 10.5px/1.5 var(--mono);letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted)}
.plate img{display:block;width:100%;height:auto;border:1px solid var(--hair);margin:0 0 10px;
  image-rendering:pixelated}

/* ---- JS on: the floor ---------------------------------------------------- */
.floor[data-js="on"] .floor-stage{display:grid;
  grid-template-columns:repeat(@@slots@@,1fr);gap:clamp(12px,1.6vw,20px);
  min-height:clamp(210px,26vw,300px);margin:0 0 22px;
  padding:16px;border:1px solid var(--hair);background:var(--deep)}
.floor[data-js="on"] .cab{display:none;margin:0;padding:0;background:transparent;border:0}
.floor[data-js="on"] .cab.live{display:block;grid-column:calc(var(--slot) + 1);grid-row:1;
  animation:power .55s cubic-bezier(.2,.8,.3,1) both}
@keyframes power{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.floor[data-js="on"] .cab.live .screen{display:block;position:relative;
  aspect-ratio:4/3;background:#000;border:1px solid var(--hair);overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,77,61,.25),0 12px 40px rgba(0,0,0,.6)}
.floor[data-js="on"] .cab.live .screen iframe{position:absolute;inset:0;width:100%;height:100%;
  border:0;display:block}
.floor[data-js="on"] .cab.live .plate{padding:9px 2px 0}
.floor[data-js="on"] .cab.live .plate p{display:none}
.floor[data-js="on"] .cab.live .plate .spec{display:block}
.floor[data-js="on"] .cab.powering-down{animation:down .6s ease-in forwards}
@keyframes down{to{opacity:0;transform:translateY(26px) scale(.97)}}

.floor[data-js="on"] .shelf{display:grid;
  grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.floor[data-js="on"] .shelf .plate{border:1px solid var(--hair);background:var(--sheet);
  padding:12px 14px;animation:power .45s ease both}
.floor[data-js="on"] .shelf .plate p{display:none}
.floor[data-js="on"] .shelf .plate .spec{display:block}
.floor[data-js="on"] .shelf .plate.has-shot{padding:0 0 12px}
.floor[data-js="on"] .shelf .plate.has-shot .n,
.floor[data-js="on"] .shelf .plate.has-shot h3,
.floor[data-js="on"] .shelf .plate.has-shot .spec{padding-left:12px;padding-right:12px}

.floor-finale{margin:26px 0 0;padding:22px;border:1px solid var(--hot);
  background:linear-gradient(180deg,rgba(255,77,61,.09),transparent 70%);animation:power .6s ease both}
.floor-finale h2{margin:0 0 8px;font:800 clamp(20px,2.4vw,28px)/1.15 var(--display);letter-spacing:-.03em}
.floor-finale p{margin:0;max-width:62ch;color:var(--ink-2);font-size:15px}

@media (max-width:860px){
  .floor[data-js="on"] .floor-stage{grid-template-columns:1fr;min-height:0}
  .floor[data-js="on"] .cab.live{grid-column:1;grid-row:auto}
}
@media (prefers-reduced-motion:reduce){
  .cab,.shelf .plate,.floor-finale{animation:none!important}
}
.foot{margin-top:44px;padding-top:18px;border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:78ch}
.foot b{color:var(--ink-2);font-weight:500}
</style>
</head>
<body>
<div class="wrap">
  <p class="kicker">Tier 3 · the floor</p>
  <h1>Eleven games. All of them run.</h1>
  <p class="lede">Not screenshots — <b>the actual games</b>, loading one at a time and playing
  their own attract screens. Click any name to play it full size. Everything here runs in a
  browser with nothing to install.</p>

  <div class="floor" @@attrs@@>
    <div class="floor-controls" hidden>
      <button type="button" class="btn btn-play" aria-pressed="false">Play</button>
      <button type="button" class="btn btn-next">Next</button>
      <button type="button" class="btn btn-reset">Reset</button>
      <span class="readout" role="status" aria-live="polite"></span>
    </div>

    <div class="floor-stage"></div>

    <div class="shelf">
    @@cabs@@
    </div>

    <section class="floor-finale" hidden aria-live="polite">
      <h2 class="f-head">Done.</h2>
      <p class="f-body">…</p>
    </section>
  </div>

  <p class="foot">
    <b>@@count@@ games</b>, @@slots@@ running at a time for @@runsec@@s each — a CPU budget,
    not a layout preference: every cabinet is a real game with its own animation loop.<br>
    The plates below are frames read off each game while it was running. There are no
    screenshots of these games anywhere; these are made from the game itself, and where a
    frame cannot be read the plate is typed rather than faked.<br>
    With JavaScript off this page is a plain index of @@count@@ playable games, and every one
    of them still works.
  </p>
</div>
<script src="floor.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
