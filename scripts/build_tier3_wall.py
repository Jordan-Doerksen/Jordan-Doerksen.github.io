"""Generate the tier-3 wall (DECISIONS.md CR-15).

Stdlib only. Reads data/registry.json and scripts/tier3_wall.config.json and
writes docs/tier-3/index.html.

WHAT THIS REPLACES. Two drafts. The arcade floor was the tier-2 stage in a
different skin - games fed three at a time on a timer into a filling box. The
orbit field put the games as bodies in one canvas scene; the owner dropped the
constellation. What survived both is the thing that actually worked: the attract
screen as a standalone asset (game law 5b).

So the wall is every game's attract screen, running, in a room you scan. No
queue, no scene, no reveal mechanic.

TWO BUILD GUARDS, both of which drop and REPORT rather than rendering an empty
box:
  requireCanvas  - the page must actually contain a <canvas>. /games/fulfillment/
                   is "Fulfillment - Manual", documentation with no canvas, and
                   the registry calls it a live game.
  requireAttract - the game must have its attract asset. A game without one is
                   still listed in the index below; it just has no panel.

Usage:
    python scripts/build_tier3_wall.py
"""

import html
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "data" / "registry.json"
CONFIG = REPO_ROOT / "scripts" / "tier3_wall.config.json"
OUT_DIR = REPO_ROOT / "docs" / "tier-3"
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

    games, dropped, no_attract = [], [], []
    for p in candidates:
        page = REPO_ROOT / p["url"].strip("/") / "index.html"
        if not page.is_file():
            dropped.append((p["slug"], "no index.html at %s" % p["url"]))
            continue
        if cfg.get("requireCanvas", True):
            body = page.read_text(encoding="utf-8", errors="ignore")
            if not CANVAS.search(body):
                dropped.append((p["slug"], "no <canvas> - not a game page"))
                continue
        p["_attract"] = (REPO_ROOT / "games" / p["slug"] / "attract" / "index.html").is_file()
        if not p["_attract"]:
            no_attract.append(p["slug"])
        games.append(p)

    if not games:
        print("ERROR: no playable games survived the checks")
        return 1

    order = cfg.get("order", [])
    games.sort(key=lambda p: (order.index(p["slug"]) if p["slug"] in order else 999))

    panels, rows = [], []
    for n, gme in enumerate(games, 1):
        slug, name = gme["slug"], gme["name"]
        play = "../.." + gme["url"]
        if gme["_attract"] and cfg.get("requireAttract", True):
            panels.append(
                '<article class="panel" data-name="%s" data-attract="../../games/%s/attract/">'
                '<div class="screen"></div>'
                '<div class="meta">'
                '<span class="n">%02d</span>'
                '<h3><a href="%s" data-play="%s">%s</a></h3>'
                '<p>%s</p>'
                '<p class="spec">%s</p>'
                '</div></article>'
                % (esc(name), esc(slug), n, esc(play), esc(name), esc(name),
                   esc(gme.get("blurb", "")), esc(gme.get("spec", "")))
            )
        rows.append(
            '<li><a href="%s" data-play="%s"><span class="n">%02d</span>'
            '<span class="t">%s</span><span class="d">%s</span></a></li>'
            % (esc(play), esc(name), n, esc(name), esc(gme.get("blurb", "")))
        )

    page = TEMPLATE
    for key, value in {
        "panels": "\n      ".join(panels),
        "rows": "\n        ".join(rows),
        "count": str(len(games)),
        "panelcount": str(len(panels)),
        "maxlive": str(cfg["maxLive"]),
        "mount": cfg["mountMargin"],
        "unmount": cfg["unmountMargin"],
    }.items():
        page = page.replace("@@%s@@" % key, value)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(page, encoding="utf-8", newline="\n")

    print("wrote %s" % OUT_PATH)
    print("  %d games | %d live panels | max %d running at once"
          % (len(games), len(panels), cfg["maxLive"]))
    if no_attract:
        print("  NO ATTRACT ASSET (listed, but no panel) - %d:" % len(no_attract))
        for s in no_attract:
            print("    %s" % s)
    else:
        print("  every game has its attract asset (game law 5b)")
    if dropped:
        print("  DROPPED %d:" % len(dropped))
        for slug, why in dropped:
            print("    %-20s %s" % (slug, why))
    print("  wall.js present: %s" % (OUT_DIR / "wall.js").is_file())
    return 0


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Games — @@count@@, all playable</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#08090C; --sheet:#11141A; --hair:#1C212A; --deep:#0B0D12;
  --ink:#F2F4F8; --ink-2:#AEB6C4; --muted:#6B7484;
  --hot:#FF6B4A;
  --display:Archivo,"Arial Black",sans-serif;
  --sans:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
}
*,*::before,*::after{box-sizing:border-box}
html{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:400 15.5px/1.6 var(--sans)}
.wrap{max-width:1320px;margin:0 auto;padding:clamp(24px,4vw,52px) clamp(16px,4vw,40px) 90px}
.kicker{margin:0 0 10px;font:500 11px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--hot)}
h1{margin:0 0 14px;max-width:16ch;font:900 clamp(30px,6vw,58px)/.95 var(--display);letter-spacing:-.045em}
.lede{margin:0 0 30px;max-width:62ch;color:var(--ink-2);font-size:16px}
.lede b{color:var(--ink);font-weight:600}

