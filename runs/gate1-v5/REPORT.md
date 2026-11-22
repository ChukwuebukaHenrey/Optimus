# Gate 1 on Library v5

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74` for every case. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile, loopback fixtures. The expected verdicts were committed in `expected.json` before the first run. The v2 and v4 cases are archived separately and do not count here.

The matrix is paused after 5 judged cases. The stop was caused by the host machine, not by a verdict on an app.

| App | Trial | Scenario | Expected | Verdict | Replays | Screenshot check | Seconds | Credits used |
|---|---:|---|---|---|---:|---|---:|---:|
| A | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 175 | 47.0109 |
| B | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 173 | 49.6558 |
| A | 1 | L1 | PASS | PASS (retry) | 0 | Agrees (pending review) | 189 | 41.9864 |
| A | 1 | L3 | PASS | PASS | 0 | Agrees (pending review) | 391 | 70.4846 |
| B | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 216 | 42.0338 |
| B | 1 | L3 | PASS | **INFRA_ERROR** (both attempts) | 0 / 3 | Not judged | 222 + 371 | 48.9085 + 55.2513 |

Unjudged attempts: the first A L1 attempt used 9.2181 credits. In total, 364.5494 credits were used (10,467.7906 → 10,103.2412).

## The reworded reload works on both reference apps

On A and B, L4 recorded a `refresh` action in the inner action log, and the local server received a second page request. B L4 failed under v4 because Kane pressed Ctrl+R instead. On B, the analyze step read the title column of the table.

## Infrastructure failures

- **A L1, first attempt.** The PC slept during step 1 (Windows: "Sleep Reason: Button or Lid"). On wake, the browser target was closed (`TargetClosedError`) and the upload failed. Following the upload-failure rule, the case was retried once and passed. The first attempt is archived in `raw/g5-a-1/L1/`.
- **B L3, first attempt.** The PC slept again during step 4 ("Button or Lid" at 15:59:49 local time), and the same `TargetClosedError` and upload failure followed. Steps 1–3 had been authored normally. A process-level keep-awake request was active, but it cannot block a lid or power-button sleep.
- **B L3, retry.** The Gate 1 helper reused the first attempt's Kane working folder. Kane found the steps it had authored there and replayed three of them (`replay_decisions: 3`). Optimus rejected the run with `replay_detected` (AGENTS rule 8). This was a defect in the temporary helper, not in Optimus: the tracked `optimus run` writes each attempt into a fresh `attempt-N` directory. The helper now gives a retry its own working directory.

Windows also recorded a battery-triggered sleep at 05:07 local time. Live runs need the laptop on mains power with the lid open, or with the lid-close action set to "Do nothing" while runs are in progress.

The queue is paused with `raw/pause`. Remaining: B L3 trial 1, then C and D trial 1 and all of trial 2 (19 cases).
