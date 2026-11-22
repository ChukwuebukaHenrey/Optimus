# Optimus report UI: structure draft

This draft lists the views, components and resources for the Optimus results UI, so design references can be gathered before it is built. It follows AGENTS.md: one contract (a pack) applied unchanged to many independently built apps, with evidence-backed verdicts.

Revision 2 adopts a design review. The comparison matrix is the visual centrepiece and is designed first. The report is organised as three levels in one file, not five separate pages. The UI is treated as a reading path that answers questions in order, not as a dump of the available data. The pasted review was cut off after its Level 1 description, so Levels 2 and 3 below are inferred from the original views.

## Build constraints the design must respect

| Constraint | Source | What it means for design |
|---|---|---|
| Static HTML report written by `src/core/report.ts` next to `result.json` | AGENTS.md layout | One self-contained HTML file per report, opened from disk. No server and no login. |
| Content Security Policy `default-src 'none'`, inline styles only | `report.ts` | No JavaScript, web fonts from a CDN, external images or icon fonts. Interactions must be pure HTML and CSS: links, `<details>` disclosure, `:target`. Icons must be inline SVG. Fonts must be system fonts, or a font embedded in the file if the policy is widened for it. |
| Every value is escaped text | `report.ts` | App titles, reasons and recorded values can be long or odd. Layouts must wrap and must not depend on short strings. |
| No LLM, no subjective quality | AGENTS.md rule 1 and scope | The UI shows verdicts, reasons and evidence. It shows no AI summaries, grades out of 10, or code-quality opinions. |
| Education wording only in reports and README | AGENTS.md | The UI may say "submission", "assignment" and "student". The engine data uses "app", "pack" and "scenario". |
| Out of scope for the hackathon | AGENTS.md | No hosted dashboard, LMS integration, accounts, or editing packs in the UI. |

## Reading path

The report answers three questions in order. Each level links to the next with in-page anchors, so no scripts are needed.

| Question the reader has | Level | Answer on screen |
|---|---|---|
| Which builds meet the contract? | 1. Comparison overview | The verdict matrix |
| Why did this build get these verdicts? | 2. Build detail | Scenario verdicts with plain reasons |
| What is the proof? | 3. Scenario evidence | Steps, recorded values and screenshots |

Two supporting sections sit outside the main path: the contract, for transparency and reproducibility, and the calibration summary, for the hackathon demo.

## Report structure: one file, three levels

The comparison report is a single static HTML file. Screenshots sit next to it in an `evidence/` folder. Anchors give every level a stable address, for example `#build-b` and `#build-b-L3`, so a matrix cell links straight to its evidence. The per-app `report.html` that exists today becomes Level 2 and Level 3 for a single build.

### Level 1: Comparison overview (design first)

The centrepiece. One screen shows that one contract judged many different builds.

- **Identity bar:** assessment name (for example "Library assessment"), contract version and short hash, the number of builds, and a line confirming that every build used the same contract hash.
- **Summary tiles:** builds evaluated, scenarios, verdicts issued, and how many verdicts are resolved (PASS or FAIL) versus unresolved.
- **Verdict matrix:** one row per build and one column per scenario, with plain names ("Add", "Remove", "Persist") and the scenario ID as a secondary label. Each cell is a verdict badge linking to that scenario's evidence.
- **Score column:** a percentage per build when every scenario is resolved, otherwise "Provisional".
- **Legend:** the six verdicts in plain words. INCONCLUSIVE and INFRA_ERROR must read as "no judgement", never as failure.
- **Mock data rule:** a mock that is not built from real run data is labelled "Illustrative". Real Gate 1 v5 data can be used once the matrix completes.

Data status: each run already writes `result.json` with the pack hash, app URL, score and scenario results. The matrix only needs a combiner over those files. No new engine data is required.

### Level 2: Build detail

One build's assessment, reached from a matrix row.

- **Build header:** build name, app URL, run nonce, score or "Provisional", Kane version and execution ID.
- **Run integrity checklist:** run completed; replay decisions = 0; evidence archive present; contract hash matches.
- **Scenario cards:** one per scenario, giving the verdict, a one-sentence reason, and for a FAIL the expected and observed values. Each card links to Level 3.

Data status: the score, URL, nonce, hash and results exist today. Kane version, execution ID and the integrity fields are in the trace but not yet in `result.json`.

### Level 3: Scenario evidence

The proof behind one verdict, reached from a matrix cell or a scenario card.

- **Verdict and reason:** badge, plain-English reason, reason code.
- **Step timeline:** each step's instruction, whether the action was recorded, and the values recorded at that step. The step that decided the verdict is highlighted.
- **Before and after comparison:** recorded lists side by side, with entries marked added, removed or unchanged, and counts with their difference.
- **Screenshot pair:** the archived before and after screenshots with step captions.
- **Evidence references:** the archive path and step entries, as plain text for auditors. This is collapsed by default.

Data status: recorded values and screenshot references are in the normalized trace. Screenshots must be copied out of the sealed archive into `evidence/`, and the page's security policy must allow `img-src 'self'`.

### Supporting section A: Contract

What every build was tested against. It is linked from the identity bar.

