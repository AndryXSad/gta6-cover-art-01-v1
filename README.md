# Vice Cover Studio

[![make.fun — gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Vice Cover Studio** turns your photos into a multi-panel GTA-style poster
cover, right in the browser. Pick a layout, a colour grade and a lettering
style, crop and position each photo, write your caption, and export a PNG
ready to post. Everything runs offline — your photos never leave your
machine.

Built for the [make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01)
($250, top 50).

## Features

- **4 layouts** — Vice Trio (three upright panels), Sunset Strip (hero band
  over two panels), Hero + Duo (big lead panel with two stacked), Four
  Corners (2×2 grid).
- **4 colour grades** — Vice Sunset, Neon Night, Palm Dusk, Mono Noir.
  Each grade re-tones the photos and lays a matching colour wash over the
  poster.
- **3 lettering styles** — Vice Bold (white block title, dark outline),
  Neon Glow (glowing title on a dark band), Chrome Band (title on a
  metallic strip).
- **Crop & position per panel** — drag a photo on the canvas to pan it,
  scroll to zoom, or use the zoom / left-right / up-down sliders.
- **Your photos or the samples** — upload any image for any panel, fill
  all panels with one photo, or use the two bundled AI-made sample photos.
- **Exact export sizes** — 1080×1080, 1080×1350 and 1920×1080 PNG, at the
  pixel. Shortcut: Ctrl/Cmd + Enter.
- **Fully offline** — static files under `app/`, no network requests, no
  build step.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `app/index.html` directly in desktop Chrome.

## How it works

- `app/index.html` — the editor shell: controls on the left, live canvas
  preview on the right.
- `app/style.css` — the editor's dark neon theme.
- `app/src/cover.js` — the pure canvas renderer: panel geometry, photo
  cover-fit with focal point + zoom, colour grades, caption lettering,
  vignette.
- `app/src/main.js` — state, controls, drag/wheel gestures, PNG export
  (`window.__viceExport(size)` renders any size on demand).
- `app/fonts/` — Noto Sans + Noto Sans Display Condensed, both under the
  SIL Open Font License 1.1 (see `app/fonts/FONTS.txt`).
- `app/samples/` — two AI-made sample photos from the bounty kit, free to
  use.
- `main.ts` — the submission entrypoint: copies `app/` and `screenshots/`
  to the output directory and writes `dossier.json` with `buildDossier`
  from `vendor/makefun-app.ts`.
- `serve.ts` — the local static server above.

Verify the dossier locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Notes

- Original work, not affiliated with Rockstar Games. No Rockstar logos,
  wordmarks, official artwork, characters or fonts are used anywhere.
- License: MIT (see `LICENSE`). Fonts: SIL Open Font License 1.1.
