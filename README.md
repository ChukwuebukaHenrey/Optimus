# Optimus

Optimus evaluates web applications against a shared behavioral contract and produces evidence-backed verdicts. Kane acts in the browser and records observations. Optimus applies the contract deterministically.

**Status (23 Nov 2026):** Library contract v5 is calibrated (Gate 1: 24 of 24 cases matched). The closed loop has repaired three defective apps live, including a blind one: see [runs/repair-c](runs/repair-c/REPORT.md), [runs/repair-d](runs/repair-d/REPORT.md) and [runs/repair-u](runs/repair-u/REPORT.md). The demo walkthrough is in [docs/DEMO.md](docs/DEMO.md), and the engineering handoff in [HANDOFF.md](HANDOFF.md).

## Development setup

Use Node.js 22 for development. Run `npm ci`, then `npm run typecheck` and `npm test`. The offline CLI also runs on Node.js 18 with `npm ci --omit=dev`. The core development phase runs without Kane or TestMu AI credits.

## Offline workflow

```sh
npm run optimus -- gen-tests --pack packs/library --nonce demo --scenario L1
npm run optimus -- lint .optimus/generated/library/demo/L1_test.md --pack packs/library --nonce demo
npm run optimus -- evaluate trace.json --pack packs/library
```

`gen-tests` generates all four Library scenarios when `--scenario` is omitted. Gate 1 uses L1, L3, and L4. L2 is reserved for Gate 2. `lint` checks the instructions and compares them to the generated Markdown for the same pack and nonce.

`evaluate` takes a normalized `ScenarioTrace` JSON object or an array of scenario traces for one app URL and nonce. The trace schema is in `src/core/types.ts`. Step indexes and `stepsSkipped` entries are zero-based. Evidence paths are resolved relative to the trace file. Each trace references its own `.evidence` archive with a run manifest, test definition, and result. The offline command expects trusted trace JSON and checks the archive structure. An array gets a score from 0 to 1 when every scenario in the loaded pack has a PASS or FAIL verdict. A single object returns its scenario verdict. CLI exits are 0 for PASS, 10 for FAIL, 20 for unresolved results, and 30 for infrastructure or input failures. Code 40 is reserved for budget escalation in the live runner.

Actions default to open for the first step and interact for later steps. Packs can declare `action: reload` or `action: none` explicitly. For a step with `expects_change`, the evaluator pairs recordings with earlier values using a delta's `from` key, matching `_before` and `_after` keys, or matching recording prompts. List order alone does not establish a change for a list membership assertion. A list recording may only gain entries that were in its earlier pair or that a step since then declares in `new_values`. Each declared value must appear in double quotes in that step's `do` text, and it is never sent to Kane. Any other new entry makes the scenario INCONCLUSIVE with `recording_inconsistent`, because the recording no longer describes the same field. Other quoted text, such as an author or a removal target, does not authorize a new entry. Removed entries are not checked. A delta with `kind: count` requires nonnegative whole numbers. Assertions with `prerequisite: true` establish starting state. If a prerequisite fails, the result is INCONCLUSIVE.

The Kane adapter joins author events to archived steps and links refreshes to the corresponding inner run. When archive details are supplied, it returns verified archive entry paths and uses the run manifest ID. See the [Phase 1 report](runs/phase1/REPORT.md) for the live calibration scope.

## Library contract versions

| Version | SHA-256 | Used for |
|---|---|---|
| v2 | `259613c83f6ff13aa3b3bb832092c214cc4fefbdfbc3cabaaa636882e63a1c80` | Phase 1 and the first six Gate 1 cases. A byte-identical copy is kept at `tests/fixtures/library-v2.pack.yaml`. |
| v3 | `76f8bbdc4b1250f97105c600f20bfae26381721a1829e9539aadf4a82e1d6990` | Superseded before any judged run. One launch was stopped by the host before its first step and used no credits. |
| v4 | `4ad9bb6e33c57d1718393452b16b0178f830e3805b43de8380fc4d26da2ab4f9` | Gate 1 stopped after 6 of 24 cases. Kane pressed Ctrl+R on the React build without reloading it. See `runs/gate1-v4/REPORT.md`. |
| v5 | `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74` | The current pack and the restarted Gate 1 matrix. |

