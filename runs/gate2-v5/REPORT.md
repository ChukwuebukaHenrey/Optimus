# Gate 2 on Library v5: L2 read status

Pack SHA-256 `b5295a39f4bec78aacd7f071022cf50d881e9233a1271dddb423c6ddf0c2fc74`, unchanged since Gate 1. Kane CLI 0.10.6, `--author --agent --headless`, fresh browser profile. Each case used the tracked runner (`runKaneAssessment`, scenario L2) against a loopback copy of the app. The expected verdicts were committed in `expected.json` before the first run.

L2 adds a book that is not read yet, toggles its read status once, and records the status text before and after. The pack accepts "not read", "to read", "unread", "not yet read" or "no" before the toggle, and "read", "finished", "done", "✓" or "yes" after it.

| App | Trial | Expected | Verdict | Recorded before → after | Replays | Seconds | Credits |
|---|---:|---|---|---|---:|---:|---:|
| A | 1 | PASS | PASS | Not read → Read | 0 | 325 | 57.9017 |
| B | 1 | PASS | PASS | To read → Finished | 0 | 186 | 51.6832 |
| A | 2 | PASS | PASS | Not read → Read | 0 | 159 | 45.5171 |
| B | 2 | PASS | PASS | To read → Finished | 0 | 191 | 48.1036 |

**Result: 4 of 4 cases match the expected verdict, with zero replays.** Total: 861 seconds and 203.2056 credits. The end-of-step screenshots after the toggle show "Read" on A and "Finished" on the new row on B, matching the recordings. They were checked by eye and reviewed by Claude; the owner delegated this review to Claude on 23 Nov 2026 (not an independent human check).

**Limitation:** this gate has no negative control. No corpus app has a broken read toggle, and AGENTS.md requires corpus apps to be built in separate sessions. L2 is calibrated on the two reference apps (vanilla card layout and React table layout); a defect-detection check for L2 is still to come.

Raw streams and archives are in the ignored `raw/` folder.
