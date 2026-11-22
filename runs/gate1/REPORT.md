# Gate 1 Library matrix

The same Library v2 pack was used for every run. Its SHA-256 matched Phase 1.

The first L3 result was reprocessed from its original sealed evidence. Kane stored the requested title and count values as explicit actions, while `final_state` used aliases. The adapter now reads the named outputs from the matching inner action log and withholds values when the archive and stream disagree.

The missing-action control used a copy of the calibrated L3 trace with the removal action set to unknown. Optimus returned INCONCLUSIVE.

| App | Trial | Scenario | Expected | Verdict | Screenshot agreement | Seconds | Credits used |
|---|---:|---|---|---|---|---:|---:|
| A | 1 | L3 | PASS | PASS | Match | 320 | 63.3395 |
| A | 1 | L1 | PASS | PASS | Match | 227 | 41.6100 |
| A | 1 | L4 | PASS | PASS | Match | 231 | 46.8698 |
| B | 1 | L1 | PASS | PASS | Match | 207 | 36.2416 |
| B | 1 | L3 | PASS | FAIL | Mismatch | 289 | 67.7529 |
| B | 1 | L4 | PASS | PASS | Match | 246 | 50.1719 |

6 of 24 planned cases have a recorded verdict. 5 match the expected result with zero replay decisions. 5 match the independent screenshot labels.

Recorded runs used 305.9857 credits over 1520 seconds.

## React removal reproduction

Gate 1 is unproven. The React removal case produced a confirmed disagreement between the archived recording and the visible page. The queue was paused at a run boundary to preserve the remaining credits.

- Environment: Windows, Kane CLI 0.10.6, neutral Library v2 L3 Markdown, nonce `g1-b-1`, zero replays. The local app was the production build of `corpus/b-react`.
- The before screenshot shows four titles: The Hobbit, Kindred, GP Beta g1-b-1, and GP Alpha g1-b-1.
- The after screenshot shows The Hobbit, Kindred, and GP Beta g1-b-1. The app removed GP Alpha as intended. The count moved from four to three.
- The successful analyze action in the sealed removal log stored `J. R. R. Tolkien|Octavia E. Butler|Ada Okafor` under `titles_after`. The stream reported the same value. These were the visible authors.
- Optimus emitted a machine FAIL for the missing Beta title in that recording. The screenshot disagreement makes that verdict inadmissible as an app failure. The HTML/JSON report implementation and saved trace remain available for diagnosis.

The saved run metadata in `runs/gate1/raw/g1-b-1/L3/` points to the sealed archive. The pack and evaluator expectations were unchanged. The remaining matrix, Gate 2 and the repair loop depend on resolving the recording mismatch.

## Re-evaluation with the recording continuity check

The evaluator now checks each list recording against its earlier pair. An entry that appears afterward must either have been in the earlier recording or be declared by a step since then as a new value (`new_values` in the pack). Otherwise the scenario is INCONCLUSIVE with `recording_inconsistent`. Removed entries are not checked. The rule is generic and contains no Library knowledge. Quoted text in an action, such as an author or a removal target, does not authorize a new entry unless the pack declares it.

These six v2 runs stay archived here. They can validate the check offline but do not count toward the calibration of a later contract. No Kane run was made for this re-evaluation.

Under the unchanged v2 pack (SHA-256 `259613c8…1c80`, frozen at `tests/fixtures/library-v2.pack.yaml`), with the original evidence archives:

| App | Trial | Scenario | Original verdict | Re-evaluated | Screenshot agreement |
|---|---:|---|---|---|---|
| A | 1 | L1 | PASS | INCONCLUSIVE `recording_inconsistent` | Match |
| A | 1 | L3 | PASS | PASS | Match |
| A | 1 | L4 | PASS | PASS | Match |
| B | 1 | L1 | PASS | INCONCLUSIVE `recording_inconsistent` | Match |
| B | 1 | L3 | FAIL | INCONCLUSIVE `recording_inconsistent` | Recording mismatch |
| B | 1 | L4 | PASS | PASS | Match |

v2 declares no new values, so the added title in both L1 recordings is not authorized and those results are withheld. The React removal no longer produces a FAIL from authors stored as titles.

Implementation check only, not a verdict: the unit tests add `new_values` for each added title to a copy of v2. With that copy, A L1, L3 and L4 and B L1 and L4 pass, and B L3 stays INCONCLUSIVE. Altered copies of the real A recordings fail for the C defect (wrong book removed) and the D defect (book lost on reload). The sanitized traces are in `tests/fixtures/gate1-v2-traces.json`.

Consequence: an app that shows a different title from the one requested (for example a truncated title) is INCONCLUSIVE rather than FAIL, because Optimus cannot tell that apart from a misrecorded field. A missing title with a visible count change still fails.
