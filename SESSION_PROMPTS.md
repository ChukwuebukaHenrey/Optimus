# Optimus — coding-agent session prompts (v2, Library-first)

Run each prompt in a **new** session of your coding agent (Codex or Claude Code). Put `AGENTS.md` and `CLAUDE.md` in the repo root first.
Sessions 2, 3 and 5 build test apps and must not see the pack or each other's code — run them
in folders **outside** the optimus repo, then copy the results in.

Before session 1: check `git config user.name` / `user.email` are yours; Node 18+ installed.
Sessions 1–3 need no Kane and no credits, and can run in cloud Codex or cloud Claude Code.

---

## Session 1 — credit-free core

```
Read AGENTS.md fully before doing anything. It is the authoritative spec; follow it exactly.

In this empty folder:
1. git init. Add .gitignore (node_modules, dist, .env*, .testmuai/, *.evidence, .optimus/,
   runs/**/raw/), MIT LICENSE, README stub, BUILT_DURING_EVENT.md (first-commit date; all code
   written during the Kane CLI Online Hackathon). Commit.
2. Node + TypeScript (ESM) + vitest + tsx + zod + yaml. Commit.
3. src/core/types.ts exactly as AGENTS.md. No app or education concepts in src/core. Commit.
4. src/core/pack.ts — load and validate pack.yaml; content hash computed with {{nonce}}
   unexpanded. Tests: valid pack, missing fields, unknown assertion type. Commit.
5. src/core/expect.ts — every assertion type in AGENTS.md, with normalisation. Tests for each,
   including unparseable values (→ INCONCLUSIVE) and delta with missing "before". Commit.
6. packs/library/pack.yaml — scenarios L1, L3, L4 (Gate 1) and L2 (Gate 2) exactly as described
   in AGENTS.md. Also tests/fixtures/calculator.pack.yaml (one scenario: press 12 + 7 = → display
   equals_number 19) to prove the core isn't Library-specific. Commit.
7. src/core/generate.ts + src/core/lint.ts + CLI `gen-tests --pack <p> --nonce <n>` and `lint`.
   Generated _test.md: one file per scenario; frontmatter mode: testing; the neutral title; one
   `##` step per pack step with the `do` text then one "Store … as '<key>'" line per record entry.
   Never write expect/preconditions/evidence. Lint rejects verify lines, @import, replay-only
   markers, and any expect arg that is not also present in a `do` line. Tests. Commit.
8. src/core/evaluate.ts — the four-stage evaluation in AGENTS.md. Vitest cases from hand-made
   traces for the Library pack:
   L1 correct → PASS; title missing after add → FAIL; count +2 → FAIL;
   L3 correct → PASS; wrong book removed (Alpha present, Beta gone) → FAIL;
   L3 nothing changed after a recorded remove → INCONCLUSIVE (no_observable_change);
   L4 correct → PASS; book gone after a recorded reload → FAIL; reload not recorded → INCONCLUSIVE;
   actionRecorded false/null → INCONCLUSIVE; targetAgreement contradicted → INCONCLUSIVE;
   replayDecisions > 0 → rejected; packHash mismatch → rejected; Kane exit 2 → INFRA_ERROR;
   steps skipped before the decisive step → NOT_RUN; unparseable count → INCONCLUSIVE;
   app with pre-existing sample books → relative assertions still PASS.
   Plus calculator: "19" → PASS, "20" → FAIL. Commit.
9. src/kane/parse.ts — PROVISIONAL parser, Kane NDJSON → Observation[]. To see real shapes,
   clone https://github.com/LambdaTest/kane-cli into a temp folder OUTSIDE this repo and read
   skill-installer/test/fixtures/testmd-author.ndjson, testmd-replay.ndjson,
   docs/user-guide/testmd/running.md and docs/user-guide/evidence.md. Do NOT copy those fixtures
   into this repo; write minimal fixtures of our own. Missing fields → null/false. Commit.
10. src/cli.ts: `lint`, `gen-tests`, `evaluate <trace.json>` with the exit codes. Commit.

