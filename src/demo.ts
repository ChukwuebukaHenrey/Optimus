/**
 * `npm run demo`: replays the blind repair of build U and the Kane-vs-Optimus table from committed files only.
 * No network, no Kane, no agent. Everything printed is read from `runs/`.
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Result { scenarioId: string; verdict: string; reasonCode?: string; stepId?: string; expected?: unknown; observed?: unknown }
interface Run { runId: string; kind: string; nonce: string; startedAt: string; finishedAt: string; creditsBefore: number | null; creditsAfter: number | null; results: Result[] }
interface History {
  sessionId: string;
  pack: { name: string; version: number; packHash: string };
  graderHash: string;
  scope: string[];
  budget: { creditsUsed: number | null; attemptsUsed: number; infrastructureRetriesUsed: number };
  runs: Run[];
  decisions: { decisionId: string; runId: string; decision: string; reason: string; basis: { scenarioId: string; runId: string; verdict: string }[] }[];
  attempts: { attempt: number; changedFiles: string[]; diffStat: string; verificationRunId: string | null; agent: { agent: string } | null;
    integrity: { workspaceOutsideOptimus: boolean; packHashUnchanged: boolean; graderUnchanged: boolean; changedGraderFiles: string[] } | null }[];
  outcome: { decision: string; reason: string; finalRunId: string | null } | null;
}

const rule = (title: string) => `\n── ${title} ${'─'.repeat(Math.max(3, 72 - title.length))}\n`;
const minutes = (run: Run) => ((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 60000).toFixed(1);
const credits = (run: Run) => run.creditsBefore !== null && run.creditsAfter !== null ? (run.creditsBefore - run.creditsAfter).toFixed(1) : '?';
const shown = (value: unknown) => (typeof value === 'string' ? `"${value}"` : JSON.stringify(value));
const verdicts = (run: Run) => run.results.map((r) => `${r.scenarioId} ${r.verdict}`).join('  ');
const check = (ok: boolean) => (ok ? 'ok' : 'FAILED');

/** The text between a heading and the next heading of the same level. */
function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) throw new Error(`Section "${heading}" is missing from the report.`);
  const level = /^#+/u.exec(heading)![0];
  const end = lines.findIndex((line, index) => index > start && new RegExp(`^${level} `, 'u').test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
}

export async function demoText(root = '.'): Promise<string> {
  const at = (...parts: string[]) => join(resolve(root), 'runs', ...parts);
  const history = JSON.parse(await readFile(at('repair-u', 'repair-history.json'), 'utf8')) as History;
  const brief = (await readFile(at('repair-u', 'attempt-1-brief.md'), 'utf8')).trim();
  const diff = (await readFile(at('repair-u', 'attempt-1-change.diff'), 'utf8')).trim();
  const defect = (await readFile(at('repair-u', 'DEFECT-unsealed.txt'), 'utf8')).trim();
  const comparison = await readFile(at('kane-vs-optimus', 'REPORT.md'), 'utf8');

  const [baseline, ...later] = history.runs;
  const [attempt] = history.attempts;
  const failure = baseline.results.find(({ verdict }) => verdict === 'FAIL');
  const final = history.decisions.at(-1)!;
  const out: string[] = [];
  const say = (...lines: string[]) => out.push(...lines);

  say('Optimus demo: a replay of committed evidence (no network, no Kane, no agent).',
    `Session ${history.sessionId}, contract ${history.pack.name} v${history.pack.version} (sha256 ${history.pack.packHash.slice(0, 12)}…), scenarios ${history.scope.join(', ')}.`,
    'Build U was made in a separate session; its defect stayed sealed until grading finished.');

  say(rule('1. Blind grade (Kane acts and records; Optimus judges)'),
    `Kane run ${baseline.runId}: ${minutes(baseline)} min, ${credits(baseline)} credits.`,
    `Optimus verdicts: ${verdicts(baseline)}`);
  if (failure) say(`FAIL ${failure.scenarioId} at step "${failure.stepId}": expected ${shown(failure.expected)}, observed ${shown(failure.observed)}.`);
  say(`Decision: ${history.decisions[0].decision}. ${history.decisions[0].reason}`);

  say(rule('2. The brief the coding agent received (no contract, no grader)'), brief);

  say(rule(`3. The fix (${attempt.agent?.agent ?? 'agent'}, in a throwaway copy outside Optimus)`), diff, '', attempt.diffStat);

  const integrity = attempt.integrity!;
  say(rule('4. Integrity check before any re-run'),
    `workspace outside Optimus ${check(integrity.workspaceOutsideOptimus)} | contract hash unchanged ${check(integrity.packHashUnchanged)} | grader (src/core, src/kane) unchanged ${check(integrity.graderUnchanged)}`,
    `Changed grader files: ${integrity.changedGraderFiles.length ? integrity.changedGraderFiles.join(', ') : 'none'}`);

  say(rule('5. Fresh Kane re-run, same contract, new nonce'));
  for (const run of later) {
    say(`Kane run ${run.runId} (${run.kind.replace('_', ' ')}, nonce ${run.nonce}): ${minutes(run)} min, ${credits(run)} credits. ${verdicts(run)}`);
    for (const decision of history.decisions.filter(({ runId }) => runId === run.runId)) say(`Decision: ${decision.decision}. ${decision.reason}`);
  }
  say(`Final verdicts: ${final.basis.map(({ scenarioId, verdict, runId }) => `${scenarioId} ${verdict} (${runId})`).join('  ')}`,
    `Outcome: ${history.outcome?.decision}. ${history.budget.attemptsUsed} repair attempt, ${history.budget.infrastructureRetriesUsed} infrastructure retry, ${history.budget.creditsUsed?.toFixed(1)} credits in all.`,
    '', `The sealed defect, opened after grading: ${defect}`);

  say(rule("6. Kane's own result next to Optimus's verdict (97 archived runs)"),
    section(comparison, '## All runs'), '',
    'Kane passed, and the app was broken (11 runs):', '',
    section(comparison, '## Kane passed, and the app was broken (11 runs)').split(/\r?\n\r?\nEach of these/u)[0], '',
    'The twelfth "passed + FAIL" is a superseded contract-v2 calibration case; the report explains it',
    'under "A case Optimus got wrong, and why it does not count".');

  say('', 'Sources: runs/repair-u/ and runs/kane-vs-optimus/REPORT.md.');
  return out.join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(await demoText());
}
