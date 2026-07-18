# Audio provenance — every shipped track, its source, its license

The music beds (C7). GO is otherwise 100% Web Audio synth (SFX + the menu bed); these
are the only audio FILES in the repo — the owner's own original compositions, ported
from the desktop game.

| File | Source | Identity | License |
|------|--------|----------|---------|
| run.mp3 | `C:\projects\fulfillment\audio\run.mp3` (desktop repo) | "Ride" — the in-run bed | **Owner-composed original** (Jordan Doerksen); no external license |
| boss.mp3 | `C:\projects\fulfillment\audio\boss.mp3` (desktop repo) | "Boss-Music" — the Supervisor bed | **Owner-composed original**; no external license |

The **menu bed** ("The Drydock at 3am") is synthesized in code (`src/app/music.ts`, C7.2) —
no file. A service-worker precache of these MP3s for true offline play is a C8 ship-kit concern.
