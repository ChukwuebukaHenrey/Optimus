import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { actionKindSchema, nonceSchema } from './types.js';

const identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const line = z.string().trim().min(1).regex(/^[^\r\n]+$/, 'Expected a single line');
const caseMode = z.enum(['exact', 'insensitive']).optional();
const prerequisite = z.boolean().optional();
const textArgs = {
  value: identifier,
  arg: line,
  case: caseMode,
  prerequisite,
};

const assertionSchema = z.discriminatedUnion('op', [
  z.strictObject({ op: z.enum(['equals', 'contains', 'not_contains', 'list_contains', 'list_not_contains']), ...textArgs }),
  z.strictObject({ op: z.literal('one_of'), ...textArgs, arg: z.array(line).min(1) }),
  z.strictObject({ op: z.literal('matches'), ...textArgs }).superRefine(({ arg, case: mode }, ctx) => {
    try {
      new RegExp(substitutePattern(arg, 'sample-nonce'), mode === 'exact' ? 'u' : 'iu');
    } catch {
      ctx.addIssue({ code: 'custom', path: ['arg'], message: 'Invalid regular expression' });
    }
  }),
  z.strictObject({ op: z.literal('equals_number'), value: identifier, arg: z.number(), prerequisite }),
  z.strictObject({ op: z.literal('count_equals'), value: identifier, arg: z.number().int().nonnegative(), prerequisite }),
  z.strictObject({ op: z.literal('delta'), value: identifier, from: identifier, by: z.number(), kind: z.literal('count').optional(), prerequisite }),
  z.strictObject({ op: z.literal('absent'), value: identifier, prerequisite }),
]);

const stepSchema = z.strictObject({
  id: identifier,
  do: line,
  record: z.record(identifier, line),
  action: actionKindSchema.optional(),
  expects_change: z.boolean().optional(),
});

const scenarioSchema = z.strictObject({
  id: identifier,
  title: line,
  preconditions: line,
  steps: z.array(stepSchema).min(1),
  expect: z.array(assertionSchema).min(1),
  evidence: line,
});

const packSchema = z.strictObject({
  pack: identifier,
  version: z.number().int().positive(),
  support: line,
  persistence: line,
  scenarios: z.array(scenarioSchema).min(1),
}).superRefine(({ scenarios }, ctx) => {
  const scenarioIds = new Set<string>();
  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const scenarioPath = ['scenarios', scenarioIndex];
    if (scenarioIds.has(scenario.id.toLowerCase())) {
      ctx.addIssue({ code: 'custom', path: [...scenarioPath, 'id'], message: 'Duplicate scenario id' });
    }
    scenarioIds.add(scenario.id.toLowerCase());

    const stepIds = new Set<string>();
    const recordSteps = new Map<string, number>();
    for (const [stepIndex, step] of scenario.steps.entries()) {
      const stepPath = [...scenarioPath, 'steps', stepIndex];
      if (stepIds.has(step.id)) {
        ctx.addIssue({ code: 'custom', path: [...stepPath, 'id'], message: 'Duplicate step id' });
      }
      if (step.action === 'none' && step.expects_change) {
        ctx.addIssue({ code: 'custom', path: [...stepPath, 'expects_change'], message: 'A change check requires a browser action' });
      }
      stepIds.add(step.id);
      for (const key of Object.keys(step.record)) {
        if (recordSteps.has(key)) {
          ctx.addIssue({ code: 'custom', path: [...stepPath, 'record', key], message: 'Duplicate recording key' });
        }
        recordSteps.set(key, stepIndex);
      }
    }

    for (const [index, assertion] of scenario.expect.entries()) {
      const assertionPath = [...scenarioPath, 'expect', index];
      const step = recordSteps.get(assertion.value);
      if (step === undefined) {
        ctx.addIssue({ code: 'custom', path: [...assertionPath, 'value'], message: 'Recording key is not declared by a step' });
      }
      if (assertion.op === 'delta') {
        const before = recordSteps.get(assertion.from);
        if (before === undefined || (step !== undefined && before >= step)) {
          ctx.addIssue({ code: 'custom', path: [...assertionPath, 'from'], message: 'Delta needs a recording key from an earlier step' });
        }
        if (assertion.kind === 'count' && !Number.isSafeInteger(assertion.by)) {
          ctx.addIssue({ code: 'custom', path: [...assertionPath, 'by'], message: 'A count delta must be a safe integer' });
        }
      }
    }
    const behaviorRecordings = scenario.expect.filter((assertion) => !assertion.prerequisite)
      .map((assertion) => recordSteps.get(assertion.value) ?? -1);
    const lastBehaviorRecording = Math.max(-1, ...behaviorRecordings);
    if (!scenario.steps.some((step, index) => index <= lastBehaviorRecording && actionForStep(step, index) !== 'none')) {
      ctx.addIssue({ code: 'custom', path: [...scenarioPath, 'expect'], message: 'At least one behavior assertion must use a recording made after or during a browser action' });
    }
  }
});

export type Assertion = z.infer<typeof assertionSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type Pack = z.infer<typeof packSchema>;

export interface LoadedPack {
  readonly pack: Pack;
  readonly packHash: string;
}

function freezePack(value: object): void {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') freezePack(child);
  }
  Object.freeze(value);
}

export function parsePack(source: string | Buffer): LoadedPack {
  const pack = packSchema.parse(parse(source.toString()));
  const packHash = createHash('sha256').update(source).digest('hex');
  freezePack(pack);
  return Object.freeze({ pack, packHash });
}

export async function loadPack(path: string): Promise<LoadedPack> {
  const file = (await stat(path)).isDirectory() ? join(path, 'pack.yaml') : path;
  return parsePack(await readFile(file));
}

export function substituteNonce(text: string, nonce: string): string {
  return text.replaceAll('{{nonce}}', nonceSchema.parse(nonce));
}

export function substitutePattern(pattern: string, nonce: string): string {
  return pattern.replaceAll('{{nonce}}', () => nonceSchema.parse(nonce).replaceAll('-', '\\x2d'));
}

export function actionForStep(step: Scenario['steps'][number], index: number) {
  return step.action ?? (index === 0 ? 'open' : 'interact');
}
