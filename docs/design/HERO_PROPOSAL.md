# Hero and navigation proposal — Optimus website

Status: **proposal for approval**. Nothing here is built yet. Sources: `docs/REFERENCE_ANALYSIS.md`
(measured references), `docs/design/requests/` (assets), the bundle fixture (real data).

The page has one job: **sell Optimus to someone who has never heard of it, in five seconds, with
nothing invented.** The hero's argument is "watch the pipeline work", not "look at this tool".

## 1. Stack (now allowed: React, Motion, UI libraries)

| Piece | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) with static export** in `website/` | Crawlable HTML for a page that has to sell; deploys straight to Vercel; shadcn's default target. The root CLI stays untouched. |
| Styling | Tailwind CSS v4 with CSS-variable tokens | Fast to build. The tokens below become `@theme` variables. |
| Components | **shadcn/ui**: Dialog (mobile menu), Accordion (chapter rows), Tooltip, Button, Tabs | Accessible primitives instead of hand-rolled ones (your original DESIGN.md rule) |
| Motion | **Motion** (`motion/react`) for UI and story motion; CSS `steps()` for sprite frame-stepping; a `<video>` for the environment loop | Each tool does what it's best at (see §5) |
| Icons | `@phosphor-icons/react`, Light weight | Your choice; MIT licence |
| Fonts | `@fontsource-variable/bricolage-grotesque`, `…/atkinson-hyperlegible-next`, `…/atkinson-hyperlegible-mono` | Self-hosted, OFL; all three verified on npm |

## 2. Website palette: Cofounder's UI colours, measured, plus our lime

Sampled from the references (`docs/REFERENCE_ANALYSIS.md`), then adjusted where contrast failed.
**Report tokens in DESIGN.md are unchanged.** This palette is for the website only.

```css
--sky:        #198DE5;  /* hero sky / brand azure (sampled behind Cofounder's headline) */
--azure-deep: #0B5FA8;  /* full-bleed bands, mobile menu panel — white text 6.53:1 */
--paper:      #F5F5F2;  /* page background (sampled) */
--ink:        #1C1C1C;  /* text on paper — 15.6:1 */
--ink-muted:  #6B6B68;  /* second tone of two-tone headlines — 4.89:1 on paper */
--charcoal:   #3B3B3B;  /* solid buttons on paper (Cofounder's dark button) — paper text 10.26:1 */
--glass:      rgb(6 33 61 / 0.35);   /* nav pills over the hero — white text 5.92:1 */
--glass-edge: rgb(255 255 255 / 0.18);
--accent:     #D9F53B;  /* lime from the agents: focus rings, the hand-off spark, menu close outline */
```

- **Dominant = azure, accent = lime.** That keeps your one-plus-one rule. Verdict colours exist
  only inside verdict badges.
- **Why the glass is ink-tinted and not white:** Cofounder's white-tinted pills give white labels
  only **2.86:1** contrast (fails accessibility guidelines). Ink-tinted glass looks almost the
  same over the sky and reaches 5.92:1.

## 3. Navigation: Integrated Bio's structure, Cofounder's colours

**Desktop (≥ 1024 px), over the hero:**

```
 ◆ Optimus                     ╭─────────────────────────────────────────╮ ╭──────╮ ┌──────────────────┐
 (white wordmark)              │ How it works · Evidence · Verdicts · Repair │ │ Docs │ │ See a real report │
                               ╰─────────────────────────────────────────╯ ╰──────╯ └──────────────────┘
                                 glass capsule (ink 35% + blur 12px)          glass     solid paper, ink text
```

- One grouped capsule for the four chapter links, one separate Docs pill, and one solid CTA:
  the same rhythm as Cofounder's "How to · Start…" group, Resources pill and white button.
- Labels: Atkinson Hyperlegible Next, 15 px, white. The active section gets a 2 px lime underline.
- **Once you scroll past the hero**, the bar turns to paper glass
  (`rgb(245 245 242 / .8)` + blur) with ink labels. The CTA turns charcoal with paper text, which
  is Cofounder's look on their paper pages.
- Links only where a real target exists. GitHub stays out while the repo is private.

**Mobile (< 1024 px):** wordmark, plus a 44 px glass square menu button.

