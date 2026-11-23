# Reference analysis — Cofounder and Integrated Biosciences

Written 23 Nov 2026 for the Optimus marketing website (`docs/Optimus_Updated_Website_Agent_Prompt.md`).
The references are for **direction and comparative QA only**. Nothing here licenses copying their
artwork, fonts, copy or layout one-to-one. The offline assessment report follows `DESIGN.md` and
`docs/UI_STRUCTURE.md`, not this file.

## Sources and how far they can be trusted

| Source | Pages | What it shows | Capture limits |
|---|---|---|---|
| `docs/cofounder-co-....pdf` (homepage) | 13 | Full homepage, hero to footer | Printed at a narrow, tablet-like width. Desktop layout not visible. |
| `docs/cofounder-co-how-to-start....pdf` | 9 | Chapter I page | Only page 1 rendered. Pages 2–8 are blank (content loads on scroll). |
| `docs/cofounder-co-pricing....pdf` | 6 | Pricing card and footer | Pages 2–4 blank. The pricing calculator is missing. |
| `docs/www-navbar-gallery-navbar-integrated-biosciences....pdf` | 3 | Integrated Bio navbar, desktop and mobile | Gallery screenshots, not the live site. |
| Live `https://cofounder.co/` HTML (fetched 23 Nov 2026) | — | Hero technique and font stack | HTML only. No assets were downloaded or kept. |
| `FOXNsi0VM2…jpg` (repo root, 1200×675) | — | **Cofounder desktop hero and navbar** | One still frame of the looping video, plus the live DOM on top of it |
| `fgUkJtOmK…jpg` (repo root, 1806×1200) | — | **Cofounder product window over pixel art** | A marketing still of their app |
| `Pixel-Art Sci-Fi Robot Adventurers.png` (repo root, 1254×1254 RGBA) | — | **Optimus agent character sheet**: four poses | Our own asset, assessed below |

PDF pages were rendered with poppler 26.09.0, installed in `C:\Users\ADMIN\tools\poppler`.

## Verified technical facts

**Cofounder's hero is a looping video, not CSS sprites or canvas.** From the live HTML:

```html
<video aria-hidden="true" autoplay muted loop playsinline preload="metadata"
       poster="/hero/cofounder-2-hero-poster.webp"
       class="absolute right-0 top-0 h-full min-w-full object-cover object-right
              translate-x-[50%] sm:translate-x-0">
  <source src="/hero/cofounder-2-hero.webm" type="video/webm">   <!-- 279,752 bytes -->
  <source src="/hero/cofounder-2-hero.mp4"  type="video/mp4">    <!-- 209,752 bytes -->
</video>
```

- The whole animated scene is one seamless loop of about 200–280 KB, with a still WebP poster.
- The video is decorative (`aria-hidden`). Headline and buttons are live DOM text on top of it.
- On phones it is shifted (`translate-x-[50%]`, `object-right`) so the subject stays in view.
  The scene's aspect ratio is about 1.71 : 1.
- The footer background is a static AVIF/WebP picture, not video.

**Cofounder's fonts are not Geist.** They were verified from the PDF's embedded fonts and from the site CSS:

| Role | Font | Licence |
|---|---|---|
| Headlines and body | **TT Neoris** (variable; the light weights include a "Hairline") | Commercial (TypeType) |
| Labels, chapter numbers | **IBM Plex Mono** | OFL |
| Pixel numerals, word-search letters | **Departure Mono** | OFL |
| Integrated Bio (navbar reference) | **Neue Montreal** | Commercial (Pangram Pangram) |

## Cofounder homepage, section by section

1. **Navbar:** wordmark on the left. On the right, a dark "Run a company" button and a square menu button.
2. **Hero:** a full-bleed pixel forest, with a big tree trunk framing the right side and a laptop and
   notebook in the grass on the lower left. The headline is left-aligned, light weight and white.
   One solid white button and one translucent button. The hero's bottom edge **dissolves into pixels**
   as it meets the next section.
3. **Social proof:** a 2×2 grid of customer logos and "over 10,650 companies". *Optimus has no
   equivalent and must not invent one.*