No Kane calls, no LLM calls, no browser code. Run the full suite before each commit.
Report: what was built, test count, anything in AGENTS.md you find ambiguous.
```

---

## Session 2 — test app A (separate folder; no access to optimus)

```
In this empty folder, build a personal library web app in plain HTML, CSS and vanilla JavaScript.
- A form (always visible) with title, author, pages and a "read" checkbox, and an "Add Book" button.
- Books shown as cards, each showing title, author, pages and a read status ("Read" / "Not read").
- Each card has a "Remove" button and a "Toggle read" button.
- Save the list in localStorage so it survives a page reload. Start with an empty library.
- Validate: title and author required.
Serve with `npx serve .` (document in README). Commit as you go.
```

Copy into `optimus/corpus/a-vanilla/`. Then derive (one commit each, message names the defect):
- `corpus/c-remove-wrong/`: A where Remove deletes the **first** book in the list instead of the clicked one.
- `corpus/d-no-persist/`: A with localStorage saving removed (books vanish on reload).

---

## Session 3 — test app B (separate folder; do NOT show it app A)

```
In this empty folder, build a reading-list app with React + Vite.
- The list is a table (title, author, pages, status) on the left; a summary panel on the right.
- Adding a book: a round "+" icon button opens a modal with the fields and a "Save" button.
- Status column shows "Finished" or "To read"; clicking it switches between them.
- Each row has a trash-can icon button (aria-label "Delete") to remove it.
- Start with two sample books already in the list.
- Persist in localStorage so the list survives a reload.
Document `npm install` and `npm run dev` in README. Commit as you go.
```

Copy into `optimus/corpus/b-react/`.

---

## Session 5 — unseen defect U (separate folder; Optimus sessions must not see the defect)

```
Copy the app in this folder. Introduce exactly ONE realistic behavioural bug a beginner might make
in add, remove, read-status or persistence. Do not mention it in code comments or commit messages.
Write the bug description to DEFECT.txt OUTSIDE the app folder and do not show it to me.
```

Run it on a copy of A or B. Put the app in `corpus/u-unseen/`; keep DEFECT.txt sealed until grading is done.

---

## Session 4 — Phase 1: first real Kane run (your machine, Kane login + Chrome)

Most stable connection. First: `npm i -g @testmuai/kane-cli`, `kane-cli login`, `kane-cli whoami`,
`kane-cli balance`; confirm `kane-cli config show` has no Chrome profile path.

```
Read AGENTS.md. Goal: one real Kane run, then inspect what Kane actually produced.
1. Serve corpus/a-vanilla on localhost. `optimus gen-tests --pack packs/library --nonce p1a`;
   lint the L1 file.
2. Record `kane-cli --version` and `kane-cli balance`. Run once:
   kane-cli testmd run <L1 file> --url <local url> --author --agent --headless
   Save raw stdout/stderr to runs/phase1/raw/ (gitignored).
3. Record balance, elapsed time, exit code.
4. Unzip the evidence pack to a temp folder. For each step report: is the interaction (fill,
   click) recorded in step.json with coordinates and element rect? screenshot present? do
   titles_before / count_before / titles_after / count_after appear in each inner run_end's
   final_state?
5. Run src/kane/parse.ts on the real output; fix every mismatch, with a test using a trimmed,
   secret-free copy of real lines.
6. Run L4 once as well and report whether the reload is recorded as a navigation in the evidence.
7. Write runs/phase1/REPORT.md (credits, time, exit codes, the click/reload evidence answers,
   parser changes, surprises). Commit code + report, not raw output.
Stop. Do not run more Kane sessions without my say-so.
```

Then label the screenshots yourself (the real list before/after) and compare with Kane's recorded
values. That comparison, plus the evidence answers, decides whether Gate 1 goes ahead.

## Gate 1 (Sat 21 Nov, 21:00) — L1, L3, L4 × A, B, C, D × 2 runs = 24 Kane runs

- Same pack hash for every run; no per-app edits.
- A and B: PASS on all three. C: FAIL on L3 only. D: FAIL on L4 only.
- Kane's recorded values match your screenshot labels.
- A deliberately wrong instruction or unrecorded action gets neither PASS nor FAIL.
- Credits and time measured per run.
Fallback if Kane can't handle B: Repro. If the evaluator can't be made defensible: kane-bisect.
