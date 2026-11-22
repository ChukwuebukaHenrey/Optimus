# Optimus report UI: structure draft

This draft lists the views, components and resources for the Optimus results UI, so design references can be gathered before it is built. It follows AGENTS.md: one contract (a pack) applied unchanged to many independently built apps, with evidence-backed verdicts.

## Build constraints the design must respect

| Constraint | Source | What it means for design |
|---|---|---|
| Static HTML report written by `src/core/report.ts` next to `result.json` | AGENTS.md layout | One self-contained HTML file per report, opened from disk. No server and no login. |
| Content Security Policy `default-src 'none'`, inline styles only | `report.ts` | No JavaScript, web fonts from a CDN, external images or icon fonts. Interactions must be pure HTML and CSS: links, `<details>` disclosure, `:target`. Icons must be inline SVG. Fonts must be system fonts, or a font embedded in the file if the policy is widened for it. |
| Every value is escaped text | `report.ts` | App titles, reasons and recorded values can be long or odd. Layouts must wrap and must not depend on short strings. |
| No LLM, no subjective quality | AGENTS.md rule 1 and scope | The UI shows verdicts, reasons and evidence. It shows no AI summaries, grades out of 10, or code-quality opinions. |
| Education wording only in reports and README | AGENTS.md | The UI may say "submission", "assignment" and "student". The engine data uses "app", "pack" and "scenario". |
| Out of scope for the hackathon | AGENTS.md | No hosted dashboard, LMS integration, accounts, or editing packs in the UI. |

## Views

### 1. Comparison matrix (main view; needs new data)

One contract run against many builds. This is the core of the pitch: "One contract. Many different builds. Evidence-backed verdicts."

- **Header:** pack name and version, short pack hash, the number of apps, and the date. A line confirming that every app used the same pack hash.
- **Matrix table:** one row per app and one column per scenario (L1 Add, L3 Remove, L4 Persist, later L2 Read status). Each cell shows a verdict badge and links to that scenario in the app detail view.
- **Score column:** a percentage when every scenario has PASS or FAIL, otherwise "Provisional".
- **Legend:** what each of the six verdicts means, in plain words.
- **Totals strip:** counts per verdict. Credits and time are optional, and are useful in the Gate demo.

Data status: one `result.json` exists per app run. Combining several runs into one matrix is not built yet.

### 2. App detail (exists in basic form)

One app's assessment.

- **Summary block:** app URL, run nonce, pack hash, score or "Provisional", Kane version and execution ID.
- **Run integrity checklist:** run completed; replay decisions = 0; evidence archive present; pack hash matches. Each item is shown as a pass or fail line.
- **Scenario result list:** one scenario card each (component C3).

Data status: the score, URL, nonce, hash and results exist today. Kane version, execution ID and the integrity fields are in the trace but not yet copied into `result.json`.

### 3. Scenario evidence (needs new data)

Why a verdict was given, shown with evidence, not claims.

- **Verdict and reason:** badge, plain-English reason and reason code.
- **Step timeline:** each pack step in order. For each step: the instruction, whether the action was recorded, and the values recorded at that step. The step that produced the verdict is highlighted.
- **Before and after comparison:** recorded list values side by side, with entries marked as added, removed or unchanged, and the counts with their difference.
- **Expected and observed:** for a FAIL, the failing assertion in words, for example "GP Alpha should be gone after removal", with what was observed.
- **Screenshot pair:** the archived screenshots for the before step and the after step, captioned with the step name.
- **Evidence references:** the archive path and the step entries, as plain text for auditors.

Data status: recorded values and screenshot references are in the normalized trace, not in `result.json`. Screenshots are inside the sealed evidence archive and would need to be copied next to the report. The page's security policy must allow `img-src 'self'` (or `data:` images) when that is added.

### 4. Contract view (needs new data)

What every app was tested against, and the split between what Kane saw and what Optimus judged.

- **Pack header:** name, version, full hash, support statement and persistence statement.
- **Per scenario, two clearly separated panels:**
  - **Sent to Kane:** the title, each step's action, and its "record" prompts. These are neutral instructions only.
  - **Judged by Optimus:** the assertions in words, prerequisites, designated new values and the evidence rule.
- **Nonce note:** `{{nonce}}` is replaced per run, and the hash covers the unexpanded pack.

Data status: everything is in `pack.yaml`. The report does not include it yet.

### 5. Gate and calibration summary (optional; hackathon demo)

Proof that the grader itself is trustworthy before it judges anyone.

- **Expected and actual table:** app, trial, scenario, expected verdict, actual verdict, screenshot agreement, seconds and credits. This mirrors `runs/gate1-v5/REPORT.md`.
- **Agreement badges:** "matches expected" and "matches screenshots".
- **Notes list:** infrastructure stops and contract revisions, with their reasons.

Data status: the data exists in run folders and reports. No page renders it yet.

Out of scope until after grading is proven: the Phase 4 repair loop view (attempts, briefs, re-runs).

## Components

| # | Component | Used in | Content and states |
|---|---|---|---|
| C1 | Verdict badge | All views | Six states: PASS, FAIL, INCONCLUSIVE, NOT_RUN, INFRA_ERROR, UNSUPPORTED. Each needs a colour, an icon and its text, because colour alone is not enough. A compact variant for matrix cells and a full variant for headers. |
| C2 | Score display | 1, 2 | A percentage, or "Provisional" with a one-line explanation. |
| C3 | Scenario card | 2 | Title, verdict badge, reason, reason code chip, failing step, and expected and observed values. A collapsed and an expanded state, using `<details>`. |
| C4 | Reason code chip | 2, 3 | A monospace token such as `recording_inconsistent`, with a plain-English line beside it. |
| C5 | Hash and ID chip | 1, 2, 4 | A shortened hash (first 8 and last 4 characters) with the full value available in a disclosure. There is no copy button, because the page runs no scripts. |
| C6 | Matrix cell | 1 | A compact verdict badge that links to the scenario. It also needs an empty state for "not run". |
| C7 | Integrity checklist | 2 | Four lines, each with an OK or problem state and short text. |
| C8 | Step timeline | 3 | A vertical list of steps showing the action text, "action recorded: yes / no / unknown", and the recorded values. One step can be highlighted as decisive. |
| C9 | List difference | 3 | Before and after columns with added, removed and unchanged markers. It must handle long titles and empty lists ("none"). |
| C10 | Count difference | 3 | Before → after with the signed change, for example 4 → 3 (−1). |
| C11 | Screenshot pair | 3 | Two framed screenshots with captions. Full-size viewing through a link to the image file or a `:target` overlay. A missing-screenshot placeholder. |
| C12 | Contract step block | 4 | The instruction text, the record prompts, and an evaluator-only panel with a different visual treatment. |
| C13 | Legend | 1 | All six verdicts with one-sentence meanings. |
| C14 | Totals strip | 1, 5 | Counts per verdict; optional credits and duration. |
| C15 | Empty and error states | All | "No scenario results", "trace missing", and "evidence archive unavailable". |
| C16 | Notes list | 5 | Dated, plain-text entries for stops and contract revisions. |

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

## Build order once the designs are ready

1. Restyle the existing app detail view (2) and the scenario card (C3) with the new tokens and icons. This needs no new data.
2. Add the integrity checklist (C7) and run identifiers to `result.json`, then render them.
3. Add a combined report across apps: the comparison matrix (1).
4. Copy the screenshot pair and recorded values into the report folder: the scenario evidence view (3).
5. Add the contract view (4) and the optional Gate summary (5).
