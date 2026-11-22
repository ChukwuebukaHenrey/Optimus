# Optimus report UI: structure draft

This draft lists the views, components and resources for the Optimus results UI, so design references can be gathered before it is built. It follows AGENTS.md: one contract (a pack) applied unchanged to many independently built apps, with evidence-backed verdicts.

Revision 2 adopts a design review. The comparison matrix is the visual centrepiece and is designed first. The report is organised as three levels in one file, not five separate pages. The UI is treated as a reading path that answers questions in order, not as a dump of the available data. The pasted review was cut off after its Level 1 description, so Levels 2 and 3 below are inferred from the original views.

Revision 3 adds the repair loop after the closed-loop audit (`Optimus_Kane_Closed_Loop_Audit.md`). The hackathon's third requirement is that the coding agent and Kane CLI communicate through a feedback loop. The report must therefore show the full chain: verified failure → brief to the agent → code change → fresh Kane run → outcome. It must also show the proof that the contract and grader stayed unchanged. This adds a fourth level (the repair record) and a repair state in the matrix.

## Build constraints the design must respect

| Constraint | Source | What it means for design |
|---|---|---|
| Static HTML report written by `src/core/report.ts` next to `result.json` | AGENTS.md layout | One self-contained HTML file per report, opened from disk. No server and no login. |
| Content Security Policy `default-src 'none'`, inline styles only | `report.ts` | No JavaScript, web fonts from a CDN, external images or icon fonts. Interactions must be pure HTML and CSS: links, `<details>` disclosure, `:target`. Icons must be inline SVG. Fonts must be system fonts, or a font embedded in the file if the policy is widened for it. |
| Every value is escaped text | `report.ts` | App titles, reasons and recorded values can be long or odd. Layouts must wrap and must not depend on short strings. |
| No LLM, no subjective quality | AGENTS.md rule 1 and scope | The UI shows verdicts, reasons and evidence. It shows no AI summaries, grades out of 10, or code-quality opinions. |
| The agent repairs; it never judges | AGENTS.md rule 1 (amended) and the closed-loop audit | Content from the coding agent (its brief, its code diff, its final message) is shown in clearly labelled agent panels. Verdicts always come from Optimus and are never shown in an agent panel. |
| Education wording only in reports and README | AGENTS.md | The UI may say "submission", "assignment" and "student". The engine data uses "app", "pack" and "scenario". |
| Out of scope for the hackathon | AGENTS.md | No hosted dashboard, LMS integration, accounts, or editing packs in the UI. |

## Reading path

The report answers four questions in order. Each level links to the next with in-page anchors, so no scripts are needed.

| Question the reader has | Level | Answer on screen |
|---|---|---|
| Which builds meet the contract? | 1. Comparison overview | The verdict matrix |
| Why did this build get these verdicts? | 2. Build detail | Scenario verdicts with plain reasons |
| What is the proof? | 3. Scenario evidence | Steps, recorded values and screenshots |
| Did the fix work, and can it be trusted? | 4. Repair record | Failure, brief, code change, fresh Kane run, outcome and integrity checks |

Two supporting sections sit outside the main path: the contract, for transparency and reproducibility, and the calibration summary, for the hackathon demo.

## Report structure: one file, four levels

The comparison report is a single static HTML file. Screenshots sit next to it in an `evidence/` folder. Anchors give every level a stable address, for example `#build-b`, `#build-b-L3` and `#repair-c`, so a matrix cell links straight to its evidence or repair record. The per-app `report.html` that exists today becomes Level 2 and Level 3 for a single build.

### Level 1: Comparison overview (design first)

The centrepiece. One screen shows that one contract judged many different builds.

- **Identity bar:** assessment name (for example "Library assessment"), contract version and short hash, the number of builds, and a line confirming that every build used the same contract hash.
- **Summary tiles:** builds evaluated, scenarios, verdicts issued, and how many verdicts are resolved (PASS or FAIL) versus unresolved.
- **Verdict matrix:** one row per build and one column per scenario, with plain names ("Add", "Remove", "Persist") and the scenario ID as a secondary label. Each cell is a verdict badge linking to that scenario's evidence.
- **Score column:** a percentage per build when every scenario is resolved, otherwise "Provisional".
- **Legend:** the six verdicts in plain words. INCONCLUSIVE and INFRA_ERROR must read as "no judgement", never as failure.
- **Repair state:** a build that went through the repair loop shows both runs in its cells, for example "FAIL → PASS", with the baseline verdict dimmed or struck through. The row links to its repair record. A build whose loop stopped shows the stopping decision, for example "Stopped: needs evidence".
- **Repair summary tiles:** loops run, repairs that reached PASS, loops stopped, and total attempts.
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

