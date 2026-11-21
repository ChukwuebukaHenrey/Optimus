# Optimus engineering handoff

**Current state.** The evaluator, live runner, reports, and five corpus fixtures are built. Gate 1 stopped after six live cases. Five agreed with the screenshots. In the sixth, Kane stored authors as book titles after a correct removal on the React app. That disagreement blocks Gate 1 acceptance. Start by reproducing it from the saved evidence. No live process is running, and the saved queue is paused.

## Repository and baseline

- Windows checkout `C:\Users\ADMIN\Optimus`, with PowerShell available. The private GitHub remote is `ChukwuebukaHenrey/Optimus`. The verified implementation and Gate 1 checkpoint are on `origin/main` at `7f353f3`. This handoff was written after that checkpoint. Check `git status --short --branch` before editing. [GitHub repository](https://github.com/ChukwuebukaHenrey/Optimus)
- [AGENTS.md](AGENTS.md) is the authoritative spec. [SESSION_PROMPTS.md](SESSION_PROMPTS.md) defines the phases, independent fixture sessions, and Gate 1 acceptance criteria. [README.md](README.md) documents the CLI. [Phase 1 report](runs/phase1/REPORT.md) and [Gate 1 report](runs/gate1/REPORT.md) contain the measured results and evidence details.
- Use Node 22 for development. The CLI was also verified on Node 18.20.8 with a synthetic Kane launcher. The last full verification passed TypeScript and **113 tests**. Run the following from the repository root for a fresh checkout.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
```

## Work completed

| Area | Status |
| --- | --- |
| Core and audit | Validated and hashed YAML packs, immutable pack data, neutral test Markdown and linting, deterministic verdicts and scoring, and checks for malformed or conflicting evidence. The calculator is an offline fixture for testing pack reuse. |
| Corpus | `corpus/a-vanilla` and `corpus/b-react` are independently built, browser-verified reference apps. `corpus/c-remove-wrong` intentionally deletes the first row regardless of the selected book. `corpus/d-no-persist` loses new books on reload. The blind fixture is copied to `corpus/u-unseen` and is awaiting grading. |
| Phase 1 | Live L1 add and L4 reload passed on A with zero replays and screenshot agreement. L4's successful `refresh` was in the archived inner action log, corroborated by an archived document request. Phase 1 used `100.0956` credits. |
| Runner and reporting | `optimus run` drives Kane sequentially on a loopback URL, checks authentication and the Chrome profile, saves raw artifacts, retries an explicit upload failure once, and writes `result.json` and escaped static `report.html`. It passed fake-launcher integration checks. The live Gate 1 matrix used a separate local launcher to measure credits and elapsed time per case. |
| Gate 1 work in progress | A trial 1 passed L1, L3, and L4. B trial 1 passed L1 and L4 with screenshot agreement. B L3 was invalidated by the recorder mismatch below. All six had zero replays. The six cases used `305.9857` credits over `1520` seconds. The last recorded balance was `10793.9187`. |

The runner, reporting, and blind-fixture agents finished and their work is already on `main`. The only isolated workspace to preserve is the one holding the sealed blind-fixture description.

## Current blocker and first offline check

The L3 reference calibration on A originally returned INCONCLUSIVE because `run_end.final_state` used `book_titles` and `book_count`. The sealed action log for the same inner run contained successful Analyze outputs under the exact requested names. The parser was updated to recover those explicitly named values, tied to the inner run ID. Reprocessing the original archive passed and agreed with the screenshots. No additional Kane run or pack edit was needed. A copy of that trace with the removal action set to unknown returned INCONCLUSIVE.

The React failure is different. The screenshot before removal shows `The Hobbit`, `Kindred`, `GP Beta g1-b-1`, and `GP Alpha g1-b-1`. The screenshot after removal shows the first three books, and the count drops from 4 to 3. Kane's successful Analyze action and `run_end.final_state` both stored `J. R. R. Tolkien|Octavia E. Butler|Ada Okafor` as `titles_after`. These are the displayed author values. The machine returned FAIL for the missing Beta title. The independent screenshot check invalidated that verdict as a judgment of the app.

On the Windows checkout, the evidence for this case is under `runs/gate1/raw/g1-b-1/L3/`. The file names below all start with `g1-b-1-`.

| File or entry | Use |
| --- | --- |
| `input.md` | Original neutral Markdown before Kane rewrote its working copy. |
| `stdout.ndjson` and `stderr.log` | Original Kane streams. Inspect the outer removal step and its `run_end`. |
| `metrics.json` | Original exit, elapsed time, balances, URL, hash, and absolute `evidence[0]` path. Open that ZIP locally for the sealed data. |
| `normalized.json` and `assessment.json` | Saved normalized input and machine result. The `expected` field in the matrix assessment is the expected **verdict** for that case. |
| `tests/<test-id>/logs/3-actions.ndjson` inside the archive | The removal step's successful `analyze` entry has the wrong `output_value` for `titles_after`. |

These PowerShell commands reproduce the machine result and display the two actual screenshots without spending credits. The `evaluate` command's expected exit is `10`. The screenshot helper prints an encoded JPEG, so the second command writes it to a temporary file for viewing.

```powershell
npm.cmd run optimus -- evaluate runs/gate1/raw/g1-b-1/L3/g1-b-1-normalized.json --pack packs/library

$image = python (Join-Path $env:TEMP 'optimus-gate1-screenshots.py') g1-b-1 L3
if ($LASTEXITCODE -ne 0) { throw 'Could not read the screenshot pair.' }
$preview = Join-Path $env:TEMP 'optimus-react-l3-repro.jpg'
[IO.File]::WriteAllBytes($preview, [Convert]::FromBase64String(($image -join '').Trim()))
```

If the helper is unavailable, use `metrics.json` to open the archive and find the last screenshot of outer steps 3 and 4. The corresponding `step_end` in stdout gives `ordinal`, `id`, and the screenshot basename. The entry is under `tests/<test-id>/steps/<ordinal>-<id>/`. Compare the screenshot against both the named Analyze output and `final_state`. If `tsx` fails before CLI startup with `uv_os_get_passwd` or a Windows home-directory permission error, retry the same offline command under the normal Windows user through the approval mechanism.

## Where to continue

1. **Investigate capture quality offline first.** Use the saved React reproduction to assess whether a generic, deterministic evidence check can detect the wrong field. A legitimate adapter fix must be grounded in actual archived evidence and tested against the known-good A case and the React case. Preserve missing or contradictory evidence as unresolved. A successful action and a correct numeric count alone do not validate the recorded title field. Keep the React reproduction as the documented fallback while the capture issue is unresolved.
2. **Preserve the comparison.** `packs/library/pack.yaml` is Library v2. Its verified SHA-256 is `259613c83f6ff13aa3b3bb832092c214cc4fefbdfbc3cabaaa636882e63a1c80`. The same hash governed Phase 1 and all six Gate 1 cases. Keep the contract and verdict rules fixed for this comparison. Kane sees only the neutral action and recording instructions. Optimus judges deterministically. A changed capture contract needs a newly approved and calibrated comparison, with its own hash across all cases. A later successful run cannot retroactively validate the earlier mismatched recording.
3. **Restart paid testing only when it serves the requested scope.** The original Gate 1 has 18 cases remaining. These are A and B trial 2, and both trials for C and D. Gate 1 requires L1, L3, and L4 on each app twice, zero replays, screenshot agreement, per-case time and credits, and no definitive verdict for an unestablished action. A and B should pass all three. C should fail only L3, and D only L4. If the user requests further exploratory runs with the current capture setup, preserve the known invalidation in the report.
4. **Keep later phases gated.** L2 read toggle is implemented and tested offline. Its live calibration is Gate 2. The blind fixture awaits independent grading. Keep its defect description sealed outside the repo, under the isolated `%TEMP%\optimus-blind-session-*` workspace, until after grading. The Phase 4 repair loop remains unbuilt and starts after grading is proven. Follow the spec's separated repair workspace, path guard, grader hash check, narrow failure brief, full-pack rerun, and caps of three attempts, 1,500 credits, and 20 minutes.

## Local live-run state and Cloud access

- Kane CLI `0.10.6` was authenticated through OAuth on this Windows PC under profile `default`. It selected TestMu project `KaneAI Generated` and folder `Untitled`. Before any authorized paid run, check `kane-cli.cmd whoami`, `kane-cli.cmd config show`, and `kane-cli.cmd balance`. Both `chrome_profile` and `chrome_profile_path` must stay unset so each run has a fresh browser. The established flags are `--author --agent --headless`. Each live authoring run uploads to TestMu and uses credits.
- The old matrix serves A, B, C, and D on loopback ports 43184 through 43187 respectively. It uses the production build at `corpus/b-react/dist` for B. If that build is missing, run `npm.cmd ci` and `npm.cmd run build` in `corpus/b-react`. The tracked CLI can run a specific scenario on any fixture you serve on a loopback URL. See the README for the command and exit codes.
- On this PC, `%TEMP%\optimus-live-gate1.mjs` launches one case and preserves metrics. `%TEMP%\optimus-gate1-matrix.mjs` orchestrates the matrix and skips cases with completed metrics. It refuses to duplicate a case that has a saved input and lacks completion metadata. `%TEMP%\optimus-gate1-screenshots.py` shows a case's screenshot pair, and `%TEMP%\optimus-gate1-report.py` consolidates the report. These helpers existed when this handoff was written. The queue stop marker is `runs/gate1/raw/pause`. Its progress and independent labels are in `matrix-progress.json` and `screenshot-labels.json` beside it. Leave the marker in place while investigating offline.
- Keep local-only evidence and credentials out of Git. The ignored stores include `runs/**/raw/`, `.testmuai/`, `.optimus/`, and `*.evidence`. Source, tests, and sanitized reports are available via the private remote for Codex Cloud. Cloud can run development and synthetic checks. The saved Windows OAuth session, raw archives, and temporary helpers stay on this PC.

If the user explicitly resumes the existing paid queue, preserve its raw directory, verify the pack hash and existing six completed cases, then remove only the pause marker. Run the saved orchestrator from the repo root with the resolved Kane entry and the launcher as arguments. If the temporary helpers are gone, use the tracked `optimus run` command one remaining case at a time, with the corresponding `g1-a-2`, `g1-b-2`, `g1-c-1`, `g1-c-2`, `g1-d-1`, or `g1-d-2` nonce and explicit scenario. Record balance before and after each case and keep new reports separate from the six saved cases.

```powershell
# Paid continuation only. The pause marker blocks the queue until explicitly removed.
$entry = Join-Path (Split-Path -Parent (Get-Command kane-cli.cmd).Source) 'node_modules/@testmuai/kane-cli/bin/kane-cli.cjs'
$matrix = Join-Path $env:TEMP 'optimus-gate1-matrix.mjs'
$launcher = Join-Path $env:TEMP 'optimus-live-gate1.mjs'
node --import tsx $matrix $entry $launcher matrix
```

## Implementation map

- `src/core/pack.ts`, `generate.ts`, and `lint.ts` enforce the reusable contract and neutral Kane projection.
- `src/core/evaluate.ts` and `expect.ts` apply integrity, action, change, and assertion checks in that order. Keep app-specific knowledge in packs. Add a regression for any evidence bug instead of tuning the evaluator to a corpus app.
- `src/kane/evidence.ts` and `parse.ts` own archive and stream formats. Ordinary actions join on archived step ordinal and ID, action ID, and kind. Archived reloads and named recordings are bound to the matching inner run. Missing or conflicting recordings stay unresolved.
- `src/kane/run.ts`, `src/core/report.ts`, and `src/cli.ts` provide sequential execution, isolated artifacts, and reports. `tests/fixtures/kane-phase1-l1.ndjson` and `kane-phase1-l4.ndjson` are sanitized real-format regression fixtures. Runner tests use a fake provider and consume no TestMu credits.
