> **LEGACY** — this cheat sheet describes the retired Observatory one-page design (now the unlinked legacy annex). The current site is documented in ../DECISIONS.md and ../ARCHITECTURE.md.

# Sections Guide — adding, editing, reordering, removing

The partner file to [`EDITING.md`](EDITING.md). That one covers *content inside*
existing sections; this one covers the sections themselves — the rooms of the
observatory.

---

## 1. Anatomy of a section

Every section follows the same skeleton. Here it is, fully annotated:

```html
<!-- ================= WORKSHOP (example) ================= -->
<section class="section" id="workshop" data-sky="#4fe3d0">
  <!--                        │              │
       id: used by the nav ───┘              │
       data-sky: the nebula color the sky ───┘
       fades to while this section is on screen -->

  <div class="container">

    <!-- The section header: plate number + title -->
    <div class="section-head reveal">
      <p class="eyebrow">
        <span class="plate-no">Plate 08</span>
        <span class="star-glyph">✦</span>Workshop
      </p>
      <!-- One word per heading gets the serif-italic "whisper" -->
      <h2>Things in <span class="ital">progress</span></h2>
      <p class="lede">Optional one-line subtitle goes here.</p>
      <div class="atlas-rule" aria-hidden="true"></div>
    </div>

    <!-- The body: one or more glass panels -->
    <div class="glass-panel reveal">
      <header class="panel-head">
        <h3>Panel title</h3>
        <span class="panel-tag">mono label</span>
      </header>
      <div class="panel-body">
        <p>Your content.</p>
      </div>
    </div>

  </div>
</section>
```

The moving parts:

| Piece | What it does |
|---|---|
| `id="workshop"` | The anchor the nav links to (`#workshop`) |
| `data-sky="#4fe3d0"` | Nebula hue while reading this section — `js/sky.js` reads it; any hex color works |
| `class="reveal"` | Fades/blurs the element in when scrolled into view |
| `class="reveal-stagger"` | Put on a *parent* to delay its `.reveal` children in sequence |
| `.eyebrow` + `.plate-no` | The mono "Plate NN ✦ Name" label — renumber when you add/remove sections |
| `<span class="ital">` | The single serif-italic accent word in a heading |
| `.atlas-rule` | The gold hairline + star under the header |
| `.glass-panel` | The translucent observatory pane |

---

## 2. Adding a new section, step by step

1. **Paste the skeleton** from above into `index.html`, between two existing
   `</section>` … `<section>` boundaries, inside `<main>`.

2. **Pick an `id`** (lowercase, no spaces) and a **`data-sky` hue**.
   Existing hues, if you want to rhyme with a neighbor:
   gold `#d8ac4e` · violet `#c084fc` · pale blue `#8fb7ff` ·
   teal `#4fe3d0` · amber `#ffaa44` · codex blue `#6aa9ff`.

