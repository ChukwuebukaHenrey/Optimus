# Live repair of app U, recorded for the demo video (Library v5, Gate 1 scope)

A fresh, screen-recorded run of the closed loop on `corpus/u-unseen`, the blind build from
`runs/repair-u/` (one planted persistence bug, description sealed until grading). The command was:

```
npm run optimus -- repair --pack packs/library --app corpus/u-unseen --scenarios L1,L3,L4
```

It used the default caps (3 attempts, 1,500 credits, 20 minutes). The session is
`repair-20261125041104-7efe46`, run on 25 Nov 2026 between 05:11 and 05:31 local time. The whole
run was screen-recorded (recording R1 of the demo video) and its terminal output is in `terminal.log`.

## Result

| Stage | Result |
|---|---|
| Baseline Kane run `run-0` | 10.1 min, 165.18 credits |
| Optimus verdicts, `run-0` | L1 PASS, L3 PASS, **L4 FAIL** (`assertion_failed`) |
| Decision | REPAIR: L4 failed after an established action |
| Brief | The L4 requirement in plain language, with expected `GP Keep 7efe46-run-0` and observed `none` (`attempt-1-brief.md`). No contract and no grader. |
| Agent | Claude Code, 0.6 min, in a throwaway copy outside Optimus. Its explanation is in `attempt-1-agent-message.md`. |
| Code change | `app.js`: one line, `saveBooks();` after `books.push(book)` in the add handler (`attempt-1-change.diff`) |
| Integrity | Workspace outside Optimus ok, contract hash unchanged ok, grader (`src/core`, `src/kane`) unchanged ok |
| Fresh Kane run `run-1` (repaired revision, all three scenarios) | 9.0 min, 148.10 credits |
| Optimus verdicts, `run-1` | L1 PASS, L3 PASS, **L4 PASS** |
| Decision | COMPLETE: every scenario in scope passed |

The session used 1 of 3 attempts and 313.28 credits. The code change is the same one line that
`runs/repair-u/` found independently on 23 Nov.

## Kane's own status versus Optimus's verdict

In the broken baseline, Kane's own end-of-scenario summary for L4 reported `"overall_status":"passed"`:
it carried out every step. Optimus judged the same run **FAIL** from what Kane recorded. After the
reload, the list was empty.

`kane-L4-summaries.ndjson` holds Kane's L4 summary lines for both runs. The Test Manager `share_url`
field has been removed because it is a private link. Kane is never told the expected answer, so its
"passed" means only that it reports carrying out every step (AGENTS.md rule 2).

## End-of-step screenshots (Kane's evidence)

- `run-0-L4-reload.jpg`: after the reload in the broken baseline, the page shows "No books yet."
- `run-1-L4-reload.jpg`: after the reload in the fresh run on the repaired revision, the page shows
  "GP Keep 7efe46-run-1".

Both were taken from each run's evidence pack. The raw packs are not committed (AGENTS.md rule 11).
They were checked by eye and reviewed by Claude; this is not an independent human check.

## Files

- `repair-history.json`: the session's audit chain, with local paths masked as `<optimus>` and `<tmp>`.
- `attempt-1-brief.md` and `attempt-1-brief.json`.
- `attempt-1-agent-message.md`.
- `attempt-1-change.diff`.
- `terminal.log`: the progress output, with local paths masked.
- `kane-L4-summaries.ndjson`.
- The two L4 screenshots.

The demo video (`video/`) uses this session for its live-repair scene, and `FACTS.liveRun` in
`video/src/config.ts` points here.
