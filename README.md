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

`evaluate` takes a normalized `ScenarioTrace` JSON object or an array of scenario traces for one app URL and nonce. The trace schema is in `src/core/types.ts`. Step indexes and `stepsSkipped` entries are zero-based. Evidence paths are resolved relative to the trace file. Each trace references its own `.evidence` archive with a run manifest, test definition, and result. The offline command expects trusted trace JSON and checks the archive structure. Associating individual observations with live artifacts remains part of Phase 1 calibration. An array gets a score from 0 to 1 when every scenario in the loaded pack has a PASS or FAIL verdict. A single object returns its scenario verdict. CLI exits are 0 for PASS, 10 for FAIL, 20 for unresolved results, and 30 for infrastructure or input failures. Code 40 is reserved for budget escalation in the live runner.

Actions default to open for the first step and interact for later steps. Packs can declare `action: reload` or `action: none` explicitly. For a step with `expects_change`, the evaluator pairs recordings with earlier values using a delta's `from` key, matching `_before` and `_after` keys, or matching recording prompts. List order alone does not establish a change for a list membership assertion. A delta with `kind: count` requires nonnegative whole numbers. Assertions with `prerequisite: true` establish starting state. If a prerequisite fails, the result is INCONCLUSIVE.

The Kane NDJSON adapter uses upstream examples and synthetic fixtures. Live authoring, action and artifact verification, and reference-app calibration are pending.
