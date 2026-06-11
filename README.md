# The Observatory — jordan-doerksen.github.io

A single-page portfolio set inside a living night sky: a hero constellation
that draws the J·D sigil in stars, a site-wide sky whose nebula hue shifts
with each section, star-chart navigation, ambient music zones (embers +
rain), a drifting constellation of places, playable projects, a 3D-print
gallery, a library with a random-quote button, and one well-hidden secret.

**No build tools. No npm. No frameworks.** Plain HTML, CSS, and JavaScript —
edit a file, push, and the site updates.

---

## 1. Put it on GitHub Pages (one-time setup)

1. Sign in to GitHub and create a new repository named exactly:

   ```
   Jordan-Doerksen.github.io
   ```

   The name must match your username for the site to live at the root URL.

2. Upload everything in this folder to the repository (drag-and-drop on
   github.com works, or use Git from the command line):

   ```bash
   cd jordan-doerksen.github.io
   git init
   git add .
   git commit -m "Launch Glass Archive v1"
   git branch -M main
   git remote add origin https://github.com/Jordan-Doerksen/Jordan-Doerksen.github.io.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment →
   Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.

4. Wait a minute or two, then visit:

   ```
   https://jordan-doerksen.github.io
   ```

That's it. Every future `git push` (or file upload through the website)
redeploys automatically.

---

## 2. Preview locally before pushing

The site loads its data (`places.json`, `books.json`, the hidden essay) with
`fetch()`, which browsers block when you open `index.html` directly from a
folder. Run a tiny local server instead:

```bash
cd jordan-doerksen.github.io
python -m http.server 8080
```

Then open <http://localhost:8080> in your browser. Press `Ctrl+C` in the
terminal to stop the server.

(Any local server works — `python3 -m http.server 8080` on Mac/Linux, or the
"Live Server" extension in VS Code.)

---

## 3. Editing your content

Almost everything you'll ever want to change lives in two places:

| What you want to change | Where |
|---|---|
| Bio, blurbs, links, embeds | `index.html` — search for `✏️ EDIT` comments |
| Places on the constellation | `data/places.json` |
| Books in the Library | `data/books.json` |
| Offline quotes | `data/quotes-fallback.json` |
| The hidden essay | `data/oot-essay.md` |
| Photos, audio, PDFs, the map file | drop into `assets/` subfolders |

The full task → file map is in **`docs/EDITING.md`**.

### Files the site expects you to add

These are referenced but not included — drop them in and they appear:

- `assets/img/portrait.jpg` — your photo (About section)
- `assets/img/sentinel-screenshot.png` — Sentinel-Pro card image
- `assets/img/wc3/coin-survival.jpg` — WC3 map screenshot
- `assets/img/forge/print-01.jpg` … `print-03.jpg` — Red River 3D photos
- `assets/maps/coin-survival.w3x` — the downloadable map

Until then, those slots show a dashed "drop file here" placeholder instead of
a broken image.

---

## 4. The secret

Click the hero in this order: **top → bottom-left → bottom-right**
(the three points of a certain golden triangle). You have about four seconds
between clicks. Something opens. Edit its contents in `data/oot-essay.md`.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| Site shows README instead of the page | Repo name must be `Jordan-Doerksen.github.io` and `index.html` must be at the repo root |
| Blank lists / constellation empty when opened from a folder | Use the local server (section 2) — `fetch()` doesn't work on `file://` URLs |
| Changes pushed but site looks old | Hard-refresh (`Ctrl+Shift+R`); GitHub Pages can take ~1–2 min |
| Quote button always says "from the shelf" | The free quote API is down or blocked — the offline fallback is working as designed |
| Animations not moving | Your OS has "reduce motion" enabled; the site respects it on purpose |

---

## Folder map

```
index.html        the whole page
css/              styles (tokens.css holds every color)
js/               one small file per effect
data/             YOUR content — edit these freely
assets/           images, audio, PDFs, the .w3x map
docs/EDITING.md   cheat sheet: which file to touch for each update
docs/SECTIONS.md  how to add / reorder / remove whole sections
```
