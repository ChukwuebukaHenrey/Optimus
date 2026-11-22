# Optimus — rules for the coding agent (v2, Library-first)

Applies to any coding agent (Codex reads this file as AGENTS.md; Claude Code reads it via CLAUDE.md).

## What Optimus is (three layers — keep them separate)

- **Product architecture:** a reusable behavioural assessment engine for web applications.
  One approved contract (a "pack") is applied, unchanged, to many independently built apps.
  Kane CLI (TestMu AI) acts and observes in a real browser; Optimus's deterministic code
  decides. Nothing in `src/core/` may mention education, grades, classrooms or any one app.
- **Initial workflow:** instructors evaluating many implementations of one assignment.
  (Education wording lives in reports/README, never in the engine.)
- **Hackathon demonstration:** a Library assignment, graded across structurally different
  builds. Calculator is an optional second pack. Tic-Tac-Toe is a later pack.

Pitch: "One contract. Many different builds. Evidence-backed verdicts."
Kane CLI Online Hackathon deadline: 26 Nov 2026, 11:59 PM IST. Repo started on or after
12 Nov 2026; every line of code written during the event.

## Non-negotiable rules

1. **Kane never judges.** Kane acts and records. Verdicts come only from `src/core/evaluate.ts`
   (declarative expectations, or an optional pack oracle). No LLM may determine, override or
   reinterpret a verdict, and the evaluator makes no LLM calls. The repair controller may invoke
   an external coding agent, which receives only validated failure briefs and may change only
   the app under repair, never the contract, the evaluator or the adapter.
2. **Kane-facing test files are neutral.** Steps say what to do and what to record, never what
   should happen. No verify lines, no expected values, no titles that hint at the outcome.
3. **One contract, unchanged, for every app.** Never edit a pack to suit one implementation.
   Each run records the pack's content hash; all apps in a comparison must share one hash.
   The only per-run inputs are the app URL and a run nonce.
4. **No custom browser recorder, no DOM observer, no element-detection engine.**
   Insufficient evidence → INCONCLUSIVE, not more browser code.
5. **FAIL only after the interaction is established; PASS only after the required behaviour
   was actually exercised.** An action expected to change the page that leaves it unchanged is
   INCONCLUSIVE (a missed click looks identical). FAIL needs a visible wrong change or a wrong
   recorded value after an established action.
6. **Assignment knowledge lives only in packs (`packs/<name>/`).** Most packs are declarative
   `pack.yaml` files with no code; a pack adds an oracle only when expected values must be
   computed from many steps (games).
7. **Evaluator input is the normalized observation format** (`src/core/types.ts`), never raw
   Kane NDJSON. Only `src/kane/` knows Kane's formats. Missing data stays missing; never
   fabricate or infer evidence.
8. **No replay counts toward a grade.** Runs use `--author`. Generated test files must not
   contain `@import` or any replay-only marker (`@db @api @js @smartui @network_query
   @network_assertion @gps @accessibility @media_injection @network_throttle @deeplink`).
   `optimus lint` enforces this; a run with `replay_decisions > 0` is rejected.
9. **Never edit a pack, oracle or evaluator to make a result pass.** When repairing a corpus
   app, edit only that app.
10. **A pack is calibrated before it judges anyone:** it must pass on a known-good reference app.
11. **Commit small and often** with honest messages. Never squash, rebase away, force-push or
    backdate. Never commit secrets, `.env*`, Kane credentials or raw evidence packs.

## Stack

- Node 18+, TypeScript (ESM), `vitest`, `tsx`, `zod` for schema validation, `yaml` for packs.
- Developer machine: Windows, Git Bash. Use `path.join`, never hard-coded `/`.
- Spawning Kane: `child_process.spawn` with `stdio: ['ignore', 'pipe', 'pipe']`, `shell: false`.

## Layout

```
src/core/types.ts      Verdict, ActionStatus, Observation, ScenarioTrace, ScenarioResult, RunRecord
src/core/pack.ts       load + validate pack.yaml (zod); content hash
src/core/expect.ts     deterministic assertion types (below)
src/core/generate.ts   pack + nonce → neutral _test.md files (do + record only, never expect)
src/core/lint.ts       rejects verify lines, expected values, @import, replay-only markers
src/core/evaluate.ts   integrity → action evidence → change plausibility → assertions
src/core/report.ts     result.json + escaped static HTML (later)
src/kane/parse.ts      Kane NDJSON → normalized observations (PROVISIONAL until a real run)
src/kane/run.ts        one sequential `testmd run` per scenario (Phase 1)
src/cli.ts             optimus lint | gen-tests | evaluate | run (run comes later)
packs/library/pack.yaml   hackathon pack
packs/calculator/pack.yaml optional second pack (after Gate 1)
corpus/                test apps (built in separate sessions)
tests/                 vitest; hand-written and corrupted traces
```

