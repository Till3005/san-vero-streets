[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Till3005/san-vero-streets/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Till3005/san-vero-streets/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
Built with an AI agent for [make.fun](https://make.fun/?ref=nkpmb14b) — earn USDC on bounties.

# SAN VERO STREETS

A top-down open-world crime game in the spirit of classic GTA — built from scratch with plain
HTML, canvas and ES modules. No libraries, no images, no network: every building, car and
pedestrian is drawn in code, and the whole city is procedurally generated from a seed.

## The story

You are **Rico Camara**, fresh out of County and back on the sun-bleached streets of **San Vero**,
a coastal city of diners, motels, pawn shops and one very crooked river. **Yara Delgado** owes
Rico's family a favor, and the jobs start small: a chauffeur run to the docks. They don't stay
small. A stolen coupe, a ticking parcel, a Viper crew squatting on the motel lot, a vault alarm
that rings the whole SVPD — and finally **Marcus Vane**, the man who sold Rico's brother out,
running the take north in an armored car called the **Warhound**.

Six jobs. One city. No way out clean.

## Controls

| Keys | Action |
| --- | --- |
| `WASD` / Arrows | Walk / drive |
| Mouse + Click or `Space` | Aim & fire |
| `E` | Enter / exit cars (steal them) |
| `Shift` | Sprint on foot / handbrake in cars |
| `Esc` | Pause menu |
| `M` | Mute (WebAudio synth sound) |

## Missions

1. **Fresh Start** — meet Yara at Chico's Diner and chauffeur her to Vero Docks.
2. **Borrowed Wheels** — lift the yellow 550 Spider from the Palm Court Motel and deliver it
   to Rufus Auto Body in one piece.
3. **Rush Hour** — a priority parcel from Swift Couriers to Salty's Marina. Eighty seconds.
4. **Pest Control** — five Vipers hold the motel back lot. Goldline Pawn pays for quiet.
5. **Smash & Grab** — open the Goldline safe, survive a 3-star citywide alert, lose the heat.
6. **The Last Deal** — intercept Vane's armored convoy and destroy the Warhound.

Cash is the score; progress auto-saves to `localStorage` (Continue on the title screen).
Crimes raise your wanted level (0–5 stars): SVPD cruisers chase you, cops on foot shoot back,
and if they corner you it's **BUSTED**. Run out of health and it's **WASTED** — either way you
wake up minus a fee, free to try again.

## How to run

```bash
node serve.ts            # serves game/ on http://localhost:8080
# open http://localhost:8080 in a browser
```

There is no build step — `game/` is plain static files. To verify the bundled output:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Tech notes

- **Engine**: hand-written canvas 2D + ES modules (`game/src/`): city generation, traffic AI,
  pedestrian AI, police wanted system, mission scripting, particles, minimap, HUD, UI screens.
- **City**: a 90×90-tile grid (10×10 blocks) — roads with lane markings, signals and
  crosswalks, sidewalks with props, parks with ponds, parking lots, a river with bridges,
  a beach and ocean with boats and piers. 2.5D buildings with procedural roofs (AC units,
  vents, water tanks), all drawn with canvas primitives.
- **Determinism**: `?seed=N` reproduces the same city, traffic and pedestrians.
- **Screenshots**: `?shot=start|play|drive|action&seed=N` (plus optional `&t=seconds`)
  fast-forwards the real simulation to a representative state, draws it and stops
  (`window.__shotReady`) for headless capture.
- **Sound**: optional WebAudio oscillator/noise synth (engine, sirens, gunfire, explosions).
- **Save**: `localStorage` key `sanvero-streets-v1` — cash, mission progress, stats.

Original work: all names, characters, art and code are invented for this project. MIT licensed.
