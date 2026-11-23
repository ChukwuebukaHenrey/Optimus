/**
 * The report data contract (bundle version 2). The UI renders only from a validated ComparisonBundle.
 * Owned by the backend; see docs/UI_DATA_CONTRACT.md. Change it only with a version bump.
 */
import { z } from 'zod';

const verdict = z.enum(['PASS', 'FAIL', 'INCONCLUSIVE', 'NOT_RUN', 'INFRA_ERROR', 'UNSUPPORTED']);
const decision = z.enum(['COMPLETE', 'REPAIR', 'NEEDS_EVIDENCE', 'RETRY_INFRASTRUCTURE', 'STOP']);
const id = z.string().min(1);
const timestamp = z.string().min(1).nullable();
/** A file inside the bundle folder, for example evidence/run-x/L3-remove.jpg. */
const bundlePath = z.string().regex(/^evidence\/[A-Za-z0-9._/-]+$/u).refine((path) => !path.split('/').includes('..'), 'No parent segments');

export const scenarioResultSchema = z.object({
  scenarioId: id,
  verdict,
  reasonCode: id,
  reason: z.string(),
  stepId: z.string().optional(),
  expected: z.unknown().optional(),
  observed: z.string().nullable().optional(),
});

const stepSchema = z.strictObject({
  stepId: id,
  /** The instruction Kane received for this step, with the run nonce filled in. */
  action: z.string(),
  actionKind: z.enum(['open', 'interact', 'reload', 'none']),
  actionRecorded: z.boolean().nullable(),
  targetAgreement: z.enum(['verified', 'contradicted', 'unknown']),
  /** Values Kane recorded at the end of the step; null means missing or withheld. */
  values: z.record(z.string(), z.string().nullable()),
  /** End-of-step screenshot, or null when none was archived or extracted. */
  screenshot: bundlePath.nullable(),
});

const scenarioRunSchema = z.strictObject({
  scenarioId: id,
  executionId: z.string().nullable(),
  result: scenarioResultSchema,
  integrity: z.strictObject({
    completed: z.boolean(),
    kaneExitCode: z.number().int().nullable(),
    replayDecisions: z.number().int().nullable(),
    authorDecisions: z.number().int().nullable(),
    kaneVersion: z.string().nullable(),
    evidenceArchive: z.boolean(),
  }),
  steps: z.array(stepSchema),
});

const runSchema = z.strictObject({
  runId: id,
  buildId: id,
  /** gate: a calibration matrix case set; repair: a run inside a repair session. */
  source: z.enum(['gate', 'repair']),
  kind: z.enum(['assessment', 'baseline', 'verification', 'infrastructure_retry']),
  nonce: id,
  appUrl: z.string(),
  packHash: z.string().regex(/^[a-f0-9]{64}$/u),
  /** Git revision of the app copy that was assessed (repair sessions only). */
  sourceRevision: z.string().nullable(),
  startedAt: timestamp,
  finishedAt: timestamp,
  creditsUsed: z.number().nullable(),
  scenarios: z.array(scenarioRunSchema),
});

const buildSchema = z.strictObject({
  buildId: id,
  label: z.string().min(1),
  /** App folder relative to the Optimus repository. */
  appSource: z.string(),
  baselineRunId: id,
  /** The most recent run of this build; equals baselineRunId when there was no repair or retry. */
  latestRunId: id,
  /**
   * The run that supplied each in-scope scenario's latest verdict. After an infrastructure retry these can be
   * different runs, always of the same source revision. Read latest verdicts from here, not from latestRunId.
   */
  latestRuns: z.record(z.string(), id),
  repairSessionId: z.string().nullable(),
  repairState: z.enum(['no_repair', 'repaired', 'repair_stopped']),
});

const contractScenarioSchema = z.strictObject({
  id,
  title: z.string(),
  inScope: z.boolean(),
  sentToKane: z.strictObject({
    steps: z.array(z.strictObject({ stepId: id, action: z.string(), record: z.record(z.string(), z.string()) })),
  }),
  judgedByOptimus: z.strictObject({
    checks: z.array(z.strictObject({ text: z.string(), recording: id, prerequisite: z.boolean() })),
    newValues: z.array(z.string()),
    evidenceRule: z.string(),
  }),
});

const attemptSchema = z.strictObject({
  attempt: z.number().int().positive(),
  decisionId: id,
  briefId: id,
  /** Exactly what the agent received, with local paths masked. */
  briefMarkdown: z.string(),
  requirement: z.string(),
  expected: z.string(),
  observed: z.string(),
  failingStepAction: z.string().nullable(),
  briefScreenshot: bundlePath.nullable(),
  agent: z.strictObject({
    agentInvocationId: id,
    agent: z.string(),
    exitCode: z.number().int().nullable(),
    timedOut: z.boolean(),
    startedAt: z.string(),
    finishedAt: z.string(),
    finalMessage: z.string().nullable(),
  }).nullable(),
  sourceRevisionBefore: z.string(),
  sourceRevisionAfter: z.string().nullable(),
  changedFiles: z.array(z.string()),
  diffStat: z.string(),
  /** Unified diff of the app files; untrusted text, always escape. */
  diff: z.string(),
  integrity: z.strictObject({
    workspaceOutsideOptimus: z.boolean(),
    packHashUnchanged: z.boolean(),
    graderUnchanged: z.boolean(),
    changedGraderFiles: z.array(z.string()),
  }).nullable(),
  verificationRunId: z.string().nullable(),
});

