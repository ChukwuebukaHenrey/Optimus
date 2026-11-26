# Gate 2 on Library v5: L2 read status

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74`, unchanged since Gate 1. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile. Each case used the tracked runner (`runKaneAssessment`, scenario L2) against a loopback copy of the app. The expected verdicts were committed in `expected.json` before the first run.

L2 adds a book that is not read yet, toggles its read status once, and records the status text before and after. The pack accepts "not read", "to read", "unread", "not yet read" or "no" before the toggle, and "read", "finished", "done", "✓" or "yes" after it.

| App | Trial | Expected | Verdict | Recorded before → after | Replays | Seconds | Credits |
|---|---:|---|---|---|---:|---:|---:|
| A | 1 | PASS | PASS | Not read → Read | 0 | 325 | 57.9017 |
| B | 1 | PASS | PASS | To read → Finished | 0 | 186 | 51.6832 |
| A | 2 | PASS | PASS | Not read → Read | 0 | 159 | 45.5171 |
| B | 2 | PASS | PASS | To read → Finished | 0 | 191 | 48.1036 |

**Result on the reference apps: 4 of 4 cases match the expected verdict, with zero replays.** Total: 861 seconds and 203.2056 credits. The end-of-step screenshots after the toggle show "Read" on A and "Finished" on the new row on B, matching the recordings. They were checked by eye and reviewed by Claude; the owner delegated this review to Claude on 23 Nov 2026 (not an independent human check).

## Negative control: build E (26 Nov 2026)

Build E (`corpus/e-toggle-wrong`) has one bug in the read toggle. A separate headless Claude Code session built it from a copy of A, in a folder outside the repository, without the pack in view. Its prompt is in [`e-build-prompt.md`](e-build-prompt.md). The session's description of the bug was sealed outside the repository. E's expected verdict (FAIL) was committed in `expected.json` (`b8255df`) before any run on E. The runner, pack hash, Kane version and settings were the same as for A and B.

| App | Trial | Expected | Verdict | Recorded before → after | Replays | Seconds | Credits |
|---|---:|---|---|---|---:|---:|---:|
| E | 1 | FAIL | **FAIL** | Not read → Reading | 0 | 255 | 55.2255 |
| E | 2 | FAIL | **FAIL** | Not read → Reading | 0 | 252 | 45.93 |

Both trials failed the same check (`assertion_failed`: `status_after` is not one of the "read" values). The toggle click was recorded and the page visibly changed, so this is a FAIL, not INCONCLUSIVE. The end-of-step screenshots ([trial 1](e-trial-1-toggle.jpg), [trial 2](e-trial-2-toggle.jpg)) show "Reading" under the new book, matching the recordings. Claude checked them by eye.

Kane's own result for both trials was `passed`: it carried out every step and recorded what it saw. Optimus never tells Kane what should happen, so the defect shows only in the recorded value. "Reading" contains the word "read". A substring check would have passed it, but `one_of` compares the whole normalised value.

The sealed description, opened after grading, is in [`E-DEFECT-unsealed.txt`](E-DEFECT-unsealed.txt). The toggle handler shows "Reading" instead of "Read", while the stored data and the label after a reload stay correct. It is a one-line change in `app.js`.

**Result with the negative control: 6 of 6 cases match the expected verdict, with zero replays.** Total for Gate 2: 1,368 seconds and 304.3611 credits.

These two E runs came after the 97-run comparison in [`../kane-vs-optimus/REPORT.md`](../kane-vs-optimus/REPORT.md) was prepared (24 Nov), so they are not counted there.

Raw streams and archives are in the ignored `raw/` folder.