3. **Add it to BOTH navigations** (they're separate markup):

   Desktop star rail (top of `index.html`):
   ```html
   <a href="#workshop"><span class="rail-label">Workshop</span><span class="rail-star"></span></a>
   ```

   Mobile star map (just below the rail):
   ```html
   <li><a href="#workshop"><span class="map-no">08</span><span class="map-name">Workshop</span></a></li>
   ```
   Keep both lists in the same top-to-bottom order as the sections on the page.
   The active-star highlighting picks the new section up automatically.

4. **Renumber the plates** if you inserted mid-page — the `Plate NN` eyebrows
   and the star map's `map-no` numbers are hand-written, so a quick
   find-and-update keeps them honest.

5. **Preview locally** (`python -m http.server 8741`, then
   <http://localhost:8741>) and check it at phone width too — open DevTools
   (`F12`), toggle device toolbar (`Ctrl+Shift+M`), pick a 375-px phone.

That's it. No JS changes needed for an ordinary content section.

---

## 3. Layout patterns you can reuse

| Want | Use |
|---|---|
| Two columns that stack on phones | `<div class="grid-2"> … </div>` with two children |
| Two-column project cards | `<div class="projects-grid">` — add `class="span-2"` to a card to make it full-width |
| Staggered entrance for children | add `reveal-stagger` to the parent, `reveal` to each child |
| A photo grid with captions | copy the `.gallery` block from the Forge section |
| A call-to-action strip | copy the `.cta-block` from the Forge section |
| A code snippet | copy the `.code-block` from the Codex card |
| Buttons | `<a class="btn">` (or `btn btn-sm`, `btn btn-primary`) |

**Gotcha:** if you put a `<canvas>` inside a grid column, keep the
`min-width: 0` rule in `css/components.css` intact — without it, canvases
inflate their column on phones.

---

## 4. Giving a section its own personality (zone accents)

The shell stays neutral; personality is opt-in via `data-zone` on a panel.
To make a new one, add a block to `css/zones.css`:

```css
/* ===== Workshop zone — copper, in here only ===== */
[data-zone='workshop'] { border-color: rgba(255, 140, 90, 0.16); }
[data-zone='workshop']::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse 70% 50% at 50% 110%,
              rgba(255, 140, 90, 0.10), transparent 70%);
}
```

Then `<article class="glass-panel" data-zone="workshop">` picks it up.
Rule of thumb from the original design: each accent color lives inside its
own zone and nowhere else.

---

## 5. Reordering sections

1. Cut and paste the whole `<section>…</section>` block in `index.html`.
2. Re-sync the order of the star-rail links and star-map list.
3. Renumber the `Plate NN` eyebrows and `map-no` numbers.

The sky, reveals, and nav highlighting all key off the DOM order, so nothing
else needs touching.

---

## 6. Removing a section

Checklist (all in `index.html` unless noted):

- [ ] Delete the `<section>` block
- [ ] Delete its link from the **star rail**
- [ ] Delete its row from the **star map**
- [ ] Renumber the remaining plates / map numbers
- [ ] If it had a `data-zone`, optionally delete that block from `css/zones.css`
- [ ] If it had its own JS module (only Music, Places, and Projects do),
      remove the `init…()` import + call from `js/main.js`

Leaving the JS in place is harmless — every module checks whether its
elements exist before doing anything.

---

## 7. Where behavior lives (when a section needs more than HTML)

| Feature | File | Notes |
|---|---|---|
| Sky / nebula hues | `js/sky.js` | Reads every `[data-sky]` — nothing to register |
| Hero constellation | `js/sigil.js` | Letterform points in the `POINTS` array |
| Nav (rail + star map) | `js/starchart-nav.js` | Picks up any `a[href^="#"]` in either nav |
| Scroll reveals | `js/reveal.js` | Observes every `.reveal` on the page |
| Section-specific canvases | `js/zones/*.js`, `js/projects/*.js` | One small file per effect — copy one as a template |

New modules follow the same pattern: export an `init…()` function, import and
call it from `js/main.js`, and bail out early if your target element is
missing.

---

## 8. Quick mobile checklist for any new section

- No fixed pixel widths — use `%`, `clamp()`, or the existing grid classes
- Grids built with `grid-2` / `projects-grid` collapse automatically at 840 px
- Test at 375 px wide in DevTools; look for horizontal scrolling
- Long unbroken strings (URLs, file paths) need `overflow-wrap: anywhere`
- Decorative motion should respect reduced-motion — CSS animations already do
  (see the global rule at the bottom of `css/base.css`); canvas modules check
  `prefers-reduced-motion` themselves

---

## 9. Spokes — giving a topic its own page

A *section* is a plate on the one-page hub. A **spoke** is a whole separate page
for a topic deep enough to deserve its own room (the band, the print shop, the
code log), with its own self-contained look. The hub stays the cinematic entry;
a spoke's plate on the hub becomes a short **teaser** that links out. Sol
Obscurus (`/sol-obscurus/`) is the reference implementation — copy it.

**The shared shell.** The logo, star-chart nav, sky canvas, and footer are
defined once in `js/shell.js` and injected into mount points, so you never
hand-copy chrome between pages. To add a topic to the nav on *every* page, edit
the `SECTIONS` array in `js/shell.js` — once.

**The recipe (one new folder + four files, no chrome duplication):**

1. **Make the folder + page:** `your-topic/index.html`. Copy
   `sol-obscurus/index.html` as the template. In it:
   - set `<body data-page="your-topic">`,
   - keep the `<div id="shell-nav"></div>` and `<div id="shell-footer"></div>`
     mounts (shell.js fills them),
   - use **root-absolute** asset paths (`/css/…`, `/js/…`, `/assets/…`) — spokes
     live in a subfolder, so relative paths would break,
   - load the shared base CSS **plus** your own theme file,
   - point the module script at your entry: `/js/spokes/your-topic.js?v=N`.

2. **Theme it:** `css/spokes/your-topic.css`. This loads *only* on your page, so
   it's the place for the topic's distinct look — you can even re-declare tokens
   like `--bg` here and it stays inside this room (see how Sol Obscurus deepens
   the night). Same spirit as zones (§4), scaled up to a whole page.

3. **Data (optional but encouraged):** `data/your-topic.json` for lists
   (tracks, projects, prints), rendered by your entry module — mirrors
   `data/books.json`. Then "adding a project" is a JSON edit, not HTML surgery.

4. **Entry module:** `js/spokes/your-topic.js`. Copy
   `js/spokes/sol-obscurus.js`. It `import`s `renderShell` and whichever shared
   effects you want (`initSky`, `initReveal`, `initCursor`, `initClickFx`, a
   zone effect…), then renders your data. **Render data lists *before*
   `initReveal()`** so the scroll-in observer picks the new nodes up. Fetch data
   with a root-absolute path (`/data/your-topic.json`).

5. **Add a hub teaser:** trim the topic's plate in `index.html` to a blurb + one
   highlight + an `<a class="btn btn-primary" href="/your-topic/">Enter →</a>`.

6. **Bump `?v=`** on the new page's `<link>`/`<script>` tags (and the hub's, if
   you touched shared CSS/JS) — same cache rule as everywhere else.

No build step, no router — GitHub Pages serves `/your-topic/index.html` at the
clean URL `/your-topic/` automatically.