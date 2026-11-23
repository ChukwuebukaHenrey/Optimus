# Optimus UI handoff (website + offline report) — 23 Nov 2026

Work lives in the **git worktree `C:\Users\ADMIN\Optimus-ui`**, branch **`ui/website`** (not pushed).
The owner's main checkout `C:\Users\ADMIN\Optimus` is on `main` and belongs to the backend agent —
never switch its branch or commit UI work there. The root `HANDOFF.md` is the backend's; this file is
the UI handoff.

### 1. Goal & Current Status
- **Overall Objective:** Build the Optimus marketing website (`website/`, Next.js static export for
  Vercel) and the offline comparison report (`src/report/render.ts`), both rendered only from the
  validated comparison bundle, for the Kane CLI hackathon (deadline 26 Nov 2026, 23:59 IST).
- **Current State:** Working. Clean tree; root `tsc` ok; `vitest` 10 files / 190 tests pass; website
  `tsc` + `eslint src` clean; `npm run build` produces a static export with routes `/`, `/docs/`,
  `/report/` (report rendered by the CLI). Verified in a real Chrome tab: hero, agents, clouds,
  "What Optimus does", "Watch a real run" replay all render; no horizontal overflow at 360/390/768 px.
- **Progress Summary:** ~85%. Site and report are feature-complete for the demo. Open: merge `main`
  (5 builds / 3 repairs in the new fixture), push + PR + Vercel, real agent movement art (A-06),
  final QA.

### 2. Completed Work
Commits on `ui/website` since base `1a40da9` (oldest first): `7300c80`, `153b8e6`, `dc7272e`,
`c018459`, `1479d9d`, `dc9d4e2`, `49e9b9b`, `bd8ada8`, `b951c92`, `746629b`, `a7880ce`.

**Offline report (UI-owned per `docs/UI_DATA_CONTRACT.md`)**
- `src/report/render.ts` — replaced the placeholder. `renderReport(bundle, dir)` (signature unchanged)
  writes `index.html`: identity bar with logo, summary totals, Level 1 verdict matrix (baseline +
  verified states read through `builds[].latestRuns`), Level 2 build detail + run integrity, Level 3
  per-step evidence with screenshots, Level 4 repair record (only sessions with attempts; attempts
  nested under the decision that started them), contract (sent to Kane vs judged by Optimus),
  calibration table. No scripts; CSP `default-src 'none'; style-src 'unsafe-inline'; img-src 'self';
  font-src data:`. Exports `escapeHtml`.
- `src/report/styles.ts` — inline CSS per `DESIGN.md` (cyanotype `#0E3A5B`, lime accent fill-only,
  16/48/144 type scale, weights 200/400/800); embeds fonts as base64.
- `src/report/assets/fonts/*.woff2` + `*.LICENSE` — Bricolage Grotesque, Atkinson Hyperlegible
  Next/Mono (OFL), ~124 KB embedded.
- `src/report/markdown.ts` — `renderMarkdown()`: escape-first mini renderer (headings, lists,
  paragraphs, inline code only) for `attempt.briefMarkdown`.
- `src/report/mark.ts` — `MARK_PATH`, `MARK_VIEWBOX`: the logo symbol (from
  `docs/Optimus_CoreOS_Components.zip`), shared by report and website.
- `tests/render.test.ts` (new, 6 tests) — escaping, CSP/no remote resources, baseline+verified via
  `latestRuns`, Level 4 only with attempts + stage order, provisional score, Markdown safety.
  `tests/bundle.test.ts` — only the test title renamed ("renders the report with escaped text").

**Website (`website/`)**
- Stack: Next.js 16.4.6 App Router, `output: "export"`, React 19, Tailwind v4, shadcn/ui (radix,
  `cn` package), Motion 14 (`motion/react`), `@phosphor-icons/react`, Fontsource variable fonts,
  `zod` (to import the backend schema), `marked` (docs page).
- `website/next.config.ts` — static export, `trailingSlash`, `images.unoptimized`,
  `turbopack.root = ..` (imports `../src/report/schema.ts`).
- `website/vercel.json` — `installCommand: "npm ci --prefix .. && npm ci"`, framework nextjs.
- `website/src/lib/bundle.ts` — `loadBundle()` validates `tests/fixtures/report-bundle/bundle.json`
  with `comparisonBundleSchema`; `getSiteData()` builds matrix (latestRuns), calibration totals,
  `repair` (first session with attempts) incl. `verifiedSteps`, `evidence` (baseline steps of the
  repaired scenario), `contractScenario`.
- `website/src/app/page.tsx` — order: Hero, ProofStrip, WhatItDoes, "Watch a real run" (RunReplay),
  Contract, Evidence, Verdicts, Repair, DocsTeaser, WordSearch, FinalCta, footer.
- `website/src/app/docs/page.tsx` — renders root `README.md` with `marked`; relative links →
  `https://github.com/ChukwuebukaHenrey/Optimus/blob/main/...`.
- `website/src/app/layout.tsx` — fonts, `MotionProvider`, `metadataBase` from `SITE_URL`,
  `<noscript>` rule `[data-reveal]{opacity:1;transform:none}`.