- Pack name, version, full hash, and the support and persistence statements.
- Per scenario, two visibly separate panels: **Sent to Kane** (title, actions, record prompts) and **Judged by Optimus** (assertions in words, prerequisites, designated new values, evidence rule).
- A note that `{{nonce}}` is filled in per run and that the hash covers the unexpanded pack.

### Supporting section B: Calibration summary (hackathon demo only)

Proof that the grader agrees with known answers before it judges anyone: expected and actual verdict, screenshot agreement, seconds and credits per case, and notes on void attempts and contract revisions. This is not part of the product report.

Out of scope until after grading is proven: the Phase 4 repair loop view.

## Components

| # | Component | Used in | Content and states |
|---|---|---|---|
| C1 | Verdict badge | All views | Six states: PASS, FAIL, INCONCLUSIVE, NOT_RUN, INFRA_ERROR, UNSUPPORTED. Each needs a colour, an icon and its text, because colour alone is not enough. A compact variant for matrix cells and a full variant for headers. |
| C2 | Score display | Overview, Build | A percentage, or "Provisional" with a one-line explanation. |
| C3 | Scenario card | Build | Title, verdict badge, reason, reason code chip, failing step, and expected and observed values. A collapsed and an expanded state, using `<details>`. |
| C4 | Reason code chip | Build, Scenario | A monospace token such as `recording_inconsistent`, with a plain-English line beside it. |
| C5 | Hash and ID chip | Overview, Build, Contract | A shortened hash (first 8 and last 4 characters) with the full value available in a disclosure. There is no copy button, because the page runs no scripts. |
| C6 | Matrix cell | Overview | A compact verdict badge that links to the scenario. It also needs an empty state for "not run". |
| C7 | Integrity checklist | Build | Four lines, each with an OK or problem state and short text. |
| C8 | Step timeline | Scenario | A vertical list of steps showing the action text, "action recorded: yes / no / unknown", and the recorded values. One step can be highlighted as decisive. |
| C9 | List difference | Scenario | Before and after columns with added, removed and unchanged markers. It must handle long titles and empty lists ("none"). |
| C10 | Count difference | Scenario | Before → after with the signed change, for example 4 → 3 (−1). |
| C11 | Screenshot pair | Scenario | Two framed screenshots with captions. Full-size viewing through a link to the image file or a `:target` overlay. A missing-screenshot placeholder. |
| C12 | Contract step block | Contract | The instruction text, the record prompts, and an evaluator-only panel with a different visual treatment. |
| C13 | Legend | Overview | All six verdicts with one-sentence meanings. |
| C14 | Totals strip | Overview, Calibration | Counts per verdict; optional credits and duration. |
| C15 | Empty and error states | All | "No scenario results", "trace missing", and "evidence archive unavailable". |
| C16 | Notes list | Calibration | Dated, plain-text entries for stops and contract revisions. |

## Verdict meanings for the legend and badges

| Verdict | Plain meaning | Suggested tone |
|---|---|---|
| PASS | The required behaviour was performed and observed. | Positive (green family) |
| FAIL | The action happened and the result was visibly wrong. | Negative (red family) |
| INCONCLUSIVE | The evidence cannot support either answer, for example when an action was not established or a recording was inconsistent. | Caution (amber family). Must not look like a failure. |
| NOT_RUN | A needed step was skipped or no trace was supplied. | Neutral grey |
| INFRA_ERROR | The browser run or tooling failed. This says nothing about the app. | Distinct neutral (slate or violet). Must not look like a failure. |
| UNSUPPORTED | The app is outside the pack's supported type, for example a canvas-only UI. | Muted neutral |

## Resources to gather

1. **Colour tokens:** six verdict colours, each with a background and a foreground at WCAG AA contrast, plus neutrals for surfaces, borders and text. A dark theme is optional; the current report is light only.
2. **Icons:** a small inline-SVG set for the six verdicts, plus check, cross, minus (unchanged), plus (added), image, link and info. A simple line style. The icons must be copyable as SVG markup.
3. **Typography:** a system font stack (the current choice), or one embeddable font in two weights. A monospace face for hashes, reason codes and recorded values.
4. **Layout references:** a dense comparison table that stays readable on a laptop and reflows on a phone, a card list, and a two-up image comparison.
5. **Screenshot frame:** a light browser-like frame or a plain border for the 1600×900 screenshots, with a caption style.
6. **Print style:** instructors may print or export to PDF. Verdict badges must stay readable in greyscale.
7. **Sample content for mocks:** use the real Gate 1 v5 data, for example "GP Beta g5-a-1" or "The Hobbit | Kindred | GP Book g5-b-1", and one long reason string. This tests wrapping.

## Design order and build order

Design in reading order. Build in dependency order. The two now mostly agree.

1. **Design** the Level 1 overview first: matrix, tiles, legend and verdict badges. **Build** it as a combiner over existing `result.json` files. No new engine data is needed.
2. Design and build Level 2: restyle the existing per-app report with the new tokens, and add the integrity checklist and run identifiers to `result.json`.
3. Design and build Level 3: copy the screenshots and recorded values into the report folder.
4. Add the contract section, then the calibration summary for the demo.
