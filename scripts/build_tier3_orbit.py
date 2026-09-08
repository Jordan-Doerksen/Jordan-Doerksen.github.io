"""Generate the tier-3 orbit scene (DECISIONS.md CR-14).

Stdlib only. Reads data/registry.json and scripts/tier3_orbit.config.json and
writes docs/tier-3-orbit/index.html.

NOT the tier-2 stage. The stage pattern in display-case-law.md is a pattern, not
a mandate, and applying it here produced a conveyor belt where an arcade should
be: games fed three at a time on a timer, into a filling box. A room of games has
no order to walk you through. One canvas owns the page, the games are bodies in
it, and pointing at one wakes it.

THE BUILD GUARD. `/games/fulfillment/` is "Fulfillment - Manual": 4.5MB of
documentation, no <canvas>, no animation loop. The registry calls it a live game
in the games category, which is true of the page and false of the thing, and it
was shipped into an arcade cabinet. With requireCanvas on, an entry is included
only if its page actually contains a canvas. The build proves it rather than
trusting a category field, and prints what it dropped.

Usage:
    python scripts/build_tier3_orbit.py
"""

import html
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "data" / "registry.json"
CONFIG = REPO_ROOT / "scripts" / "tier3_orbit.config.json"
OUT_DIR = REPO_ROOT / "docs" / "tier-3-orbit"
OUT_PATH = OUT_DIR / "index.html"

CANVAS = re.compile(r"<canvas", re.I)


def esc(v):
    return html.escape(str(v) if v is not None else "", quote=True)


def main():
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))

    candidates = [p for p in reg["projects"]
                  if p.get("category") == "games"
                  and p.get("status") == "live"
                  and p.get("url")]

    games, dropped = [], []
    for p in candidates:
        page = REPO_ROOT / p["url"].strip("/") / "index.html"
        if not page.is_file():
            dropped.append((p["slug"], "no index.html at %s" % p["url"]))
            continue
        if cfg.get("requireCanvas", True):
            try:
                body = page.read_text(encoding="utf-8", errors="ignore")
            except OSError as exc:
                dropped.append((p["slug"], "unreadable: %s" % exc))
                continue
            if not CANVAS.search(body):
                dropped.append((p["slug"], "no <canvas> - not a game page"))
                continue
        games.append(p)

    if not games:
        print("ERROR: no playable games survived the canvas check")
        return 1

    # ---- featured: the attract assets lead the page ----------------------
    # Game law 5b gives every game a standalone attract screen. Those are what
    # run up here, NOT the games: an attract asset is purpose-built to start
    # with no input and to paint its first frame immediately, which an embedded
    # game does not guarantee. A featured slug with no attract asset is dropped
    # and reported rather than silently rendering an empty box.
    by_slug = {p["slug"]: p for p in games}
    hero = []
    for slug in cfg.get("featured", []):
        gme = by_slug.get(slug)
        if not gme:
            dropped.append((slug, "featured, but not a playable game in the scene"))
            continue
        attract = REPO_ROOT / "games" / slug / "attract" / "index.html"
        if not attract.is_file():
            dropped.append((slug, "featured, but has no attract/index.html (game law 5b)"))
            continue
        hero.append(
            '<figure class="feat">'
            '<div class="feat-screen">'
            '<iframe src="../../games/%s/attract/" loading="lazy" scrolling="no" '
            'title="%s, attract screen"></iframe>'
            '</div>'
            '<figcaption><a href="../../games/%s/">%s</a>'
            '<span>%s</span></figcaption></figure>'
            % (esc(slug), esc(gme["name"]), esc(slug), esc(gme["name"]),
               esc(gme.get("spec", "")))
        )

    items = []
    for n, gme in enumerate(games, 1):
        items.append(
            '<li><a href="../..%s" data-game="%s" data-spec="%s">'
            '<span class="n">%02d</span>'
            '<span class="t">%s</span>'
            '<span class="d">%s</span>'
            '<span class="s">%s</span></a></li>'
            % (esc(gme["url"]), esc(gme["name"]), esc(gme.get("spec", "")),
               n, esc(gme["name"]), esc(gme.get("blurb", "")),
               esc(gme.get("spec", "")))
        )

    page = TEMPLATE
    for key, value in {
        "items": "\n      ".join(items),
        "hero": "\n      ".join(hero),
        "herocount": str(len(hero)),
        "count": str(len(games)),
        "stars": str(cfg["starCount"]),
        "speed": str(cfg["orbitSpeed"]),
        "bodyr": str(cfg["bodyRadius"]),
        "hoverr": str(cfg["hoverRadius"]),
        "drift": str(cfg["driftAmp"]),
    }.items():
        page = page.replace("@@%s@@" % key, value)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")

    print("wrote %s" % OUT_PATH)
    print("  %d playable games in the scene | %d featured attract screens" % (len(games), len(hero)))
    if dropped:
        print("  DROPPED %d entry(s) the registry calls games:" % len(dropped))
        for slug, why in dropped:
            print("    %-20s %s" % (slug, why))
    else:
        print("  nothing dropped - every candidate had a canvas")
    print("  orbit.js present: %s" % (OUT_DIR / "orbit.js").is_file())
    return 0


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The field — @@count@@ games</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#080A0E; --sheet:#11141A; --hair:#1C212A;
  --ink:#F2F4F8; --ink-2:#AEB6C4; --muted:#6B7484;
  --hot:#FF6B4A; --live:#39BDF8;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.6 var(--sans)}
