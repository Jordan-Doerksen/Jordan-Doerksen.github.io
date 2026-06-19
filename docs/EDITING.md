# Editing Cheat Sheet

Which file to touch for each kind of update. Rule of thumb: **content lives
in `data/` and `index.html`; looks live in `css/`; behavior lives in `js/`.**
You will almost never need to open `js/`.

For adding, reordering, or removing whole **sections**, see the partner
guide: [`SECTIONS.md`](SECTIONS.md).

---

## Everyday updates

| Task | File | Notes |
|---|---|---|
| Rewrite your bio | `index.html` | About section — look for `✏️ EDIT` comments |
| Edit the route log (Oshawa → … → Winnipeg) | `index.html` | The `.route-log` block under the bio — copy a `<span class="stop">` + arrow pair |
| Change stat bars (Curiosity / Craft / Music / Systems) | `index.html` | Each bar has a `--value` percentage on it |
| Add / remove Affinities chips | `index.html` | Copy a `<span class="chip">` line |
| Add a place to the constellation | `data/places.json` | Copy a block; `x`/`y` are 0–1 fractions of the panel (0,0 = top-left) |
| Edit the Jasper / Grande Prairie CN Rail stories | `data/places.json` | The `story` field is the long tooltip text |
| Add / move books | `data/books.json` | `status` must be `"reading"` or `"recommended"` |
| Add offline quotes | `data/quotes-fallback.json` | `text`, `author`, optional `work` |
| Add / edit a Sol Obscurus track | `data/sol-obscurus.json` | `title` + `src`; optional `pdf` for sheet music. Shows on `/sol-obscurus/` |
| Add / edit a Bedroom Weather track | `data/bedroom-weather.json` | `title` + `src`. Shows on `/bedroom-weather/` |
| Add / edit a 3D print | `data/forge.json` | `img`, `alt`, `name`, `rarity` (`artifact`/`rare`). Shows on `/forge/` |
| Add / edit a code project | `data/projects.json` | `name`, `tag`, `blurb`, `links[]`; optional `img`. Shows on `/projects/` |
| Change the featured project | `data/projects.json` → `featured` | Full-width lead card on `/projects/`; supports `points[]`. Currently Switch List |
| Fold in another standalone app | copy its folder into the repo (e.g. `/switch-list/`, `/echo-bat/`, `/cror-trainer/`) | Then add a card in `data/projects.json` linking to it (use `"newTab": true`). Copy runtime files only — leave out internal docs, PDFs, and anything private |
| Add a whole new topic page (spoke) | see `docs/SECTIONS.md` §9 | One folder + theme CSS + entry JS + a hub teaser |
| Replace the hidden essay | `data/oot-essay.md` | Plain Markdown; headings, bold, lists, quotes supported |
| Update the footer / contact links | `index.html` (Contact) + `js/shell.js` (footer) | The footer markup lives in `shell.js` now |

## Media

| Task | Where to drop the file | Then |
|---|---|---|
| Your portrait | `assets/img/portrait.jpg` | Appears automatically |
| Sentinel-Pro screenshot | `assets/img/sentinel-screenshot.png` | Appears automatically |
| WC3 screenshot | `assets/img/wc3/coin-survival.jpg` | Appears automatically |
| Red River 3D print photos | `assets/img/forge/` | Drop the photo, then add an entry to `data/forge.json` |
| The downloadable map | `assets/maps/` | Linked from `/warcraft/` (download button) |
| Band audio / sheet PDFs | `assets/audio/`, `assets/pdf/` | Then reference them in `data/sol-obscurus.json` / `data/bedroom-weather.json` |

## Look & feel

| Task | File |
|---|---|
| Any color, font, blur amount | `css/tokens.css` — every color is a variable at the top |
| Panel glass, star-chart nav, hero, modals | `css/glass.css` |
| Buttons, chips, cards, stat bars | `css/components.css` |
| Per-panel themes (fire, rain, codex blue, forge amber, OoT green-gold) | `css/zones.css` |
| Cursor, click sparks, scroll reveals | `css/fx-global.css` |

## Behavior (rarely needed)

| Feature | File |
|---|---|
| Bootstraps everything | `js/main.js` |
| The site-wide living sky (stars, nebula hues, shooting stars) | `js/sky.js` — each section's `data-sky="#hex"` in `index.html` sets its nebula color |
| Hero J·D constellation sigil | `js/sigil.js` — letterform points live in the `POINTS` array |
| Star-chart nav (rail + mobile star map) | `js/starchart-nav.js` |
| Custom cursor | `js/cursor.js` |
| Click sparks | `js/click-fx.js` |
| Scroll-in reveals | `js/reveal.js` |
| Constellation drift / tooltips | `js/constellation.js` |
| Sol Obscurus embers + sigils | `js/zones/sol-obscurus.js` |
| Bedroom Weather rain | `js/zones/bedroom-weather.js` |
| Coin Survival mini-game | `js/projects/coin-survival.js` |
| Particle window demo | `js/projects/particle-window.js` |
| Books + quote button | `js/library/quotes.js` |
| Triforce sequence + OoT modal | `js/easter-egg/triforce.js` |
| Shared modal helper (focus trap, Esc) | `js/modal.js` — small addition beyond the original plan; both the quote modal and OoT modal use it |

## Gotchas

- **After editing any CSS or JS file, bump the `?v=` number** on the
  `<link>` / `<script>` tags in `index.html` (e.g. `?v=2` → `?v=3`).
  GitHub Pages caches files for 10 minutes; the version bump makes every
  visitor's browser fetch the new files together with the new HTML instead
  of mixing old and new.
- **JSON is picky.** No trailing commas, keys and strings in double quotes.
  If a list goes blank after an edit, paste the file into a JSON validator.
- **Preview with a local server** (`python -m http.server 8080`), not by
  double-clicking `index.html` — see README section 2.
- **Reduced motion:** if animations seem "broken" on your machine, check your
  OS accessibility settings; the site deliberately goes static when
  "reduce motion" is on.
- The Triforce order is **top → bottom-left → bottom-right**, with ~4 seconds
  allowed between clicks. Clicking anywhere wrong resets the sequence.
