# Gate 1 on Library v4

Pack SHA-256 `4ad9bb6e33c57d1718393452b16b0178f830e3805b43de8380fc4d26da2ab4f9` for every case. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile, loopback fixtures. The expected verdicts were committed in `expected.json` before the first run. The six v2 runs are archived separately in `runs/gate1/` and do not count here.

The matrix stopped at the first contradiction, after 6 of 24 cases.

| App | Trial | Scenario | Expected | Verdict | Replays | Screenshot check | Seconds | Credits used |
|---|---:|---|---|---|---:|---|---:|---:|
| A | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 424 | 43.2390 |
| A | 1 | L3 | PASS | PASS | 0 | Agrees (pending review) | 342 | 73.4642 |
| A | 1 | L4 | PASS | PASS | 0 | Agrees (pending review) | 215 | 50.3660 |
| B | 1 | L1 | PASS | PASS | 0 | Agrees (pending review) | 210 | 43.1037 |
| B | 1 | L3 | PASS | PASS | 0 | Agrees (pending review) | 295 | 68.6023 |
| B | 1 | L4 | PASS | **INCONCLUSIVE** `action_not_recorded` | 0 | Values agree; no reload happened | 202 | 47.3529 |

Totals: 1,688 seconds and 326.1281 credits (10,793.9187 → 10,467.7906).

A trial 1 passed all three scenarios, which calibrates v4 on the vanilla reference app. B L3 recorded the title column correctly under the titles-only prompt, so the v2 author mismatch did not recur in this case.

Screenshot labels are in the ignored `raw/screenshot-labels.json`. Each label was made by visually inspecting the archived screenshots and is marked pending independent review.

## Stop: B L4 reload was not performed

- Kane's reload step on the React build ran one `press_key` action, `ControlOrMeta+R`, using Playwright `page.keyboard.press`. It used no `refresh` or navigation action.
- The local server logged only the initial page load (`/` and its two assets at 03:49:51Z). A real reload with `Cache-Control: no-store` would request `/` again, as it did in A L4.
- Kane still reported the step as passed, with the summary "reloaded the reading list page".
- The before and after screenshots show the same three books, and the recorded values match them. That is what an unreloaded page also looks like.

Optimus returned INCONCLUSIVE because no navigation was recorded for the reload step. This is the intended rule: a missed action that leaves the page unchanged gets neither PASS nor FAIL. The verdict is not a judgment of the app. It contradicts the expected matrix because the browser action was never established.

The evidence is in `raw/g4-b-1/L4/` (stdout, metrics with the server request log, and the archive path). In the archive, the press is in `logs/2-actions.ndjson` and `steps/14-2-1/step.json`.

The queue is paused with `raw/pause`. Remaining: B trial 1 is done; C and D trial 1 and all of trial 2 (18 cases) have not run.
