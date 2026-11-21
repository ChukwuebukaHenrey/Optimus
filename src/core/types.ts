import { z } from 'zod';

export type Verdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'NOT_RUN' | 'INFRA_ERROR' | 'UNSUPPORTED';

export const actionKindSchema = z.enum(['open', 'interact', 'reload', 'none']);
const actionStatusSchema = z.enum(['verified', 'contradicted', 'unknown']);
export const nonceSchema = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'Expected a short, single-token nonce');
const stepIndexSchema = z.number().int().nonnegative();

const observationSchema = z.strictObject({
  stepIndex: stepIndexSchema,
  stepId: z.string().min(1),
  actionKind: actionKindSchema,
  actionRecorded: z.boolean().nullable(),
  targetAgreement: actionStatusSchema,
  values: z.record(z.string(), z.string().nullable()),
  screenshotRef: z.string().nullable(),
  evidenceRef: z.string().nullable(),
});

export const runRecordSchema = z.strictObject({
  completed: z.boolean(),
  kaneExitCode: z.number().int().nonnegative().nullable(),
  replayDecisions: z.number().int().nonnegative().nullable(),
  authorDecisions: z.number().int().nonnegative().nullable(),
  evidencePackPath: z.string().trim().min(1).nullable(),
  kaneVersion: z.string().nullable(),
  executionId: z.string().nullable(),
  stepsSkipped: z.array(stepIndexSchema),
  packHash: z.string().regex(/^[a-f0-9]{64}$/),
  nonce: nonceSchema,
  appUrl: z.url({ protocol: /^https?$/ }),
});

export const scenarioTraceSchema = z.strictObject({
  scenarioId: z.string().min(1),
  run: runRecordSchema,
  observations: z.array(observationSchema),
});

export type ActionStatus = z.infer<typeof actionStatusSchema>;
export type ActionKind = z.infer<typeof actionKindSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
export type ScenarioTrace = z.infer<typeof scenarioTraceSchema>;

export interface ScenarioResult {
  scenarioId: string;
  verdict: Verdict;
  reasonCode: string;
  reason: string;
  stepId?: string;
  expected?: unknown;
  observed?: string | null;
}
