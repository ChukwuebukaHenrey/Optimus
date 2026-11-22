# Gate 1 on Library v5

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74` for every case. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile, loopback fixtures. The expected verdicts were committed in `expected.json` before the first run. The v2 and v4 cases are archived separately and do not count here.

**Result: 24 of 24 cases match the expected verdict, with zero replay decisions, and agree with their screenshots.** A and B pass L1, L3 and L4 in both trials. C fails only L3, and D fails only L4, in both trials. All screenshot labels are pending independent review.

The verdicts below come from re-evaluating every case from its original evidence with the final adapter.

| App | Trial | Scenario | Expected | Verdict | Screenshot check | Seconds | Credits used |
|---|---:|---|---|---|---|---:|---:|
| A | 1 | L4 | PASS | PASS | Agrees | 175 | 47.0109 |
| B | 1 | L4 | PASS | PASS | Agrees | 173 | 49.6558 |
| A | 1 | L1 | PASS | PASS (retry) | Agrees | 189 | 41.9864 |
| A | 1 | L3 | PASS | PASS | Agrees | 391 | 70.4846 |
| B | 1 | L1 | PASS | PASS | Agrees | 216 | 42.0338 |
| B | 1 | L3 | PASS | PASS (third run) | Agrees | 402 | 73.1675 |
| C | 1 | L1 | PASS | PASS | Agrees | 227 | 44.3898 |
| C | 1 | L3 | FAIL | FAIL | Agrees | 442 | 59.2292 |
| C | 1 | L4 | PASS | PASS | Agrees | 423 | 44.8210 |
| D | 1 | L1 | PASS | PASS | Agrees | 310 | 40.7207 |
| D | 1 | L3 | PASS | PASS (after the list-format fix) | Agrees | 383 | 62.0152 |
| D | 1 | L4 | FAIL | FAIL | Agrees | 239 | 46.2058 |
| A | 2 | L1 | PASS | PASS | Agrees | 273 | 44.5646 |
| A | 2 | L3 | PASS | PASS | Agrees | 296 | 68.3347 |
| A | 2 | L4 | PASS | PASS | Agrees | 276 | 46.1207 |
| B | 2 | L1 | PASS | PASS (retry) | Agrees | 223 | 35.0868 |
| B | 2 | L3 | PASS | PASS | Agrees | 445 | 65.0059 |
| B | 2 | L4 | PASS | PASS (retry) | Agrees | 390 | 42.3692 |
| C | 2 | L1 | PASS | PASS (clean rerun, then retry) | Agrees | 209 | 39.3004 |
| C | 2 | L3 | FAIL | FAIL | Agrees | 279 | 73.4422 |
| C | 2 | L4 | PASS | PASS | Agrees | 226 | 48.2316 |
| D | 2 | L1 | PASS | PASS | Agrees | 586 | 43.1366 |
| D | 2 | L3 | PASS | PASS (third run) | Agrees | 375 | 72.8966 |
| D | 2 | L4 | FAIL | FAIL | Agrees | 214 | 46.3704 |

Valid cases: 7,362 seconds and 1,246.5804 credits. Void attempts (listed below) used 280.4852 credits. Total used: 1,527.0656 credits (10,467.7906 → 8,940.7250).

## Findings

- **The reworded reload works.** Every L4 run recorded a `refresh` action, and the server received a second page request. On D, the reloaded page is empty in both trials.
- **C L3 failed for the right reason in both trials, by a route other than the one predicted.** Kane clicked Remove on GP Alpha. The app removed GP Beta, the first card. Kane then clicked Remove on the still-visible Alpha, and the list became empty. GP Beta, which was never asked to be removed, disappeared after an established action.
- **Two adapter fixes came from real evidence.** Each was checked against every saved case.
  - *List format (D L3, trial 1).* Kane's action log stored a list as a JSON array, while `final_state` held the same titles joined with `|`. The adapter now reads an unambiguous JSON array of strings as the same list.
  - *Wrong site (C L1, trial 2).* Kane reported navigating to the app, but the browser stayed on Kane's configured default site, and step 1 recorded an empty list from it. The adapter now marks a step contradicted when its `final_state.url` is on another origin than the app. That attempt is INCONCLUSIVE (`action_target_contradicted`) and archived.
- **Neither fix changed a verdict that the screenshots supported.** Re-evaluating all saved cases after each fix left every other verdict unchanged.

## Void attempts (archived in `raw/`, not counted)

| Case | Cause | Outcome |
|---|---|---|
| A L1, trial 1, first attempt | PC slept (lid or button); browser closed; upload failed | Retried once and passed |
| B L3, trial 1, attempts 1 and 2 | PC slept during step 4; the retry replayed cached steps from a reused working folder (`replay_detected`) | Helper fixed to isolate retries; a clean third run passed |
| B L1 and B L4, trial 2, first attempts | TestMu upload rejected | Each retried once in a fresh folder and passed |
| C L1, trial 2, first attempt | Kane stayed on its default site despite reporting navigation | INCONCLUSIVE; a clean rerun then hit an upload failure, was retried and passed |
| D L3, trial 2, attempts 1 and 2 | Kane's planner produced no action for three consecutive steps (Kane-side) | A clean third run passed |

Infrastructure lessons for the repair loop: keep live runs on mains power with the lid open; give every retry its own Kane working folder; count void attempts against the credit budget; and never let an INFRA_ERROR or INCONCLUSIVE result trigger a code change.
