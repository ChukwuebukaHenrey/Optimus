# Optimus handoff brief (23 Nov 2026)

### 1. Goal & Current Status

**Goal:** Optimus is a submission for the Kane CLI Online Hackathon (deadline **26 Nov 2026, 11:59 PM IST**; pushes are refused after it). One behavioural contract (a "pack") is applied unchanged to many independently built web apps. Kane CLI acts in a real browser and records what it sees; Optimus's deterministic code decides each verdict. A closed loop sends verified failures to a coding agent (Claude Code), checks the change, and has Kane re-verify it. The pitch: "One contract. Many different builds. Evidence-backed verdicts."

**Status: the backend and integrations are complete and proven live.**

- Library contract **v5** (`packs/library/pack.yaml`, SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74`).
- **Gate 1** (L1 add, L3 remove, L4 persist): 24 of 24 cases matched the expected verdicts.
- **Gate 2** (L2 read status): 4 of 4 on the reference apps; it has no negative control yet.
- **Closed loop:** three live repairs completed: C (wrong book removed), D (lost on reload), and U (a blind app whose defect stayed sealed until grading). Each was verified by a fresh Kane run against the unchanged contract and grader.
- **Repo:** public at https://github.com/ChukwuebukaHenrey/Optimus (MIT licence). `main` was at `769f54e` before this brief, in sync with origin.
- **Checks:** typecheck passes; `npm test` passes 184 tests in 9 files.
- **Credits:** 6,703.23 left (23 Nov).
- **UI:** a separate agent is building the website and report UI on branch `ui/website` in the worktree `C:/Users/ADMIN/Optimus-ui`. It is **not merged yet**.

### 2. What's Done

| Area | Result | Record |
|---|---|---|
| Evaluator (`src/core/`) | Order: integrity → action evidence → change plausibility and **list continuity** → assertions. A list may gain only values declared by `new_values` in the steps since the earlier recording. | `src/core/evaluate.ts` (`inconsistentRecording`, `hasObservableChange`) |
| Kane adapter (`src/kane/`) | Origin check (a step on another site has its target contradicted, so INCONCLUSIVE). JSON-array and empty-list (`[]` vs `none`) recordings count as the same list. Conflicting values are withheld. End-of-step screenshots come from `lastStepScreenshots`. | `parse.ts` (`originAgreement`, `sameRecording`), `evidence.ts` (`loggedRecording`, `extractArchiveEntry`), `screens.ts` |
| Runner | Scenario subsets (`scenarioIds`), per-scenario `executions`, and `readKaneBalance` with back-off. An upload failure gets one retry after `retryDelayMs` (90 s). | `src/kane/run.ts` (`runKaneAssessment`) |
| Repair controller | `optimus repair`. Decision gate (`decide`); plain-language brief (`buildBrief`, `describeCheck`); disposable git workspace outside Optimus; Claude Code headless with file tools only (`claudeCodeCommand`); grader and pack hashes checked (`graderFingerprint`); full-scope rerun. An infrastructure retry reruns **only unjudged scenarios, once per source revision, after 90 s**. Each decision records its `basis` (which run supplied each verdict). Caps: 3 attempts, 1,500 credits, 20 minutes. Output: `repair-history.json`. | `src/loop/{decision,brief,workspace,serve,integrity,agent,repair}.ts` |
| Report data contract | **Bundle v2**: `builds[].latestRuns` and `repairs[].decisions[].basis`. `optimus bundle --manifest` and `optimus report --bundle`. | `src/report/schema.ts`, `src/report/bundle.ts`, `docs/UI_DATA_CONTRACT.md` |
| Real-data fixture | 5 builds (A, B, C, D, U), 9 runs, 3 repairs, end-of-step screenshots, local paths masked. | `tests/fixtures/report-bundle/`, built from `runs/demo/library-demo.manifest.json` |
| Gates | Gate 1 v5: 24/24. Gate 2: 4/4. The v2 and v4 runs are archived and don't count. | `runs/gate1-v5/REPORT.md`, `runs/gate2-v5/REPORT.md`, `expected.json` in each folder |
| Live repairs | C: one `app.js` fix (310.78 credits). D: added `saveBooks()` persistence (306.45; three earlier sessions stopped safely). U (blind): one `saveBooks()` line; the unsealed defect matches (365.08). | `runs/repair-{c,d,u}/REPORT.md` and the sanitized `repair-history.json`, brief and diff in each |
| Docs | Spec amendments for an agent-independent loop and per-revision retries (made by the owner). Demo walkthrough. UI structure. | `AGENTS.md`, `docs/DEMO.md`, `docs/UI_STRUCTURE.md` |
| Screenshot review | All labels were reviewed by Claude. The owner **delegated** the review on 23 Nov; the reports say it is not an independent human check. Local review page: `.optimus/review/index.html` (30 cards, 60 images; it doesn't include Gate 2). | Reports and `runs/gate1-v5/raw/screenshot-labels.json` |

### 3. In Progress / Uncommitted

- **No uncommitted tracked changes.** Nothing is half-written, and no Kane job is running.
- **UI branch `ui/website` (not merged):** a Next.js static site in `website/`, the renderer `src/report/render.ts` (Levels 1–4, reads `latestRuns`, keeps the offline CSP plus `font-src data:`), `src/report/styles.ts`, fonts, `tests/render.test.ts`. A trial merge with `main` showed no conflicts (checked against `ba07b72`). Its only change to a backend-owned file is a one-word test rename in `tests/bundle.test.ts`.
- **Untracked files in the main checkout that are not Optimus's** (from the owner or the UI agent): design PDFs (`docs/cofounder-co-*.pdf`, `docs/www-navbar-gallery-*.pdf`), images with random names (`FOXNsi0….jpg`, `fgUkJtOm….jpg`), `Pixel-Art Sci-Fi Robot Adventurers.png`, `docs/Optimus_CoreOS_Components.zip`, `docs/180++FREE+logos+library+–+Untitled+UI.zip`, `DESIGN.md`, `assets/`, `docs/design/`, `docs/demo-*.png`, `docs/asset-preview.png`, the `docs/*` prompt files, and `Optimus_Kane_Closed_Loop_Audit.md`. **Do not commit them**: the repo is public, and some are third-party reference material.

### 4. Next Steps (in order)

1. **Merge the UI.** The UI agent merges `main` into `ui/website` in `C:/Users/ADMIN/Optimus-ui`, then runs `npm run typecheck` and `npm test` **from the repo root**, so that `website/` doesn't break the root TypeScript or Vitest setup. Then, in the **main checkout** (git won't update a branch checked out in another worktree): `git -c safe.directory=C:/Users/ADMIN/Optimus merge --ff-only ui/website`, run the tests, and `git push origin main`. After the merge, regenerate the fixture's `index.html` with the real renderer: `rm -rf tests/fixtures/report-bundle && npm run optimus -- bundle --manifest runs/demo/library-demo.manifest.json --out tests/fixtures/report-bundle`. Check that `tests/bundle.test.ts` passes, then commit.
2. **Hosting:** Vercel is recommended for a static Next.js export, with preview links per push. It needs the owner's sign-in and decision. Then set the social-preview URL in the site (the UI agent's request).
3. **Art provenance** (for the UI agent's `ASSET_PROVENANCE.md`): "Generated with OpenAI's GPT image generation on 22 Nov 2026; to be edited by the owner later; this entry will be updated after the edits." The UI agent should also update the "pending independent review" wording in `docs/design/HERO_PROPOSAL.md` to the delegated-review wording.
4. **Before the deadline:** submission text (what was built, who it's for, which agent, what Kane does), a demo video of a real fail-then-pass (see `docs/DEMO.md`), and a final push. Freeze the repo after the deadline.
5. **Optional:** an L2-defective corpus app built in a **separate session** (AGENTS.md rule: corpus apps are built outside Optimus sessions). That adds a Gate 2 negative control, and L2 could then join the repair scope.

### 5. Key Files

```
AGENTS.md                      authoritative spec (owner edits it; agent edits to it may be blocked)
packs/library/pack.yaml        contract v5 (never edit to make a result pass; any change = new version + recalibration)
src/core/                      types, pack, expect, evaluate, generate, lint, report (old per-run page)
src/kane/                      parse.ts, evidence.ts, screens.ts, run.ts
src/loop/                      decision.ts, brief.ts, workspace.ts, serve.ts, integrity.ts, agent.ts, repair.ts
src/report/                    schema.ts + bundle.ts (backend), render.ts + styles.ts (UI agent)
src/cli.ts                     gen-tests | lint | evaluate | run | repair | bundle | report
corpus/                        a-vanilla, b-react (dist/ build), c-remove-wrong, d-no-persist, u-unseen
runs/gate1-v5, runs/gate2-v5   calibration reports and expected.json (raw/ is ignored and local only)
runs/repair-{c,d,u}            committed, sanitized repair records
runs/demo/library-demo.manifest.json   bundle manifest (references local raw data)
tests/fixtures/report-bundle/  committed real-data bundle (v2)
docs/UI_DATA_CONTRACT.md, docs/UI_STRUCTURE.md, docs/DEMO.md
.optimus/repair/<session>/     raw repair sessions (ignored): C 1b7e12, D fe7a64 (+ stopped c26c1d, 6f4dd9, 85d737), U c61591 (+ stopped c1f0ad, 9ac091)
.optimus/tools/                local helper scripts (ignored), listed in section 6
```

### 6. Commands

```sh
# Setup and checks (no Kane needed)
npm ci && npm run typecheck && npm test          # expect 184 passing

# Git: the checkout's .git is owned by another Windows user
git -c safe.directory=C:/Users/ADMIN/Optimus status

# Live runs (cost credits)
export OPTIMUS_KANE_CLI="C:/Users/ADMIN/AppData/Local/Author Software/nvm/installs/v22.23.5/node_modules/@testmuai/kane-cli/bin/kane-cli.cjs"
npm run optimus -- repair --pack packs/library --app corpus/c-remove-wrong --scenarios L1,L3,L4
bash .optimus/tools/repair-run.sh corpus/d-no-persist label   # same, with keep-awake and output to .optimus/tools/repair-label.out.json

# Report bundle
npm run optimus -- bundle --manifest runs/demo/library-demo.manifest.json --out <new-folder>
npm run optimus -- report --bundle <folder-with-bundle.json>

# Kane health
node "$OPTIMUS_KANE_CLI" whoami ; node "$OPTIMUS_KANE_CLI" balance ; node "$OPTIMUS_KANE_CLI" config show
```

Helpers in `.optimus/tools/` (local, run from the repo root with `node --import tsx` or `python`):

- `build-review.mts`: rebuilds the screenshot review page.
- `sanitize_session.py <session-dir> <out-dir>`: copies a repair session into `runs/` with paths masked.
- `repair-final-shots.mts <history> <runId> <scenario> <outDir>`: extracts end-of-step screenshots.
- `reparse-sessions.mts <history...>`: re-evaluates sessions from raw evidence after an adapter change.
- `gate1v5-matrix.mjs` with `gate1v5-launch.mjs`: the Gate 1 v5 orchestrator. `status` mode re-evaluates offline; remove `runs/gate1-v5/raw/pause` first and restore it afterwards.
- `gate2.mts` and `gate2-shots.mts`: run and check Gate 2.
- `keep-awake.ps1`: holds a keep-awake request while a given PID runs.

### 7. Environment & Gotchas

- Windows 11, Node 22.23.5, Git Bash and PowerShell. Kane CLI **0.10.6** (an update to 0.10.7 is offered; **don't upgrade** mid-comparison). OAuth profile `default`; `chrome_profile` and `chrome_profile_path` must stay unset. Claude Code 2.1.330 is at `~/.local/bin/claude.exe`. `gh` is signed in as ChukwuebukaHenrey.
- **Keep the laptop on mains power with the lid open.** A lid or battery sleep killed runs (`TargetClosedError`). Keep-awake cannot block a lid close.
- **Kane flakiness seen, and how it's handled:**
  - TestMu upload rejected → one retry after 90 s.
  - "TMS did not return an org_id" on an immediate relaunch → the 90 s pause.
  - Wrong-site navigation to Kane's tutorial page → INCONCLUSIVE through the origin check.
  - Planner stall ("AP produced no action for 3 consecutive steps") → infrastructure error, then a scenario-level retry.
  - Balance lookup failures → back-off; the loop stops if the balance can't be read, because the credit cap can't be enforced.
  - Network outages → the loop stops.
- Costs: about 40–75 credits and 3–7 minutes per scenario; about 300–370 credits and 30–45 minutes per repair session.
- The screenshot linked to a step's **action** can predate the action's effect. Always use the **end-of-step** screenshot (`lastStepScreenshots`).
- Kane rewrites its working copy of a test file and caches authored steps beside it. A retry in the same folder **replays** cached steps (rejected as `replay_detected`), so every attempt must use a fresh folder (the runner does this).
- Inline Python in Bash heredocs mangled backslashes and quotes several times. Write scripts to files instead.
- An interrupted tool call can still have launched its command. Check `tasklist` and the output folders before re-running.

### 8. Open Decisions (owner)

- Hosting: Vercel (recommended) or Cloudflare Pages; then the site URL.
- When to merge the UI branch (after the UI agent's root checks).
- Whether to build an L2-defective app for a Gate 2 negative control.
- Art edits, and the final provenance text.

### 9. Rules a fresh session must keep

- Kane never judges; verdicts come only from `src/core/evaluate.ts`. No LLM may decide or reinterpret a verdict. The repair agent changes only the app copy, never the pack, the grader or `src/core`/`src/kane`.
- Never edit a pack, the evaluator or the adapter to make one result pass. Adapter fixes must come from real archived evidence and be re-checked against **all** saved cases (use `reparse-sessions.mts` and the Gate 1 `status` mode).
- Commit small and honestly. Never force-push, rebase away or backdate. Never commit secrets, `.env*`, raw evidence or the untracked third-party files listed in section 3.
- Paid Kane runs and outward-facing actions (publishing, hosting, visibility changes) need the owner's go-ahead. The owner has approved live runs for this project's plan so far.
