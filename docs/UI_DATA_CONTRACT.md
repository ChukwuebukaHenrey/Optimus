# Report data contract (bundle version 2)

This is the agreement between the backend (Kane runs, evaluation and the repair loop) and the report UI, which are built by separate agents working at the same time. The UI renders **only** from a comparison bundle. It never reads Kane output, traces, packs or `.optimus/` directly.

- **Source of truth:** `src/report/schema.ts` (Zod). This document explains it. If they disagree, the schema wins; please report the mismatch.
- **Real sample:** `tests/fixtures/report-bundle/`, built from Gate 1 v5 and the live repair of app C. Use it for all UI work. It needs no Kane, no credits and no local raw evidence.
- **Design:** `docs/UI_STRUCTURE.md` (four levels; Level 4 only when a repair exists).

## Ownership

| UI agent | Backend agent |
|---|---|
| `src/report/render.ts` (replace the placeholder body), any new files under `src/report/` except `schema.ts` and `bundle.ts`, report CSS and assets, `docs/UI_STRUCTURE.md`, report tests | `src/report/schema.ts`, `src/report/bundle.ts`, `src/core/`, `src/kane/`, `src/loop/`, `src/cli.ts`, `packs/`, `corpus/`, `runs/`, `tests/fixtures/report-bundle/` |

`src/core/report.ts` (the older per-run page written by `optimus run`) also belongs to the UI agent. Keep its exported `writeReport` signature.

Working rules:

- The UI agent works on its own branch or git worktree (for example `ui/report`) and merges into `main` when a piece is ready. No force pushes and no rewriting history (AGENTS.md rule 11).
- Only the backend agent runs live Kane sessions, because they cost credits, use local ports and need the signed-in machine.
- Schema changes come from the backend with a `bundleVersion` bump and a refreshed fixture. If the UI needs a field that is missing, ask for it; do not derive it from other files.

## Entry point

```ts
// src/report/render.ts
export async function renderReport(bundle: ComparisonBundle, bundleDirectory: string): Promise<string>
```

The function receives a validated bundle. It writes `index.html` (plus any assets) into `bundleDirectory`, next to `bundle.json` and `evidence/`, and returns the path of `index.html`. It must be deterministic and must not touch the network.

Commands:

```sh
npm run optimus -- bundle --manifest runs/demo/library-demo.manifest.json --out <new-folder>   # backend: build bundle + render
npm run optimus -- report --bundle tests/fixtures/report-bundle                                  # UI: re-render an existing bundle
```

`report` overwrites `index.html` in the given folder. Render into a copy when working on the committed fixture, so the fixture's `index.html` changes only on purpose.

## Bundle layout

```
<bundle>/
  bundle.json         ComparisonBundle (validated)
  evidence/           end-of-step screenshots (JPEG) referenced by bundle.json
  index.html          written by renderReport
```

Delivery is an offline bundle, not one self-contained file. The page's Content Security Policy must allow `img-src 'self'` and nothing remote.

## Top-level fields

