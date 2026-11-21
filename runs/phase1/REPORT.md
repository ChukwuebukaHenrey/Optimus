# Phase 1 Kane authoring calibration

21 November 2026. Kane CLI 0.10.6 ran on Windows against the vanilla Library reference app at `http://127.0.0.1:43184/`. Both files were generated from Library v2, linted before launch, and run with `--author --agent --headless`. The Kane Chrome profile was unset. The pack SHA-256 was `259613c83f6ff13aa3b3bb832092c214cc4fefbdfbc3cabaaa636882e63a1c80` for both runs.

| Scenario | Nonce | Kane exit | Elapsed | Credits before | Credits after | Credits used | Optimus |
|---|---|---:|---:|---:|---:|---:|---|
| L1 add | `p1a` | 0 | 263 s | 11,200.0000 | 11,156.2672 | 43.7328 | PASS |
| L4 reload | `p1b` | 0 | 189 s | 11,156.2672 | 11,099.9044 | 56.3628 | PASS |

Total balance change was 100.0956 credits. Both runs uploaded successfully and sealed one evidence pack each. L1 reported two author decisions, L4 reported three, and both reported zero replay decisions. The first balance lookup failed during preflight, before a browser run began.

## Archived actions

Step directories below are relative to the single test’s `steps/` directory in its archive. Rectangles are `x, y, width, height` in viewport pixels.

| Scenario step | Recorded action and screenshot evidence |
|---|---|
| L1 open | `1-0-1` records `navigate`. A screenshot is present. No element rectangle applies. |
| L1 add | `6-1-2`, `7-1-3`, and `10-1-6` record the title, author, and page entries as `type` actions. Their rectangles are `(562, 206, 237, 24)`, `(841, 206, 237, 24)`, and `(1120, 206, 237, 24)`. `12-1-8` records the successful save as `click` with rectangle `(641, 264, 69, 24)`. All four have screenshots and annotations. |
| L4 open | `1-0-1` records `navigate` and has a screenshot. No element rectangle applies. |
| L4 add | `4-1-2`, `5-1-3`, and `8-1-6` record the three `type` actions with the same rectangles as L1. `10-1-8` records the successful `click` with rectangle `(641, 264, 69, 24)`. All four have screenshots and annotations. |
| L4 reload | `13-2-1`, `14-2-2`, and `15-2-3` have screenshots. The NDJSON and `step.json` records show wait and analysis. `logs/2-actions.ndjson` records a successful `refresh` for `run-2`. `logs/2-network.har` records a successful same-URL request with `_resource_type: document`, attributed to step `2-1`. The local server independently received the second page request. |

The `step.json` entries had element rectangles for successful typing and clicking. They had no standalone click coordinates, and the action logs reported `coordinates: null` for both saves. The reload was established by the archived refresh action, corroborated by the archived document request. The refresh itself had no corresponding `step.json` or direct action screenshot reference.

## Screenshot labels and recorded values

The screenshots were labeled by visually inspecting the Library cards. The labels agree with every count and title stored for the four checkpoints. The open step in L4 had no requested recordings.

| Checkpoint | Screenshot step | Visible library | Matching `run_end.final_state` |
|---|---|---|---|
| L1 before add | `4-0-4` | `No books yet.` Zero cards. | `titles_before: none`, `count_before: 0` |
| L1 after add | `14-1-10` | One card, `GP Book p1a`, Ada Okafor, 123 pages, Not read. | `titles_after: GP Book p1a`, `count_after: 1` |
| L4 before reload | `12-1-10` | One card, `GP Keep p1b`, Ada Okafor, 123 pages, Not read. | `titles_before: GP Keep p1b`, `count_before: 1` |
| L4 after reload | `15-2-3` | The same single card, title, author, pages, and status. | `titles_after: GP Keep p1b`, `count_after: 1` |

The relevant `run_end.final_state` objects contained the keys for their own outer step. The after snapshots did not repeat the before keys in these runs.

## Adapter verification

- The stream’s `test_md_done` contains a session ID. The actual execution ID came from the archive’s `run.yaml` and matched the archive filename.
- Kane reused action IDs across archive entries and emitted the repeated basename `screenshot.jpg`. The adapter now matches the outer archive step path using the ordinal and step ID, then verifies the action ID and kind before linking the evidence and screenshot paths.
- The L4 refresh appeared in the numbered action log. The adapter links a successful refresh to the matching `run_end.run_id`. A refresh from another inner run leaves the reload inconclusive.
- Both existing archives and streams were reprocessed by the updated adapter. The committed tests use trimmed, sanitized Phase 1 event shapes with replacement IDs. Raw streams, screenshots, archives, and credentials remain outside Git.

L1 and L4 passed on the vanilla reference app with screenshot agreement and established actions. L3 and the other corpus apps have yet to be calibrated with live Kane evidence. The Gate 1 matrix was outside this session.
