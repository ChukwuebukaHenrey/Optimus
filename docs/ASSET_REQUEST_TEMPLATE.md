# Universal Optimus pixel-art asset request — agent fills this, then asks for generation

**Purpose:** ensure every newly requested piece fits the *same original Optimus pixel-art world*. Use this whenever the agent needs an art asset absent from `ASSET_MANIFEST.md`, or when a draft asset needs final-quality refinement.

**Agent procedure:**

1. Search the real manifest and filesystem. If the asset exists, reuse it; if absent, don't invent filenames or download the nearest third-party art.
2. Duplicate the request block below, **fill every bracketed field**, and save it to `docs/design/requests/<ASSET_ID>.md`.
3. Send the filled request to the asset creator and mark the manifest item `needs_generation`. You may use an explicitly labelled placeholder or this starter kit's draft image in a motion prototype, but never call the final asset finished.
4. On delivery, inspect the actual pixels, alpha, crop, dimensions, alignment, first/last frame, provenance, and mobile usage. Update the manifest and scene config, and only then use it in final UI.
5. If a new asset can be achieved by changing colors, positions, orientation, duration, scale or an existing SVG/CSS state, **edit the configuration or code instead of regenerating art**.

## Copy/fill the request

```markdown
# PIXEL ASSET REQUEST — [ASSET_ID]

ROLE: Senior 2D pixel-art environment/character artist working on **the original Optimus verification-observatory world**.

USE CASE: [hero / mobile nav / documentation / pricing/editorial / footer / agent / effect]
TYPE: [background layer / transparent overlay / prop / sprite strip / individual character frames / editorial scene]
EXACT ACTION OR SUBJECT: [one concrete description]
TARGET COMPOSITION: [position and anchor; perspective; x%, y%; negative space for copy; depth layer]
CHARACTER CONTINUITY (if relevant): cast v2, from `assets/source/optimus-agent-sheet.png`.
  OPTIMUS AGENT (contract, evidence, verdict poses): tan/cream cloth hood with gold trim; black glossy visor face with two friendly rounded cyan (#4FE0FF-ish) eyes; lime ring "ears"; purple scarf and purple cloak with a gold square-dot border; brown leather satchel; tan/grey limbs; dark boots.
  BROWSER RUNNER (the Kane browser run; never shown judging): same body and visor, but a deep purple hood with gold trim and narrower focused eyes; sits with a dark laptop showing a lime `>_` prompt.
  REPAIR SMITH (the coding agent): see A-05. Same visor-and-cyan-eyes family, own silhouette and palette.
  Pixel scale: hero sprites 80 px tall at native resolution; editorial portraits 128 px tall. One art pixel = one square block, no anti-aliasing.
STYLE LOCK: Original retro high-resolution pixel art; sharp visible square pixel clusters; painterly-but-crisp 2D environments; atmospheric deep-blue/cyan skies, vivid moss-green terraces, warm limestone ruins, turquoise water, controlled lime highlights; friendly readable robot characters; consistent oblique-front 2D perspective, sunlight from upper-left. Preserve character silhouettes, accessories, palette and logical baseline across frames. NOT a screenshot of a web page.
UI COLOR SEPARATION: The surrounding interface uses `--dominant #0E3A5B` and `--accent #D9F53B`; art may have a richer scene palette. Do not bake UI chrome into the artwork.
DIMENSIONS: [e.g. 1600×900 environment / 448×448 per character frame / 96×192 waterfall tile]
ALPHA: [opaque base / true RGBA transparent, no background / tileable with repeating edges]
FRAME PLAN: [count; action phases; each pose; frame duration; first/last identical for loop; same feet/prop anchor]
ANIMATION INTENT: [period, CSS vs sprite, layering, overflow/occlusion]
DEPTH ORDER: [z index or near/far layer]
MOBILE: [crop and subject-safe-zone; or substitute asset]
OUTPUT FILES: [exact names and folder destinations]
DELIVERABLES: Separate PNGs (and/or a clean sprite strip), master source, preview/contact sheet, measured alpha/crop, updated manifest record, provenance note.
NEGATIVE: No logos, no website headline, no letter labels, no buttons, no floating verdict cards, no borders between sprite frames, no watermarks, no photographic realism, no gradients washing out pixels, no cloned Cofounder artwork.
REFERENCES: See `docs/REFERENCE_ANALYSIS.md` and the original user PDFs for visual *principles*, plus `assets/hero/hero-environment-master.png` for this project's unique color/perspective; do not reproduce third-party artwork.
ACCEPTANCE: Verify visual continuity against existing assets; frame 0 and last frame match; no clipping; alpha is real; repeat texture wraps seamlessly; orientation and lighting match the asset pack; final file exists at requested path.
```

## Asset coverage map — original equivalents for the visible Cofounder references

1. **Forest hero** → original `H-00` observatory hero plate, plus X-01 separate depth layers and X-02 masked waterfall. Ask for each missing layer separately.
2. **Hovering clouds, leaves and foliage** → H-02, H-03, H-05, H-06 starter overlays; request bespoke branches/flowers with this template when needed.
3. **Specialized workers/agents** → A-01 to A-04 strips and their poses; request specific motions and occlusion pieces as separate transparent sprites.
4. **Team orchestration diagram** → draw with DOM/SVG and actual Optimus workflow data; not a generated fake dashboard.
5. **Feature accordion illustrations** → real components plus optional original small sprites; avoid screenshot-only tiles.
6. **Editorial chapter art** → E-01 beacon is a starter; use request for new chapter-specific stories instead of borrowing Cofounder's rocket.
7. **Pricing card art** → E-02 signal-bloom; display no invented commercial price.
8. **Product status/agent panel art** → DOM UI with authenticated or clearly illustrative data; pixel props may decorate outside data.
9. **Footer word grid** → `U-01` puzzle data + real responsive HTML buttons and links. The puzzle's letters must never be baked into a PNG.
10. **Footer decorations** → request original transparent pixel border, flora and small floating lights under X-04.
11. **Desktop + mobile navigation** → DOM/CSS and accessible dialog, not artwork.
12. **Logo** → provisional outlined SVGs only; do not falsely claim CoreOS-derived symbol is an original trademark-cleared identity.

This coverage addresses the **visible design families in the supplied PDFs**, not unseen proprietary Cofounder assets.
