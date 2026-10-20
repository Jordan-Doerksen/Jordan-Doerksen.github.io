"""Write the compare page for item 24b: the three ride variants side by side. Stdlib only.
    python docs/skin-lab/method-24b/compare.py
"""
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parent


def png_size(p):
    with open(p, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


V = [
    ("r1", "R1", "Lazy river",
     "The page itself flows. It scrolls on its own at a slow, constant speed, eases to a stop at each gate and dwells there. A ring traces the card, and the card settles 4 px into place.",
     "Closest to a lazy river, and the page is still one document.",
     "The page moves under the reader. The pause rules carry the most weight, and a stray scroll hands control back."),
    ("r2", "R2", "Rollercoaster",
     "A track runs down the side from gate to gate. The particle is the car and the window follows it. At each station the car orbits the card, the border traces, the number ticks up and the track to the next gate draws.",
     "The most rollercoaster. The motion has a cause: the car brings each gate.",
     "The most engineering, and the camera move has to stay slow."),
    ("r3", "R3", "Conveyor stage",
     "No page scroll at all. One stage the height of the window. The gates ride a belt in from below and file up into the record at the top. The bar and its particle sit at the foot and drive the belt.",
     "Answers scrolling forever most directly: there is no scroll.",
     "The furthest from a normal web page. Deep links set the stage, and the phone layout needs the most care."),
]
cols = []
for k, n, name, what, gives, costs in V:
    w1, h1 = png_size(HERE / "shots" / ("%s-still-1280.png" % k))
    cols.append('''      <li class="md-cmp-col">
        <span class="md-n">%s</span>
        <h2 class="md-h3">%s</h2>
        <p class="md-small">%s</p>
        <dl class="md-facts"><dt>Gives</dt><dd>%s</dd><dt>Costs</dt><dd>%s</dd></dl>
        <figure class="md-frame"><iframe src="%s/index.html" title="%s, live render" tabindex="-1" loading="lazy"></iframe></figure>
        <figure class="md-still"><img src="shots/%s-still-1280.png" width="%d" height="%d" alt="%s with reduced motion: the stepped page, all four gates and the filed record, complete." loading="lazy"><figcaption class="md-small">Reduced-motion still, 1280 wide: the stepped page with Next and Back, no timer. <a href="shots/%s-still-390.png">390 wide</a></figcaption></figure>
        <p class="md-small md-cmp-links"><a href="%s/index.html">Open %s full size</a> <a href="shots/%s-strip.png">Frame strip, six states</a></p>
      </li>''' % (n, name, what, gives, costs, k, name, k, w1, h1, name, k, k, n, k))
html = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Three ways to ride the four gates</title>
<meta name="description" content="Item 24b, the method page as a ride: chapter 3, the four gates, rendered as three rides side by side, each with its reduced-motion still.">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../../../method/tokens.css">
<link rel="stylesheet" href="../../../method/method.css">
<link rel="stylesheet" href="shared/ride-tokens.css">
<link rel="stylesheet" href="compare.css">
</head>
<body class="md-skin md-skin-c md-cmp" data-variant="c">
<a class="md-skip" href="#md-main">Skip to the content</a>
<div class="md-cmp-bar"><a class="md-brand" href="../method-24/index.html">Jordan Doerksen</a><span class="md-small">Method page lab · item 24b</span></div>
<header class="md-cmp-hero">
  <span class="md-kicker">Method page · chapter 3</span>
  <h1 class="md-title">Three ways to ride the four gates.</h1>
  <p class="md-lede">The same four gates and the record they leave, three rides. In each, the ride starts only when you press Start the ride. It holds while a card is under the pointer or has focus. The wheel and the arrow keys step one gate at a time. See all chapters stops the ride and lists every chapter. Each frame below is the live page. The still under it is what a visitor sees when the system asks for reduced motion: the stepped page, no timer.</p>
</header>
<main id="md-main" class="md-cmp-band">
  <ol class="md-cmp-grid" aria-label="The three rides">
%s
  </ol>
</main>
</body>
</html>
''' % "\n".join(cols)
(HERE / "index.html").write_text(html, encoding="utf-8", newline="\n")
print("wrote index.html")
