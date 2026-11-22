# Gate 1 on Library v5

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74` for every case. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile, loopback fixtures. The expected verdicts were committed in `expected.json` before the first run. The v2 and v4 cases are archived separately and do not count here.

The matrix is paused after 11 of 24 cases. It stopped at D L3 (see below).

| App | Trial | Scenario | Expected | Verdict | Replays | Screenshot check | Seconds | Credits used |
|---|---:|---|---|---|---:|---|---:|---:|
| A | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 175 | 47.0109 |
| B | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 173 | 49.6558 |
| A | 1 | L1 | PASS | PASS (retry) | 0 | Agrees (pending review) | 189 | 41.9864 |
| A | 1 | L3 | PASS | PASS | 0 | Agrees (pending review) | 391 | 70.4846 |
| B | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 216 | 42.0338 |
| B | 1 | L3 | PASS | PASS (third run) | 0 | Agrees (pending review) | 402 | 73.1675 |
| C | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 227 | 44.3898 |
| C | 1 | L3 | FAIL | FAIL | 0 | Agrees (pending review) | 442 | 59.2292 |
| C | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 423 | 44.8210 |
| D | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 310 | 40.7207 |
| D | 1 | L3 | PASS | **INCONCLUSIVE** at run time; PASS after the adapter fix | 0 | Agrees with PASS (pending review) | 383 | 62.0152 |

Void attempts, kept in `raw/` and not counted: A L1 first attempt (9.2181 credits), and B L3 attempts 1 and 2 (48.9085 and 55.2513). In total, 688.8928 credits were used (10,467.7906 → 9,778.8978).

## Findings

- **The reworded reload works.** Every L4 run so far (A, B, C) recorded a `refresh` action, and the server received a second page request.
- **C L3 failed for the right reason, by a different route than predicted.** Kane clicked "Remove" on GP Alpha. The app removed GP Beta, the first card. Alpha was still visible, so Kane clicked Remove on it again, and the list became empty. The verdict is FAIL because GP Beta, which was never asked to be removed, disappeared after an established action. The recordings (`none`, count 0) match the screenshots.
- **D L3 stop: a list was recorded in two formats.** In the removal scenario's step 3, Kane's sealed action log stored `titles_before` as a JSON array, `["GP Beta g5-d-1","GP Alpha g5-d-1"]`. `run_end.final_state` held the same list as `GP Beta g5-d-1|GP Alpha g5-d-1`. The adapter withholds values when its two sources disagree, so the recording was unavailable and the verdict was INCONCLUSIVE (`recording_unavailable`). That contradicts the expected PASS, so the matrix stopped.
- **Adapter fix, prepared offline.** `src/kane/evidence.ts` now converts a logged JSON array of non-empty strings, none containing `|`, into its `|`-joined form before comparing it with `final_state`. Any other value is kept unchanged, so a real disagreement still withholds the value. Every completed v5 case was re-evaluated from its original archive with the fix. The ten earlier verdicts are unchanged, and D L3 becomes PASS, which agrees with its screenshots (Beta and Alpha, then Beta). The pack, the evaluator and the expected matrix are unchanged.

## Infrastructure failures

- **A L1, first attempt.** The PC slept during step 1 (Windows: "Sleep Reason: Button or Lid"). The browser target closed and the upload failed. Following the upload-failure rule, the case was retried once and passed.
- **B L3, attempts 1 and 2.** The PC slept during step 4 ("Button or Lid"). The retry then replayed cached steps, because the temporary helper reused Kane's working folder. Optimus rejected that retry as `replay_detected`. The tracked `optimus run` already isolates attempts; the helper now does too. Both attempts were archived, and a clean third run passed.

The queue is paused with `raw/pause`. Remaining: D L4 trial 1 and all of trial 2 (13 cases).