## Verdicts and exit codes

`PASS | FAIL | INCONCLUSIVE | NOT_RUN | INFRA_ERROR | UNSUPPORTED`, each with a reason code and a
plain-English reason. A numeric score only when every scenario is resolved; else "provisional".
CLI exit codes: 0 PASS, 10 FAIL, 20 INCONCLUSIVE/NOT_RUN, 30 INFRA_ERROR, 40 ESCALATED/BUDGET.

## Normalized observation (contract)

```ts
type ActionStatus = 'verified' | 'contradicted' | 'unknown';
type Observation = {
  stepIndex: number;
  stepId: string;                          // pack step id
  actionKind: 'open' | 'interact' | 'reload' | 'none';
  actionRecorded: boolean | null;          // click/fill/navigation present in evidence; null = not available
  targetAgreement: ActionStatus;           // experimental; 'unknown' is normal
  values: Record<string, string | null>;   // recorded values; null = missing
  screenshotRef: string | null;
  evidenceRef: string | null;
};
```
Run-level: `completed`, `kaneExitCode`, `replayDecisions`, `authorDecisions`, `evidencePackPath`,
`kaneVersion`, `executionId`, `stepsSkipped`, `packHash`, `nonce`, `appUrl`.

## Declarative pack format

```yaml
pack: library
version: 1
support: "DOM-rendered apps that list books as visible text; data kept in the browser"
persistence: "survives a page reload in the same browser session (not a fresh browser profile)"
scenarios:
  - id: L1
    title: "Scenario L1: add a record and record the list"     # neutral; goes to Kane
    preconditions: "fresh browser profile; app at its starting state (may contain sample books)"
    steps:
      - id: before
        do: "Open the page."
        record:
          titles_before: "every book title currently shown, separated by |, or 'none'"
          count_before: "the number of books currently shown"
      - id: add
        do: "Add a new book with title \"GP Book {{nonce}}\", author \"Ada Okafor\", 123 pages, not read yet, and save it."
        expects_change: true
        record:
          titles_after: "every book title currently shown, separated by |"
          count_after: "the number of books currently shown"
    expect:
      - { op: not_contains, value: titles_before, arg: "GP Book {{nonce}}" }
      - { op: contains,     value: titles_after,  arg: "GP Book {{nonce}}" }
      - { op: delta,        value: count_after,   from: count_before, by: 1 }
    evidence: "the add step has a recorded interaction; before and after values present"
```

- `title`, `do`, `record` go to Kane. `expect`, `preconditions`, `evidence` never do.
- `{{nonce}}` is a short random run id substituted at generation time. It is a run input, not
  part of the contract; `packHash` is computed on pack.yaml with `{{nonce}}` unexpanded.
- **Assertions are relative to recorded "before" values,** never absolute counts, because apps
  may start with sample data. Every new record uses a unique `{{nonce}}` title.
- Assertion types (`src/core/expect.ts`), deterministic, with normalisation (trim, collapse
  spaces, case-insensitive unless `case: exact`): `equals`, `equals_number` (parses "19",
  "19.0", "1,200"), `contains`, `not_contains`, `one_of`, `matches`, `list_contains` /
  `list_not_contains` (split on `|`), `count_equals`, `delta` (after − before = by), `absent`.
  A value that can't be parsed for its assertion → INCONCLUSIVE, never FAIL.
- Expected values are written or approved by a human. AI may draft a pack later; never used
  until approved and calibrated.
- Out of scope: subjective quality, server internals, server-backed data (needs seeding/reset),
  live external APIs, canvas-only UIs (→ UNSUPPORTED), audio.

## Evaluation order (per scenario)

1. **Run integrity** — completed; `replayDecisions === 0`; evidence pack present; `packHash`
   matches the comparison. Kane exit 2/3 or missing pack → INFRA_ERROR. Steps skipped before the
   decisive step → NOT_RUN.
2. **Action evidence** — every step with an action has `actionRecorded === true` (reload counts
   if a navigation is recorded). `false`/`null` → INCONCLUSIVE. `targetAgreement === 'contradicted'`
   → INCONCLUSIVE.