4. **Positioning plus a radial diagram:** a two-tone headline over a radial "orchestration" chart.
   A Cofounder node sits in the centre, departments sit around it, and dashed spokes connect them.
   A tiny pixel sunflower sits at the centre.
5. **Product preview:** a faded app window ("Ask cofounder…") above three run-in feature lines.
   Each line has a bold lead and an em-dash ("**Human in the loop** — …").
6. **Numbered chapters:** `1.0 — LAUNCH`, `2.0 — GROW`, `3.0 — OPERATE`. Each has a mono label,
   a two-tone headline ("Cofounder launches a company *with you*"), a paragraph, and an accordion
   of four numbered rows (`1.1 Business positioning +`). Below that is a faded **mock** product
   screen: a task board, an email preview, or an analytics card.
7. **Guide teaser:** a centred headline and a dark button, then centred "book" cards stacked on a
   faint grid (Chapter 1–4). Each has a mono "Read this chapter (I)" link.
8. **Full-bleed contrast section:** sky blue, getting lighter towards the bottom. On the left, a
   vertical list of three claims, with the active one marked by a left rule and the others faded.
   On the right, a glassy panel listing agent tasks with status chips (Ready to review, Running,
   Completed, Blocked), tallies, and a department node.
9. **Word search:** "Build across industries". A 6 × 10 grid in a light-grey dot-matrix font
   (Departure Mono), centred, with **no frame and no word list**.
10. **Footer:** a two-tone headline, a tall rounded CTA card, a row of "How to…" chapter links,
    two link columns, X and LinkedIn buttons, a SOC 2 badge, legal text, and "Made with ♡".

**Other pages:**
- Chapter page: a breadcrumb bar with a "Try →" button, a chapter pill, a headline, prose, and a
  framed pixel illustration (a rocket launch).
- Pricing page: one rounded card with a pixel sunflower, "$ 40 / month" in the pixel mono font,
  a checklist with green check icons, and a dark button.

## Cofounder's visual system

- **Ratio of art to page:** pixel art appears only in the hero, one framed picture per chapter,
  the pricing card, and the tiny sunflower. Everything else is quiet UI on a warm off-white page.
  The art is roughly 15% of the page, and that restraint is why it feels premium.
- **Hierarchy through colour, not weight:** light-weight headlines in two tones (ink, then grey).
  Bold appears only on small run-in labels.
- **Mono as the structure layer:** chapter numbers, labels and links are small mono text with
  wide letter-spacing.
- **Shape and depth:** 8–12px rounded corners and soft shadows on cards, buttons and accordion
  rows. One saturated full-bleed colour section breaks up the off-white.

## Integrated Biosciences navbar

- **Desktop:** the logo top-left. Top-right, a small capsule holding mono uppercase links
  (PLATFORM · COMPANY · NEWSROOM) and one dark "WORK WITH US" button. Below it, a big light-weight
  headline over abstract full-bleed art.
- **Mobile:** a full-screen dark spruce panel (about `#243130`) with rounded corners. Logo
  top-left; the close button is a square with a lime outline. Huge light-weight links are centred
  and stacked. Thin curved line art sits in the background, and an email address underlined in
  lime sits at the bottom. **Lime is used only for lines** (the close outline and the underline).
  This matches our `--accent #D9F53B` used on `--dominant`, which measures 9.62:1.

## Cofounder desktop hero (`FOXNsi0VM2…jpg`)

