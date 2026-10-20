# Research pass: what dark fintech fronts share

Rank: high (the picked variant becomes the site skin, Intake item 12). Done 2026-10-20 before any
markup. Method: ten front pages fetched headless (Playwright Chromium from `map-reading-trainer`,
1280 x 900, dark colour scheme), the computed styles of every element read and counted, one
screenshot each. The counts below are what the script printed; nothing is typed from memory.

## The five that carry the direction

The brief named Jane Street, Hudson River Trading, Two Sigma and Citadel Securities. All four
loaded, and all four are white-ground (body `rgb(255,255,255)`, black or near-black ink). Jump
Trading is the same. The dark, high-contrast front is not the old-line prop-shop look; it is the
look of the venues and the tooling: Kalshi, Polymarket, Linear, Vercel, and one market maker, IMC.
Those five are the study. The four white fronts are kept below as the counter-finding.

| Site | Ground | Ink | Body type | Display | Panel | Hairline | Radius (top) | Blur | Accents in use |
|---|---|---|---|---|---|---|---|---|---|
| Kalshi | `rgb(10,12,15)` | `rgba(255,255,255,.9)` | Kalshi Sans 16px | condensed sans, few uses | `rgba(255,255,255,.02)` x25 | `rgba(255,255,255,.09)` x30, `.14` x15, `.12` x11 | 100px x94, 8px x71, 16px x58 | blur(12px) x1 | green `rgb(0,221,148)`, red `rgb(255,69,77)`, blue `rgb(47,106,245)` |
| Polymarket | lab L=4 (near-black, cool) | white | Inter 16px | Inter 16px (no big h1) | oklab L=.24 at 50% alpha x26 | lab L=20 x11 | 4px x122, 2px x105, pill x83 | blur(0.5px) x1 | blue `rgb(135,191,255)` plus state greens and reds |
| Linear | `rgb(8,9,10)` | `rgb(247,248,248)` | Inter Variable 16px | Inter Variable 64px, weight 510, -1.4px | `rgb(15,16,17)` x37, `rgba(255,255,255,.08)` x36 | `rgba(255,255,255,.08)` x65, `.12` x10 | pill x76, 8px x30, 12px x25 | blur(4px) x2, blur(20px) x1 | state tints at 7 to 10% alpha; one pink link colour |
| Vercel | `rgb(0,0,0)` | `rgb(237,237,237)` | Geist Sans 16px | Geist Sans 64px, weight 400, -3.84px | `rgb(10,10,10)` x18 | `rgba(255,255,255,.14)` x5 | 6px x54, pill x21 | none | one blue, used on 3 elements |
| IMC | `rgb(2,21,38)` navy | white | Mark Pro 16px | Oswald 84px, weight 500 | `rgb(1,38,73)` x20 | white x13, `rgb(7,81,226)` x9 | 4px x28, 100px x25 | none | one blue `rgb(7,81,226)` |

Motion, as counted by `document.getAnimations()` 2.5 s after load: Linear 96, Polymarket 44,
Kalshi 25, IMC 5, Vercel 2. Canvas: Polymarket 4, IMC 2, Vercel 1, the rest 0.

## What they share

- **Ground.** Near-black, not grey: L under 5 in Lab. Three of five are cool-tinted (Kalshi,
  Polymarket, IMC); two are neutral (Linear, Vercel). None uses a mid-grey ground.
- **Ink.** Near-white at 90 to 97% (`rgb(237,237,237)` to `rgba(255,255,255,.9)`), never pure
  white on the body. The second ink is a grey at about 55 to 60% (`rgb(138,143,152)`,
  `rgb(161,161,161)`, `rgba(255,255,255,.55)`).
- **Panel treatment.** A panel is the ground lifted by 2 to 8% white, with a 1px hairline at 8 to
  14% white. The hairline carries the panel; the fill is almost nothing. Blur is rare and local
  (one bar, one overlay), never on every panel.
- **Contrast.** High: body text 12:1 and up on the ground; the grey ink sits near 4.5 to 6:1.
- **Type.** One sans family does nearly all the work (Inter, Geist, Kalshi Sans, Mark Pro). A mono
  is the second voice for data and labels (Berkeley Mono, Geist Mono, Plex Mono). Display is the
  same sans, large, regular to medium weight (400 to 510), tracked tight (-2% to -6%).
- **Accent.** One signal colour, plus state colours (green up, red down) that appear only on a
  state. Nobody uses three brand colours.
- **Radius.** Small on panels (4 to 8px); pills only on buttons and tags. (The site's own rule bans
  pills: 6px or plain text.)
- **Density.** Dense inside a panel (14 to 16px body, tight rows), quiet between panels.
- **Motion.** Hover and reveal only on Vercel and IMC; Linear and Polymarket run many small
  animations; Kalshi's are live-data ticks. None of the five moves the text while it is read.

## The counter-finding

Jane Street (`Alright Sans`, 60px weight 800, white ground), Hudson River Trading (`IBM Plex Sans`
plus `IBM Plex Mono`, 87px weight 300, white ground, one orange), Two Sigma (white, 23 animations,
pills x31), Citadel Securities (`TT Commons` and `Aktiv Grotesk`, white, two blues), Jump Trading
(white, one red). The quant firms front themselves on paper, not glass. HRT is the one that shares
the sans-plus-mono pairing with the dark five.

## The axes the three variants are built on

Taken from the table, not from a swatch:

| Axis | Found range | A: Ledger | B: Terminal | C: Board |
|---|---|---|---|---|
| Ground tint | neutral (Linear, Vercel) to cool (Kalshi, IMC) | neutral | cool blue-black | navy |
| Panel fill and blur | flat 2 to 4% (Vercel, Kalshi) to 50% with blur (Polymarket) | flat, no blur | 3% fill, blur on the bar only | 50% fill, blur on every panel |
| Hairline | 8% (Linear) to 14% (Vercel) | 10% | 12% | 18% |
| Type pairing | one sans (Vercel, Linear) · sans + mono (HRT, Kalshi) · two sans (Citadel, IMC) | one sans, mono labels | Plex Sans + Plex Mono | Space Grotesk display + Inter body |
| Display weight and track | 400 at -6% (Vercel) to 510 at -2% (Linear) to 500 (IMC) | 400, -4% | 500, -2% | 600, -1% |
| Accent count | one (Vercel, IMC) · one plus states (Kalshi, Linear) | one | one plus two state colours | one plus two state colours, used on the panels too |
| Radius | 4 (Polymarket, IMC) · 6 (Vercel) · 8 (Kalshi, Linear) | 6px | 8px | 4px |
| Density | tight (Vercel, Linear) to airy sections with dense panels (Kalshi) | tight | medium | airy outside, dense inside |
| Motion | hover only (Vercel) · reveal and hover (IMC) · ambient (Linear) | hover only | reveal and hover | reveal, hover, one ambient glow |

Sources: the ten URLs above, fetched 2026-10-20. Screenshots of the ten stayed in the session
scratchpad (research references; they do not ship, per the web bible's screenshot policy).
