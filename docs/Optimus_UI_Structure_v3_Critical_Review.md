# Optimus UI Structure v3 — Critical Review and Recommended Corrections

**Source reviewed:** `UI_STRUCTURE(2).md` (Revision 3)  
**Decision:** Approve the direction, subject to targeted architectural revisions. Do not expand scope further before the closed-loop workflow is demonstrated.

## Executive assessment

Revision 3 is considerably stronger than the earlier drafts. It now treats the repair loop as something Optimus must **prove**, rather than simply describe. Its proposed fourth level—an evidence-backed repair record—would make the Kane → coding agent → repair → Kane sequence visible to a reviewer.

However, the specification still contains **three significant architectural problems, two direct contradictions, and a scope/dependency risk**. These should be resolved before implementation.

## 1. What improved

The revised report has a coherent four-level reading path:

| Level | Reader's question | Primary content |
|---|---|---|
| 1. Comparison overview | Which builds meet the contract? | Cross-build verdict matrix |
| 2. Build detail | Why did this build receive these verdicts? | Individual scenario results and reasons |
| 3. Scenario evidence | What is the proof? | Step records, before/after values, screenshots |
| 4. Repair record | Did the fix work, and can it be trusted? | Baseline failure, agent brief, code diff, fresh verification, integrity checks |

This follows the product's core promise: **one unchanged behavioral contract applied to independently built applications, producing evidence-backed verdicts**.

The new repair record captures most of the evidence needed for the hackathon's Closed-loop and Craft dimensions: baseline failure, controller decision, agent instructions, code modifications, unchanged contract, fresh Kane results, and resource usage.

**Keep this hierarchy.** The remaining work is to ensure its claims can be established by the underlying execution records.

## 2. Three architectural problems

### Problem 1 — The report mixes an assessment product with a repair audit

Optimus's primary assessment workflow serves people comparing multiple implementations of a shared assignment. Such readers need verdicts and supporting evidence, but they do not necessarily need agent invocation logs, code diffs, or repair budgets.

**Recommended correction:** Keep Level 4, but make it an **optional repair audit**, shown only for builds that underwent a recorded repair workflow. Ordinary grading reports must still make complete sense without repair attempts or coding agents.

This avoids turning a hackathon demonstration feature into a mandatory part of the core report experience.

### Problem 2 — Displaying an agent brief and a PASS does not, by itself, prove that the agent caused the fix

A report can display a failure, an agent's final message, a code diff, and a later passing run while leaving important questions unanswered: Did the agent receive that specific failure? Was its invocation successful? Did it actually modify those files? Was the subsequent verification run tied to those modifications?

**Recommended correction:** Require a machine-generated causal/audit chain:

```text
baselineRunId
  → decisionId
  → briefId
  → agentInvocationId
  → changedCommitOrRevision
  → verificationRunId
```

Record timestamps, execution status, source revision before and after repair, sanitized agent inputs/outputs, and the resulting verification evidence. Render the UI from those records—not from manually assembled storytelling.

This is an **audit trail**, not mathematical proof of causality; it establishes an inspectable relationship between the events.

### Problem 3 — A simple `result.json` combiner is insufficient for repair-aware comparisons

Revision 3 says the comparison matrix requires only a combiner over existing `result.json` files (line 51). That may be true for the baseline comparison, but the repair-aware matrix introduces multiple runs per build, multiple attempts, and potentially incomplete workflows.

**Recommended correction:** The report assembly layer should group records using explicit keys such as:

- Assessment/build identifier.
- Unexpanded pack hash and calibrated scenario scope.
- Repair-session identifier, when applicable.
- Baseline run ID, numbered repair attempts, and final verification run ID.

Never infer which run is the latest valid result based only on timestamps, file names, or directory order.

## 3. Direct contradictions to resolve

### Contradiction A — “Self-contained HTML” versus external screenshots

The constraints describe one self-contained HTML file (lines 11–14), while the proposed report references screenshots in a neighboring `evidence/` folder (lines 34–36 and 63–73).

Those are different delivery models.

**Decision recommended:** Use an **offline report bundle** with an `index.html` entry point and an `evidence/` directory. It remains usable without a server or account, but must no longer be described as one self-contained file. Update and test the Content Security Policy for locally referenced images.

### Contradiction B — The agent receives expected outcomes but supposedly receives no expected values

The Level 4 specification says the brief contains *expected and observed values*, yet also says *“the pack and expected values were not included”* (line 81).

These statements are inconsistent.

**Correct rule:** The coding agent may receive the **specific plain-language requirement and expected-versus-observed behavior** necessary to fix a verified failure. It must not receive or modify the hidden full evaluator, oracle, unrelated assertions, or approved contract. The repair process must enforce file boundaries outside the agent's instructions.

### Editorial contradiction — Remove the obsolete scope statement

Line 105 still says: *“Out of scope until after grading is proven: the Phase 4 repair loop view.”* Revision 3 has already introduced that view as Level 4. Remove or replace this sentence with a clear statement that Level 4 is rendered **only when repair history exists**.