const repairSchema = z.strictObject({
  sessionId: id,
  buildId: id,
  packHash: z.string(),
  graderHash: z.string(),
  scope: z.array(id),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  caps: z.strictObject({ attempts: z.number(), credits: z.number(), minutes: z.number() }),
  budget: z.strictObject({
    creditsStart: z.number().nullable(),
    creditsUsed: z.number().nullable(),
    attemptsUsed: z.number().int(),
    infrastructureRetriesUsed: z.number().int(),
    repairMinutesUsed: z.number(),
  }),
  baselineRunId: id,
  decisions: z.array(z.strictObject({
    decisionId: id, runId: id, decision, reason: z.string(),
    /** Which run supplied each scenario's verdict for this decision. */
    basis: z.array(z.strictObject({ scenarioId: id, runId: id, verdict })),
  })),
  attempts: z.array(attemptSchema),
  outcome: z.strictObject({ decision, reason: z.string(), finalRunId: z.string().nullable() }),
});

const calibrationSchema = z.strictObject({
  title: z.string(),
  rows: z.array(z.strictObject({
    app: z.string(), trial: z.number().int(), scenario: id, expected: verdict, verdict,
    seconds: z.number().nullable(), credits: z.number().nullable(),
  })),
  notes: z.array(z.string()),
});

export const comparisonBundleSchema = z.strictObject({
  bundleVersion: z.literal(2),
  generatedAt: z.string(),
  assessment: z.strictObject({
    name: z.string(),
    pack: z.strictObject({ name: id, version: z.number().int(), packHash: z.string().regex(/^[a-f0-9]{64}$/u), support: z.string(), persistence: z.string() }),
  }),
  /** Calibrated scenarios every build was assessed on, in display order. */
  scope: z.array(id).min(1),
  contract: z.array(contractScenarioSchema),
  builds: z.array(buildSchema).min(1),
  runs: z.array(runSchema).min(1),
  repairs: z.array(repairSchema),
  calibration: calibrationSchema.nullable(),
}).superRefine((bundle, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const runs = new Map(bundle.runs.map((run) => [run.runId, run]));
  const builds = new Set(bundle.builds.map(({ buildId }) => buildId));
  if (runs.size !== bundle.runs.length) issue('Run IDs must be unique.');
  if (builds.size !== bundle.builds.length) issue('Build IDs must be unique.');
  for (const run of bundle.runs) {
    if (!builds.has(run.buildId)) issue(`Run ${run.runId} names an unknown build.`);
    if (run.packHash !== bundle.assessment.pack.packHash) issue(`Run ${run.runId} used a different contract.`);
  }
  for (const build of bundle.builds) {
    for (const runId of [build.baselineRunId, build.latestRunId]) {
      if (runs.get(runId)?.buildId !== build.buildId) issue(`Build ${build.buildId} points at run ${runId}, which is not its own.`);
    }
    if (Object.keys(build.latestRuns).sort().join() !== [...bundle.scope].sort().join()) issue(`Build ${build.buildId} must name a latest run for every scenario in scope.`);
    for (const [scenarioId, runId] of Object.entries(build.latestRuns)) {
      const run = runs.get(runId);
      if (run?.buildId !== build.buildId || !run.scenarios.some((scenario) => scenario.scenarioId === scenarioId)) {
        issue(`Build ${build.buildId} takes ${scenarioId} from run ${runId}, which did not assess it for this build.`);
      }
    }
    const repair = bundle.repairs.find(({ sessionId }) => sessionId === build.repairSessionId);
    if ((build.repairSessionId !== null && repair?.buildId !== build.buildId) || (build.repairState !== 'no_repair' && !repair) ||
      (build.repairState === 'no_repair' && (repair?.attempts.length ?? 0) > 0)) {
      issue(`Build ${build.buildId} has an inconsistent repair state.`);
    }
  }
  for (const repair of bundle.repairs) {
    const referenced = [repair.baselineRunId, ...repair.decisions.flatMap(({ runId, basis }) => [runId, ...basis.map((entry) => entry.runId)]),
      ...repair.attempts.flatMap(({ verificationRunId }) => verificationRunId ? [verificationRunId] : []),
      ...(repair.outcome.finalRunId ? [repair.outcome.finalRunId] : [])];
    for (const runId of referenced) if (runs.get(runId)?.buildId !== repair.buildId) issue(`Repair ${repair.sessionId} references run ${runId} outside its build.`);
    const decisions = new Set(repair.decisions.map(({ decisionId }) => decisionId));
    for (const attempt of repair.attempts) if (!decisions.has(attempt.decisionId)) issue(`Repair ${repair.sessionId} attempt ${attempt.attempt} has no decision.`);
  }
});

export type ComparisonBundle = z.infer<typeof comparisonBundleSchema>;
export type BundleRun = ComparisonBundle['runs'][number];
export type BundleBuild = ComparisonBundle['builds'][number];
export type BundleRepair = ComparisonBundle['repairs'][number];
