import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPack } from '../src/core/pack.js';
import type { ScenarioResult, Verdict } from '../src/core/types.js';
import type { KaneAssessment } from '../src/kane/run.js';
import type { AgentRun } from '../src/loop/agent.js';
import { briefMarkdown, buildBrief } from '../src/loop/brief.js';
import { decide } from '../src/loop/decision.js';
import { runRepairLoop, type RepairDeps } from '../src/loop/repair.js';
import { serveStatic } from '../src/loop/serve.js';

const library = await loadPack(join('packs', 'library'));
const scope = ['L1', 'L3', 'L4'];
const temporary: string[] = [];
afterAll(async () => { await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true }))); });

const result = (scenarioId: string, verdict: Verdict, extra: Partial<ScenarioResult> = {}): ScenarioResult => ({
  scenarioId, verdict, reasonCode: verdict === 'PASS' ? 'assertions_satisfied' : 'x', reason: 'synthetic', ...extra,
});
const all = (verdicts: Record<string, Verdict>) => scope.map((id) => result(id, verdicts[id] ?? 'PASS'));

describe('decision gate', () => {
  it.each([
    [{}, 'COMPLETE'],
    [{ L3: 'FAIL' }, 'REPAIR'],
    [{ L3: 'INCONCLUSIVE' }, 'NEEDS_EVIDENCE'],
    [{ L3: 'FAIL', L4: 'INCONCLUSIVE' }, 'STOP'],
    [{ L3: 'FAIL', L4: 'INFRA_ERROR' }, 'RETRY_INFRASTRUCTURE'],
    [{ L1: 'UNSUPPORTED', L3: 'FAIL' }, 'STOP'],
  ] as const)('%j → %s', (verdicts, decision) => {
    expect(decide(all(verdicts), scope, 1).decision).toBe(decision);
  });

  it('stops when the infrastructure retry is used up', () => {
    expect(decide(all({ L1: 'INFRA_ERROR' }), scope, 0).decision).toBe('STOP');
  });

  it('treats a missing scenario as unresolved and ignores results outside the scope', () => {
    expect(decide([result('L1', 'PASS'), result('L3', 'PASS')], scope, 1).decision).toBe('NEEDS_EVIDENCE');
    expect(decide([...all({}), result('L2', 'NOT_RUN')], scope, 1).decision).toBe('COMPLETE');
  });

  it('returns only the verified failures for a repair', () => {
    expect(decide(all({ L3: 'FAIL', L4: 'FAIL' }), scope, 1).failures.map(({ scenarioId }) => scenarioId)).toEqual(['L3', 'L4']);
  });
});

describe('repair brief', () => {
  const failure = result('L3', 'FAIL', {
    reasonCode: 'assertion_failed', reason: "The recording 'titles_after' did not satisfy 'list_contains'.",
    stepId: 'remove', expected: 'GP Beta demo', observed: 'none',
  });

  it('states the failing expectation in plain language with expected and observed values', () => {
    const brief = buildBrief(library.pack, failure, 'demo', 'C:/work/app', 'C:/work/brief/shot.jpg');
    expect(brief.actions).toHaveLength(4);
    expect(brief.requirement).toBe('After "Remove the book titled "GP Alpha demo".", the title of every book currently shown (titles only, not authors or other fields), separated by |, or \'none\' should include "GP Beta demo".');
    expect(brief).toMatchObject({ expected: 'GP Beta demo', observed: 'none', failingStep: { id: 'remove' } });
  });

  it('describes a count change relative to the earlier recording', () => {
    const count = result('L3', 'FAIL', {
      reason: "The recording 'count_after' did not satisfy 'delta'.", stepId: 'remove', expected: { from: 'count_before', by: -1 }, observed: '0',
    });
    const brief = buildBrief(library.pack, count, 'demo', 'C:/work/app', null);
    expect(brief.requirement).toMatch(/the number of books currently shown should be 1 fewer than the number of books currently shown before that action\.$/u);
    expect(brief.expected).toBe('a change of -1 from the earlier value');
  });

  it('never carries the contract, other assertions or grader vocabulary', () => {
    const markdown = briefMarkdown(buildBrief(library.pack, failure, 'demo', 'C:/work/app', null));
    for (const leak of ['list_contains', 'list_not_contains', 'new_values', 'prerequisite', 'delta', library.packHash, 'expects_change']) {
      expect(markdown).not.toContain(leak);
    }
    expect(markdown).not.toMatch(/GP Alpha demo"? should/u);
  });

  it('refuses to brief anything but a verified FAIL', () => {
    expect(() => buildBrief(library.pack, result('L3', 'INCONCLUSIVE'), 'demo', 'C:/work/app', null)).toThrow();
  });
});

it('serves only files inside the app folder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'optimus-serve-'));
  temporary.push(root);
  await writeFile(join(root, 'index.html'), '<p>ok</p>');
  const server = await serveStatic(root);
  try {
    expect(await (await fetch(server.url)).text()).toBe('<p>ok</p>');
    expect((await fetch(`${server.url}..%2F..%2Fetc%2Fpasswd`)).status).toBe(404);
    expect(server.pageRequests()).toBe(1);
  } finally {
    await server.close();
  }
});