```
┌────────────────────────────────┐   Full-screen panel, --azure-deep (#0B5FA8)
│ ◆ Optimus               ┏━━━┓  │   close button: glass square, 1.5 px lime outline
│                         ┃ ✕ ┃  │
│                         ┗━━━┛  │
│                                │
│ How it works                   │   Bricolage Grotesque 200, 48 px, white,
│ Evidence                       │   left-aligned (our rule; Integrated Bio centres)
│ Verdicts                       │
│ Repair                         │
│ Docs                           │   thin white pixel-step line art at 12% opacity
│                                │
│ ┌────────────────────────────┐ │
│ │     See a real report      │ │   solid paper button
│ └────────────────────────────┘ │
│ BUILT FOR THE KANE CLI HACKATHON│   mono label, white 70%
└────────────────────────────────┘
```

- shadcn `Dialog`. Escape closes it, focus returns to the menu button, the page behind can't
  scroll, and tapping a link closes it. Respects notch and safe areas.
- Motion: the panel fades in (250 ms) and the links rise 12 px one after another (40 ms apart).
  **The hero never moves when the menu opens.**

## 4. The hero: "The Observatory"

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ Optimus                         [ How it works · Evidence · Verdicts · Repair ][Docs][See a real report] │
│                                                                                          │
│  Grade the work.                                        ___  ✦ brass armillary           │
│  Not how it was built.            ← white + white/70%   /   \                             │
│                                                         | ▯▯ |  ≋ waterfalls              │
│  One contract. Many different builds.                  |____|  ≋                          │
│  Evidence-backed verdicts.                                                                │
│  Kane CLI acts in a real browser and records.                                             │
│  Optimus judges the evidence. Deterministically.                                          │
│                                                                                          │
│  ┌──────────────────┐ ╭─────────────╮                                                     │
│  │ See a real report │ │ How it works │       ·────·────·────·────·  ← lime spark hops    │
│  └──────────────────┘ ╰─────────────╯       📜    💻    🔍    📋    🔧                    │
│                                        ══════════════════════════════════  stone terrace │
│  ░░░░▒▒▒▒▓▓▓▓ pixel-dissolve edge into the paper page ▓▓▓▓▒▒▒▒░░░░                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
   Contract → Browser run → Evidence → Verdict → Repair   (the pipeline, left to right)
