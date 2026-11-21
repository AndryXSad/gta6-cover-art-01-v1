# Vice Cover Studio — GTA-style poster cover maker

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into a
multi-panel poster cover in the style of GTA 6's posters — bold caption
lettering, a Vice City sunset or neon colour grade — exported as a PNG to
share. Built for the [make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** load up to three photos from your machine (or use the
  bundled samples). Every panel can show any photo.
- **Crop and position:** pick a panel, drag it on the preview to move the
  photo, scroll to zoom, or use the sliders. One photo can fill several
  panels, or each panel can show a different one.
- **Four poster layouts:** Vice Trio, Sunset Strip, Hero + Duo, Four Corners.
- **Four colour grades:** Vice Sunset, Neon Night, Palm Dusk, Mono Noir.
- **Caption:** your own title and subtitle, three lettering styles
  (solid + outline, neon glow, chrome band), top or bottom placement,
  adjustable size.
- **Fast export:** one click exports a PNG in 1080×1080, 1080×1350 or
  1920×1080.

## Run it

The app is static files under `app/` — no build step, no network request.
Serve it with any static server:

```sh
node serve.ts
# open http://localhost:8080
```

Everything runs in your browser. Photos are read on your machine and are
never uploaded. Tip: Ctrl/Cmd+Enter exports the cover at the chosen size
without reaching for the button.

## Originality

All artwork is made by this app at render time. It uses no Rockstar Games
logo, wordmark, official artwork, character or font. The type is
Liberation Sans and Noto Sans Display, shipped under `app/fonts/` under
the SIL Open Font License 1.1 (`app/fonts/OFL.txt`). The sample photos
under `app/samples/` were made with an image model and are free to use.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
