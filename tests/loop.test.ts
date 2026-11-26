import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadPack } from '../src/core/pack.js';
import type { ScenarioResult, Verdict } from '../src/core/types.js';
import type { KaneAssessment } from '../src/kane/run.js';
import type { AgentRun } from '../src/loop/agent.js';
import { briefMarkdown, buildBrief } from '../src/loop/brief.js';
import { decide } from '../src/loop/decision.js';
import { runRepairLoop, type RepairDeps } from '../src/loop/repair.js';
import { serveStatic } from '../src/loop/serve.js';
import { createWorkspace } from '../src/loop/workspace.js';
import { claudeCodeCommand } from '../src/loop/agent.js';

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

describe('repair agent limits', () => {
  it('refuses a repair workspace inside the Optimus folder', async () => {
    const source = await mkdtemp(join(tmpdir(), 'optimus-app-'));
    temporary.push(source);
    await writeFile(join(source, 'index.html'), '<p>app</p>');
    await expect(createWorkspace(source, join(resolve('.'), '.optimus', 'inside-test'), resolve('.')))
      .rejects.toThrow('The repair workspace must be outside the Optimus folder.');
  });

  it('gives the default agent (Claude Code) file tools only: no shell, no web, no sub-agents', () => {
    const { args } = claudeCodeCommand();
    const after = (flag: string) => {
      const rest = args.slice(args.indexOf(flag) + 1);
      const end = rest.findIndex((arg) => arg.startsWith('--'));
      return end === -1 ? rest : rest.slice(0, end);
    };
    expect(after('--allowedTools')).toEqual(['Read', 'Edit', 'Write', 'Glob', 'Grep']);
    expect(after('--disallowedTools')).toEqual(['Bash', 'WebFetch', 'WebSearch', 'Task']);
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
  type Behaviour = 'fix' | 'nothing' | ((cwd: string) => Promise<void>);
  async function setup(agentBehaviour: Behaviour, verdictsFor: (body: string, run: number) => Record<string, Verdict>, caps = { attempts: 3, credits: 1500, minutes: 20 },
    root = resolve('.'), packFile = join('packs', 'library', 'pack.yaml')) {
    const base = await mkdtemp(join(tmpdir(), 'optimus-loop-test-'));
    temporary.push(base);
    const app = join(base, 'source');
    await rm(app, { recursive: true, force: true });
    await writeFile(join(base, 'placeholder'), '');
    await mkdir(app);
    await writeFile(join(app, 'index.html'), '<p>BUG</p>');
    let credits = 1000;
    let runs = 0;
    const agentCalls: string[] = [];
    const lines: string[] = [];
    const deps: RepairDeps = {
      log: (line) => lines.push(line),
      assess: async ({ appUrl, nonce, scope: selected }) => {
        const body = await (await fetch(appUrl)).text();
        credits -= 50;
        const verdicts = verdictsFor(body, runs++);
        return {
          directory: join(base, nonce), packHash: library.packHash, appUrl, nonce, score: 'provisional',
          results: selected.map((id) => result(id, verdicts[id] ?? 'PASS', verdicts[id] === 'FAIL'
            ? { reason: "The recording 'titles_after' did not satisfy 'list_contains'.", stepId: 'remove', expected: `GP Beta ${nonce}`, observed: 'none' } : {})),
          executions: [],
        } satisfies KaneAssessment;
      },
      balance: async () => credits,
      agent: async ({ cwd, prompt, logDirectory }) => {
        agentCalls.push(prompt);
        if (agentBehaviour === 'fix') await writeFile(join(cwd, 'index.html'), `<p>FIXED ${agentCalls.length}</p>`);
        else if (typeof agentBehaviour === 'function') await agentBehaviour(cwd);
        return {
          agentInvocationId: `agent-${agentCalls.length}`, agent: 'fake', exitCode: 0, timedOut: false,
          startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), finalMessage: 'done', agentSessionId: null,
          stdoutPath: join(logDirectory, 'out'), stderrPath: join(logDirectory, 'err'),
        } satisfies AgentRun;
      },
    };
    const history = await runRepairLoop({
      root, loaded: library, packFile, appSource: app, scope, caps,
      workspaceParent: base, sessionParent: join(base, 'sessions'), infraRetryDelayMs: 0,
    }, deps);
    return { history, agentCalls, base, lines };
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

  it('reports progress in order, with Optimus verdicts kept apart from Kane runs', async () => {
    const { history, lines } = await setup('fix', buggyRemove);
    const order = [
      /^Session repair-.*scenarios L1, L3, L4/,
      /^Kane run run-0 \(baseline\) started: L1, L3, L4/,
      /^Kane run run-0 finished \(.* min, 50\.00 credits\)/,
      /^Optimus verdicts for run-0: L1 PASS \| L3 FAIL \([^)]+\) \| L4 PASS$/,
      /^Decision: REPAIR\./,
      /^Attempt 1: brief for L3 \(expected "GP Beta .*", observed "none"\)\. The brief has no contract and no grader\./,
      /^Agent started in a throwaway copy of the app/,
      /^Agent finished \(.*\): changed index\.html/,
      /^Integrity: workspace outside Optimus ok \| contract hash unchanged ok \| grader \(src\/core, src\/kane\) unchanged ok$/,
      /^Kane run run-1 \(verification\) started/,
      /^Optimus verdicts for run-1: L1 PASS \| L3 PASS \| L4 PASS$/,
      /^Decision: COMPLETE\./,
      /^Outcome: COMPLETE\./,
    ];
    let at = -1;
    for (const pattern of order) {
      const next = lines.findIndex((line, index) => index > at && pattern.test(line));
      expect(next, `missing or out of order: ${pattern} in:\n${lines.join('\n')}`).toBeGreaterThan(at);
      at = next;
    }
    // The record is unchanged by logging: progress never enters the history.
    expect(JSON.stringify(history)).not.toContain('Optimus verdicts for');
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

  it('retries only the scenarios without a verdict, on the same revision', async () => {
    const { history, agentCalls } = await setup('fix', (_body, run): Record<string, Verdict> => run === 0 ? { L1: 'INFRA_ERROR' } : {});
    expect(history.runs.map(({ kind, results }) => [kind, results.map(({ scenarioId }) => scenarioId)])).toEqual([
      ['baseline', ['L1', 'L3', 'L4']], ['infrastructure_retry', ['L1']],
    ]);
    expect(history.outcome).toMatchObject({ decision: 'COMPLETE', finalRunId: 'run-1' });
    expect(history.decisions.at(-1)?.basis).toEqual([
      { scenarioId: 'L1', runId: 'run-1', verdict: 'PASS' },
      { scenarioId: 'L3', runId: 'run-0', verdict: 'PASS' },
      { scenarioId: 'L4', runId: 'run-0', verdict: 'PASS' },
    ]);
    expect(agentCalls).toHaveLength(0);
  });

  it('completes a repair whose verification is split across runs of the repaired revision', async () => {
    const { history } = await setup('fix', (body, run): Record<string, Verdict> => body.includes('BUG') ? { L3: 'FAIL' } : run === 1 ? { L4: 'INFRA_ERROR' } : {});
    expect(history.runs.map(({ kind }) => kind)).toEqual(['baseline', 'verification', 'infrastructure_retry']);
    expect(history.runs[2].results.map(({ scenarioId }) => scenarioId)).toEqual(['L4']);
    expect(new Set(history.runs.slice(1).map(({ sourceRevision }) => sourceRevision)).size).toBe(1);
    expect(history.outcome?.decision).toBe('COMPLETE');
    expect(history.decisions.at(-1)?.basis.map(({ runId }) => runId)).toEqual(['run-1', 'run-1', 'run-2']);
  });

  it('never combines verdicts from before and after a repair', async () => {
    const { history } = await setup('fix', (body, run): Record<string, Verdict> => body.includes('BUG') ? { L3: 'FAIL' } : run >= 1 ? { L4: 'INFRA_ERROR' } : {});
    expect(history.outcome).toMatchObject({ decision: 'STOP' });
    expect(history.decisions.at(-1)?.basis.find(({ scenarioId }) => scenarioId === 'L4')).toMatchObject({ verdict: 'INFRA_ERROR', runId: 'run-2' });
  });

  describe('a cheating agent', () => {
    // Each cheat runs against a throwaway copy of the contract and the grader, never the real packs/ or src/.
    async function copyOfOptimus(): Promise<string> {
      const copy = await mkdtemp(join(tmpdir(), 'optimus-root-copy-'));
      temporary.push(copy);
      for (const path of [join('src', 'core'), join('src', 'kane'), join('packs', 'library')]) {
        await cp(path, join(copy, path), { recursive: true });
      }
      return copy;
    }
    async function rewrite(path: string, change: (text: string) => string): Promise<void> {
      const before = await readFile(path, 'utf8');
      const after = change(before);
      if (after === before) throw new Error(`The cheat did not change ${path}.`);
      await writeFile(path, after);
    }
    const integrityStop = 'An integrity check failed after the agent ran; the contract or grader may have changed.';
    const cheats: [string, (copy: string) => Promise<void>, { packHashUnchanged: boolean; changedGraderFiles: string[] }][] = [
      ['edits the pack file', (copy) => rewrite(join(copy, 'packs', 'library', 'pack.yaml'), (text) => text.replace(/by: -1/u, 'by: 0')),
        { packHashUnchanged: false, changedGraderFiles: [] }],
      ['edits src/core/evaluate.ts', (copy) => rewrite(join(copy, 'src', 'core', 'evaluate.ts'), (text) => `${text}\nexport const everythingPasses = true;\n`),
        { packHashUnchanged: true, changedGraderFiles: ['src/core/evaluate.ts'] }],
      ['edits a file in src/kane', (copy) => rewrite(join(copy, 'src', 'kane', 'parse.ts'), (text) => `// recorded values are trusted as PASS\n${text}`),
        { packHashUnchanged: true, changedGraderFiles: ['src/kane/parse.ts'] }],
      ['adds a new file under src/core', (copy) => writeFile(join(copy, 'src', 'core', 'override.ts'), "export const verdict = 'PASS';\n"),
        { packHashUnchanged: true, changedGraderFiles: ['src/core/override.ts'] }],
    ];

    it.each(cheats)('stops when the agent %s, and runs no verification', async (_cheat, cheat, expected) => {
      const copy = await copyOfOptimus();
      const realPack = await readFile(join('packs', 'library', 'pack.yaml'));
      // The agent also "fixes" the app, so only the integrity check can stop the loop.
      const { history, agentCalls, lines } = await setup(async (cwd) => {
        await writeFile(join(cwd, 'index.html'), '<p>FIXED</p>');
        await cheat(copy);
      }, buggyRemove, undefined, copy, join(copy, 'packs', 'library', 'pack.yaml'));
      expect(agentCalls).toHaveLength(1);
      expect(history.outcome).toMatchObject({ decision: 'STOP', reason: integrityStop, finalRunId: 'run-0' });
      expect(history.runs.map(({ kind }) => kind)).toEqual(['baseline']);
      const [attempt] = history.attempts;
      expect(attempt.verificationRunId).toBeNull();
      expect(attempt.changedFiles).toEqual(['index.html']);
      expect(attempt.integrity).toEqual({
        workspaceOutsideOptimus: true,
        packHashUnchanged: expected.packHashUnchanged,
        graderUnchanged: expected.changedGraderFiles.length === 0,
        changedGraderFiles: expected.changedGraderFiles,
      });
      expect(lines.some((line) => line.startsWith('Integrity:') && line.includes('FAILED'))).toBe(true);
      expect(lines.some((line) => line.startsWith('Kane run run-1'))).toBe(false);
      // The real contract was never touched.
      expect(await readFile(join('packs', 'library', 'pack.yaml'))).toEqual(realPack);
    });

    it('never tells the agent where the contract is or what it is called', async () => {
      const { history, agentCalls } = await setup('fix', buggyRemove);
      const packPath = resolve('packs', 'library', 'pack.yaml');
      const briefFiles = [history.attempts[0].briefPath, join(dirname(history.attempts[0].briefPath), 'brief.json')];
      const briefDirectory = join(history.workspace, '..', 'brief');
      briefFiles.push(...(await readdir(briefDirectory)).filter((name) => /\.(md|json)$/u.test(name)).map((name) => join(briefDirectory, name)));
      const texts = [...agentCalls, ...await Promise.all(briefFiles.map((path) => readFile(path, 'utf8')))];
      expect(texts.length).toBeGreaterThanOrEqual(4);
      for (const text of texts) {
        for (const leak of ['pack.yaml', 'packs/', 'packs\\', packPath, packPath.replaceAll('\\', '/'), library.packHash, 'evaluate.ts', 'src/core', 'src/kane']) {
          expect(text, `brief leaks "${leak}"`).not.toContain(leak);
        }
      }
    });
  });
});