.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));
  gap:clamp(14px,1.8vw,24px)}
.panel{margin:0;border:1px solid var(--hair);background:var(--sheet)}
.screen{position:relative;aspect-ratio:4/3;background:#04060B;overflow:hidden;
  border-bottom:1px solid var(--hair)}
.screen iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
/* A panel that has not mounted yet is a quiet plate, never a black hole. */
.screen::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px)}
.panel .meta{padding:13px 15px 15px;display:grid;grid-template-columns:2.1rem 1fr;gap:2px 8px}
.panel .n{grid-row:1/4;font:400 11px/1.7 var(--mono);color:var(--muted)}
.panel h3{margin:0;font:600 16px/1.3 var(--sans)}
.panel h3 a{color:var(--ink);text-decoration:none}
.panel h3 a:hover,.panel h3 a:focus-visible{color:var(--hot)}
.panel h3 a:focus-visible{outline:2px solid var(--hot);outline-offset:3px}
.panel p{margin:2px 0 0;grid-column:2;color:var(--ink-2);font-size:14px}
.panel .spec{font:400 10px/1.5 var(--mono);letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);margin-top:6px}

.all{margin:44px 0 0;padding-top:20px;border-top:1px solid var(--hair)}
.all h2{margin:0 0 14px;font:500 11px/1 var(--mono);letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted)}
.all ul{list-style:none;margin:0;padding:0;
  display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}
.all a{display:grid;grid-template-columns:2.1rem 1fr;gap:1px 8px;text-decoration:none;
  color:inherit;padding:9px 11px;border:1px solid var(--hair);background:var(--deep)}
.all a:hover,.all a:focus-visible{border-color:var(--hot)}
.all .n{grid-row:1/3;font:400 10.5px/1.7 var(--mono);color:var(--muted)}
.all .t{font:600 14px/1.3 var(--sans)}
.all .d{grid-column:2;color:var(--muted);font-size:13px}

.player{position:fixed;inset:0;z-index:50;background:rgba(4,5,8,.95);display:flex;flex-direction:column}
.player[hidden]{display:none}
.player-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px clamp(12px,3vw,24px);border-bottom:1px solid var(--hair)}
.player-title{font:600 15px/1 var(--sans)}
.player-close{cursor:pointer;background:var(--sheet);color:var(--ink);border:1px solid var(--hair);
  padding:8px 14px;font:500 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.player-close:hover{border-color:var(--hot);color:var(--hot)}
.player iframe{flex:1;width:100%;border:0;background:#000}

.foot{margin-top:40px;padding-top:18px;border-top:1px solid var(--hair);
  font:400 11.5px/1.75 var(--mono);color:var(--muted);max-width:80ch}
.foot b{color:var(--ink-2);font-weight:500}
</style>
</head>
<body>
<div class="wrap">
  <p class="kicker">Games</p>
  <h1>@@count@@ games. All of them run.</h1>
  <p class="lede">Every panel is a live <b>attract screen</b> — a standalone asset built for
  each game, running now, no input needed. <b>Click a name to play the game itself</b>, in the
  browser, with nothing to install.</p>

  <div class="wall" data-maxlive="@@maxlive@@" data-mountmargin="@@mount@@"
       data-unmountmargin="@@unmount@@">
      @@panels@@
  </div>

  <section class="all">
    <h2>All @@count@@</h2>
    <ul>
        @@rows@@
    </ul>
  </section>

  <p class="foot">
    <b>@@panelcount@@ attract screens</b>, at most @@maxlive@@ running at once. Each is a real
    canvas loop, so that is a CPU budget rather than a layout preference: a panel starts when
    it comes near the viewport and stops when it goes well past.<br>
    Playing a game stops every panel — one loop at a time.<br>
    With JavaScript off no panel mounts and the list below is the page, every game still one
    click away. Under reduced motion nothing is mounted at all.
  </p>
</div>

<div class="player" hidden>
  <div class="player-bar">
    <span class="player-title"></span>
    <button type="button" class="player-close">Close · Esc</button>
  </div>
  <iframe title="The game you opened" src="about:blank"></iframe>
</div>

<script src="wall.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    sys.exit(main())