describe('repair controller', { timeout: 60000 }, () => {
  async function setup(agentBehaviour: 'fix' | 'nothing', verdictsFor: (body: string, run: number) => Record<string, Verdict>, caps = { attempts: 3, credits: 1500, minutes: 20 }) {
    const base = await mkdtemp(join(tmpdir(), 'optimus-loop-test-'));
    temporary.push(base);
    const app = join(base, 'source');
    await rm(app, { recursive: true, force: true });
    await writeFile(join(base, 'placeholder'), '');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(app);
    await writeFile(join(app, 'index.html'), '<p>BUG</p>');
    let credits = 1000;
    let runs = 0;
    const agentCalls: string[] = [];
    const deps: RepairDeps = {
      assess: async ({ appUrl, nonce }) => {
        const body = await (await fetch(appUrl)).text();
        credits -= 50;
        const verdicts = verdictsFor(body, runs++);
        return {
          directory: join(base, nonce), packHash: library.packHash, appUrl, nonce, score: 'provisional',
          results: scope.map((id) => result(id, verdicts[id] ?? 'PASS', verdicts[id] === 'FAIL'
            ? { reason: "The recording 'titles_after' did not satisfy 'list_contains'.", stepId: 'remove', expected: `GP Beta ${nonce}`, observed: 'none' } : {})),
          executions: [],
        } satisfies KaneAssessment;
      },
      balance: async () => credits,
      agent: async ({ cwd, prompt, logDirectory }) => {
        agentCalls.push(prompt);
        if (agentBehaviour === 'fix') await writeFile(join(cwd, 'index.html'), `<p>FIXED ${agentCalls.length}</p>`);
        return {
          agentInvocationId: `agent-${agentCalls.length}`, agent: 'fake', exitCode: 0, timedOut: false,
          startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), finalMessage: 'done', agentSessionId: null,
          stdoutPath: join(logDirectory, 'out'), stderrPath: join(logDirectory, 'err'),
        } satisfies AgentRun;
      },
    };
    const history = await runRepairLoop({
      root: resolve('.'), loaded: library, packFile: join('packs', 'library', 'pack.yaml'), appSource: app, scope, caps,
      workspaceParent: base, sessionParent: join(base, 'sessions'),
    }, deps);
    return { history, agentCalls, base };
  }
  const buggyRemove = (body: string): Record<string, Verdict> => body.includes('BUG') ? { L3: 'FAIL' } : {};

  it('repairs a verified failure and verifies it with a fresh full-scope run', async () => {
    const { history, agentCalls } = await setup('fix', buggyRemove);
    expect(history.outcome).toMatchObject({ decision: 'COMPLETE', finalRunId: 'run-1' });
    expect(history.runs.map(({ kind }) => kind)).toEqual(['baseline', 'verification']);
    expect(history.runs[1].results.map(({ verdict }) => verdict)).toEqual(['PASS', 'PASS', 'PASS']);
    expect(new Set(history.runs.map(({ nonce }) => nonce)).size).toBe(2);
    const [attempt] = history.attempts;
    expect(attempt).toMatchObject({
      attempt: 1, decisionId: 'decision-0', changedFiles: ['index.html'], verificationRunId: 'run-1',
      integrity: { workspaceOutsideOptimus: true, packHashUnchanged: true, graderUnchanged: true, changedGraderFiles: [] },
    });
    expect(attempt.sourceRevisionAfter).not.toBe(attempt.sourceRevisionBefore);
    expect(history.runs[1].sourceRevision).toBe(attempt.sourceRevisionAfter);
    expect(await readFile(attempt.diffPath!, 'utf8')).toContain('+<p>FIXED 1</p>');
    expect(agentCalls[0]).toContain(`should include "GP Beta ${history.runs[0].nonce}"`);
    expect(history.budget).toMatchObject({ attemptsUsed: 1, creditsUsed: 100 });
    const saved = JSON.parse(await readFile(join(history.workspace, '..', '..', 'sessions', history.sessionId, 'repair-history.json'), 'utf8'));
    expect(saved.outcome.decision).toBe('COMPLETE');
  });

  it('never calls the agent when the evidence is unresolved', async () => {
    const { history, agentCalls } = await setup('fix', () => ({ L3: 'INCONCLUSIVE' }));
    expect(history.outcome?.decision).toBe('NEEDS_EVIDENCE');
    expect(agentCalls).toHaveLength(0);
  });

  it('stops when the agent changes nothing', async () => {
    const { history } = await setup('nothing', buggyRemove);
    expect(history.outcome).toMatchObject({ decision: 'STOP', reason: 'The agent made no change to the app.' });
    expect(history.runs).toHaveLength(1);
  });

  it('stops at the attempt cap without changing anything else', async () => {
    const { history, agentCalls } = await setup('fix', () => ({ L3: 'FAIL' }), { attempts: 2, credits: 1500, minutes: 20 });
    expect(agentCalls).toHaveLength(2);
    expect(history.runs.map(({ kind }) => kind)).toEqual(['baseline', 'verification', 'verification']);
    expect(history.outcome).toMatchObject({ decision: 'STOP', reason: 'A repair is needed but the attempt cap (2) is reached.' });
  });

  it('retries the whole scope once after an infrastructure error', async () => {
    const { history, agentCalls } = await setup('fix', (_body, run): Record<string, Verdict> => run === 0 ? { L1: 'INFRA_ERROR' } : {});
    expect(history.runs.map(({ kind }) => kind)).toEqual(['baseline', 'infrastructure_retry']);
    expect(history.outcome?.decision).toBe('COMPLETE');
    expect(agentCalls).toHaveLength(0);
  });
});