v3 changes only the recording prompts for `titles_before` and `titles_after` in L1, L3 and L4. They now ask for "the title of every book currently shown (titles only, not authors or other fields), separated by |, or 'none'". The actions, assertions and verdict rules are unchanged.

v4 keeps the v3 prompts and adds `new_values` to each add step, naming only the added title. This lets the continuity check accept the requested new book without accepting any other quoted text, such as the author.

v5 changes only the L4 reload action to "Reload the page in the current browser session using the browser's refresh action, not a keyboard shortcut." Under v4, Kane once pressed Ctrl+R as a page key event, which does not reload a headless browser. Optimus correctly withheld a verdict, but no reload took place.

The reason for v3: in the v2 Gate 1 run on the React reference app, Kane removed the correct book but stored the visible authors as `titles_after`. The screenshots showed the app was correct. v2's "every book title" prompt did not rule out other columns in a table layout. Results from different versions are separate comparisons and are never mixed.

## Live runs and reports

Start a corpus app on a loopback URL, sign in with `kane-cli`, and leave its Chrome profile unset. Select a scenario explicitly for a Gate 1 run.

```sh
npm run optimus -- run --pack packs/library --url http://127.0.0.1:3000/ --scenario L3
```

Optimus runs Kane in author mode and evaluates each scenario sequentially. Kane uploads each live run to TestMu and uses credits. The command prints the run directory and writes `result.json` and `report.html` there. An optional `--out` points to a new report directory. Generated authoring inputs, raw streams, and evidence stay in the ignored `.optimus/runs/` directory. A selected scenario returns its own verdict exit code and leaves the whole-pack score provisional.

The [Gate 1 report](runs/gate1/REPORT.md) records the live reference-app results and the React recording mismatch that halted the matrix. The [Gate 1 v5 report](runs/gate1-v5/REPORT.md) records the completed calibration: 24 of 24 cases matched their expected verdicts.

## Repair loop

`optimus repair` closes the loop between Kane, Optimus and a coding agent for a static app folder:

```sh
npm run optimus -- repair --pack packs/library --app corpus/c-remove-wrong --scenarios L1,L3,L4
```

1. The app is copied into a disposable git workspace outside the Optimus folder and served on a random loopback port.
2. Kane runs every scenario in scope. Optimus judges each one.
3. The decision gate reads every result. Only a verified FAIL with nothing unresolved starts a repair. INCONCLUSIVE stops the loop for review. An infrastructure error gets one rerun per code revision, covering only the scenarios that got no verdict. A decision then uses, for each scenario, the latest verdict from runs of that same revision, and records which run supplied it. Verdicts from before and after a repair are never combined.
4. The agent receives a brief: the failing requirement in plain language, expected versus observed values, and the failing step's screenshot. It never receives the pack. By default the agent is Claude Code in headless mode, limited to file tools in the workspace. `--agent <path>` runs any other agent that reads the brief on stdin.
5. Optimus commits the agent's change, records the diff, and checks that the pack and the grader sources (`src/core`, `src/kane`) are unchanged.
6. Kane reruns the whole scope with a new nonce. The loop repeats until every scenario passes or a cap is reached: `--max-attempts 3`, `--max-credits 1500` (void attempts included) and `--max-minutes 20` (from the first agent call).

Each session writes `.optimus/repair/<session>/repair-history.json`. It links the baseline run, the decision, the brief, the agent invocation, the source revisions before and after, the diff, the integrity checks and the verification run. Exit codes: 0 when every scenario passes, 20 when evidence is unresolved, and 40 when the loop stops.
