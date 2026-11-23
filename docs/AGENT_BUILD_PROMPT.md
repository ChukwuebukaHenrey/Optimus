# Optimus website — implementation directive for the coding agent

You are the senior frontend engineer, motion designer and accessibility QA owner for Optimus. The user has approved producing the Observatory asset set. **Import these real files; don't invent art assets or regenerate screens from screenshots.**

## Before changing code
1. Read the repository's `AGENTS.md`, `DESIGN.md`, `docs/UI_STRUCTURE.md`, and `docs/UI_DATA_CONTRACT.md`. Identify the current report/bundle/repair code, real tests and ownership boundaries. If the current source differs, treat current code as authoritative and note the discrepancy.
2. Read this pack's `README.md`, `scene-config.json`, `docs/HERO_PROPOSAL.md`, `docs/ASSET_PROVENANCE.md`, and art previews. Verify dimensions and transparency before coding.
3. Work in **`website/` only** for the marketing site (Next.js App Router static export, TypeScript, Tailwind v4 CSS tokens, shadcn/ui primitives if actually installed). Do not alter the TypeScript CLI, deterministic evaluator, repair controller, pack schema, scenario scoring, Kane traces, or corpus apps.
4. The offline comparison report is **separate**, no JavaScript, and must never import the website's Motion/React runtime. Its sole data source is the validated comparison bundle.

## Required pages and flow
1. Homepage, anchored navigation: Contract, Evidence, Verdicts, Repair, Docs, and footer word-search. Keep the hero copy from `docs/HERO_PROPOSAL.md` unless the user changes it.
2. H-01 hero: responsive static DOM copy, **environment-only 12-second loop**, five separately animated character sprites, hover/focus captions and real links to the matching chapters. No webpage-as-GIF and no one-frame-per-page slideshow. Position with scene-config, preserve 16:9 coordinate space and a calm upper-left copy zone.
3. Desktop nav: logo left, grouped translucent capsule links, separate Docs chip, one high-contrast CTA. Scroll state becomes a paper-toned nav with dark text. Avoid background contrast failures. Mobile nav: accessible shadcn Dialog if installed, otherwise equivalent accessible native dialog. Full-screen blue menu with large links, 44px close, focus management, Escape, body-scroll lock, safe-area handling. Opening the menu must not move the hero.
4. Editorial chapters: E-01 Contract (show real approved pack), E-02 Evidence (real archived screenshots when available), E-03 Verdicts (render a truthful sample taken from validated bundle), E-04 Repair (the actual FAIL → brief → changed file → fresh PASS chain, only when the fixture supports it). User-visible verdicts must never come from an LLM or invented example sold as real data.
5. Word search close to footer: render `assets/word-search.json` as real selectable 12×12 grid; support drag/touch and keyboard two-click selection. Match only straight saved solutions forward or reversed; mark found words, announce status through `aria-live`, and keep a visible alternative list of links for every word. No image-as-puzzle.
6. F-01 dusk CTA and footer. Keep the text live HTML. Add an actual repository link; do not invent a deployed report URL. Keep the provisional CoreOS-derived logo out of production until an original trademark-cleared mark is approved.

## Motion and graphics
- CSS `steps()` for sprites; Motion for React for micro-interactions and scroll reveals only; CSS environmental loops or provided WebM/MP4 for background. Use differing durations and delays for each agent, and no synchronized hard reset. The 6th frame equals the 1st, so the loop seam is intentional.
- On mobile, show three agents in the hero and reveal Evidence/Smith characters in their chapters. Honor `prefers-reduced-motion` for video, sprites, parallax and scroll animations.
- Include a poster for offline/light browsers. No text baked into assets. `image-rendering: pixelated` for all raster pixel art; maintain exact integer upscale where the device/browser permits.
- Inspect the preview screenshot and the real build at 360,390,768,1024,1440px widths. No horizontal overflow or nested page scroll.

## Asset management
- Reuse existing pack assets whenever a change is only pose location, crop, opacity, theme color or CSS timing.
- If a new asset is **truly** required, fill out `docs/ASSET_REQUEST_TEMPLATE.md` with explicit ID, scene, identity, palette, native canvas, scale, alpha, layers, frame endpoints, positioning, responsiveness, forbidden elements and exact filename; mark MISSING until the user supplies it. Do not fabricate its existence.
- Keep `docs/ASSET_PROVENANCE.md` updated with date, tool, version when known, reference and post-processing.

## Acceptance gate
- Working static export, clean typecheck/build, URL routes and page accessibility (keyboard nav, dialog focus, puzzle live status, reduced motion).
- One continuous 12-second environment loop where **the webpage does not shift** and character loops are independently animated.
- Hero and chapters match the supplied assets, not generic shadowed-card SaaS templates.
- All result data derives from the comparison bundle or is prominently marked as example-only; no unapproved grading logic changes.
- Production source, generated artifact and screenshot evidence delivered in one implementation handoff. If the browser test is blocked, say so explicitly.

**Proceed to implementation rather than reopening the design audit.** Only stop for a material missing dependency or a user decision that cannot be inferred from the accepted brief.