3. **Change plausibility** — every value an assertion needs exists and parses. For a step with
   `expects_change: true`, if every recorded value is identical before and after → INCONCLUSIVE
   (`no_observable_change`).
4. **Assertions** — first failing assertion → FAIL with step, expected and observed.

## Library pack (hackathon)

- **L1 Add:** before list → add `GP Book {{nonce}}` → title absent before, present after, count +1.
- **L3 Remove:** add `GP Alpha {{nonce}}` and `GP Beta {{nonce}}`, record list → remove the book
  titled `GP Alpha {{nonce}}` → Alpha absent, Beta still present, count −1.
- **L4 Persist:** add `GP Keep {{nonce}}`, record → reload the page → title still present, count unchanged.
- **L2 Toggle read (Gate 2):** add a not-read book → change its read status → its status text is
  one of the "read" synonyms declared in the pack (e.g. read, finished, done, ✓, yes).
- Gate 1 uses L1, L3, L4.

## Kane facts (verified from docs; re-check against the first real run)

- `kane-cli testmd run <file> --url <app> --author --agent --headless`.
- Leave `chrome_profile` unset and `chrome_profile_path` empty → fresh temporary profile per
  run. Refuse to run if `kane-cli config show` reports a profile path.
- Authoring stream: per step, an inner `run_end` carries cumulative `final_state` (stored
  values); `test_md_step_end` (`status`, `failed_sub_step_index`); then `test_md_summary`
  (`overall_status`, `steps.replay_decisions`, `steps.author_decisions`) and `test_md_done`.
  Replayed steps use a different `run_end` shape (no `final_state`).
- Evidence pack: zip with `tests/<id>/steps/<n>-<id>/step.json` (click coordinates, element
  rect), `screenshot.png`, `annotated.png`, `failure.yaml`. **Unverified:** whether every
  interaction (click, fill, reload) is recorded in `step.json` — Phase 1 checks this.
- Exit codes: 0 passed, 1 failed, 2 error (auth/Chrome/network), 3 timeout/cancelled.
- Every authoring run uploads to TestMu Test Manager; upload failure ends the run →
  INFRA_ERROR, retry once.

## Repair loop (Phase 4, after grading is proven; agent-independent controller)

The loop is driven by Optimus, not by one agent's lifecycle hooks:
verified failure → brief → coding agent → integrity checks → fresh full Kane run → recorded outcome.

- **Decision gate** (`src/loop/decision.ts`). Read every scenario in `result.json`; never rely
  on the process exit code. Decisions: `COMPLETE` (all PASS), `REPAIR` (at least one verified
  FAIL and nothing unresolved), `NEEDS_EVIDENCE` (any INCONCLUSIVE or NOT_RUN),
  `RETRY_INFRASTRUCTURE` (INFRA_ERROR; one retry, separate count), `STOP` (UNSUPPORTED, caps
  reached, or a mix of FAIL and unresolved). Only a verified FAIL may start a repair.
- **Brief** (`src/loop/brief.ts`). JSON plus Markdown with only: scenario id, plain-language
  requirement rendered from the assertions, expected vs observed for the failing step,
  screenshot path, app path and the allowed edit scope. Never the pack or the expected verdicts.
- **Agent invocation.** A configurable agent CLI (default Claude Code in headless mode) runs in
  a disposable copy of the app outside the Optimus folder. A Claude Code Stop hook may be used
  as an optional adapter; the controller never depends on it.
- **Integrity checks before every rerun.** Only files inside the app copy changed (diff);
  the pack hash and the hashes of `src/core/` and `src/kane/` are unchanged; the browser
  profile is fresh. Honest limit: an agent with shell access could still read the packs.
- **Rerun.** The full calibrated scenario set (Gate 1 scope: L1, L3, L4) with a new nonce and a
  new execution ID, never only the failing scenario.
- **Caps.** 3 repair attempts, 1,500 credits (void attempts included), 20 minutes. When a cap
  is reached the loop stops; it never changes the contract, broadens permissions or retries
  silently.
- **Audit record** (`repair-history.json`). Baseline execution, decision, brief, agent
  invocation and final message, code diff, hashes, new execution, attempts, budget used and the
  stopping reason.

## Out of scope for the hackathon

Hosted service, arbitrary public URLs (controlled targets only), server-backed apps, AI pack
drafting, LMS/classroom features, hiring/agency workflows, mobile, audio.
