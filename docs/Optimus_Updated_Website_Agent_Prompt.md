# IMPLEMENT NOW — Optimus website UI and animation (after the repo audit)

You are the **lead frontend architect, visual designer, pixel-art motion director, accessibility engineer and QA owner** for Optimus. You already received a `DESIGN.md` repo audit. Do **not** restart a speculative architecture audit; perform only a brief current-files check, resolve conflicts against actual repo state, and build a real website. Follow the existing AGENTS.md non-negotiable grading constraints. Do not touch `corpus/`, packs, Kane adapter, evaluator, expectations, grade rules or repair orchestration except to read their documented output schemas. Use a separate website workspace from the Node CLI and offline report generator.

## Source of truth and supplied package

Read, in order: the repository's `AGENTS.md`, `package.json`, latest `docs/UI_STRUCTURE.md`, `DESIGN.md`, then this kit's:

- `docs/REFERENCE_ANALYSIS.md` (actual PDF-derived UI patterns, page-by-page)
- `docs/ASSET_MANIFEST.md` (real files, absent assets, provenance)
- `docs/MOTION_SPEC.md` (seamless independent motion)
- `docs/ASSET_REQUEST_TEMPLATE.md` (required asset-request protocol)
- `scene-config.json` (positions, z-order, timing; change parameters rather than regen)
- `demos/index.html` (technical demo: navbar, responsive menu, real word search, independent sprites)

The original user-supplied PDFs are copied under `refs/`. Use them for **direction and comparative QA**, not pixel-for-pixel copying. A logo kit is included under `assets/brand/`, but the symbol is derived from CoreOS and **provisional; do not call it original or trademark-cleared**. `docs/UI_STRUCTURE.md` governs the **offline assessment report**, not the animated website; do not apply the report's no-JS or inline-CSP restrictions to the marketing site.

## Goal and done-when

Build an original, responsive Optimus marketing website whose visual storytelling is inspired by the references: a lush pixel-art verification-observatory hero, independent long-loop animated Kane/inspection/contract/evidence agents, editorial product sections with real demo-oriented UI, a compact desktop capsule navbar, a full-screen mobile navigation, and an **interactive linked word puzzle near the footer**. It must feel like a real web page: live DOM text and buttons remain stationary while illustrated layers animate. No whole-page GIFs, slideshow frames, motion on page wrappers, image-rendered text, nonexistent links or fake real-world claims.

## The six implementation stages (finite, no endless redesign)

### Stage 0 — Truthful intake, maximum one short pass

1. Inspect whether the repo already has a `website/`, `app/` or other frontend and which packages, components, styles and routing it uses. Do not assume a Tailwind config, shadcn or React exists just because the original prompt named them.
2. Create/use an isolated frontend directory (`website/` only if no suitable existing website exists). Prefer reuse; if nothing exists, select a compact frontend suited to static pages + one interactive puzzle (e.g. React/Vite or Astro with an interactive island). Explain the selection briefly. Keep root CLI unchanged.
3. Verify each file in the asset manifest **actually exists** before importing it. Make a tiny `ASSETS_STATUS.md` with available/draft/needs-final. Do not claim the starter environment plate is fully layered.
4. Read the logo SVGs and keep both light/dark polarity. Don't convert back to font-dependent live SVG text.
5. Confirm the latest repair-controller output schemas from real source files before visualizing a repair result; mock results are explicitly **Illustrative**.

### Stage 1 — Design system and layout skeleton

- Maintain website-specific tokens separately from static report tokens. Proposed UI chrome: `--dominant:#0E3A5B`, `--accent:#D9F53B`, paper `#F5F3EC`, ink `#121A22`. Semantic PASS/FAIL etc remain separate. Pixel-art *illustrations may be richly colored* despite the two-accent UI-chrome rule.
- Spacing follows an 8px layout rhythm, not a dogmatic 8px for every border/icon/line-height. Distinctive high-contrast display/body/mono typography; check actual font availability and license rather than referencing unavailable fonts. Reuse existing app components or create small purposeful ones.
- Build left-aligned hero headline: **"Grade the work. Not how it was built."** Support: **"One contract. Different builds. Evidence-backed verdicts."** Explain Kane's role factually (Kane acts and records; Optimus judges deterministically). One primary CTA plus a working secondary link. Don't invent customers, performance metrics, paid pricing, or validated repairs.
- Separate content into: hero → one contract/many builds → Kane evidence → comparison matrix sample/real data → conditional repair/recheck → documentation teaser → interactive word search → CTA/footer. Make section pacing editorial and spacious, not repeated identical cards.

### Stage 2 — Responsive navbar modeled on the *supplied navbar PDF*

- Desktop: logo left, small rounded/capsule navigation near top-right over hero; distinct actual links to How it works, Examples, Docs/Guide, GitHub and one primary action (omit links without a real target instead of rendering dead buttons). Avoid stealing Integrated Biosciences labels/design assets.
- Mobile: small logo + menu control; opening shows a full-viewport dark spruce/ink panel with high-contrast oversized vertical links, top-right large close control, restrained linework and bottom supporting text. Use native `<dialog>` or semantically correct focus-managed overlay; Escape works, focus returns to trigger, backdrop doesn't leak clicks, menu link closes it. Support 360px viewports and notch/safe-area.
- Menu transitions animate only overlay and link entries (`opacity`/small `transform`) with 250–400ms. The main hero must **not slide, zoom or get swapped frame-by-frame** when menu opens.

### Stage 3 — Hero scene and purposeful animation

