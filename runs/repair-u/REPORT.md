# Blind grade and closed loop on app U (Library v5, Gate 1 scope)

`corpus/u-unseen` was made in a separate session from a copy of the vanilla app, with exactly one planted behavioural bug. Its description was sealed outside the repository. No Optimus session saw the description or read the app's code before grading. Grading and repair ran with `optimus repair --pack packs/library --app corpus/u-unseen --scenarios L1,L3,L4` and the default caps.

## Blind grade

Every session's baseline graded U the same way: **L1 PASS, L3 PASS, L4 FAIL**.

The end-of-step screenshots of L4 (session `9ac091`), checked by eye and reviewed by Claude; the owner delegated this review to Claude on 23 Nov 2026 (not an independent human check): after the add, the page shows "GP Keep 9ac091-run-0"; after the reload, it shows "No books yet." The verdict is FAIL, not INCONCLUSIVE, so the reload action was established in the evidence.

## Unsealed defect description

The description, unsealed after grading (`DEFECT-unsealed.txt`):

> The add-book submit handler adds a book to the displayed list and the in-memory array but does not save it to local storage. Reloading immediately after adding a book loses that book. A later toggle or removal can persist the current array because those actions still save.

The blind grade identified the affected behaviour (persistence after adding), and passed the behaviours that still work.

## Sessions

| Session | Outcome | Cause | Credits |
|---|---|---|---:|
| `repair-20261123004113-c1f0ad` | STOP, no repair | L4 got no verdict: Kane's planner stalled and its upload failed, then immediate retries were refused ("TMS did not return an org_id"). Retries now wait 90 s. | 107.09 |
| `repair-20261123010204-9ac091` | STOP, no repair | Graded L4 FAIL, but three immediate balance lookups failed, so the credit cap could not be enforced. Balance lookups now back off. | 156.40 |
| **`repair-20261123014521-c61591`** | **COMPLETE** | See below | 365.08 |

## The completed session

| Stage | Result |
|---|---|
| Baseline `run-0` | L1 PASS, L3 PASS, **L4 FAIL** |
| Decision `decision-0` | REPAIR |
| Brief | The L4 requirement in plain language, with expected `GP Keep c61591-run-0` and observed `none` (`attempt-1-brief.md`) |
| Agent | Claude Code, 35 seconds. Its diagnosis: "Toggling and removing books already saved, but adding didn't." |
| Code change | `app.js`: one line, `saveBooks()` after `books.push(book)` in the add handler (`attempt-1-change.diff`) |
| Integrity | Workspace outside Optimus; pack hash and grader hash unchanged |
| Verification `run-1` (repaired revision) | L1 PASS; L3 and L4 INFRA_ERROR (Kane-side) |
| Infrastructure retry `run-2` (same revision, only L3 and L4) | L3 PASS, **L4 PASS** |
| Decision `decision-2` | COMPLETE. Basis: L1 from `run-1`; L3 and L4 from `run-2`, all on the repaired revision |

The L4 reload screenshot after the repair shows "GP Keep c61591-run-2" still listed.

## Files

`repair-history.json` (the completed session's audit chain, with local paths masked), `attempt-1-brief.md` and `attempt-1-brief.json`, `attempt-1-agent-message.md`, `attempt-1-change.diff`, and `DEFECT-unsealed.txt`.
