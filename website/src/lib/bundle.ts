/**
 * Build-time access to the real comparison bundle.
 *
 * The site renders verdicts ONLY from a bundle validated with the backend's own schema
 * (../src/report/schema.ts, docs/UI_DATA_CONTRACT.md). Nothing here grades anything: it reads
 * `result.verdict` and arranges it. Latest verdicts are read through `builds[].latestRuns`
 * (bundle version 2), never through `latestRunId`.
 */
import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { comparisonBundleSchema, type ComparisonBundle } from "../../../src/report/schema";

export type Verdict = ComparisonBundle["runs"][number]["scenarios"][number]["result"]["verdict"];

/** Where the committed real-data fixture lives, relative to website/. */
export const BUNDLE_DIR = path.join(process.cwd(), "..", "tests", "fixtures", "report-bundle");

/** The repair the page walks through, when the bundle has it (the blind build in the Library demo). */
const FEATURED_REPAIR_BUILD = "u-unseen";

/** Plain names for the Library demo; any other pack falls back to the scenario id (data contract). */
const SCENARIO_NAMES: Record<string, string> = { L1: "Add", L2: "Toggle read", L3: "Remove", L4: "Persist" };

let cached: ComparisonBundle | null = null;

export function loadBundle(): ComparisonBundle {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(path.join(BUNDLE_DIR, "bundle.json"), "utf8"));
  cached = comparisonBundleSchema.parse(raw);
  return cached;
}

export interface MatrixCell {
  scenarioId: string;
  baseline: Verdict;
  latest: Verdict;
  /** The run that supplied the latest verdict. */
  latestRunId: string;
  changed: boolean;
}

export interface MatrixRow {
  buildId: string;
  label: string;
  repairState: ComparisonBundle["builds"][number]["repairState"];
  cells: MatrixCell[];
  /** Fraction of in-scope scenarios passing in the latest verdicts, or null if any is unresolved. */
  score: number | null;
}

export interface SiteData {
  assessmentName: string;
  pack: ComparisonBundle["assessment"]["pack"];
  scope: { id: string; name: string }[];
  matrix: MatrixRow[];
  calibration: { cases: number; matched: number; replays: number; seconds: number; credits: number; apps: number; trials: number; notes: string[] } | null;
  /** Repaired builds whose latest verdicts all pass: each one a verified FAIL → fresh Kane run → PASS. */
  verifiedRepairs: number;
  repair: RepairStory | null;
  contractScenario: ComparisonBundle["contract"][number] | null;
  evidence: EvidenceStory | null;
}

export interface RepairStory {
  sessionId: string;
  buildLabel: string;
  scenarioId: string;
  scenarioName: string;
  baseline: Verdict;
  latest: Verdict;
  requirement: string;
  expected: string;
  observed: string;
  changedFiles: string[];
  diffStat: string;
  diff: string;
  agent: string | null;
  attempts: number;
  creditsUsed: number | null;
  minutes: number;
  integrity: { label: string; ok: boolean }[];
  outcome: string;
  /** The same scenario in the fresh verification run: what Kane recorded after the fix. */
  verifiedSteps: EvidenceStory["steps"];
}

export interface EvidenceStory {
  buildLabel: string;
  scenarioId: string;
  scenarioName: string;
  reason: string;
  expected: string | null;
  observed: string | null;
  steps: { stepId: string; action: string; recorded: boolean | null; values: Record<string, string | null>; screenshot: string | null }[];
  verdict: Verdict;
}

function verdictOf(bundle: ComparisonBundle, runId: string, scenarioId: string): Verdict {
  const run = bundle.runs.find((r) => r.runId === runId);
  const scenario = run?.scenarios.find((s) => s.scenarioId === scenarioId);
  return scenario ? scenario.result.verdict : "NOT_RUN";
}

export function scenarioName(id: string) {
  return SCENARIO_NAMES[id] ?? id;
}

