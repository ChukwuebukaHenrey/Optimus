/**
 * Builds a ComparisonBundle (bundle.json + evidence/) from recorded runs. Every link in the bundle comes from
 * an explicit manifest entry or a recorded ID; nothing is inferred from timestamps or folder order.
 */
import { copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { evaluateScenario } from '../core/evaluate.js';
import { loadPack, substituteNonce, type LoadedPack } from '../core/pack.js';
import { scenarioTraceSchema, type ScenarioResult, type ScenarioTrace } from '../core/types.js';
import { extractArchiveEntry } from '../kane/evidence.js';
import { lastStepScreenshots } from '../kane/screens.js';
import { describeCheck } from '../loop/brief.js';
import type { RepairHistory } from '../loop/repair.js';
import { comparisonBundleSchema, type BundleRepair, type BundleRun, type ComparisonBundle } from './schema.js';

export const manifestSchema = z.strictObject({
  name: z.string().min(1),
  pack: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  builds: z.array(z.strictObject({
    buildId: z.string().regex(/^[a-z0-9-]+$/u),
    label: z.string().min(1),
    appSource: z.string().min(1),
    /** Gate case folders (one scenario each) that form this build's assessment run(s). */
    gateCases: z.array(z.string().min(1)).min(1).optional(),
    /** A repair session's repair-history.json. */
    repairHistory: z.string().min(1).optional(),
  }).refine((build) => (build.gateCases === undefined) !== (build.repairHistory === undefined), 'Give exactly one of gateCases or repairHistory.')).min(1),
  calibration: z.strictObject({ title: z.string(), progress: z.string(), notes: z.array(z.string()) }).optional(),
});
export type BundleManifest = z.infer<typeof manifestSchema>;

const BACKSLASH = String.fromCharCode(92);

/** Masks local absolute paths so a bundle can be shared. */
function masker(root: string): (text: string) => string {
  const labels: [string, string][] = [[resolve(root), '<optimus>'], [resolve(tmpdir()), '<tmp>'], [resolve(homedir()), '<home>']];
  return (text) => {
    let masked = text;
    for (const [path, label] of labels) {
      for (const variant of new Set([path, path.split(BACKSLASH).join(BACKSLASH + BACKSLASH), path.split(BACKSLASH).join('/')])) {
        masked = masked.split(variant).join(label);
      }
    }
    return masked;
  };
}

const safeName = (text: string) => text.replace(/[^A-Za-z0-9._-]+/gu, '-');

interface ScenarioSource {
  trace: ScenarioTrace;
  result: ScenarioResult;
  stdout: string | null;
  evidencePath: string | null;
}

async function exists(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null)) !== null;
}