.wrap{max-width:1240px;margin:0 auto;padding:clamp(24px,4vw,48px) clamp(16px,4vw,40px) 90px}
.kicker{margin:0 0 10px;font:500 11px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--hot)}
h1{margin:0 0 14px;max-width:15ch;font:900 clamp(30px,6vw,58px)/.95 var(--display);letter-spacing:-.045em}
.lede{margin:0 0 22px;max-width:58ch;color:var(--ink-2);font-size:16px}
.lede b{color:var(--ink);font-weight:600}

/* the featured band: three attract assets, running. Not the games - an attract
   screen is built to start with no input and paint at once. */
.featured{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(10px,1.4vw,18px);
  margin:0 0 26px}
.feat{margin:0}
.feat-screen{position:relative;aspect-ratio:4/3;background:#04060B;
  border:1px solid var(--hair);overflow:hidden}
.feat-screen iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.feat figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  padding:8px 2px 0;flex-wrap:wrap}
.feat figcaption a{font:600 14px/1.3 var(--sans);color:var(--ink);text-decoration:none}
.feat figcaption a:hover,.feat figcaption a:focus-visible{color:var(--hot)}
.feat figcaption span{font:400 10px/1.5 var(--mono);letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted)}
@media (max-width:820px){ .featured{grid-template-columns:1fr} }

/* the scene only exists once the canvas is running */
.stagewrap{display:none}
.orbit[data-js="on"] .stagewrap{display:block;position:relative;margin:0 0 26px;
  border:1px solid var(--hair);background:radial-gradient(60rem 40rem at 50% 40%,#0D1119,#06070A)}
canvas.scene{display:block;width:100%;height:clamp(360px,58vh,620px)}
.hint{position:absolute;left:14px;bottom:12px;margin:0;font:400 11px/1.5 var(--mono);
  letter-spacing:.06em;color:var(--muted);pointer-events:none}

/* the index: the fallback, the keyboard route, and the site map. Never hidden. */
.index{list-style:none;margin:0;padding:0;
  display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.index a{display:grid;grid-template-columns:2.2rem 1fr;gap:2px 10px;text-decoration:none;
  border:1px solid var(--hair);background:var(--sheet);padding:12px 14px;color:inherit}
.index a:hover,.index a:focus-visible{border-color:var(--hot)}
.index a:focus-visible{outline:2px solid var(--hot);outline-offset:2px}
.index .n{grid-row:1/3;font:400 11px/1.7 var(--mono);color:var(--muted)}
.index .t{font:600 15px/1.3 var(--sans)}
.index .d{grid-column:2;color:var(--ink-2);font-size:13.5px}
.index .s{grid-column:2;margin-top:4px;font:400 10px/1.5 var(--mono);letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted)}
.orbit[data-js="on"] .index-head{display:block}
.index-head{display:none;margin:0 0 10px;font:500 11px/1 var(--mono);letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted)}

/* the player */
.player{position:fixed;inset:0;z-index:50;background:rgba(4,5,8,.94);
  display:flex;flex-direction:column}
.player[hidden]{display:none}
.player-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px clamp(12px,3vw,24px);border-bottom:1px solid var(--hair)}
.player-title{font:600 15px/1 var(--sans)}
.player-close{cursor:pointer;background:var(--sheet);color:var(--ink);border:1px solid var(--hair);
  padding:8px 14px;font:500 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.player-close:hover{border-color:var(--hot);color:var(--hot)}
.player iframe{flex:1;width:100%;border:0;background:#000}

.foot{margin-top:34px;padding-top:16px;border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:76ch}
.foot b{color:var(--ink-2);font-weight:500}
@media (max-width:640px){ canvas.scene{height:clamp(300px,52vh,420px)} }
</style>
</head>
<body>
<div class="wrap">
  <p class="kicker">Tier 3 · the field</p>
  <h1>@@count@@ games, in one field.</h1>
  <p class="lede">Every one runs in a browser with nothing to install.
  <b>Point at a body to wake it, click it to play.</b> The list underneath is the same
  @@count@@ games and works on its own.</p>

  <div class="featured">
      @@hero@@
  </div>

  <div class="orbit" data-stars="@@stars@@" data-speed="@@speed@@" data-bodyr="@@bodyr@@"
       data-hoverr="@@hoverr@@" data-drift="@@drift@@">
    <div class="stagewrap">
      <canvas class="scene" role="img"
              aria-label="A field of @@count@@ games. The same games are listed below as links."></canvas>
      <p class="hint">point to wake · click to play · esc to leave</p>
    </div>

    <p class="index-head">All @@count@@</p>
    <ul class="index">
      @@items@@
    </ul>
  </div>

  <p class="foot">
    The three above are <b>attract screens</b>, not the games: standalone assets built to run
    with no input and to paint their first frame immediately, so they are alive even in a
    background tab. Every game ships one.<br>
    The field is canvas 2D, not WebGL: this repo ships no framework, and hand-rolled GL makes
    readable labels expensive for no gain at @@count@@ bodies.<br>
    <b>Nothing loads a game until you open one.</b> The scene draws itself; the game runs only
    while its window is open, and closing it stops the loop.<br>
    With JavaScript off the field never appears and the list below is the page — every game
    still one click away, still working. Under reduced motion the field is drawn once, static,
    and stays clickable.
  </p>
</div>

<div class="player" hidden>
  <div class="player-bar">
    <span class="player-title"></span>
    <button type="button" class="player-close">Close · Esc</button>
  </div>
  <iframe title="The game you opened" src="about:blank"></iframe>
</div>

<script src="orbit.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
