# Optimus engineering handoff

**Current state (23 Nov 2026).** The grading engine is calibrated, and the closed loop works live. Library contract v5 passed Gate 1 (24 of 24 cases matched the expected verdicts). `optimus repair` has repaired three defective apps with Claude Code, each verified by a fresh Kane run against the unchanged contract and grader. One of them was a blind app whose defect stayed sealed until grading finished. The report UI is being built in parallel by a separate agent against a frozen data contract.

## Repository and baseline

- Windows checkout at `C:\Users\ADMIN\Optimus`. Private remote: `ChukwuebukaHenrey/Optimus`, branch `main`. The checkout's `.git` is owned by another Windows user, so run git as `git -c safe.directory=C:/Users/ADMIN/Optimus ...`.
- [AGENTS.md](AGENTS.md) is the authoritative spec, and the owner edits it. Rule 1 separates judging (deterministic, no LLM) from repairing (an external agent may change only the app under repair). Phase 4 describes the agent-independent repair controller.
- Node 22. Run `npm ci`, `npm run typecheck` and `npm test` (184 tests, no Kane needed).

## What is built

| Area | Where | Status |
|---|---|---|
| Contract | `packs/library/pack.yaml` (v5, SHA-256 `b5295a39…fc74`) | L1 add, L3 remove and L4 persist are calibrated (Gate 1). L2 read status is calibrated on the reference apps (Gate 2), without a negative control. |
| Evaluator | `src/core/` | Integrity → action evidence → change plausibility and continuity → assertions. A list may only gain the values a step declares in `new_values`. |
| Kane adapter | `src/kane/` | Parses the stream and sealed archive. It checks that each step stayed on the app's origin, reads JSON-array lists as the same list, withholds conflicting values, and finds end-of-step screenshots. |
| Runner | `src/kane/run.ts` | Runs one scenario at a time in a fresh folder, retries an upload failure once after 90 s, and reads the balance with back-off. |
| Repair loop | `src/loop/`, `optimus repair` | Decision gate, plain-language brief, disposable git workspace, Claude Code headless (file tools only), integrity hashes, full-scope rerun. An infrastructure retry reruns only unjudged scenarios on the same revision. Caps and `repair-history.json` keep the audit chain. |
| Report contract | `src/report/schema.ts` (bundle v2), `optimus bundle`, `optimus report` | `docs/UI_DATA_CONTRACT.md` defines it. The fixture `tests/fixtures/report-bundle/` is real data: 5 builds, 9 runs, 3 repairs. |
| UI | `src/report/render.ts` (placeholder) | Owned by the UI agent. Design in `docs/UI_STRUCTURE.md`. |

## Evidence

| Record | Result |
|---|---|
| [Gate 1 v5](runs/gate1-v5/REPORT.md) | 24/24 match. A and B pass everything; C fails only L3; D fails only L4; zero replays. |
| [Repair C](runs/repair-c/REPORT.md) | Wrong book removed. One `app.js` fix, then L1, L3 and L4 PASS. |
| [Repair D](runs/repair-d/REPORT.md) | Lost on reload. The agent added saving to browser storage, then everything PASS. Three earlier sessions stopped safely; each led to a fix. |
| [Repair U (blind)](runs/repair-u/REPORT.md) | Blind grade: L4 FAIL. The unsealed defect matches. One `saveBooks()` line, then everything PASS. |
| Earlier contracts | `runs/gate1/` (v2) and `runs/gate1-v4/` are archived and do not count toward v5. |

The screenshot labels are Claude's and are **pending the owner's independent review**. A local review page is built by the scratchpad script `build-review.mts` into `.optimus/review/index.html`; it is ignored by git and can be rebuilt from raw evidence.

## Running live (credits)

- Kane CLI 0.10.6, OAuth profile `default`. Keep `chrome_profile` and `chrome_profile_path` unset. Do not upgrade Kane mid-comparison.
- The Kane entry point is not on PATH. Set `OPTIMUS_KANE_CLI` to `C:/Users/ADMIN/AppData/Local/Author Software/nvm/installs/v22.23.5/node_modules/@testmuai/kane-cli/bin/kane-cli.cjs`.
- Keep the laptop **on mains power with the lid open**. A lid or battery sleep kills the headless browser.
- Typical costs: one scenario is about 40–75 credits and 3–7 minutes; a repair session is about 300–370 credits and 30–45 minutes. The balance on 23 Nov was 6,906.44.
- Kane flakiness seen in practice: TestMu upload rejections; "TMS did not return an org_id" on an immediate relaunch (now handled by a 90 s pause); wrong-site navigation to Kane's tutorial page (now INCONCLUSIVE through the origin check); planner stalls ("AP produced no action"); balance lookups failing (now with back-off). The loop stops rather than guess.

```sh
export OPTIMUS_KANE_CLI=".../kane-cli.cjs"
npm run optimus -- repair --pack packs/library --app corpus/c-remove-wrong --scenarios L1,L3,L4
npm run optimus -- bundle --manifest runs/demo/library-demo.manifest.json --out <new-folder>
```

Raw streams, archives and repair sessions stay in the ignored `.optimus/` and `runs/**/raw/` folders. Committed records under `runs/repair-*` have local paths masked.

## Open items

1. The owner reviews the screenshot labels on the review page.
2. AGENTS.md has two small typos from the last edit: "Test Managerupload" and "scenario.After". The owner owns the file.
3. Gate 2 is done: L2 (read status) passed 4 of 4 on A and B ([report](runs/gate2-v5/REPORT.md)). It still lacks a negative control, which needs an L2-defective corpus app from a separate session. L2 can join the repair scope once that exists.
4. Merge the UI agent's renderer when ready. It must render only from the bundle (see the contract doc).
5. Demo walkthrough: [docs/DEMO.md](docs/DEMO.md).