- **Navbar:** a serif wordmark on the left. On the right, **frosted-glass pills** (translucent blue,
  blurring what's behind them):
  - one grouped capsule with a faded "How to" label followed by Start · Build · Sell · Scale;
  - separate pills for Resources, Pricing and Log in;
  - one **solid white** "Run a company" button.
  The navbar sits on the sky with no bar behind it.
- **Copy block:** left-aligned in the upper-left third, over plain sky. The headline is
  **regular weight** (not light), white, two lines. Below it, one subline, then a white solid
  button and a glass button. The copy is placed over the calmest part of the art, so contrast
  never depends on busy pixels.
- **Scene:** a pixel park with a city skyline far away, a bench and path, a big tree framing
  the right with sun rays, clovers and a dandelion in front, and a laptop (its screen shows sky)
  next to a notebook.
- **Product inside the art:** three stacked **glass status chips** float above the laptop, each
  with a green dot: "Task running · bug fix", "Task Completed · SEO Optimization",
  "Task Completed · Marketing Campaign". They tell the product story *inside* the scene and
  appear to be live DOM over the video.
- The tree-framed-right composition and the laptop on the grass are confirmed as Cofounder's
  signature. That strengthens guardrail 1 below.

## Cofounder product window over pixel art (`fgUkJtOmK…jpg`)

- The real app UI sits in a large window with about 24px corners and a frosted white surface
  with **diagonal light streaks**. The window floats over a full-bleed pixel tree canopy that
  shows around every edge.
- **Left pane:** Todo / Inbox / Flows tabs, filter chips tinted by service (Gmail red-tint,
  Calendar blue-tint), small-caps date groups (TODAY, YESTERDAY, THIS WEEK), and rows each
  showing a tag chip, a title and a time.
- **Right pane:** the task title, an **approval card** (a form with fields, attendee chips and
  a toggle), Cancel, a black primary button with its keyboard shortcut (`Create Event ⌘↵`), a
  keyboard-hint footer, and a reply composer.
- **The lesson:** the product itself is the illustration, framed by the art. It is not a
  drawing of the product.

## Optimus agent character sheet (`Pixel-Art Sci-Fi Robot Adventurers.png`)

**Subject:** one hooded robot adventurer with a black visor face and cyan eyes, in four poses:

| Pose | Props | Suggested Optimus role |
|---|---|---|
| Crouching, magnifying glass | satchel, cloak | **Evidence**: inspecting what Kane recorded |
| Standing, scroll showing `</>` | backpack, scroll | **Contract**: the approved pack |
| Sitting, laptop showing `>_` (purple hood, narrowed eyes) | laptop | **Kane run**: acting and recording in the browser |
| Standing, clipboard with ticks, pencil | clipboard | **Verdict**: Optimus judges (never Kane) |

**Palette:** tan cloth, purple cloak, gold trim, cyan eyes, and **lime** details (ear rings,
ticks, the `>_` prompt). The lime matches `--accent #D9F53B`. Purple in illustration is allowed
(the ban covers purple/indigo *gradients on white*).

**Measured quality (Pillow):**
- **Not grid-locked pixel art.** It's AI-made "pixel style": 741+ colours, no consistent
  pixel block size (the most common run of identical pixels is 1px), stair-step edges blurred
  by anti-aliasing, and a soft glow around the eyes. Up close, the steps are irregular,
  about 4–5 source pixels each.
- **The transparency is a soft cut-out.** About 53% of pixels are fully transparent and about
  46% almost opaque (alpha 224–254), with very few in between. That's usable.
- **About 12.6k reddish fringe pixels** at the edges, left over from background removal.
- **Static only:** one frame per pose. There are no animation strips.

**Cleanup plan (doable in-house with Python and Pillow):**
1. Snap each figure to its native pixel grid by scaling down with nearest-neighbour sampling,
   to about 110–130px tall per figure.
2. Reduce to a fixed palette of about 24–32 colours.
3. Make the alpha strictly on/off and strip the red fringe.
4. Cut each pose into its own transparent sprite with a bottom-centre anchor.

**Idle loops I can make from a single frame:**
- eye blink (the cyan eyes are separate shapes, easy to mask);
- the `>_` cursor blinking on the laptop;
- a glint sweeping across the magnifying glass;
- a new tick drawing in on the clipboard;
- the lime ear rings pulsing;
- a 1px breathing bob on the upper body, using hand-cut masks at native size.

**Gaps:**
1. There is **no repair pose** (the coding agent fixing code). It needs an asset request.
2. The sheet **replaces the kit's four different robots**. The asset template's character
   continuity section (Kane blue, Investigator amber, Contract amethyst, Evidence cream) is now
   out of date.
3. **Provenance** (which tool made it, and when) must be recorded for the hackathon's
   "built during the event" rule.
4. If the purple-hood laptop figure is labelled "Kane", that labels TestMu's product as our
   character. Safer: the website names it "the browser run", and Kane is named only in copy.

## Mapping to Optimus — take the principle, not the pixels

| Reference pattern | Optimus version | Why it's different |
|---|---|---|
| Hero video loop | Environment loop (video or layered sprites) with the four Optimus agent poses as separate sprites on top | Our own world and characters. The agents can be interactive. |
| Glass task chips floating above the laptop | Glass **verdict chips** above the agents, built from **real bundle data**, e.g. `C · Remove · Baseline FAIL` then `C · Remove · Verified PASS` | Real outcomes, not invented tasks. Raw engine reasons ("did not satisfy 'list_contains'") are not shown as hero copy. |
| Product window over pixel art | The **real report** (matrix or repair record, rendered from the bundle) in a framed window over pixel scenery | The report must exist first. This is why the report renderer comes before this section. |
| Frosted-glass nav pills | Glass capsule nav on the hero (the one corner-radius exception in DESIGN.md) | Our labels, our palette |
| Pixel-dissolve hero edge | Pixel-step edge built with CSS/SVG in our palette | A generic technique, rebuilt from scratch |
| Light two-tone headlines | Bricolage Grotesque 200, ink plus `--ink-muted` | Different typeface. Fits the DESIGN.md weight extremes. |
| Mono labels and numbered chapters | `1.0 — CONTRACT`, `2.0 — EVIDENCE`, `3.0 — VERDICTS`, `4.0 — REPAIR` | Our real pipeline stages |
| Faded **mock** product screens | **Real** product data: a generated `_test.md` excerpt, real Kane screenshots, the real Gate 1 v5 matrix, the real repair diff | Real data instead of mock-ups; this is the main advantage over the reference |
| Radial orchestration diagram | **Left-to-right pipeline**: contract → Kane → evidence → Optimus verdict → agent → fresh Kane run | Matches how Optimus actually works. Not a radial chart. |
| Blue contrast section with task chips | Solid `--dominant` section for the repair loop, using decision badges from the real `repair-history` (C: L3 baseline FAIL, then verified PASS) | Solid colour, no gradient. Decisions are kept visually separate from verdicts. |
| Guide teaser with book cards | Documentation chapters linking to **real** README sections | Only links that have a real target |
| Pricing card with sunflower | **Drop it.** At most a "What a run costs" card with measured credits | Optimus has no price. The sunflower card is Cofounder's signature. |
| Customer logos and counts | **None** | No customers exist; fabrication is banned |
| Word search | 12 × 12 grid of real buttons in Atkinson Hyperlegible Mono, with an always-visible link list | Accessible, an original grid and words, not a dot-matrix font |
| Rounded corners and soft shadows | **Not adopted.** Corners ≤ 4px and no shadows (DESIGN.md); the capsule nav is the only exception | Gives a ledger-like feel and visibly differs from Cofounder |
| Integrated Bio mobile menu | Full-screen `--dominant` panel, huge links, lime-outlined close, thin pixel-step line art, and a real link at the bottom (no invented email) | Our palette and line art |

## Originality guardrails (things to avoid)

1. **Hero composition.** The kit's draft hero (`docs/asset-preview.png`) has a big tree trunk
   framing the right edge over grass and a pixel sky. That is Cofounder's strongest signature.
   The final hero (X-01) should drop the framing tree or move it, and lead with the observatory.
   The desktop still confirms it, and adds a second signature: **a laptop and notebook lying in
   the grass**. Our laptop pose (the browser run) must sit in our own setting, such as the
   observatory steps, not on a lawn beside a book.
2. **Sunflower motifs** (the kit's `signal-bloom.png`, the demo's flower card): drop them.
3. **The Departure Mono / dot-matrix look** for numbers and the puzzle: don't use it.
4. **TT Neoris or Neue Montreal**: commercial fonts, and using them would mimic the references.
5. **Copy patterns:** don't reuse "Run a company", "How to start / build / sell / scale", or
   "Build across industries".
6. **Nothing from their servers**: no video, poster, footer image or font file is downloaded into
   or referenced from this project.
