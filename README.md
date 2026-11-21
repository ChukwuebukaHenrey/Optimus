# Optimus

Optimus evaluates web applications against a shared behavioral contract and produces evidence-backed verdicts. Kane acts in the browser and records observations. Optimus applies the contract deterministically.

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

Actions default to open for the first step and interact for later steps. Packs can declare `action: reload` or `action: none` explicitly. For a step with `expects_change`, the evaluator pairs recordings with earlier values using a delta's `from` key, matching `_before` and `_after` keys, or matching recording prompts. List order alone does not establish a change for a list membership assertion. A list recording may only gain entries that were in its earlier pair or are quoted in its own step's action text. Any other new entry makes the scenario INCONCLUSIVE with `recording_inconsistent`, because the recording no longer describes the same field. Removed entries are not checked. A delta with `kind: count` requires nonnegative whole numbers. Assertions with `prerequisite: true` establish starting state. If a prerequisite fails, the result is INCONCLUSIVE.

The Kane adapter joins author events to archived steps and links refreshes to the corresponding inner run. When archive details are supplied, it returns verified archive entry paths and uses the run manifest ID. See the [Phase 1 report](runs/phase1/REPORT.md) for the live calibration scope.

## Library contract versions

| Version | SHA-256 | Used for |
|---|---|---|
| v2 | `259613c83f6ff13aa3b3bb832092c214cc4fefbdfbc3cabaaa636882e63a1c80` | Phase 1 and the first six Gate 1 cases. A byte-identical copy is kept at `tests/fixtures/library-v2.pack.yaml`. |
| v3 | `76f8bbdc4b1250f97105c600f20bfae26381721a1829e9539aadf4a82e1d6990` | The current pack and the restarted Gate 1 matrix. |

v3 changes only the recording prompts for `titles_before` and `titles_after` in L1, L3 and L4. They now ask for "the title of every book currently shown (titles only, not authors or other fields), separated by |, or 'none'". The actions, assertions and verdict rules are unchanged.

The reason: in the v2 Gate 1 run on the React reference app, Kane removed the correct book but stored the visible authors as `titles_after`. The screenshots showed the app was correct. v2's "every book title" prompt did not rule out other columns in a table layout. Results from different versions are separate comparisons and are never mixed.

## Live runs and reports

Start a corpus app on a loopback URL, sign in with `kane-cli`, and leave its Chrome profile unset. Select a scenario explicitly for a Gate 1 run.

```sh
npm run optimus -- run --pack packs/library --url http://127.0.0.1:3000/ --scenario L3
```

Optimus runs Kane in author mode and evaluates each scenario sequentially. Kane uploads each live run to TestMu and uses credits. The command prints the run directory and writes `result.json` and `report.html` there. An optional `--out` points to a new report directory. Generated authoring inputs, raw streams, and evidence stay in the ignored `.optimus/runs/` directory. A selected scenario returns its own verdict exit code and leaves the whole-pack score provisional.

The [Gate 1 report](runs/gate1/REPORT.md) records the live reference-app results and the React recording mismatch that halted the matrix.