- `website/src/app/globals.css` — website tokens (azure `#198DE5`, deep `#0B5FA8`, paper, ink,
  charcoal, lime), shadcn mapping, hero/dusk cover-and-pin rules (`.hero-scene`, `.dusk-scene`),
  `.strip` frame animation, `.cloud-band`, `.lantern-glow`, `.twinkle`, `.agent-sprite` blink,
  `.docs` README styles, reduced-motion rules.
- Components (`website/src/components/`): `hero/hero.tsx` (copy + scrim; phone order headline →
  scene → explanation), `hero/hero-scene.tsx` (plate, two cloud bands, wind + waterfall strips,
  lanterns), `hero/hero-cast.tsx` (client; agents + hand-off spark + tick on one 10 s Motion cycle;
  **no flips**), `site-nav.tsx` (glass capsule over hero, solid paper when scrolled, GitHub link,
  shadcn Dialog mobile menu), `sections.tsx` (ProofStrip, WhatItDoes, ContractChapter with compact
  checks via `compactCheck()`, EvidenceChapter, VerdictsChapter, RepairChapter, DocsTeaser,
  SiteFooter, `ExampleTag`, `RecordedValue`), `chapter.tsx`, `reveal.tsx` (Reveal / Stagger /
  StaggerItem / Entrance with `data-reveal`), `run-replay.tsx` (client replay built only from bundle
  data), `word-search.tsx` (drag/tap/keyboard, hint outline every 6 s, "Go to" link),
  `final-cta.tsx` (animated dusk scene), `logo.tsx`, `verdict-badge.tsx`, `ui/*` (shadcn).
- Content: `src/content/scene.ts` (agent positions, `FOOT_Y = 305`), `hero-layers.json`,
  `dusk-layers.json`, `word-search.json`, `site.ts` (`REPO_URL`, `SITE_URL`).
- Art pipeline (Python + Pillow + numpy): `website/scripts/extract_art.py` (cuts sprites/scenes from
  the supplied boards in `assets/source/`), `make_hero_layers.py` (waterfalls, lanterns, layered
  wind per plant, two cloud bands, dusk layers), `make-word-search.mjs`, `prepare-data.mjs` (copies
  bundle + evidence to `public/report/` and runs `optimus report`).
- Docs: `DESIGN.md` (report rules + "Current state" section for the two surfaces),
  `docs/REFERENCE_ANALYSIS.md`, `docs/design/HERO_PROPOSAL.md`, `docs/design/ASSET_PROVENANCE.md`,
  `docs/design/requests/*.md` (H-01, A-00, A-05, E-01…E-04, F-01, **A-06 v2**), `docs/AGENT_BUILD_PROMPT.md`.

### 3. Architectural Decisions & Constraints
- **Verdicts only from `result.verdict`; latest verdicts only via `builds[].latestRuns`** (bundle v2).
  The site and report never compute or invent a verdict. AGENTS.md rules 1–11 apply.
- **Website validates with the backend's own schema** (`../src/report/schema.ts`), not a copy.
- **Report has no JavaScript and loads nothing remote**; fonts are embedded. Never import the website
  runtime into `src/report/`.
- **Committed fixture `tests/fixtures/report-bundle/` is backend-owned.** Render into a copy
  (`prepare-data.mjs` does) — never let `optimus report` overwrite the fixture's `index.html`.
- **Hero is not a video.** An earlier ffmpeg loop was dropped: scaled video blurs pixel art and was
  ~1 MB. Plate `<img>` + CSS frame strips (`image-rendering: pixelated`) instead.
- **Wind must stay layered** (`sway_strip()`): plants masked by saturated green/petals/lupines,
  background inpainted, each connected component sways from its own base. A region shear dragged
  bricks/castle with it — do not go back to that.
- **Clouds are a page layer** and cannot pass behind the observatory: bands fade out before it; top
  band ends at 14.5% of the scene (above the eyebrow even on a 960 px hero).
- **Hero geometry:** scene point `(--fx, --fy)` pinned to the same fraction of the frame; desktop
  `--fx: 68%` keeps the Smith in view on short screens; hero `min-height: max(820px, …)` keeps the
  buttons off the agents.
- **Responsive grids must start with `grid-cols-1`** (`minmax(0,1fr)`) and columns `min-w-0`, or the
  unwrapped diff widens the whole column (this caused the phone overflow).
- **Motion everywhere, with a no-JS fallback** (`data-reveal` + `<noscript>`). Motion's SSR initial
  state is `opacity:0`.
- **No sprite flips.** Owner rejected flip/nudge "movement"; real movement needs drawn frames (A-06).
  Do not fake turns with `scaleX`.
- Palette: website azure+lime (HERO_PROPOSAL §2); report cyanotype+lime (DESIGN.md). Logo = supplied
  CoreOS-derived mark (owner: free to use); wordmark text set in Bricolage, never the kit's
  Inter/Arial SVG text.