### Level 4: Repair record (the closed-loop proof)

One loop for one build, reached from the matrix row or the build header. It reads top to bottom as a timeline, and each stage shows its evidence.

1. **Baseline run.** The Kane execution ID, pack hash, and the scenario verdicts. The verified FAIL that started the loop is highlighted and links to its Level 3 evidence.
2. **Decision gate.** The controller's decision with its reason: `REPAIR`, `COMPLETE`, `NEEDS_EVIDENCE`, `RETRY_INFRASTRUCTURE` or `STOP`. The page states that only a verified FAIL can start a repair, and that INCONCLUSIVE never does.
3. **Brief sent to the agent.** The exact text the agent received: scenario, requirement in plain language, expected and observed values, screenshot reference and allowed scope. It is labelled "Sent to the coding agent". A note confirms that the pack and expected values were not included.
4. **Agent action.** Agent name and version, start and end times, and the agent's final message, collapsed by default and labelled as agent output.
5. **Code change.** The diff of the app files, rendered as static `<pre>` lines marked added or removed, with a file list and line counts.
6. **Integrity checks.** Only allowed app files changed; the pack hash is unchanged; the evaluator and adapter file hashes are unchanged; the browser profile was fresh. Each check is a pass or problem line.
7. **Fresh Kane run.** A new execution ID and nonce, the same pack hash, and the full Gate 1 scope (L1, L3, L4), not only the failed scenario. Each verdict links to its Level 3 evidence.
8. **Outcome.** The final state, for example "Repaired: L3 FAIL → PASS; L1 and L4 still PASS", or the stopping reason.
9. **Budget.** Attempts used out of 3, credits used out of 1,500, and minutes used out of 20. Void infrastructure attempts are listed separately with their own retry count.

A loop with several attempts repeats stages 3–7 per attempt, as numbered attempt blocks.

Data status: needs `repair-history.json` from the new repair controller, recording the baseline execution, brief, agent invocation, diff, hashes, new execution, attempts, budget and stopping reason. Nothing produces it yet.

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
| C17 | Repair cell state | Overview | A matrix cell showing a baseline and a post-repair verdict, for example "FAIL → PASS". The baseline is dimmed or struck through. |
| C18 | Decision badge | Repair | Five states: COMPLETE, REPAIR, NEEDS_EVIDENCE, RETRY_INFRASTRUCTURE, STOP. These need a visual family distinct from the verdict badges, because a decision is not a verdict. |
| C19 | Repair timeline | Repair | Vertical stages (baseline, decision, brief, agent, change, integrity, rerun, outcome) with connectors, and repeated attempt blocks. |
| C20 | Agent panel | Repair | A container for content that came from or went to the coding agent (the brief, its final message), with a distinct label and border, so that it is never mistaken for an Optimus verdict. |
| C21 | Diff view | Repair | Static code diff with added and removed lines, line numbers, the file name header, and a "no other files changed" footer. Long diffs collapse with `<details>`. |
| C22 | Integrity seal | Repair | Four checks (allowed files only, pack hash unchanged, grader hashes unchanged, fresh profile), each with the hash or file list available in a disclosure. |
| C23 | Budget meter | Repair, Overview | Attempts out of 3, credits out of 1,500, and minutes out of 20, plus a void-attempt count. |

## Verdict meanings for the legend and badges

Repair decisions (C18) use their own neutral family, such as outlined badges, so they never compete with verdict colours.

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
7. **Repair-loop references:** a vertical timeline or stepper pattern, a code diff style that reads well without syntax highlighting, and an "agent output" container style (for example a terminal-like frame) that is clearly different from Optimus's own panels.
8. **Sample content for mocks:** use the real Gate 1 v5 data, for example "GP Beta g5-a-1" or "The Hobbit | Kindred | GP Book g5-b-1", and one long reason string. This tests wrapping.

## Design order and build order

Design in reading order. Build in dependency order.

1. **Design** the Level 1 overview first, including the repair cell state: matrix, tiles, legend, verdict badges and decision badges. **Build** it as a combiner over existing `result.json` files.
2. **Design** the Level 4 repair record next, because it is the closed-loop proof the hackathon judges look for. **Build** it once the repair controller writes `repair-history.json`.
3. Design and build Level 2: restyle the per-app report, and add the integrity checklist and run identifiers to `result.json`.
4. Design and build Level 3: copy the screenshots and recorded values into the report folder.
5. Add the contract section, then the calibration summary.