| Field | Meaning | UI level |
|---|---|---|
| `assessment.name`, `assessment.pack` | Assessment title; contract name, version, hash, support and persistence statements | Identity bar, contract section |
| `scope` | Calibrated scenario IDs every build was assessed on, in display order (`L1`, `L3`, `L4`) | Matrix columns |
| `contract[]` | Every pack scenario, with `sentToKane` (actions and record prompts, `{{nonce}}` left unexpanded) and `judgedByOptimus` (plain-language checks, designated new values, evidence rule). `inScope` marks the calibrated ones. | Contract section |
| `builds[]` | One row per build, with `baselineRunId`, `latestRunId`, `latestRuns` (scenario → run that supplied its latest verdict), `repairSessionId` and `repairState` (`no_repair`, `repaired` or `repair_stopped`) | Matrix rows, Level 2 |
| `runs[]` | Every assessed run, keyed by `runId`. Each has `scenarios[]` with the Optimus `result`, the Kane `executionId`, `integrity` and `steps[]` (action text, whether the action was recorded, recorded `values`, and the end-of-step `screenshot`). | Levels 1–3 |
| `repairs[]` | One record per repair session: caps, budget, `decisions[]` (each with a `basis`: which run supplied each scenario's verdict), `attempts[]` (brief, agent, revisions, diff, integrity, `verificationRunId`) and `outcome` | Level 4 |
| `calibration` | Gate 1 expected-versus-actual rows and notes, or `null` | Calibration summary |

Scenario display names are not in the pack. The UI may map `L1` to "Add", `L3` to "Remove" and `L4` to "Persist" for the Library demo, but must fall back to the scenario ID and `contract[].title` for any other pack.

## How to read a build

- **Baseline verdict** for a scenario: `runs[baselineRunId].scenarios[scenarioId].result.verdict`.
- **Latest verdict:** `runs[build.latestRuns[scenarioId]].scenarios[scenarioId].result.verdict`. After an infrastructure retry, scenarios can come from different runs; all of them assessed the same source revision. Show which run each latest verdict came from. If `latestRuns[scenarioId]` equals `baselineRunId`, that scenario has no newer verdict.
- **Decision basis:** `repairs[].decisions[].basis` lists the run behind every verdict the controller acted on. Level 4 can show it as "verified by run-1 (L1, L3) and run-2 (L4)".
- **Repair record:** `repairs.find(r => r.sessionId === build.repairSessionId)`. Render Level 4 only when this exists and has attempts.
- **Score:** a percentage only when every in-scope verdict of the run is PASS or FAIL; otherwise "Provisional". Compute it from the run; it is not stored.

## Rules the UI must keep

1. **Verdicts come only from `result.verdict`.** Repair `decision` values (`COMPLETE`, `REPAIR`, `NEEDS_EVIDENCE`, `RETRY_INFRASTRUCTURE`, `STOP`) are not verdicts and need their own visual family.
2. **INCONCLUSIVE, NOT_RUN and INFRA_ERROR mean "no judgement"** and must never look like a failure.
3. **Never strike through or hide a baseline verdict.** Show baseline and latest as two labelled states.
4. **Treat every string as untrusted:** recorded values, reasons, agent messages, briefs, diffs and labels. Escape them all. `escapeHtml` in `render.ts` is available.
5. **Render repair claims only from `repairs[]`.** Never assemble a repair story by hand or infer links from timestamps or file names.
6. **Content that came from or went to the coding agent** (`briefMarkdown`, `agent.finalMessage`, `diff`) goes in clearly labelled agent panels.
7. **Local paths are masked as `<optimus>`, `<tmp>` and `<home>`.** Show them as given.

## Changes

- **Version 2:** added `builds[].latestRuns` and `repairs[].decisions[].basis`. An infrastructure retry now reruns only the scenarios without a verdict, on the same source revision, so one build's latest verdicts can come from several runs. Read latest verdicts through `latestRuns`; `latestRunId` is only the build's most recent run.

## Known values in the fixture

- Builds: `a-vanilla` and `b-react` pass everything. `c-remove-wrong` has L3 baseline FAIL, then verified PASS after one repair attempt. `d-no-persist` has L4 baseline FAIL, then verified PASS after one repair attempt.
- `u-unseen` is the blind build: its defect was sealed until grading finished. L4 baseline FAIL, then verified PASS. Its verification is split across two runs of the same repaired revision (L1 from `run-1`; L3 and L4 from the infrastructure retry `run-2`), so it exercises `latestRuns` and `decisions[].basis`.
- Repairs: session `repair-20261123014521-c61591` (U: one `saveBooks()` call added, 365.08 credits), session `repair-20261122205046-1b7e12` (C: `app.js`, 310.78 credits) and session `repair-20261123000518-fe7a64` (D: `app.js` gains saving to browser storage, 306.45 credits). Every integrity check passed.
- The attempt's `briefScreenshot` in this session shows the page mid-step (a backend issue, fixed after this session). Later sessions attach the end-of-step screenshot.
