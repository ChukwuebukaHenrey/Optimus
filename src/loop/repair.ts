import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { LoadedPack } from '../core/pack.js';
import type { ScenarioResult, ScenarioTrace, Verdict } from '../core/types.js';
import { extractArchiveEntry } from '../kane/evidence.js';
import { lastStepScreenshots } from '../kane/screens.js';
import type { KaneAssessment } from '../kane/run.js';
import type { AgentRun } from './agent.js';
import { briefMarkdown, buildBrief, type RepairBrief } from './brief.js';
import { decide, type LoopDecision } from './decision.js';
import { changedGraderFiles, graderFingerprint, type Fingerprint } from './integrity.js';
import { serveStatic } from './serve.js';
import { changeBetween, createWorkspace, isInside, snapshot } from './workspace.js';

export interface RepairCaps {
  attempts: number;
  credits: number;
  minutes: number;
}

export interface RepairDeps {
  assess: (input: { appUrl: string; nonce: string; scope: readonly string[] }) => Promise<KaneAssessment>;
  balance: () => Promise<number | null>;
  agent: (input: { cwd: string; prompt: string; timeoutMs: number; logDirectory: string; briefDirectory: string }) => Promise<AgentRun>;
  now?: () => number;
}

export interface RepairOptions {
  root: string;
  loaded: LoadedPack;
  packFile: string;
  appSource: string;
  scope: readonly string[];
  caps: RepairCaps;
  workspaceParent?: string;
  /** Pause before an infrastructure retry so the Kane service can recover. Default 90 s. */
  infraRetryDelayMs?: number;
  /** Where session records are written. Defaults to <root>/.optimus/repair. */
  sessionParent?: string;
}

interface RunEntry {
  runId: string;
  kind: 'baseline' | 'infrastructure_retry' | 'verification';
  nonce: string;
  sourceRevision: string;
  startedAt: string;
  finishedAt: string;
  creditsBefore: number | null;
  creditsAfter: number | null;
  runDirectory: string;
  results: ScenarioResult[];
  executions: KaneAssessment['executions'];
}

interface DecisionEntry {
  decisionId: string;
  /** The most recent run before this decision. */
  runId: string;
  decision: LoopDecision;
  reason: string;
  /** Which run supplied each scenario's verdict. All runs share the current source revision. */
  basis: { scenarioId: string; runId: string; verdict: Verdict }[];
}

interface AttemptEntry {
  attempt: number;
  decisionId: string;
  briefId: string;
  brief: RepairBrief;
  briefPath: string;
  agent: AgentRun | null;
  sourceRevisionBefore: string;
  sourceRevisionAfter: string | null;
  changedFiles: string[];
  diffStat: string;
  diffPath: string | null;
  integrity: {
    workspaceOutsideOptimus: boolean;
    packHashUnchanged: boolean;
    graderUnchanged: boolean;
    changedGraderFiles: string[];
  } | null;
  verificationRunId: string | null;
}

export interface RepairHistory {
  sessionId: string;
  startedAt: string;
  finishedAt: string | null;
  pack: { name: string; version: number; packHash: string };
  graderHash: string;
  scope: string[];
  appSource: string;
  workspace: string;
  appUrl: string | null;
  caps: RepairCaps;
  budget: { creditsStart: number | null; creditsUsed: number | null; attemptsUsed: number; infrastructureRetriesUsed: number; repairMinutesUsed: number };
  runs: RunEntry[];
  decisions: DecisionEntry[];
  attempts: AttemptEntry[];
  outcome: { decision: LoopDecision; reason: string; finalRunId: string | null } | null;
}

/**
 * Extracts the last screenshot Kane took during the failing step, which shows the page after the step.
 * The trace's own screenshot belongs to the recorded action and can predate its effect.
 */
async function failureScreenshot(run: RunEntry, failure: ScenarioResult, output: string): Promise<string | null> {
  const execution = run.executions.find(({ scenarioId }) => scenarioId === failure.scenarioId);
  if (!execution?.evidencePackPath) return null;
  const trace = JSON.parse(await readFile(join(execution.directory, 'trace.json'), 'utf8')) as ScenarioTrace;
  const observation = trace.observations.find(({ stepId }) => stepId === failure.stepId);
  if (!observation) return null;
  const screens = lastStepScreenshots(await readFile(join(execution.directory, 'stdout.ndjson'), 'utf8'), trace);
  const reference = screens.get(observation.stepIndex) ?? observation.screenshotRef;
  if (!reference) return null;
  return await extractArchiveEntry(execution.evidencePackPath, reference, output) ? output : null;
}

