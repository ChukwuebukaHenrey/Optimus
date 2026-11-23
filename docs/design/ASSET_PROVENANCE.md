# Asset provenance

Every raster asset on the website and in the report, where it came from and what was done to it.
The hackathon requires that work is made during the event (from 21 Nov 2026).

## Source boards (supplied by the project owner, 23 Nov 2026)

| File in `assets/source/` | What it is | Generation tool / model | Date |
|---|---|---|---|
| `asset-pack-sheet.png` (1536×1024) | Board with the cast (A-01…A-05, main + blink), editorial scenes E-01…E-04, hero layers, dusk scene, palette | ChatGPT (OpenAI image generation), generated 22 Nov 2026; to be edited by the owner later, and this entry updated after the edits | supplied 23 Nov 2026 |
| `website-kit-mockup.png` (1536×1024) | Website mock-up board; source of the only full dusk scene (F-01) | ChatGPT (OpenAI image generation), generated 22 Nov 2026; to be edited by the owner later, and this entry updated after the edits | supplied 23 Nov 2026 |
| `observatory-plate.png` (1672×941) | Hero environment without characters (H-01a) | ChatGPT (OpenAI image generation), generated 22 Nov 2026; to be edited by the owner later, and this entry updated after the edits | supplied 23 Nov 2026 |

The boards were generated from the requests in `docs/design/requests/` (H-01, A-05, A-00, E-01…E-04,
F-01). They are presentation boards, not individual files: the claims printed on them ("exact-grid
exports", "≤32 colours") describe the request, not the delivered pixels.

## A-06 movement sheets (supplied by the project owner, 23 Nov 2026)

| File in `assets/source/` | Agent | Generation tool / model | Date |
|---|---|---|---|
| `Hooded Robot Sprite Sheet.png` (2172×724) | contract | ChatGPT (OpenAI image generation), per the owner | supplied 23 Nov 2026 |
| `Hooded Hacker Robot Sprite Sheet.png` (2172×724) | browser run (walk row empty, as requested) | ChatGPT (OpenAI image generation), per the owner | supplied 23 Nov 2026 |
| `Hooded Robot Detective Sprite Sheet.png` (2172×724) | evidence | ChatGPT (OpenAI image generation), per the owner | supplied 23 Nov 2026 |
| `Pixel Robot Inspector Sprite Sheet.png` (2172×724) | verdict | ChatGPT (OpenAI image generation), per the owner | supplied 23 Nov 2026 |
| `Chibi Robot Mechanic Sprite Sheet.png` (2172×724) | repair smith | ChatGPT (OpenAI image generation), per the owner | supplied 23 Nov 2026 |

Generated from `docs/design/requests/A-06.md` (v2). Delivered as 8 columns × 3 rows (turnaround,
walk, action) on a transparent canvas, but not on the requested exact 384 px grid (cells are
271.5 × 241.3 px) and with soft alpha edges; the slicer below compensates.

## Post-processing (reproducible, in this repository)

| Output | Script | What it does |
|---|---|---|
| `website/public/art/agents/<agent>.png`, `<agent>-sheet.png`, `website/src/content/agent-frames.json` | `website/scripts/extract_art.py` | From the A-06 sheets: cuts every cell (turnaround, walk, action) from the canvas size; thresholds alpha at 50% (drops the halo); snaps to a native grid by area averaging, one scale for all agents (the contract's rest pose = 80 art px); pins the cyan eyes; one 48-colour palette per agent across all its frames; keeps each frame's horizontal place in its cell, lines each row's first frame up with the rest pose, and stands every frame on one baseline. `<agent>.png` = rest pose (action frame 1) + a **synthesised** blink (page sections); `<agent>-sheet.png` = rest, blink and all drawn frames in one strip (hero), saved as an exact indexed PNG. If the sheets are missing, it falls back to the old board crops. |
| `website/public/art/editorial/E-0*.png`, `scene/F-01-dusk.png` | same | Crops inset past the board's rounded corners and labels; snaps to 320 px (480 px for F-01) wide; 48 colours. |
| `website/public/art/scene/H-01-plate.png` | same | Snaps the observatory plate to 640×360; 96 colours. |
| `website/public/art/hero/fall-*.png`, `lantern-*.png` | `website/scripts/make_hero_layers.py` | 12-frame waterfall strips drawn in the plate's own water colours (fixed seed); lantern glass glow overlays. |
| `website/src/content/word-search.json` | `website/scripts/make-word-search.mjs` | Deterministic 12×12 grid; every word appears exactly once. |

Not used: the supplied 640×360 MP4 loop (crude block clouds and lime blocks over the lanterns, a
visible seam, MP4 only), the contact sheet JPEG and the hero mock-up with agents baked in. They
remain in the owner's checkout and are not committed.

## Fonts and icons

- Bricolage Grotesque, Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono — SIL OFL 1.1, via
  Fontsource; licences in `src/report/assets/fonts/*.LICENSE`.
- Phosphor Icons — MIT (`@phosphor-icons/react`).

## Logo

- The mark is the symbol from `docs/Optimus_CoreOS_Components.zip` (a CoreOS-derived design). The
  project owner states it is free to use with no copyright restriction (23 Nov 2026). It is used as
  a single SVG path (`src/report/mark.ts`) in the website nav, menu, footer, favicon and the report.
- The kit's wordmark SVG set "Optimus" as live text in Inter/Arial; that text is not used. The word
  is set in Bricolage Grotesque next to the mark.
