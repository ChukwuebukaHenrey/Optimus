# DESIGN.md — rules for every Optimus UI change

These are binding rules for the Optimus report UI. Read this file before touching any markup or
CSS, and check every UI change against it. AGENTS.md still wins on anything it covers (verdicts,
escaping, scope). `docs/UI_STRUCTURE.md` says *what* the report contains; this file says *how it
looks and how it is built*.

## Current state (23 Nov 2026) — read this before §0

There are now **two surfaces**. They share the fonts (§3), the verdict colours and badge rules
(§4.2–4.4), the 8px rhythm and the forbidden patterns (§7). They differ in everything that the
report's offline, script-free format forces.

| | Offline report | Marketing website |
|---|---|---|
| Code | `src/report/render.ts` (markup), `src/report/styles.ts` (CSS), `src/report/assets/fonts/` (OFL fonts, embedded) | `website/` (Next.js static export, Tailwind v4, shadcn/ui, Motion, Phosphor) |
| Rules | This file, unchanged: no JavaScript, CSP `default-src 'none'` + `img-src 'self'` + `font-src data:` | `docs/design/HERO_PROPOSAL.md`: azure `#198DE5` dominant + lime accent, glass nav; JS allowed |
| Data | The validated comparison bundle passed to `renderReport` | The same bundle, validated with `src/report/schema.ts` at build time (`website/src/lib/bundle.ts`) |
| Icons | Inline SVG verdict icons drawn in `render.ts` (nothing can be loaded) | `@phosphor-icons/react` (Light for UI, Regular for verdicts) |
| Radius | ≤ 4px everywhere | ≤ 4px, except the capsule nav pills and pill buttons (the reference's one allowed exception) |

**Components to reuse.** Report: `badge`, `decisionBadge`, `hashChip`, `matrixCell`, `scenarioCard`,
`evidence`, `repairSection`, `diffView`, `meter` in `src/report/render.ts`. Website:
`VerdictBadge` (`website/src/components/verdict-badge.tsx`), `Chapter` (`chapter.tsx`),
`HeroScene` / `Hero` (`hero/`), `SiteNav`, `WordSearch`, `Reveal` / `Entrance` (`motion.tsx`),
and the shadcn primitives in `website/src/components/ui/` (Dialog, Accordion, Button).
shadcn/ui *is* installed in `website/` (§0 below describes the repo before that).

**Art pipeline.** `website/scripts/extract_art.py` cuts the pixel art from the supplied boards in
`assets/source/`; `make_hero_layers.py` builds the hero's CSS animation layers;
`make-word-search.mjs` builds the puzzle; `prepare-data.mjs` renders `/report/` with
`optimus report`. Provenance: `docs/design/ASSET_PROVENANCE.md`.

## 0. Audit of the repo (22 Nov 2026) — what actually existed then

| Asked to read | Found | Consequence |
|---|---|---|
| `package.json` | Node CLI: `tsx`, `zod`, `yaml`, `yauzl`, `vitest`, `typescript`. No React, no Vite, no CSS tooling. | The product UI is **server-rendered static HTML strings**, not a component framework. |
| Tailwind config | **None.** No `tailwind.config.*`, no PostCSS. | No utility classes. Styles are hand-written CSS inside `report.ts`. |
| `globals.css` | **None.** The only product CSS is the inline `<style>` block in `src/core/report.ts`. | That `<style>` block *is* the global stylesheet. Tokens go at its top, on `:root`. |
| shadcn/ui | **Not installed**, and cannot be: the report's CSP is `default-src 'none'`, it runs no JavaScript and is opened from disk. | shadcn names are used below only as a **pattern vocabulary**, mapped to the HTML-only equivalent. There are no shadcn import paths in this repo and none will be invented. |
| Existing components | `src/core/report.ts`: `renderReport`, `renderResult`, `escapeHtml` (private), `writeReport` (exported), `AssessmentReport` (exported). | Reuse and extend these. Do not add a second renderer. |
| Other CSS | `corpus/*/styles.css`, `corpus/b-react/src/styles.css` | **Off limits — see §1.** |

The current report uses `system-ui`, a single grey-blue palette, mid weights (600/700) and
size steps of ~1.2×. All four break the rules below; the first UI task fixes them.

## 1. Scope: what these rules apply to

**Applies to:** everything Optimus renders for a human — `src/core/report.ts` today, and the
report assembler / repair-record views from `docs/UI_STRUCTURE.md` when they are built.

**Never applies to `corpus/`.** The corpus apps are the *subjects under test*. They are
deliberately different builds (vanilla vs React, cards vs table, sample data vs empty) so the
one-contract claim is demonstrated. Restyling them changes the calibration set, and AGENTS.md
rule 9 allows editing a corpus app only when repairing it. Do not "bring them in line" with
this file. Do not copy their CSS into the report either.

## 2. Hard constraints inherited from the report format

These come from `report.ts` and `docs/UI_STRUCTURE.md` and override any taste preference:

- **No JavaScript.** Interactions are links, `<details>`/`<summary>`, `:target` and `:has()` only.
- **No network.** No CDN fonts, no external images, no icon fonts. Icons are inline SVG.
- **Every dynamic value goes through `escapeHtml`.** Layouts must survive 200-character titles,
  64-character hashes and empty values. Use `overflow-wrap: anywhere` on any cell holding data.
- **CSP changes are deliberate and tested.** This design needs exactly two additions:
  `font-src data:` (embedded fonts, §3) and `img-src 'self'` (evidence screenshots, already
  planned). Each addition gets an assertion in `tests/report.test.ts`. Nothing else is widened.
- **Print.** Must read correctly in greyscale (§4.4).
- **No LLM content styled as a verdict.** Agent output lives only in the Agent panel (§6).

## 3. Fonts

Three families, all SIL Open Font License, embedded as subset WOFF2 `data:` URIs in the
`<style>` block (Latin + `→ − ✓ ✗ · …`). Total embedded font budget: **≤ 150 KB per report.**
Font files live in `src/core/fonts/` with their licence files, and are inlined at render time.

| Role | Family | Weights used | Why |
|---|---|---|---|
| **Display** | **Bricolage Grotesque** (variable) | 200, 800 | Has the full 200–800 axis the type scale needs; condensed, slightly irregular grotesque — reads like a printed lab report, not a SaaS landing page. |
| **Body** | **Atkinson Hyperlegible Next** (variable) | 400, 800 | Built for legibility; distinguishes `I l 1` and `O 0`, which matters when readers compare reasons and app names across many builds. |
| **Mono** | **Atkinson Hyperlegible Mono** (variable) | 400, 800 | Hashes, nonces, reason codes, recorded values, diffs. Same unambiguous glyph shapes as the body, so `0`/`O` in a hash is never misread. |

```css
--font-display: "Bricolage Grotesque", Georgia, serif;
--font-body:    "Atkinson Hyperlegible Next", Verdana, sans-serif;
--font-mono:    "Atkinson Hyperlegible Mono", Consolas, monospace;
```

**Never use, anywhere, including as a named fallback:** `Inter`, `Roboto`, `Open Sans`, `Arial`,
`system-ui` (and its aliases `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `ui-sans-serif`).
A generic keyword (`serif`, `sans-serif`, `monospace`) may appear only as the last item of a stack.

## 4. Colour

### 4.1 Brand: one dominant, one accent

```css
:root {
  /* dominant — Cyanotype: the blueprint/photographic-evidence blue */
  --dominant:      #0E3A5B;   /* on paper 10.66:1 */
  /* accent — Marker: a highlighter stroke over evidence */
  --accent:        #D9F53B;   /* ink on accent 14.27:1; accent on dominant 9.62:1 */

  /* neutrals (not colours — paper and ink) */
  --paper:         #F5F3EC;   /* page background, warm off-white */
  --surface:       #FFFFFF;   /* table body, screenshot frame */
  --ink:           #121A22;   /* body text, 15.81:1 on paper */
  --ink-muted:     #4A5866;   /* secondary text, 6.57:1 on paper */
  --rule:          #B9B3A3;   /* hairlines and table rules (decorative) */
}
```

Ratios above were measured (WCAG 2 formula), not estimated.

Usage rules:

- **Dominant** carries structure: headings, the identity bar fill, table header rules, links,
  focus rings (`outline: 2px solid var(--dominant)`), decision-badge outlines.
- **Accent is a fill only, never a text or line colour.** On paper it is 1.11:1 — invisible as
  text. It marks *where to look*: the decisive step in a timeline, the `:target`-ed row, a
  highlighted value in a list diff, text on a dominant-filled bar. Always `--ink` text on it.
- **Accent never touches a verdict badge** (no accent border, fill or neighbour cell). It must
  not read as a seventh verdict.
- At most **one accent mark per screen-height**. If two things need it, neither does.
- **Banned:** purple or indigo anywhere in a gradient; any gradient on a white or paper
  background; any gradient at all on text. Solid fills only.

### 4.2 Verdict colours (semantic, not brand)

The six verdicts are the only other hues allowed, and only inside a verdict badge, matrix cell
or legend entry. They are status signals, not decoration.

```css
--pass-fg:   #0F5132;  --pass-bg:   #DDF1E4;   /* 7.92:1 */
--fail-fg:   #8E1C1C;  --fail-bg:   #FBE3E0;   /* 7.36:1 */
--inconc-fg: #7A4A00;  --inconc-bg: #FCEBC7;   /* 6.36:1 */
--notrun-fg: #4A4A4A;  --notrun-bg: #ECEAE4;   /* 7.37:1 */
--infra-fg:  #33475B;  --infra-bg:  #E2E8EE;   /* 7.76:1 — slate, deliberately not violet */
--unsup-fg:  #5C5650;  --unsup-bg:  transparent; /* 6.52:1 on paper */
```

- INCONCLUSIVE and INFRA_ERROR **must not look like FAIL**: never red-family, never heavier
  than FAIL.
- `docs/UI_STRUCTURE.md` allowed "slate or violet" for INFRA_ERROR; this file picks **slate**.

### 4.3 Decision badges (repair loop)

`COMPLETE | REPAIR | NEEDS_EVIDENCE | RETRY_INFRASTRUCTURE | STOP` use **no fill and no verdict
hue**: `1px solid var(--dominant)` outline, `--dominant` text, mono uppercase. A decision is not
a verdict and must never compete with one.

### 4.4 Greyscale and print

Colour is never the only signal. Every verdict badge has **text + icon + border style**:

| Verdict | Icon (inline SVG) | Border |
|---|---|---|
| PASS | check | 2px solid |
| FAIL | cross | 4px solid (left edge) |
| INCONCLUSIVE | question mark | 2px dashed |
| NOT_RUN | minus | 2px dotted |
| INFRA_ERROR | plug/broken link | 3px double |
| UNSUPPORTED | slash-circle | 1px solid |

`@media print`: drop backgrounds to `--surface`, keep borders and icons, expand all `<details>`.

### 4.5 Theme

Light only for now (matches today's report and `color-scheme: light`). Tokens are on `:root`
so a dark theme can be added later by redefining them; until then do not write dark styles.

## 5. Spacing and type

### 5.1 8px rhythm

```css
--s1: 8px;  --s2: 16px;  --s3: 24px;  --s4: 32px;
--s6: 48px; --s8: 64px;  --s12: 96px; --s18: 144px;
```

- Every margin, padding, gap, line-height and fixed dimension is a multiple of 8px.
- **One exception:** `4px` is allowed inside badges and chips only (vertical padding, icon gap).
- Borders (1–4px) are not spacing and don't count, but a bordered box's total height still
  lands on the grid (compensate in padding).
- Page side gutter: `--s2` (16px) on phones, `--s4` (32px) from 640px up. No horizontal page
  scroll at 360px wide; wide tables scroll inside their own container.

### 5.2 Type scale: 3× jumps, weight extremes

Three sizes. Adjacent steps differ by **3×**. There is no in-between size.

| Token | Size / line-height | Family | Weights | Used for |
|---|---|---|---|---|
| `--t-mega` | 144 / 144px | display | 200 or 800 | One number per screen: builds evaluated, a score. |
| `--t-display` | 48 / 56px | display | 200 or 800 | Page title, level headings, build name. |
| `--t-body` | 16 / 24px | body or mono | 400 or 800 | Everything else: text, tables, badges, labels. |

- **Allowed weights: 200, 400, 800.** 200 and 800 are the hierarchy; 400 is for running text
  and table data only. **500, 600 and 700 are banned** — they are the "slightly bolder" habit
  this scale exists to remove.
- Display pairings use the extremes against each other, e.g. a `--t-mega` `800` number with
  its `--t-display` `200` label, never 800 next to 700.
- Hierarchy *within* the body step comes from weight (400 ↔ 800), mono vs body, uppercase
  with `letter-spacing: 0.08em` for labels, and `--ink-muted` — **never** from a 13px or 14px size.
- **Honest exception:** below 640px, `--t-mega` clamps to `clamp(96px, 26vw, 144px)` so a
  value like "100%" fits a 360px screen. This is the only place the 3× ratio bends.
- `font-variant-numeric: tabular-nums` on every number in a table, count diff or budget meter.

## 6. Components — reuse before writing

There is no component library. "Reuse" here means: one render function per pattern in
`src/core/report.ts` (or a sibling module it imports, e.g. `src/core/report/badge.ts`), called
from everywhere that needs it. **Never hand-write a second badge, chip or table.**

### 6.1 What exists today (import from `src/core/report.ts`)

| Export / function | Status | Rule |
|---|---|---|
| `writeReport(directory, report)` | exported | Only entry point that writes `report.html` + `result.json`. Keep its atomic tmp-then-rename write. |
| `AssessmentReport` | exported type | Extend it; don't create a parallel report type. |
| `renderReport(report)` | private | Page shell, `<head>`, CSP, the `<style>` token block. |
| `renderResult(result)` | private | Scenario card (C3). Will become `scenarioCard()`. |
| `escapeHtml(value)` | private | Must be used for every interpolated value. When renderers split into modules, export it from one place and import it — never copy it. |
| `Verdict`, `ScenarioResult` | `src/core/types.ts` | Drive badges and cards from these types; never from string literals. |
| `LoopDecision`, `DecisionOutcome` | `src/loop/decision.ts` | Drive decision badges (C18). |
| `RepairHistory` | `src/loop/repair.ts` | Only source for the repair record (Level 4). Never assemble it by hand. |
| `RepairBrief`, `briefMarkdown` | `src/loop/brief.ts` | Content of the Agent panel's "Sent to the coding agent" block. |

### 6.2 shadcn/ui vocabulary → HTML-only equivalent

shadcn/ui is not installed and won't be (no React, no scripts). Use its primitives as the
naming and behaviour reference, built as escaped HTML + CSS:

| shadcn primitive | Optimus equivalent | Planned ID (`docs/UI_STRUCTURE.md`) |
|---|---|---|
| `Badge` | `verdictBadge(verdict, size)`, `decisionBadge(decision)` | C1, C6, C18 |
| `Table` | `<table>` with `<th scope>`; the verdict matrix | Level 1, C6, C17 |
| `Collapsible` / `Accordion` | `<details>` / `<summary>` | C3, C5, C21, evidence refs |
| `Alert` | `<p role="note">` strip with left rule | C15 empty/error states |
| `Separator` | `<hr>` with `--rule` | — |
| `Card` | **Not used as a visual box** — see §7. A scenario "card" is a ruled `<article>`. | C3 |
| `Tooltip`, `Dialog`, `Tabs`, `Dropdown` | **Unavailable** (need JS). Use `<details>`, `:target` sections, or plain anchors. | — |
| `Button` | Plain links. The report has no actions. | — |

When a new pattern is built, add it to the table in §6.1 with its file path in the same commit.

## 7. Forbidden patterns

- **Three (or four) rounded cards in a row.** No equal-width tile grids for stats or scenarios.
  Summary numbers are a single ruled strip (C14) or one `--t-mega` number with labels; scenarios
  are a vertical ruled list.
- **Centred-everything heroes.** Text is left-aligned to a single edge. The identity bar is a
  left-aligned band, not a centred title over a subtitle over a button.
- **Soft drop shadows (≈0.1 opacity) on everything.** No `box-shadow` for elevation at all.
  Separation comes from `--rule` hairlines, `--surface` vs `--paper`, and spacing.
- Rounded corners above 4px. Badges and chips 2px; screenshot frames 0.
- Purple/indigo gradients, any gradient on white/paper, gradient text (§4.1).
- Emoji as icons. Icon fonts. External images.
- Striking through or dimming a baseline verdict in a repair cell (`docs/UI_STRUCTURE.md`).
- Any score, grade or summary not computed by Optimus.

## 8. Checklist before any UI commit

1. No banned font name appears in the output (`grep -iE "inter|roboto|open sans|arial|system-ui"`).
2. Only tokens from §4 and §5 are used; no raw hex or px outside the `:root` block.
3. Every interpolated value passes through `escapeHtml`; the unsafe-string test still passes.
4. CSP only gained what §2 lists, and the test asserts it.
5. Renders at 360px wide with no page-level horizontal scroll.
6. Prints legibly in greyscale with verdicts distinguishable.
7. No file under `corpus/` changed.