export function getSiteData(): SiteData {
  const bundle = loadBundle();

  const matrix: MatrixRow[] = bundle.builds.map((build) => {
    const cells = bundle.scope.map((scenarioId) => {
      const latestRunId = build.latestRuns[scenarioId];
      const baseline = verdictOf(bundle, build.baselineRunId, scenarioId);
      const latest = verdictOf(bundle, latestRunId, scenarioId);
      return { scenarioId, baseline, latest, latestRunId, changed: latestRunId !== build.baselineRunId };
    });
    const resolved = cells.every((c) => c.latest === "PASS" || c.latest === "FAIL");
    const score = resolved ? cells.filter((c) => c.latest === "PASS").length / cells.length : null;
    return { buildId: build.buildId, label: build.label, repairState: build.repairState, cells, score };
  });

  const cal = bundle.calibration;
  const calibration = cal
    ? {
        cases: cal.rows.length,
        matched: cal.rows.filter((r) => r.expected === r.verdict).length,
        replays: bundle.runs
          .filter((r) => r.source === "gate")
          .flatMap((r) => r.scenarios)
          .reduce((n, s) => n + (s.integrity.replayDecisions ?? 0), 0),
        seconds: cal.rows.reduce((n, r) => n + (r.seconds ?? 0), 0),
        credits: cal.rows.reduce((n, r) => n + (r.credits ?? 0), 0),
        apps: new Set(cal.rows.map((r) => r.app)).size,
        trials: new Set(cal.rows.map((r) => r.trial)).size,
        notes: cal.notes,
      }
    : null;

  // The repair story: only a session that exists, has an attempt and a verified outcome. The page
  // features the blind build: its defect was sealed until grading, like a real submission nobody
  // has seen. Any other bundle falls back to its first session with an attempt.
  let repair: RepairStory | null = null;
  const withAttempts = bundle.repairs.filter((r) => r.attempts.length > 0);
  const session = withAttempts.find((r) => r.buildId === FEATURED_REPAIR_BUILD) ?? withAttempts[0];
  if (session) {
    const build = bundle.builds.find((b) => b.buildId === session.buildId)!;
    const attempt = session.attempts[session.attempts.length - 1];
    const failing = bundle.scope.find(
      (id) => verdictOf(bundle, build.baselineRunId, id) === "FAIL",
    );
    if (failing) {
      const latestRunId = build.latestRuns[failing];
      repair = {
        sessionId: session.sessionId,
        buildLabel: build.label,
        scenarioId: failing,
        scenarioName: scenarioName(failing),
        baseline: verdictOf(bundle, build.baselineRunId, failing),
        latest: verdictOf(bundle, latestRunId, failing),
        requirement: attempt.requirement,
        expected: attempt.expected,
        observed: attempt.observed,
        changedFiles: attempt.changedFiles,
        diffStat: attempt.diffStat,
        diff: attempt.diff,
        agent: attempt.agent?.agent ?? null,
        attempts: session.budget.attemptsUsed,
        creditsUsed: session.budget.creditsUsed,
        minutes: session.budget.repairMinutesUsed,
        integrity: attempt.integrity
          ? [
              { label: "Agent worked in a copy outside Optimus", ok: attempt.integrity.workspaceOutsideOptimus },
              { label: "Contract hash unchanged", ok: attempt.integrity.packHashUnchanged },
              { label: "Evaluator and Kane adapter unchanged", ok: attempt.integrity.graderUnchanged },
            ]
          : [],
        outcome: session.outcome.reason,
        verifiedSteps: (bundle.runs.find((r) => r.runId === latestRunId)?.scenarios.find((x) => x.scenarioId === failing)?.steps ?? []).map((st) => ({
          stepId: st.stepId,
          action: st.action,
          recorded: st.actionRecorded,
          values: st.values,
          screenshot: st.screenshot,
        })),
      };
    }
  }

  // Evidence: the failing baseline run of the repaired build shows recorded values and screenshots.
  let evidence: EvidenceStory | null = null;
  if (repair) {
    const build = bundle.builds.find((b) => b.buildId === session!.buildId)!;
    const run = bundle.runs.find((r) => r.runId === build.baselineRunId)!;
    const scenario = run.scenarios.find((s) => s.scenarioId === repair!.scenarioId)!;
    evidence = {
      buildLabel: build.label,
      scenarioId: scenario.scenarioId,
      scenarioName: scenarioName(scenario.scenarioId),
      verdict: scenario.result.verdict,
      reason: scenario.result.reason,
      expected: scenario.result.expected === undefined ? null : typeof scenario.result.expected === "string" ? scenario.result.expected : JSON.stringify(scenario.result.expected),
      observed: scenario.result.observed ?? null,
      steps: scenario.steps.map((s) => ({
        stepId: s.stepId,
        action: s.action,
        recorded: s.actionRecorded,
        values: s.values,
        screenshot: s.screenshot,
      })),
    };
  }

  const contractScenario = bundle.contract.find((c) => c.id === (repair?.scenarioId ?? bundle.scope[0])) ?? null;

  return {
    assessmentName: bundle.assessment.name,
    pack: bundle.assessment.pack,
    scope: bundle.scope.map((id) => ({ id, name: scenarioName(id) })),
    matrix,
    calibration,
    verifiedRepairs: matrix.filter((row) => row.repairState === "repaired" && row.score === 1).length,
    repair,
    contractScenario,
    evidence,
  };
}
