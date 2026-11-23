# Optimus demo walkthrough (about 5 minutes)

**Pitch:** one contract, many different builds, evidence-backed verdicts. When a build fails, a coding agent fixes it, and Kane proves the fix.

## 1. The problem (30 s)

Many people build the same app differently: students on one assignment, teams on one spec. Checking each build by hand is slow, and asking an AI "does this work?" yields opinions, not evidence. Optimus applies one written behavioural contract to every build. Kane CLI does the clicking and records what it sees. Optimus's deterministic code decides each verdict, and it gives no verdict when the evidence is weak.

## 2. One contract, many builds (1 min)

Open the report: the comparison matrix.

- Five builds of a reading-list app: vanilla JS (A), React with a table layout (B), and three buggy builds (C, D and U).
- Three calibrated behaviours: **Add**, **Remove**, **Persist after reload**. They are judged by the same contract hash for every build.
- A and B pass everything. C fails Remove, D fails Persist, and U, the blind build, fails Persist.
- Calibration came first: 24 of 24 Gate 1 cases matched the expected verdicts (`runs/gate1-v5/REPORT.md`).

## 3. Evidence, not claims (1 min)

Open C, then Remove.

- The step timeline shows what Kane was told to do, what it recorded, and the end-of-step screenshots. Two books before; an empty list after removing "GP Alpha": the app deleted the wrong book first.
- Kane never decides. The FAIL comes from a deterministic check: "GP Beta should still be listed".
- Honesty rules: a missed click is INCONCLUSIVE, never FAIL. A Kane recording that contradicts itself is withheld. A step that lands on the wrong website is rejected (this happened once, and the report shows it).

## 4. The closed loop (1.5 min)

Open C's repair record.

1. **Decision gate:** only a verified FAIL with nothing unresolved starts a repair.
2. **Brief:** the requirement in plain language, expected versus observed, and a screenshot. The agent never sees the contract.
3. **Claude Code** fixes `app.js` in a disposable copy, outside Optimus.
4. **Integrity:** the contract hash and the grader hash are unchanged; only app files changed.
5. **Fresh Kane run** of the whole scope, with new IDs: Add, Remove and Persist all PASS.

The record links every step by ID: baseline run, decision, brief, agent invocation, code revisions, verification run.

## 5. The blind test (1 min)

Build U was made in a separate session, with one bug sealed in a file nobody opened until grading finished.

- Blind grade: Add PASS, Remove PASS, **Persist FAIL**.
- Unsealed description: "the add-book handler… does not save it to local storage".
- From the brief alone, the agent found the same cause ("toggling and removing already saved, but adding didn't") and added one line. Kane verified the fix.

## 6. It refuses to guess (30 s)

Several repair sessions stopped instead of claiming success: a network outage, Kane planner stalls, a login error, an unreadable balance. Each stop is recorded with its reason. A verifier that says "I don't know" when it doesn't know is one you can trust.

## Reproduce

```sh
npm ci && npm test                       # 184 offline tests, no Kane needed
export OPTIMUS_KANE_CLI=<path to kane-cli.cjs>
npm run optimus -- repair --pack packs/library --app corpus/c-remove-wrong --scenarios L1,L3,L4
```

You need Kane CLI 0.10.6 signed in with no Chrome profile set, Claude Code on PATH, and mains power. One repair session costs about 300–370 Kane credits and takes 30–45 minutes.
