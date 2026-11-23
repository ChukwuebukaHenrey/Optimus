# Closed loop on app C (Library v5, Gate 1 scope)

Session `repair-20261122205046-1b7e12`, 22 November 2026. `optimus repair --pack packs/library --app corpus/c-remove-wrong --scenarios L1,L3,L4`, default caps (3 attempts, 1,500 credits, 20 minutes). Kane CLI 0.10.6 with `--author --agent --headless` and a fresh browser profile. The agent was Claude Code 2.1.330 in headless mode, limited to the Read, Edit, Write, Glob and Grep tools inside the disposable workspace.

**Outcome: COMPLETE.** A verified FAIL went to the coding agent, the agent changed one file, and a fresh Kane run of the whole scope passed. The contract and the grader were unchanged.

| Stage | Record | Result |
|---|---|---|
| Workspace | Copy of `corpus/c-remove-wrong` outside the Optimus folder, revision `f469b2d`, served on a random loopback port | — |
| Baseline run `run-0` | Nonce `1b7e12-run-0`; Kane executions L1 `196da366…`, L3 `c280aeba…`, L4 `45133116…` | L1 PASS, **L3 FAIL**, L4 PASS |
| Decision `decision-0` | Read from every in-scope result | REPAIR: "L3 failed after an established action." |
| Brief `brief-142a6e6f…` | Plain-language requirement, expected `GP Beta 1b7e12-run-0`, observed `none`, and a screenshot. No pack content. | `attempt-1-brief.md` |
| Agent `agent-0754a466…` | Claude Code, 39 seconds, exit 0 | `attempt-1-agent-message.md` |
| Code change | Revision `f469b2d` → `a9a92ac`: `app.js`, 5 insertions and 2 deletions | `attempt-1-change.diff` |
| Integrity | Workspace outside Optimus; pack hash `b5295a39…` unchanged; grader hash over `src/core` and `src/kane` unchanged | All pass |
| Verification run `run-1` | Nonce `1b7e12-run-1`; new Kane executions L1 `07668a71…`, L3 `d9ee7236…`, L4 `169887f2…`; source revision `a9a92ac` | **L1 PASS, L3 PASS, L4 PASS** |
| Decision `decision-1` | — | COMPLETE: "Every scenario in scope passed." |

Budget: 1 attempt, 310.78 credits (baseline 158.71, verification 152.07), and 0.66 repair minutes. There were no infrastructure retries.

## The fix

Remove used to delete `list.firstElementChild` and `books[0]`, whatever card was clicked. The agent changed it to delete the clicked card and its own book object. The change is general: it does not depend on the example titles.

## Screenshot check

These are the end-of-step screenshots from the sealed archives, checked by eye and reviewed by Claude; the owner delegated this review to Claude on 23 Nov 2026 (not an independent human check).

| Run | Before removal | After removal | Recorded after |
|---|---|---|---|
| Baseline | GP Beta, GP Alpha | "No books yet." | `none`, count 0 |
| Verification | GP Beta, GP Alpha | GP Beta only | `GP Beta 1b7e12-run-1`, count 1 |

The baseline list is empty because Kane clicked Remove on GP Alpha twice: the first click removed GP Beta, and the second removed the still-visible Alpha, as in Gate 1. The agent noticed from the code alone that "none" was more than one wrong click would explain.

## Known issue found by this run (fixed afterwards)

The brief's screenshot in this session was the one Kane linked to the removal **action**. It shows the page mid-step, with only GP Alpha left, not the page after the step. Since this session, the brief uses the last screenshot of the failing step. The verdicts and the fix are unaffected.

## Files

- `repair-history.json`: the full audit chain, with local paths masked.
- `attempt-1-brief.md` and `attempt-1-brief.json`: exactly what the agent received.
- `attempt-1-agent-message.md`: the agent's final message.
- `attempt-1-change.diff`: the code change.

Raw Kane streams, evidence archives and screenshots stay in the ignored `.optimus/` folder.
