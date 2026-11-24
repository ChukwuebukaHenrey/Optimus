# Kane's own result next to Optimus's verdict

Prepared 24 Nov 2026 from every scenario run archived during calibration and repair: Gate 1 under
contract v2, v3, v4 and v5, Gate 2, and all eight repair sessions. That is **97 scenario runs**,
5 of them void attempts. Every run used Kane CLI **0.10.6**.

- **Kane's result** is `overall_status` from Kane's own `test_md_summary` event in the run's stream.
- **Optimus's verdict** is the evaluator's verdict for the same run.

**Read "Kane passed" carefully.** Optimus never tells Kane what should happen: its test files only
say what to do and what to record ([AGENTS.md](../../AGENTS.md), rule 2). So "passed" means Kane
reports that it carried out every step. It is not Kane judging the app. This table shows what
Optimus adds on top of a green Kane run. It is not a contest between the two.

## All runs

| Kane's result | Optimus PASS | Optimus FAIL | Optimus INCONCLUSIVE | Optimus INFRA_ERROR |
|---|---:|---:|---:|---:|
| passed | 64 | 12 | 2 | 2 |
| failed | 0 | 0 | 1 | 8 |
| no summary (crash, timeout, upload) | 0 | 0 | 0 | 8 |

When Kane did not finish, Optimus never issued a verdict on the app. Those runs are INFRA_ERROR,
or INCONCLUSIVE when Kane finished on the wrong site.

## Kane passed, and the app was broken (11 runs)

In each run, Kane completed every step and reported `passed`. The defect showed only in the values
Kane recorded, and Optimus caught it from them.

| Build | Scenario | Runs | What the recordings showed |
|---|---|---:|---|
| C (removes the wrong book) | L3 remove | 3 (Gate 1 ×2, repair `1b7e12`) | Asked to remove "GP Alpha", the app removed "GP Beta". |
| D (loses books on reload) | L4 persist | 6 (Gate 1 ×2, repairs `c26c1d`, `6f4dd9`, `85d737`, `fe7a64`) | The list was empty after a reload. |
| U (blind; defect sealed until grading) | L4 persist | 2 (repairs `9ac091`, `c61591`) | The list was empty after a reload. |

Each of these was later repaired by Claude Code and passed a fresh Kane run against the same
contract: see [repair-c](../repair-c/REPORT.md), [repair-d](../repair-d/REPORT.md) and
[repair-u](../repair-u/REPORT.md).

## Kane passed, but the action never happened (1 run)

**B L4 under contract v4** ([gate1-v4](../gate1-v4/REPORT.md)). Asked to "Reload the page", Kane
pressed `ControlOrMeta+R` inside the page. That does not reload a page driven this way: the local
server received no second request. Kane still marked the step passed, with the summary "Reloaded the
current page as requested."

Optimus returned **INCONCLUSIVE** (`action_not_recorded`), not PASS. A step that should change the
page but leaves it unchanged is never treated as proof. On build D, which loses books on reload, the
same missed reload would have looked like a working app. Contract v5 asks for the browser's refresh
action instead, and every L4 run since has recorded a real refresh. Reported to Kane as
[LambdaTest/kane-cli#252](https://github.com/LambdaTest/kane-cli/issues/252).

## Kane passed, but its own recordings disagreed (1 run)

**D L1 in repair `c26c1d`.** Kane logged the starting list as `[]` in one place and `none` in another.
Optimus withheld the value (INCONCLUSIVE, `recording_unavailable`) rather than pick one. Both
encodings mean an empty list, so the adapter now treats them as the same. That change was re-checked
against every saved case.

## Kane failed on the wrong site (1 run)

**C L1, Gate 1 v5, trial 2 (void).** Kane logged "Navigate to http://127.0.0.1:43186/". But the page
it read was `https://kaneai-playground.lambdatest.io/`, and its summary says "Opened the LambdaTest
KaneAI Playground page … the number of books shown was 0". Step 1 was marked passed, and step 2 then
failed. Optimus marked the run INCONCLUSIVE (`action_target_contradicted`), because the recorded page
was not on the app's origin. Reported to Kane as
[LambdaTest/kane-cli#253](https://github.com/LambdaTest/kane-cli/issues/253).

## Kane passed, but the run could not be judged (2 runs)

- One attempt replayed cached steps instead of authoring them. Optimus rejects replays by rule, so it
  was void (`replay_detected`).
- One run did not contain the complete evidence (`run_incomplete`).

## A case Optimus got wrong, and why it does not count

**B L3 under contract v2** (Gate 1, the first six cases). Optimus returned FAIL on the correct React
build, because Kane recorded the author column as titles. That was the contract's wording, not the
app. Calibration caught it, v3 clarified the prompt ("titles only, not authors or other fields"), and
v2 results are archived and never mixed with later versions. It is one of the 12 FAILs in the table
above and is not counted among the 11 real defects.

## Reproducing this table

The table was built from the raw Kane streams and evidence archives. Those stay local, because they
are large and hold session data, so this report records the result. Every case listed here also
appears in the committed per-run reports linked above.