export async function buildBundle(manifestPath: string, outDirectory: string, root = process.cwd()): Promise<ComparisonBundle> {
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  const base = dirname(resolve(manifestPath));
  const fromManifest = (path: string) => resolve(base, path);
  const loaded: LoadedPack = await loadPack(fromManifest(manifest.pack));
  const mask = masker(root);
  const out = resolve(outDirectory);
  if (await exists(join(out, 'bundle.json'))) throw new Error('The output folder already holds a bundle; choose a new folder.');
  await mkdir(join(out, 'evidence'), { recursive: true });
  const unknownScope = manifest.scope.filter((id) => !loaded.pack.scenarios.some((scenario) => scenario.id === id));
  if (unknownScope.length) throw new Error(`Unknown scenarios in scope: ${unknownScope.join(', ')}`);

  const scenarioRun = async (runId: string, nonce: string, source: ScenarioSource): Promise<BundleRun['scenarios'][number]> => {
    const scenario = loaded.pack.scenarios.find(({ id }) => id === source.trace.scenarioId)!;
    const screens = source.stdout ? lastStepScreenshots(source.stdout, source.trace) : new Map<number, string>();
    const steps = [];
    for (const observation of source.trace.observations) {
      let screenshot: string | null = null;
      const entry = screens.get(observation.stepIndex);
      if (entry && source.evidencePath && Object.keys(observation.values).length) {
        const path = `evidence/${safeName(runId)}/${safeName(`${scenario.id}-${observation.stepId}`)}.jpg`;
        await mkdir(dirname(join(out, path)), { recursive: true });
        if (await extractArchiveEntry(source.evidencePath, entry, join(out, path))) screenshot = path;
      }
      steps.push({
        stepId: observation.stepId, action: substituteNonce(scenario.steps[observation.stepIndex].do, nonce),
        actionKind: observation.actionKind, actionRecorded: observation.actionRecorded, targetAgreement: observation.targetAgreement,
        values: observation.values, screenshot,
      });
    }
    const { run } = source.trace;
    return {
      scenarioId: scenario.id, executionId: run.executionId, result: source.result,
      integrity: {
        completed: run.completed, kaneExitCode: run.kaneExitCode, replayDecisions: run.replayDecisions,
        authorDecisions: run.authorDecisions, kaneVersion: run.kaneVersion, evidenceArchive: source.evidencePath !== null,
      },
      steps,
    };
  };
  const ordered = <T extends { scenarioId: string }>(items: T[]) =>
    manifest.scope.flatMap((id) => items.filter(({ scenarioId }) => scenarioId === id));

  const runs: BundleRun[] = [];
  const repairs: BundleRepair[] = [];
  const builds: ComparisonBundle['builds'] = [];

  for (const build of manifest.builds) {
    const appSource = relative(root, fromManifest(build.appSource)).split(BACKSLASH).join('/');
    if (build.gateCases) {
      const byNonce = new Map<string, { sources: ScenarioSource[]; credits: number | null }>();
      for (const caseDirectory of build.gateCases.map(fromManifest)) {
        const files = await readdir(caseDirectory);
        const normalized = files.filter((name) => name.endsWith('-normalized.json'));
        if (normalized.length !== 1) throw new Error(`Expected one normalized trace in ${caseDirectory}.`);
        const prefix = normalized[0].slice(0, -'normalized.json'.length);
        const trace = scenarioTraceSchema.parse(JSON.parse(await readFile(join(caseDirectory, normalized[0]), 'utf8')));
        if (trace.run.packHash !== loaded.packHash) throw new Error(`${caseDirectory} was assessed with a different contract.`);
        const metrics = JSON.parse(await readFile(join(caseDirectory, `${prefix}metrics.json`), 'utf8')) as Record<string, unknown>;
        const evidence = Array.isArray(metrics.evidence) && typeof metrics.evidence[0] === 'string' ? metrics.evidence[0] : trace.run.evidencePackPath;
        const stdout = await readFile(join(caseDirectory, `${prefix}stdout.ndjson`), 'utf8').catch(() => null);
        const credits = typeof metrics.creditsBefore === 'number' && typeof metrics.creditsAfter === 'number' ? metrics.creditsBefore - metrics.creditsAfter : null;
        const group = byNonce.get(trace.run.nonce) ?? { sources: [], credits: 0 };
        group.sources.push({ trace, result: evaluateScenario(loaded, trace), stdout, evidencePath: evidence && await exists(evidence) ? evidence : null });
        group.credits = group.credits === null || credits === null ? null : group.credits + credits;
        byNonce.set(trace.run.nonce, group);
      }
      const runIds: string[] = [];
      for (const [nonce, group] of byNonce) {
        const runId = `gate/${nonce}`;
        const scenarios = [];
        for (const source of ordered(group.sources.map((item) => ({ ...item, scenarioId: item.trace.scenarioId })))) scenarios.push(await scenarioRun(runId, nonce, source));
        runs.push({
          runId, buildId: build.buildId, source: 'gate', kind: 'assessment', nonce, appUrl: group.sources[0].trace.run.appUrl,
          packHash: loaded.packHash, sourceRevision: null, startedAt: null, finishedAt: null,
          creditsUsed: group.credits === null ? null : Number(group.credits.toFixed(4)), scenarios,
        });
        runIds.push(runId);
      }
      const latestRuns = Object.fromEntries(manifest.scope.map((scenarioId) => [scenarioId,
        [...runIds].reverse().find((runId) => runs.find((run) => run.runId === runId)?.scenarios.some((scenario) => scenario.scenarioId === scenarioId)) ?? runIds.at(-1)!]));
      builds.push({ buildId: build.buildId, label: build.label, appSource, baselineRunId: runIds[0], latestRunId: runIds.at(-1)!, latestRuns, repairSessionId: null, repairState: 'no_repair' });
      continue;
    }

    const historyPath = fromManifest(build.repairHistory!);
    const history = JSON.parse(await readFile(historyPath, 'utf8')) as RepairHistory;
    if (history.pack.packHash !== loaded.packHash) throw new Error(`${historyPath} was recorded with a different contract.`);
    const runId = (local: string) => `${history.sessionId}/${local}`;
    for (const recorded of history.runs) {
      const scenarios = [];
      for (const result of ordered(recorded.results)) {
        const execution = recorded.executions.find(({ scenarioId }) => scenarioId === result.scenarioId);
        const traceText = execution ? await readFile(join(execution.directory, 'trace.json'), 'utf8').catch(() => null) : null;
        if (!execution || !traceText) {
          scenarios.push({ scenarioId: result.scenarioId, executionId: null, result, steps: [],
            integrity: { completed: false, kaneExitCode: null, replayDecisions: null, authorDecisions: null, kaneVersion: null, evidenceArchive: false } });
          continue;
        }
        const trace = scenarioTraceSchema.parse(JSON.parse(traceText));
        const stdout = await readFile(join(execution.directory, 'stdout.ndjson'), 'utf8').catch(() => null);
        scenarios.push(await scenarioRun(runId(recorded.runId), recorded.nonce, { trace, result, stdout, evidencePath: execution.evidencePackPath }));
      }
      const credits = recorded.creditsBefore !== null && recorded.creditsAfter !== null ? Number((recorded.creditsBefore - recorded.creditsAfter).toFixed(4)) : null;
      runs.push({
        runId: runId(recorded.runId), buildId: build.buildId, source: 'repair',
        kind: recorded.kind === 'baseline' ? 'baseline' : recorded.kind, nonce: recorded.nonce, appUrl: history.appUrl ?? '',
        packHash: loaded.packHash, sourceRevision: recorded.sourceRevision, startedAt: recorded.startedAt, finishedAt: recorded.finishedAt,
        creditsUsed: credits, scenarios,
      });
    }
    const sessionDirectory = dirname(historyPath);
    const attempts = [];
    for (const attempt of history.attempts) {
      let briefScreenshot: string | null = null;
      if (attempt.brief.screenshot && await exists(attempt.brief.screenshot)) {
        briefScreenshot = `evidence/${safeName(history.sessionId)}/attempt-${attempt.attempt}-brief.jpg`;
        await mkdir(dirname(join(out, briefScreenshot)), { recursive: true });
        await copyFile(attempt.brief.screenshot, join(out, briefScreenshot));
      }
      const briefMarkdown = await readFile(join(sessionDirectory, `attempt-${attempt.attempt}`, 'brief.md'), 'utf8').catch(() => '');
      const diff = attempt.diffPath ? await readFile(attempt.diffPath, 'utf8').catch(() => '') : '';
      attempts.push({
        attempt: attempt.attempt, decisionId: attempt.decisionId, briefId: attempt.briefId, briefMarkdown: mask(briefMarkdown),
        requirement: attempt.brief.requirement, expected: attempt.brief.expected, observed: attempt.brief.observed,
        failingStepAction: attempt.brief.failingStep?.action ?? null, briefScreenshot,
        agent: attempt.agent && {
          agentInvocationId: attempt.agent.agentInvocationId, agent: attempt.agent.agent, exitCode: attempt.agent.exitCode,
          timedOut: attempt.agent.timedOut, startedAt: attempt.agent.startedAt, finishedAt: attempt.agent.finishedAt,
          finalMessage: attempt.agent.finalMessage === null ? null : mask(attempt.agent.finalMessage),
        },
        sourceRevisionBefore: attempt.sourceRevisionBefore, sourceRevisionAfter: attempt.sourceRevisionAfter,
        changedFiles: attempt.changedFiles, diffStat: attempt.diffStat, diff: mask(diff), integrity: attempt.integrity,
        verificationRunId: attempt.verificationRunId ? runId(attempt.verificationRunId) : null,
      });
    }
    const outcome = history.outcome ?? { decision: 'STOP' as const, reason: 'No outcome was recorded.', finalRunId: null };
    // Sessions recorded before decisions carried a basis ran the whole scope every time; their basis is that run.
    const basisOf = (decision: RepairHistory['decisions'][number]) => ((decision as { basis?: { scenarioId: string; runId: string; verdict: ScenarioResult['verdict'] }[] }).basis ??
      (history.runs.find(({ runId: local }) => local === decision.runId)?.results ?? []).map((result) => ({ scenarioId: result.scenarioId, runId: decision.runId, verdict: result.verdict })))
      .map((entry) => ({ ...entry, runId: runId(entry.runId) }));
    const finalBasis = history.decisions.length ? basisOf(history.decisions.at(-1)!) : [];
    repairs.push({
      sessionId: history.sessionId, buildId: build.buildId, packHash: history.pack.packHash, graderHash: history.graderHash,
      scope: history.scope, startedAt: history.startedAt, finishedAt: history.finishedAt, caps: history.caps, budget: history.budget,
      baselineRunId: runId(history.runs[0].runId),
      decisions: history.decisions.map((decision) => ({
        decisionId: decision.decisionId, runId: runId(decision.runId), decision: decision.decision, reason: decision.reason, basis: basisOf(decision),
      })),
      attempts,
      outcome: { ...outcome, finalRunId: outcome.finalRunId ? runId(outcome.finalRunId) : null },
    });
    builds.push({
      buildId: build.buildId, label: build.label, appSource,
      baselineRunId: runId(history.runs[0].runId),
      latestRunId: runId(outcome.finalRunId ?? history.runs.at(-1)!.runId),
      latestRuns: Object.fromEntries(manifest.scope.map((scenarioId) => [scenarioId,
        finalBasis.find((entry) => entry.scenarioId === scenarioId)?.runId ?? runId(outcome.finalRunId ?? history.runs.at(-1)!.runId)])),
      repairSessionId: history.sessionId,
      repairState: history.attempts.length === 0 ? 'no_repair' : outcome.decision === 'COMPLETE' ? 'repaired' : 'repair_stopped',
    });
  }

  let calibration: ComparisonBundle['calibration'] = null;
  if (manifest.calibration) {
    const progress = JSON.parse(await readFile(fromManifest(manifest.calibration.progress), 'utf8')) as Record<string, unknown>[];
    calibration = {
      title: manifest.calibration.title, notes: manifest.calibration.notes,
      rows: progress.map((row) => ({
        app: String(row.app), trial: Number(row.repeat), scenario: String(row.id),
        expected: (row.expectedVerdict ?? row.expected) as ComparisonBundle['runs'][number]['scenarios'][number]['result']['verdict'],
        verdict: row.verdict as ComparisonBundle['runs'][number]['scenarios'][number]['result']['verdict'],
        seconds: typeof row.elapsedSeconds === 'number' ? row.elapsedSeconds : null,
        credits: typeof row.creditsBefore === 'number' && typeof row.creditsAfter === 'number' ? Number((row.creditsBefore - row.creditsAfter).toFixed(4)) : null,
      })),
    };
  }

  const bundle = comparisonBundleSchema.parse({
    bundleVersion: 2,
    generatedAt: new Date().toISOString(),
    assessment: {
      name: manifest.name,
      pack: { name: loaded.pack.pack, version: loaded.pack.version, packHash: loaded.packHash, support: loaded.pack.support, persistence: loaded.pack.persistence },
    },
    scope: manifest.scope,
    contract: loaded.pack.scenarios.map((scenario) => ({
      id: scenario.id, title: scenario.title, inScope: manifest.scope.includes(scenario.id),
      sentToKane: { steps: scenario.steps.map((step) => ({ stepId: step.id, action: step.do, record: { ...step.record } })) },
      judgedByOptimus: {
        checks: scenario.expect.map((assertion) => ({ text: describeCheck(scenario, assertion), recording: assertion.value, prerequisite: assertion.prerequisite === true })),
        newValues: scenario.steps.flatMap((step) => step.new_values ?? []),
        evidenceRule: scenario.evidence,
      },
    })),
    builds, runs, repairs, calibration,
  });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(out, 'bundle.json'), JSON.stringify(bundle, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  return bundle;
}