- Base hero plate: `assets/hero/hero-environment-16x9.png`. Use it as a **temporary static scenic plate**, with correct mobile crop; source master is also included.
- Four agents are **independent transparent six-frame sprite strips** at `assets/agents/*-strip-6.png`. Load coordinates/durations from `scene-config.json` and verify relative positions across 1440px/768px/360px. Use `steps(6,end)` and 17, 21, 19, 23-second periods with staggered active frames; preserve bottom-center anchors; no visible frame reset.
- Independent cloud loops duplicate the same layer seamlessly; waterfall uses a vertically tileable texture but the **current draft geometry isn't a final water mask**—do not claim it is perfectly integrated until refined; particles move independently. Foreground grass remains an optional separate overlay.
- `prefers-reduced-motion` shows a complete still composition and no scroll reveals or parallax. Mobile reduces the number of animated layers and disables inaccurate masks. Decorative imagery has empty alt / `aria-hidden` while essential copy stays HTML.
- Micro-interactions: tasteful hover/focus on nav, links and app preview; no permanent spinning/bouncing CTA. A chosen agent can reveal its role on focus/click **only if** it has a real accessible target.
- Keep hero HTML separate from illustration sprites so movement never resembles the previous full-page slideshow bug.

### Stage 4 — Cofounder-inspired editorial features, ORIGINAL Optimus content

- Use the PDF features as layout references: pale reading sections, line-separated feature accordion, occasional authentic product-preview screenshot or DOM approximation labeled **Illustrative**; no fake grades/success metrics.
- Reuse `assets/editorial/evidence-beacon.png` for documentation storytelling and `signal-bloom.png` for a visual feature/pricing teaser (don't fabricate an Optimus price). A generated image should never contain illegible fake UI/labels; real product panels must be DOM components.
- Include a blue/ink full-bleed contrast section for the Kane-to-coding-agent workflow; only depict `FAIL → repair → PASS` as verified if actual history supports it.
- Provide accessible headings, anchors, responsive typography and fast loading; lazy-load below-fold editorial art.

### Stage 5 — FUNCTIONAL footer word-search, not a decorative screenshot

- Position one original 12×12 letter word search in a prominent late-page section **just before the final CTA/footer**, inspired by Cofounder's grid but with its own vocabulary and styling.
- Source `assets/word-search.json` contains the original six words and their real solution-cell paths: `CONTRACT`, `EVIDENCE`, `VERIFY`, `REPAIR`, `BUILD`, `KANE`. Each word maps to an actual same-site section, docs or examples URL; keep destination links available even before the puzzle is solved.
- Implementation: actual text/button grid, pointer/touch swipe selection and keyboard/two-click selection of a straight word path; reverse selection allowed; solved path visibly marked; screen-reader live feedback. Responsive at 360px, usable without drag, not a focus trap. Hover/focus labels, clear "How to play" text, no forced puzzle completion to reach important pages. Puzzle is **the interactive navigation link** near the footer.
- `demos/index.html` demonstrates an implementation mechanism; refactor and test rather than blindly shipping demo code. No puzzle screenshot raster as the interaction.

### Stage 6 — Visual QA and handoff

- Launch locally, typecheck/lint/test; inspect actual desktop/tablet/mobile screenshots against user PDFs. Test browser keyboard-only, touch, reduced-motion and menu focus. Check 60s+ looping hero video or frame snapshots on the same stable composition; inspect near end/start boundaries for snaps.
- Check all navigation destinations; no fake readme links; no horizontal scroll at 360px; avoid invisible text over moving scenery; check slow network, image loads and mobile low power.
- Preserve all source paths, avoid extra packages for obvious CSS effects, and avoid needless iterative style churn. List exact changed files, real test commands/results, screenshots and remaining asset-quality limitations.
- **Do not claim website animation is production-final while X-01/X-02/X-03 in `ASSET_MANIFEST.md` remain needs-final.** Its current pack is a working visual and interaction prototype.

## MANDATORY: What to do when an asset is missing or insufficient

**Never substitute an unrelated stock image, crop a screenshot of Cofounder, or quietly approximate a missing sprite as if it's complete.** First check the manifest. If it is missing, fill `docs/ASSET_REQUEST_TEMPLATE.md` with exact dimensions/role/anchor/depth/frame plan/transparent requirement/negative restrictions and save it under `docs/design/requests/<ASSET_ID>.md`. Send me that filled request and stop only that art-dependent part; continue other independent UI tasks with clearly labeled draft placeholders. When delivered, validate then register the actual file path. This protocol is how the same base visual language covers every new scene without rewriting its style rules.

**Prefer configuration changes to regeneration:** recolor chrome with CSS vars; reposition characters via `scene-config.json`; change timing independently; switch character role/props from manifest; recompose layers. Regenerate art only if new geometry, perspective, character pose or occlusion is required.

## Hard stop / scope boundaries

- No direct edits to `corpus/` or evaluation/Kane/pack logic for UI convenience.
- No copying Cofounder's proprietary assets. Original environment/characters only, supplied PDFs are reference evidence.
- No use of provisional CoreOS-derived logo in a public final release until a distinctive original symbol is approved.
- No new claims of validated performance, student scores, repair completions or pricing without source data.
- Keep static evidence-report work separate; do not inject JS into its CSP or rewrite its generator as a React app.
- Stop for owner approval only if a true blocker (rights, missing critical asset or data, an unsafe dependency) prevents continuation; otherwise implement one complete hero/nav/puzzle vertical slice before discussing nonessential polish.

## Deliverables

Working website source, a stable responsive hero, functional desktop/mobile navigation, seamless independent sprite animations, real accessible linked word puzzle, reusable token/component files, updated asset manifest, screenshots, QA logs, a concise known-limitations section and a demonstration of how new assets are requested using the master template.
