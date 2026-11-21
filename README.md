# Vice Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/AndryXSad/gta6-cover-art-01-v1/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos into GTA-style poster cover art — the multi-panel Vice City look with bold caption lettering and a sunset or neon colour grade — and exports it as a PNG to share. Built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** add your own photos from your machine (or load the two bundled samples). One photo can fill every panel, or each panel can take a different photo. Photos are never uploaded — everything runs in your browser.
- **Four layouts:** Vice Trio (three upright columns), Sunset Strip (wide banner over two halves), Hero + Duo (one big feature panel with two stacked beside it), Four Corners (2×2 grid).
- **Four colour grades:** Vice Sunset, Neon Night, Palm Dusk and Mono Noir — warm glow, electric night, purple dusk or high-contrast black and white.
- **Three letterings:** Vice (tall condensed title with a pink bar), Neon (glowing outline) and Chrome (silver band with rules).
- **Crop and position per panel:** drag the preview to pan, scroll to zoom, or use the zoom and pan sliders.
- **One-step export:** PNG in the common post sizes — 1080 × 1080, 1080 × 1350 and 1920 × 1080. Ctrl/⌘ + Enter exports too.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Then pick a layout, a grade and a caption, frame each photo, and hit Download PNG cover.

No build step, no network requests: `app/` is plain static files, and every script, font and sample photo it loads is a file under `app/`.

## How the cover is made

`app/src/cover.js` paints the poster on canvas: each photo is cover-fit into its panel with its own zoom and focal point, thin pale gutters separate the panels, a grade wash (sunset glow, neon magenta/cyan, dusk purple/amber or noir) is laid over the whole poster with a vignette, and the caption block — big condensed title plus sub-caption — sits on a bottom scrim so it stays readable over any photo. `app/src/main.js` owns the editor state and the DOM wiring.

## Fonts and photos

- Fonts: Liberation Sans (Regular, Bold) and Noto Sans Display Condensed (SemiBold, ExtraBold), all under the SIL Open Font License 1.1 — see `app/fonts/FONTS.txt` and `app/fonts/OFL.txt`. No Rockstar Games logo, artwork or font is used anywhere.
- Sample photos: the kit's two AI-made photos (`app/samples/`), free to use.

## Entry program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