```

**Copy** (headline from the website brief; tagline from AGENTS.md, word for word):
- H1: **"Grade the work."** white / **"Not how it was built."** white at 70%. Bricolage Grotesque
  200, about 72 px on desktop. Two tones, light weight, as in the reference, in our typeface.
- Sub: "One contract. Many different builds. Evidence-backed verdicts."
- Fact line: "Kane CLI acts in a real browser and records what it sees. Optimus judges the
  evidence against one unchanged contract — deterministically, with no AI deciding the grade."
- Primary CTA: **See a real report** goes to a published copy of the real bundle report
  (Gate 1 v5 plus the live repair of C). It needs the report renderer.
- Secondary CTA: **How it works** jumps to 1.0.

**The scene:**
- The H-01 observatory terrace plays as a 12 s seamless loop video: clouds drift, the waterfalls
  shimmer through palette cycling, the lanterns glow, the banners sway.
- The copy sits over calm sky, never over busy pixels.
- **No computer, no task chips, as you asked.** The agents are the product story.

**The five agents** stand on the terrace waypoints in pipeline order:

| Waypoint | Agent | Caption on hover/focus | Goes to |
|---|---|---|---|
| 1 | Contract (scroll `</>`) | "The contract — one approved pack for every build" | 1.0 |
| 2 | Browser run (laptop `>_`) | "The browser run — Kane acts and records" | 2.0 |
| 3 | Evidence (magnifier) | "The evidence — every step, every screenshot" | 2.0 |
| 4 | Verdict (clipboard) | "The verdict — Optimus decides, deterministically" | 3.0 |
| 5 | Repair Smith (wrench, `{ }`) | "The repair — a coding agent fixes a verified failure" | 4.0 |

Each agent is a real `<a>` with an `aria-label`. The caption is a small glass chip above its
head, and keyboard focus shows the same chip. Clicking scrolls to the chapter.

**The signature beat, "the hand-off"** (every ~10 s):
1. A small lime pixel spark leaves the Contract agent's scroll.
2. It arcs to the laptop (the cursor blinks faster), then the magnifier (a glint), then the
   clipboard. A lime tick draws in, and the lanterns along that stretch light up one by one.
3. Every few cycles the clipboard shows a small cross instead. The spark then hops on to the
   Smith, a `{ }` tile pulses, and the spark returns to the clipboard, which draws a tick.
   That's the repair loop, told with no text and no invented numbers.

## 5. Motion plan: which tool does what

| Motion | Tool | Detail |
|---|---|---|
| Environment loop | `<video autoplay muted loop playsinline>` + AVIF poster | ffmpeg-built from the H-01 layers: about 300 KB WebM (VP9) + MP4 (H.264) fallback, scaled up with nearest-neighbour sampling so pixels stay square |
| Agent idles (blink, cursor, glint, bob) | CSS `steps(n)` sprite sheets | 4–6 frames each. Staggered periods of 4.3 / 5.1 / 5.9 / 6.7 / 7.3 s so they never sync. No visible reset. |
| Hand-off spark, lanterns, tick | **Motion** keyframes in the same box as the video | Positions in % of the scene box. The box matches the video's crop, so sprites and video stay aligned at every width. |
| Copy entrance | **Motion** | Fade + 8 px rise, staggered 60 ms, once on load |
| Agent hover/focus | **Motion** | Lift 4 px (whole art pixels) + caption chip fade, 180 ms |
| Mobile menu | **Motion** + shadcn Dialog | Above |
| Scroll | **Motion** `useScroll` | The copy fades as the hero scrolls away. No parallax on the art. |
| **Reduced motion** | `useReducedMotion` | Poster image instead of video, first sprite frames, no spark. The complete still scene stays. |

## 6. Mobile hero (360–767 px)

- The video crops to keep the observatory and the middle of the terrace in view.
- **Three agents only:** Contract, Browser run, Verdict. Evidence and the Smith appear in their
  chapters instead.
- The copy sits on top, over sky; the CTAs stack full-width.
- The hand-off still plays across the three agents.

## 7. Right under the hero: the proof strip (real numbers only)

A ruled strip on paper, Atkinson Mono labels, Bricolage 800 numerals:

| Number | Label | Source |
|---|---|---|
| **24 / 24** | calibration cases matched the expected verdict | `runs/gate1-v5/REPORT.md` |
| **0** | replays counted toward any verdict | same |
| **3** | live repairs: verified FAIL → fresh Kane run → PASS | bundle `builds[]` repaired with every latest verdict PASS (C L3, D L4, U L4) |
| **≈ 5 min · ≈ 52 credits** | per scenario run | Gate 1 v5: 7,362 s and 1,246.58 credits over 24 valid cases |

The screenshot labels were reviewed by Claude; the owner delegated this review to Claude on 23 Nov
2026 (not an independent human check). The site says so next to the proof strip.

## 8. Page flow after the hero

1. Proof strip (above).
2. **1.0 Contract**: two-tone headline, accordion (neutral steps · one hash for every build ·
   checks relative to the starting state), and a real generated `_test.md` excerpt. Art: E-01.
3. **2.0 Evidence**: the real Kane end-of-step screenshots from the bundle, before and after.
   Art: E-02.
4. **3.0 Verdicts**: the **real report** in a framed window over pixel scenery (the
   product-over-art idea), showing the matrix for A–D with real verdicts read via `latestRuns`.
5. **4.0 Repair**, on a full-bleed `--azure-deep` band: the real repair of C (baseline FAIL →
   brief → one attempt → verified PASS, every integrity check passed). Art: E-04.
6. Documentation teaser: chapters linking to real README sections.
7. **Word search**: 12 × 12, the words CONTRACT · EVIDENCE · VERIFY · REPAIR · BUILD · KANE, each
   linking to its section, with the link list always visible.
8. Final call to action over the F-01 dusk scene, then the footer.

## 9. Decisions this proposal needs

1. Approve the palette in §2. It supersedes the cyanotype `#0E3A5B` **for the website only**.
2. Approve Next.js static export (or Vite, if you'd rather skip static export).
3. Approve the hero copy and the "See a real report" CTA. That CTA needs the report renderer,
   so it fixes the build order: **report renderer → website**.
4. Publish the agent sheet's provenance before anything goes public.