## 4. Correct how repair states appear in the comparison matrix

The draft proposes cells such as `FAIL → PASS`, with the original failure dimmed or struck through.

Do **not** strike through a baseline failure. It is valid historical evidence. A later repair changes the application's state, not what Kane observed in the original run.

Prefer distinct baseline and final columns or clearly labeled inline states:

| Build | Baseline assessment | Latest verified assessment | Repair state |
|---|---|---|---|
| Vanilla A | L1/L3/L4 PASS | Same baseline | No repair |
| React B | L1/L3/L4 PASS | Same baseline | No repair |
| Defective C | L3 FAIL | L3 PASS; other calibrated scenarios PASS | Repaired |
| Defective D | L4 FAIL | Not yet reverified | Not repaired |

**Important:** This table is *illustrative*. A post-repair PASS must not be presented as real until a fresh Kane run establishes it.

The actual matrix should continue to show **per-scenario verdicts**, rather than only this summary.

## 5. Strengthen the integrity checks

The proposed integrity seal checks allowed app files, unchanged pack hash, unchanged evaluator/adapter hashes, and a fresh browser profile. These are appropriate but not sufficient as a complete security guarantee.

| Integrity property | Recommended control |
|---|---|
| Agent changes only the application | Isolated workspace or disposable checkout with independently enforced permissions |
| Approved contract unchanged | Recompute and compare the original pack hash before and after the repair |
| Evaluator and adapter unchanged | Separate grader from editable app; verify relevant source revisions and hashes |
| New verification is genuinely fresh | Fresh browser context, distinct execution ID and nonce |
| No regression in unrelated requirements | Rerun **every calibrated scenario in the declared scope** |
| Evidence remains auditable | Preserve original Kane archives and references for each run |
| Report safely displays untrusted content | Escape/sanitize agent output, diffs, recorded values and paths |

A matching final hash does **not** prove the agent never read or temporarily changed a protected file. Workspace isolation is the stronger control; hashes are a useful complementary check.

The repair record must capture the application's source revision **before and after** the repair, not only the grader and pack hashes.

## 6. Scope and dependency concerns

Revision 3 expands the component list from 16 to 23, adding repair cell states, decision badges, timelines, agent panels, diff views, integrity seals, and budget meters (lines 107–133).

The number of components is not inherently a problem. The concern is that the document says **nothing yet produces `repair-history.json`** (line 91).

A polished repair timeline built before the controller writes genuine event records risks becoming an attractive but unsubstantiated demonstration.

### Recommended build priorities

| Priority | Deliverable | Acceptance criterion |
|---|---|---|
| P0 | Working repair controller | Real verified FAIL triggers constrained agent work |
| P0 | Genuine agent feedback and repair | Agent invocation and code changes are recorded |
| P0 | Fresh Kane verification | Same approved contract, fresh run, complete calibrated scenario scope |
| P0 | Minimal repair audit | Timeline rendered exclusively from real `repair-history.json` data |
| P0 | Comparison matrix | Baseline and post-repair outcomes remain distinguishable |
| P1 | Detailed screenshots and scenario evidence | Paths, images and observations are traceable to archives |
| P1 | Contract transparency and integrity disclosures | Hashes and methodology can be inspected |
| P2 | Elaborate diff presentation, budget visuals, cosmetic polish | Add only after execution reliability is demonstrated |

Designing the repair UI before the controller is fine. **Implementing a fabricated repair journey as though it were validated is not.**

## 7. Fit against the KaneCLI hackathon

| Judging dimension | How Revision 3 helps | Remaining risk |
|---|---|---|
| **Ships** | Clearer offline report deliverable | Must be generated by working code |
| **Verified** | Stronger evidence and provenance presentation | Kane's observations still require calibration |
| **Closed loop** | Explicit representation of agent feedback and re-verification | Underlying controller and actual agent invocation must be demonstrated |
| **Craft** | Better transparency, traceability and reader flow | UI complexity can distract from usability and reliability |

**A UI specification cannot fulfill the closed-loop requirement by itself.** The actual workflow must pass a real failure into a coding agent, produce a constrained code change, and rerun Kane against the repaired application.

## Final decision

**Approve Revision 3 after these targeted changes:**

1. Preserve the four-level reading path, making Level 4 optional for non-repaired builds.
2. Establish a repair-session ID and a machine-generated chain connecting baseline evidence, agent invocation, code revision, and fresh verification.
3. Make comparison aggregation explicitly repair-aware instead of treating every `result.json` as an interchangeable run.
4. Resolve the offline bundle/CSP contradiction.
5. Clarify that the agent may see the relevant failure requirement and expected outcome but not alter the approved contract or evaluator.
6. Preserve baseline verdicts as history; never overwrite or strike through them when a later run passes.
7. Remove the obsolete sentence claiming the repair view is out of scope.
8. Implement and validate the repair controller and audit data **before** investing in elaborate repair-view styling.

**Central recommendation:** The next milestone is not another UI revision. It is a real, reproducible **verified failure → agent repair → unchanged contract → fresh Kane verification** sequence, with a report generated from that evidence.