- Commit rules: small honest commits, **merge (never rebase/force-push)**, attribution trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### 4. Remaining Work (Ordered Next Steps)
**Update 23 Nov, later session:** steps 1, 2 (counts; the featured repair is still C, the first
session) and 4 (action rows only) are done: commits `7964d89`…`5144da2`. Root tsc + 190 tests pass;
website tsc/eslint/build pass. Provenance for the original boards is filled in; the A-06 sheets'
tool/model is still owed by the owner. Still open: 3 (push/PR/Vercel, owner's yes), 6 (final QA,
incl. a fresh 360/390 px pass after the frame-stepping change), and optionally using the A-06
turnaround/walk rows.

1. **Merge `main` into `ui/website`** (in `C:\Users\ADMIN\Optimus-ui`: `git -c safe.directory=* merge main`).
   `main` is 11 commits ahead (head `dc436d7`; D and U repaired, Gate 2 passed). Expected conflict:
   `tests/bundle.test.ts` — keep main's assertions (5 builds incl. `u-unseen`) plus the renamed title.
   `src/report/schema.ts` and `render.ts` are unchanged on main. Then: `npx vitest run`,
   `cd website && npm run build`.
2. **Make the site copy data-driven for 5 builds / 3 repairs**: `website/src/components/sections.tsx`
   lines with "four builds" (ProofStrip ~L68, WhatItDoes ~L126, VerdictsChapter ~L315) → derive from
   `data.matrix.length`; ProofStrip "1 live repair" → count of repair sessions; decide which repair
   the Evidence/Repair chapters and RunReplay feature (`getSiteData()` in `website/src/lib/bundle.ts`
   picks the first session with attempts). Check `render.ts` Level 4 with 3 sessions.
3. **Push + PR + Vercel** — only after the owner says yes (pushing makes the branch public):
   `git push -u origin ui/website`, open PR into `main`. Vercel project: Root Directory `website`
   (uses `website/vercel.json`).
4. **Integrate A-06 art when delivered** (`docs/design/requests/A-06.md`: one 8×3 sheet per agent,
   384×384 cells = 96 art px ×4): add a slicer to `website/scripts/extract_art.py`, drive frame
   steps in `website/src/components/hero/hero-cast.tsx` per agent action on the 10 s cycle.
5. **Provenance**: fill tool/model/date in `docs/design/ASSET_PROVENANCE.md` (owner said they edited
   a provenance file, but none was found in either checkout — ask).
6. **Final QA** in a real browser: 360/390/768/1280/1440 widths, keyboard (menu, puzzle), reduced
   motion, `/report/` on phones, `/docs/`.

### 5. Environment, Commands & Gotchas
- **Key Commands** (Git Bash):
  - Tests/typecheck (root): `cd /c/Users/ADMIN/Optimus-ui && npx tsc --noEmit && npx vitest run`
  - Website: `cd website && npx tsc --noEmit && npx eslint src && npm run build` (prebuild renders `/report/`)
  - Preview: `python -P -m http.server 4321 --bind 127.0.0.1 --directory out` (from `website/`), open `http://127.0.0.1:4321/`
  - Regenerate art: `npm run art` (in `website/`), puzzle: `npm run word-search`
  - Render report into a folder: `npm run optimus -- report --bundle <copy-of-bundle-folder>`
  - Git: always `git -c safe.directory=*` (repo owned by another Windows account → "dubious ownership").
- **Tools installed (user level):** poppler `C:\Users\ADMIN\tools\poppler\poppler-26.09.0\Library\bin`,
  ffmpeg `C:\Users\ADMIN\tools\ffmpeg\ffmpeg-9.1-essentials_build\bin`, Chrome
  `C:\Users\ADMIN\AppData\Local\Google\Chrome\Application\chrome.exe`, numpy in Python user site.
- **Active Bugs / Blockers:** none failing. Open items are the merge (step 1–2), owner approvals
  (push/PR/Vercel, provenance) and missing A-06 art. A preview server may still be running in the
  background on port 4321.
- **Gotchas:**
  - Low memory: the system kills background servers; restart only when needed.
  - Run Python with `-P`, not `-I` (`-I` hides user site-packages → no numpy).
  - Windows: don't serve from inside `website/out` (build fails with `EBUSY`); use `--directory out`.
  - Headless Chrome: min window ~500 px wide (use a 390 px iframe harness), and `--virtual-time-budget`
    does not run Motion animations → captures show Motion content invisible. Verify in a real tab.
  - Chrome extension tab can report a 0×0 viewport when the window is minimised (animations pause).
  - Pillow: `Image.fromarray(...).copy()` before `ImageDraw.floodfill`, or the fill silently does nothing.
  - Next.js 16 differs from older docs: read `website/node_modules/next/dist/docs/` before config changes.
  - LF→CRLF warnings on commit are harmless.
- **Relevant Files to Read First:**
  1. `AGENTS.md` (repo rules) and `docs/UI_DATA_CONTRACT.md` (bundle v2, ownership)
  2. `DESIGN.md` ("Current state" section) and `docs/design/HERO_PROPOSAL.md`
  3. `website/src/lib/bundle.ts` and `website/src/components/sections.tsx`
  4. `website/src/components/hero/hero-cast.tsx` + `docs/design/requests/A-06.md`
  5. `src/report/render.ts`
