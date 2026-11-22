# Gate 1 on Library v5

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74` for every case. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile, loopback fixtures. The expected verdicts were committed in `expected.json` before the first run. The v2 and v4 cases are archived separately and do not count here.

The matrix is paused after 19 of 24 cases. It stopped at C L1 in trial 2 (see below). The verdicts below come from re-evaluating every case from its original evidence with the current adapter.

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
| C | 2 | L1 | PASS | **INCONCLUSIVE** `action_target_contradicted` | The app is not shown | 613 | 51.1806 |

Every case had zero replay decisions. All screenshot labels are pending independent review.

Void attempts, kept in `raw/` and not counted: A L1 trial 1 first attempt (9.2181 credits); B L3 trial 1 attempts 1 and 2 (48.9085 and 55.2513); B L1 trial 2 first attempt (40.1164); and B L4 trial 2 first attempt (26.4867). In total, 1,154.3642 credits were used (10,467.7906 → 9,313.4264).

## Findings

- **The reworded reload works.** Every L4 run recorded a `refresh` action, and the server received a second page request. On D, the reloaded page is empty, as expected.
- **The defective apps fail only where expected, so far.** C failed only L3 in trial 1. D failed only L4.
- **C L3 failed for the right reason, by a different route than predicted.** Kane clicked Remove on GP Alpha. The app removed GP Beta, the first card. Kane clicked Remove on the still-visible Alpha again, and the list became empty. GP Beta, which was never asked to be removed, disappeared after an established action.
- **D L3: list-format fix.** Kane's action log stored `titles_before` as a JSON array, while `final_state` held the same titles joined with `|`. The adapter now reads an unambiguous JSON array of strings as the same list. The verdict changed from INCONCLUSIVE to PASS, which matches the screenshots. No other verdict changed.
- **C L1 trial 2 stop: Kane tested the wrong site.** Kane's stream reported "Navigate to http://127.0.0.1:43186/" as successful. However, every screenshot and `final_state.url` show the browser still on Kane's configured default site, `https://kaneai-playground.lambdatest.io/`, and the local server received no request. Step 1 recorded an empty list from that site. Step 2 then failed while following an unrelated guided flow. This happened in only one of the 24 runs.
- **Origin check added.** The adapter now compares each step's reported `final_state.url` with the origin of the app under test. A step that ended on another origin has its target marked contradicted, and the evaluator returns INCONCLUSIVE (`action_target_contradicted`). Before this check, the wrong-site recording from step 1 was accepted as evidence. Re-evaluating every completed case leaves the 18 other verdicts unchanged.

## Infrastructure failures

- **Sleep.** The PC slept on lid or button twice during runs (A L1 trial 1 and B L3 trial 1). The browser target closed and the upload failed.
- **Upload failures.** TestMu rejected the upload for B L1 and B L4 in trial 2. Each was retried once in a fresh working folder and passed.
- **Replay from a reused folder.** The helper's first retry design reused Kane's working folder, so Kane replayed cached steps. Optimus rejected that run as `replay_detected`. Retries now use a fresh folder. The tracked `optimus run` already isolated its attempts.

The queue is paused with `raw/pause`. Remaining: C L1 trial 2 needs a valid run; C L3 and C L4, and D L1, L3 and L4, in trial 2 have not run (5 cases).
