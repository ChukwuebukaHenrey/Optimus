# Asset provenance

Every raster asset on the website and in the report, where it came from and what was done to it.
The hackathon requires that work is made during the event (from 21 Nov 2026).

## Source boards (supplied by the project owner, 23 Nov 2026)

| File in `assets/source/` | What it is | Generation tool / model | Date |
|---|---|---|---|
| `asset-pack-sheet.png` (1536×1024) | Board with the cast (A-01…A-05, main + blink), editorial scenes E-01…E-04, hero layers, dusk scene, palette | **To be supplied by the owner** | 23 Nov 2026 |
| `website-kit-mockup.png` (1536×1024) | Website mock-up board; source of the only full dusk scene (F-01) | **To be supplied by the owner** | 23 Nov 2026 |
| `observatory-plate.png` (1672×941) | Hero environment without characters (H-01a) | **To be supplied by the owner** | 23 Nov 2026 |

The boards were generated from the requests in `docs/design/requests/` (H-01, A-05, A-00, E-01…E-04,
F-01). They are presentation boards, not individual files: the claims printed on them ("exact-grid
exports", "≤32 colours") describe the request, not the delivered pixels.

## Post-processing (reproducible, in this repository)

| Output | Script | What it does |
|---|---|---|
| `website/public/art/agents/*.png` | `website/scripts/extract_art.py` | Crops each agent from the board; keys out the cream board by flood fill from the crop edges (keeps enclosed near-white parts such as the clipboard paper); removes the floor shadow; snaps to a native grid (80 art px tall) by area averaging; reduces to 32 colours; pins the cyan eyes; strips cream edge pixels. Frame 2 is a **synthesised** blink (the board's blink drawings are a different size). |
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
