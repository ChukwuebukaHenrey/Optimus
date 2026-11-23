# Closed loop on app D (Library v5, Gate 1 scope)

App `corpus/d-no-persist` keeps books in memory only, so they vanish on reload. `optimus repair --pack packs/library --app corpus/d-no-persist --scenarios L1,L3,L4`, default caps. Kane CLI 0.10.6 (`--author --agent --headless`, fresh browser profile). The agent was Claude Code in headless mode, limited to file tools in the disposable workspace.

D took four sessions. The first three stopped safely. None of them changed the contract or claimed a fix it had not verified.

| Session | Outcome | Cause | Credits |
|---|---|---|---:|
| `repair-20261122221904-c26c1d` | STOP before any repair | Baseline L1 was INCONCLUSIVE next to the real L4 FAIL. Kane logged the empty starting list as `[]` and `final_state` said `none`, so the adapter withheld it. The adapter now treats equivalent list encodings as one recording. | 167.36 |
| `repair-20261122223136-6f4dd9` | STOP after one repair | Network outage: Kane's uploads failed (`fetch failed`), then Kane would not start ("TMS did not return an org_id"). The infrastructure retry was used up. | 156.22 |
| `repair-20261122230530-85d737` | STOP after one repair | Kane flaked on a different scenario in each full rerun (a wrong-site navigation to Kane's own tutorial page, a planner stall, a login error). Every scenario passed on the repaired code at least once. The controller now reruns only unjudged scenarios, on the same revision. | 262.22 |
| **`repair-20261123000518-fe7a64`** | **COMPLETE** | See below | 306.45 |

## The completed session

| Stage | Record | Result |
|---|---|---|
| Baseline run `run-0` | Fresh workspace copy outside Optimus | L1 PASS, L3 PASS, **L4 FAIL** (the book was gone after reload) |
| Decision `decision-0` | Basis: every scenario from `run-0` | REPAIR |
| Brief | L4 requirement in plain language, expected `GP Keep fe7a64-run-0`, observed `none`, and the end-of-step screenshot | `attempt-1-brief.md` |
| Agent | Claude Code, 42 seconds, exit 0 | `attempt-1-agent-message.md` |
| Code change | `app.js` only: `saveBooks()` after add, remove and toggle, plus safe loading of stored books | `attempt-1-change.diff` |
| Integrity | Workspace outside Optimus; pack hash and grader hash unchanged | All pass |
| Verification run `run-1` | New nonce and Kane executions, repaired revision | **L1 PASS, L3 PASS, L4 PASS** |
| Decision `decision-1` | Basis: every scenario from `run-1` | COMPLETE |

End-of-step screenshots of the L4 reload step, checked by eye and pending independent review: before the repair the page shows "No books yet." After the repair the page shows "GP Keep fe7a64-run-1", matching the recordings (`none`, count 0 before the repair; the title, count 1, after).

## Files

`repair-history.json` (audit chain, with local paths masked), `attempt-1-brief.md` and `attempt-1-brief.json` (exactly what the agent received), `attempt-1-agent-message.md`, and `attempt-1-change.diff`. Raw Kane streams, archives and screenshots stay in `.optimus/`. The three stopped sessions are kept there too.