export async function runRepairLoop(options: RepairOptions, deps: RepairDeps): Promise<RepairHistory> {
  const now = deps.now ?? Date.now;
  const root = resolve(options.root);
  const sessionId = `repair-${new Date(now()).toISOString().replace(/[-:T]/gu, '').slice(0, 14)}-${randomBytes(3).toString('hex')}`;
  const short = sessionId.slice(-6);
  const sessionDirectory = join(resolve(options.sessionParent ?? join(root, '.optimus', 'repair')), sessionId);
  await mkdir(sessionDirectory, { recursive: true });
  const before: Fingerprint = await graderFingerprint(root, options.packFile);
  if (before.packHash !== options.loaded.packHash) throw new Error('The pack file does not match the loaded pack.');
  const workspaceRoot = join(resolve(options.workspaceParent ?? tmpdir()), `optimus-${sessionId}`);
  const { workspace, revision: baselineRevision } = await createWorkspace(options.appSource, workspaceRoot, root);

  const history: RepairHistory = {
    sessionId, startedAt: new Date(now()).toISOString(), finishedAt: null,
    pack: { name: options.loaded.pack.pack, version: options.loaded.pack.version, packHash: options.loaded.packHash },
    graderHash: before.graderHash, scope: [...options.scope], appSource: resolve(options.appSource), workspace: workspace.appDirectory,
    appUrl: null, caps: options.caps,
    budget: { creditsStart: null, creditsUsed: null, attemptsUsed: 0, infrastructureRetriesUsed: 0, repairMinutesUsed: 0 },
    runs: [], decisions: [], attempts: [], outcome: null,
  };
  const historyPath = join(sessionDirectory, 'repair-history.json');
  const save = () => writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', 'utf8');
  const server = await serveStatic(workspace.appDirectory);
  history.appUrl = server.url;
  let revision = baselineRevision;
  let firstAgentAt: number | null = null;

  const spend = async (): Promise<number | null> => {
    const balance = await deps.balance();
    if (balance !== null && history.budget.creditsStart !== null) history.budget.creditsUsed = Number((history.budget.creditsStart - balance).toFixed(4));
    return balance;
  };
  const doRun = async (kind: RunEntry['kind'], scope: readonly string[] = options.scope): Promise<RunEntry> => {
    const runId = `run-${history.runs.length}`;
    const nonce = `${short}-${runId}`;
    const startedAt = new Date(now()).toISOString();
    const creditsBefore = await spend();
    const assessment = await deps.assess({ appUrl: server.url, nonce, scope });
    const creditsAfter = await spend();
    const entry: RunEntry = {
      runId, kind, nonce, sourceRevision: revision, startedAt, finishedAt: new Date(now()).toISOString(),
      creditsBefore, creditsAfter, runDirectory: assessment.directory,
      results: assessment.results.filter(({ scenarioId }) => scope.includes(scenarioId)), executions: assessment.executions,
    };
    history.runs.push(entry);
    await save();
    return entry;
  };
  /**
   * The verdict for each scenario on the current source revision: the most recent run of this revision that
   * judged it. An infrastructure error only stands when no run of this revision produced a verdict.
   */
  const composed = () => {
    const sameRevision = history.runs.filter(({ sourceRevision }) => sourceRevision === revision).reverse();
    const picks = options.scope.map((scenarioId) => {
      const candidates = sameRevision.flatMap((entry) => entry.results.filter((result) => result.scenarioId === scenarioId).map((result) => ({ entry, result })));
      return candidates.find(({ result }) => result.verdict !== 'INFRA_ERROR') ?? candidates[0];
    });
    return {
      results: picks.flatMap((pick) => pick ? [pick.result] : []),
      basis: picks.flatMap((pick) => pick ? [{ scenarioId: pick.result.scenarioId, runId: pick.entry.runId, verdict: pick.result.verdict }] : []),
    };
  };
  const finish = async (decision: LoopDecision, reason: string, run: RunEntry | null) => {
    history.outcome = { decision, reason, finalRunId: run?.runId ?? null };
  };

  try {
    history.budget.creditsStart = await deps.balance();
    await save();
    let run = await doRun('baseline');
    let retriesForRevision = 0;
    for (;;) {
      const { results, basis } = composed();
      const outcome = decide(results, options.scope, 1 - retriesForRevision);
      const decision: DecisionEntry = {
        decisionId: `decision-${history.decisions.length}`, runId: run.runId, decision: outcome.decision, reason: outcome.reason, basis,
      };
      history.decisions.push(decision);
      await save();
      if (outcome.decision === 'RETRY_INFRASTRUCTURE') {
        // Rerun only the scenarios that got no verdict, on the same source revision.
        retriesForRevision++;
        history.budget.infrastructureRetriesUsed++;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, options.infraRetryDelayMs ?? 90000));
        run = await doRun('infrastructure_retry', basis.filter(({ verdict }) => verdict === 'INFRA_ERROR').map(({ scenarioId }) => scenarioId));
        continue;
      }
      if (outcome.decision !== 'REPAIR') { await finish(outcome.decision, outcome.reason, run); break; }

      const balance = await spend();
      const minutes = firstAgentAt === null ? 0 : (now() - firstAgentAt) / 60000;
      const cap = history.budget.attemptsUsed >= options.caps.attempts ? `the attempt cap (${options.caps.attempts}) is reached`
        : balance === null ? 'the credit balance cannot be read, so the credit cap cannot be enforced'
          : (history.budget.creditsUsed ?? 0) >= options.caps.credits ? `the credit cap (${options.caps.credits}) is reached`
            : minutes >= options.caps.minutes ? `the time cap (${options.caps.minutes} minutes) is reached` : null;
      if (cap) { await finish('STOP', `A repair is needed but ${cap}.`, run); break; }

      firstAgentAt ??= now();
      const attemptNumber = ++history.budget.attemptsUsed;
      const attemptDirectory = join(sessionDirectory, `attempt-${attemptNumber}`);
      await mkdir(attemptDirectory, { recursive: true });
      const failure = outcome.failures[0];
      const failureRun = history.runs.find(({ runId }) => runId === basis.find(({ scenarioId }) => scenarioId === failure.scenarioId)?.runId) ?? run;
      const screenshot = await failureScreenshot(failureRun, failure, join(workspace.briefDirectory, `attempt-${attemptNumber}-${failure.scenarioId}.jpg`)).catch(() => null);
      const brief = buildBrief(options.loaded.pack, failure, failureRun.nonce, workspace.appDirectory, screenshot);
      const prompt = briefMarkdown(brief);
      const briefPath = join(attemptDirectory, 'brief.md');
      await writeFile(briefPath, prompt, 'utf8');
      await writeFile(join(attemptDirectory, 'brief.json'), JSON.stringify(brief, null, 2) + '\n', 'utf8');
      await writeFile(join(workspace.briefDirectory, `attempt-${attemptNumber}.md`), prompt, 'utf8');
      const attempt: AttemptEntry = {
        attempt: attemptNumber, decisionId: decision.decisionId, briefId: brief.briefId, brief, briefPath, agent: null,
        sourceRevisionBefore: revision, sourceRevisionAfter: null, changedFiles: [], diffStat: '', diffPath: null,
        integrity: null, verificationRunId: null,
      };
      history.attempts.push(attempt);
      await save();

      const remaining = options.caps.minutes * 60000 - (now() - firstAgentAt);
      attempt.agent = await deps.agent({
        cwd: workspace.appDirectory, prompt, timeoutMs: Math.max(60000, remaining), logDirectory: attemptDirectory,
        briefDirectory: workspace.briefDirectory,
      });
      history.budget.repairMinutesUsed = Number(((now() - firstAgentAt) / 60000).toFixed(2));
      const after = await graderFingerprint(root, options.packFile);
      attempt.sourceRevisionAfter = await snapshot(workspace.appDirectory, `Agent repair attempt ${attemptNumber} (${brief.briefId})`);
      const change = await changeBetween(workspace.appDirectory, revision, attempt.sourceRevisionAfter);
      attempt.changedFiles = change.files;
      attempt.diffStat = change.stat;
      attempt.diffPath = join(attemptDirectory, 'change.diff');
      await writeFile(attempt.diffPath, change.diff, 'utf8');
      attempt.integrity = {
        workspaceOutsideOptimus: !isInside(workspace.appDirectory, root),
        packHashUnchanged: after.packHash === before.packHash,
        graderUnchanged: after.graderHash === before.graderHash,
        changedGraderFiles: changedGraderFiles(before, after),
      };
      await save();
      const { workspaceOutsideOptimus, packHashUnchanged, graderUnchanged } = attempt.integrity;
      if (!workspaceOutsideOptimus || !packHashUnchanged || !graderUnchanged) {
        await finish('STOP', 'An integrity check failed after the agent ran; the contract or grader may have changed.', run);
        break;
      }
      if (!change.files.length) { await finish('STOP', 'The agent made no change to the app.', run); break; }
      revision = attempt.sourceRevisionAfter;
      run = await doRun('verification');
      retriesForRevision = 0;
      attempt.verificationRunId = run.runId;
      await save();
    }
  } finally {
    await server.close();
    await spend().catch(() => null);
    history.finishedAt = new Date(now()).toISOString();
    if (!history.outcome) history.outcome = { decision: 'STOP', reason: 'The loop ended with an error before a decision was recorded.', finalRunId: history.runs.at(-1)?.runId ?? null };
    await save();
  }
  return history;
}
