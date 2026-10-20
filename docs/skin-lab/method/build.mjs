// Stamps content.html into a/index.html, b/index.html and c/index.html (D-02): the same body,
// three skins. Run from anywhere: node docs/skin-lab/method/build.mjs
// No package, no fetch at run time; each output is a complete file:// page.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const body = fs.readFileSync(path.join(HERE, 'content.html'), 'utf8');

const variants = {
  a: { name: 'Ledger', fonts: 'family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500' },
  b: { name: 'Terminal', fonts: 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500' },
  c: { name: 'Board', fonts: 'family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500' },
};

// The reveal script: adds md-js so the translate-only reveal applies, then marks each block in
// view. With scripts off nothing is translated. Under reduced motion every block is marked at once.
const script = `<script>
(function () {
  "use strict";
  try {
    document.documentElement.classList.add("md-js");
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var blocks = document.querySelectorAll(".md-rv");
    var all = function () { blocks.forEach(function (b) { b.classList.add("md-in"); }); };
    if (reduce || !("IntersectionObserver" in window)) { all(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("md-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    blocks.forEach(function (b) { io.observe(b); });
  } catch (e) { document.querySelectorAll(".md-rv").forEach(function (b) { b.classList.add("md-in"); }); }
})();
</script>`;

for (const [key, v] of Object.entries(variants)) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gates, loops and rules</title>
<meta name="description" content="How the work runs: four gates, two loops, six rules, and a record on disk for every step.">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${v.fonts}&display=swap">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="../method.css">
</head>
<body class="md-skin md-skin-${key}" data-variant="${key}" data-variant-name="${v.name}">
${body}
${script}
</body>
</html>
`;
  const out = path.join(HERE, key, 'index.html');
  fs.writeFileSync(out, html);
  console.log('wrote ' + path.relative(process.cwd(), out) + ' (' + html.length + ' bytes)');
}
