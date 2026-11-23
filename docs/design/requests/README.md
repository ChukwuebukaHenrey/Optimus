# Asset requests — index

Filled from `docs/ASSET_REQUEST_TEMPLATE.md`. Each file is one asset ID. Send the code block in
each file to the image tool as-is. When something comes back, give me the file. I check it
(pixel grid, alpha, size, how the loop joins up) and only then mark it delivered.

## Needs generating (you)

| ID | Asset | Priority | Blocks |
|---|---|---|---|
| [H-01](H-01.md) | Hero environment: observatory terrace, in layers | **P0** | Hero loop video, sprite placement |
| [A-05](A-05.md) | Repair Smith (the coding agent): new character, 2 poses | **P0** | 5th hero agent, Repair chapter |
| [A-00](A-00.md) | *Optional, my preferred version:* the whole cast regenerated on a true pixel grid | P1 | Nothing. The cleanup below works without it. It's just better. |
| [E-01](E-01.md) | Chapter vignette: Contract | P1 | 1.0 section art |
| [E-02](E-02.md) | Chapter vignette: Evidence | P1 | 2.0 section art |
| [E-03](E-03.md) | Chapter vignette: Verdicts | P1 | 3.0 section art |
| [E-04](E-04.md) | Chapter vignette: Repair | P1 | 4.0 section art |
| [F-01](F-01.md) | Footer / final-call scene: observatory at dusk | P2 | Final call-to-action band |

## Made in-house (me) — no request needed

| Item | How |
|---|---|
| Agent sprites (contract, evidence, verdict, browser run) | Clean up the existing sheet with Pillow: snap to a pixel grid, cut to a 24–32 colour palette, make the alpha on/off, strip the fringe, re-cut to 80 px and 128 px |
| Idle animation frames | Built from the single frames: blink, `>_` cursor blink, magnifier glint, a tick drawing in, ear-ring pulse, a 1 px breathing bob |
| Water and light motion in the hero | Palette cycling on the plate's waterfall pixels, lantern flicker, drifting light motes |
| Pixel clouds (3–4 shapes) | Drawn in code, in the plate's palette |
| Hero loop video | ffmpeg: compose the layers, make a 12 s seamless loop, export WebM + MP4 + an AVIF poster |
| Pixel-dissolve edge under the hero | SVG/CSS mask |
| Mobile-menu line art | SVG pixel-step lines |
| Icons | Phosphor (`@phosphor-icons/react`), Light for UI, Regular for verdicts |
| OG image, favicon | Composed from the hero still and the logo |
| Logo options | SVG drafts for you to choose from. The CoreOS-derived mark stays provisional. |

## Shared rules for every generated asset

- **The pixel grid is the whole point.** Ask for crisp square pixels with no anti-aliasing, no
  blur and no glow halos. Deliver upscaled by an exact whole number (×3 or ×4, nearest
  neighbour), so I can snap it back to native size without loss.
- **Transparency:** a true RGBA PNG is preferred. If the tool can't do that, use a perfectly flat
  `#FF00FF` background. None of our characters use magenta.
- **Never:** text, logos, UI windows, laptops lying on grass, framing tree trunks, sunflowers,
  city skylines, or anything in Cofounder's style (`docs/REFERENCE_ANALYSIS.md` guardrails).
- **Provenance:** for every delivery, record the tool, model/version, date and prompt in
  `docs/design/ASSET_PROVENANCE.md`. The hackathon requires everything to be made during the event.
