# Editing Cheat Sheet

Which file to touch for each kind of update. Rule of thumb: **content lives
in `data/` and `index.html`; looks live in `css/`; behavior lives in `js/`.**
You will almost never need to open `js/`.

---

## Everyday updates

| Task | File | Notes |
|---|---|---|
| Rewrite your bio | `index.html` | About section — look for `✏️ EDIT` comments |
| Change stat bars (Guitar / Code / Empathy) | `index.html` | Each bar has a `--value` percentage on it |
| Add / remove Affinities chips | `index.html` | Copy a `<span class="chip">` line |
| Add a place to the constellation | `data/places.json` | Copy a block; `x`/`y` are 0–1 fractions of the panel (0,0 = top-left) |
| Edit the Jasper / Grande Prairie CN Rail stories | `data/places.json` | The `story` field is the long tooltip text |
| Add / move books | `data/books.json` | `status` must be `"reading"` or `"recommended"` |
| Add offline quotes | `data/quotes-fallback.json` | `text`, `author`, optional `work` |
| Replace the hidden essay | `data/oot-essay.md` | Plain Markdown; headings, bold, lists, quotes supported |
| Update the footer / contact links | `index.html` | Contact section near the bottom |

## Media

| Task | Where to drop the file | Then |
|---|---|---|
| Your portrait | `assets/img/portrait.jpg` | Appears automatically |
| Sentinel-Pro screenshot | `assets/img/sentinel-screenshot.png` | Appears automatically |
| WC3 screenshot | `assets/img/wc3/coin-survival.jpg` | Appears automatically |
| Red River 3D print photos | `assets/img/forge/print-01.jpg` … `print-03.jpg` | To add a 4th+, copy a `<figure>` in `index.html` |
| The downloadable map | `assets/maps/coin-survival.w3x` | Download button starts working |
| Band audio / sheet PDFs | `assets/audio/`, `assets/pdf/` | Link them from `index.html` |
| YouTube / Bandcamp embeds | `index.html` | Each Music panel has a commented `media-stack` slot — paste the embed `<iframe>` there |

## Look & feel

| Task | File |
|---|---|
| Any color, font, blur amount | `css/tokens.css` — every color is a variable at the top |
| Panel glass styling, nav, modals | `css/glass.css` |
| Buttons, chips, cards, stat bars | `css/components.css` |
| Per-panel themes (fire, rain, codex blue, forge amber, OoT green-gold) | `css/zones.css` |
| Cursor, click sparks, scroll reveals | `css/fx-global.css` |

## Behavior (rarely needed)

| Feature | File |
|---|---|
| Bootstraps everything | `js/main.js` |
| Hero starfield + gold rings | `js/starfield.js` |
| Custom cursor | `js/cursor.js` |
| Click sparks | `js/click-fx.js` |
| Scroll-in reveals + nav highlighting | `js/reveal.js` |
| Constellation drift / tooltips | `js/constellation.js` |
| Sol Obscurus embers + sigils | `js/zones/sol-obscurus.js` |
| Bedroom Weather rain | `js/zones/bedroom-weather.js` |
| Coin Survival mini-game | `js/projects/coin-survival.js` |
| Particle window demo | `js/projects/particle-window.js` |
| Books + quote button | `js/library/quotes.js` |
| Triforce sequence + OoT modal | `js/easter-egg/triforce.js` |
| Shared modal helper (focus trap, Esc) | `js/modal.js` — small addition beyond the original plan; both the quote modal and OoT modal use it |

## Gotchas

- **JSON is picky.** No trailing commas, keys and strings in double quotes.
  If a list goes blank after an edit, paste the file into a JSON validator.
- **Preview with a local server** (`python -m http.server 8080`), not by
  double-clicking `index.html` — see README section 2.
- **Reduced motion:** if animations seem "broken" on your machine, check your
  OS accessibility settings; the site deliberately goes static when
  "reduce motion" is on.
- The Triforce order is **top → bottom-left → bottom-right**, with ~4 seconds
  allowed between clicks. Clicking anywhere wrong resets the sequence.
