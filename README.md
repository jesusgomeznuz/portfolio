# CanicasBrawl — web demos

Astro site running two games **in the browser**: CanicasBrawl and Musical Path.
Physics is Rapier compiled to WASM, through `@react-three/rapier` on top of
React Three Fiber.

This is the web port of a game whose original lives in Rust
([canicasbrawl-rapier](https://github.com/jesusgomeznuz/canicasbrawl-rapier) +
[rapier-bevy](https://github.com/jesusgomeznuz/rapier-bevy)). Read
[What's not here](#whats-not-here) before assuming parity.

---

## Run it

All you need is **Node ≥ 22.12.0**. No Rust, no ffmpeg, no tokens, no env vars.

```bash
git clone https://github.com/jesusgomeznuz/portfolio.git
cd portfolio
npm install
npm run dev        # → http://localhost:4321
```

Then open **http://localhost:4321/canicas** — that's the game.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static site to `dist/` (~2.5s, 5 pages) |
| `npm run preview` | Serve the built output |

> `npm install` reports some audit warnings from transitive dev dependencies.
> They don't affect the build or the demo — no need to `audit fix` before running.

---

## Routes

| Route | What it is |
|---|---|
| `/canicas` | **The marble game**, playable in the browser |
| `/musical` | Musical Path — the score drives the runners |
| `/flow` | Diagram of the CanicasBrawl production pipeline |
| `/flow-musical` | Same, for Musical Path |
| `/` | Portfolio landing page |

---

## Where the game lives

```
src/
  components/
    canicas-demo/
      CanicasDemo.tsx   ← mounts the canvas and the scene
      Race.tsx          ← the race: marbles, camera, timer
      Module.tsx        ← the modules the level is built from
      Background.tsx    ← background and palette
      race_rules.ts     ← ALL the game constants
    musical-demo/
      MusicalDemo.tsx  Show.tsx  Corridor.tsx  song_rules.ts
  pages/                ← one .astro per route
  data/                 ← JSON for the flow diagrams
```

Components mount with `client:only="react"` — the game is 100% client-side,
nothing renders on the server. That matters if you embed it: it needs a browser.

### To tune the game, start at `race_rules.ts`

Every constant is in one file, so you don't have to hunt through components:

```ts
UNIT = 0.35             // base level unit
MARBLE_RADIUS = 0.085   // marble radius
GRAVITY_Y = -3.0        // gravity (softer than real, on purpose)
RACE_SECS = 35          // race duration
CAMERA_Z = 2.5          // camera distance
DESIGN_ASPECT = 9/16    // vertical — TikTok/Reels format
WALL_HALF_WIDTH = 0.55  // lane width
```

Power-ups are `PickupVariant`: `freeze`, `shrink`, `swap`.

---

## What's not here

This is a **partial port**, not the full game. Against the Rust original:

| | Rust (`canicasbrawl-rapier`) | Web (this repo) |
|---|---|---|
| Lines | 3,758 | 1,644 |
| Last evolved | August 2026 | July 2026 |

Rust-only:

- **mp4 recording.** The whole video pipeline (`--record`, timelines,
  `--write-timeline` / `--play`) lives in the Rust engine. The web build only
  plays in real time.
- **Traps with sensors grouped by effect**, trap icons, and the per-marble
  timer — an August refactor that was never ported.
- **The voice tracker**, which decides which character sings at each moment and
  feeds the audio production.

Treat it as a working base to build on, not as the finished game ported over.

---

## Stack

Astro 6 · React 19 · Three.js · React Three Fiber · `@react-three/rapier` ·
`@react-three/drei` · Mermaid (flow diagrams).
