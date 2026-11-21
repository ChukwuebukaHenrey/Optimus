import { mkdir, readFile, rmdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { evaluateScenario } from './core/evaluate.js';
import { generateTests, lintGeneratedTest } from './core/generate.js';
import { loadPack } from './core/pack.js';
import { writeReport } from './core/report.js';
import { nonceSchema, scenarioTraceSchema, type ScenarioResult, type Verdict } from './core/types.js';
import { checkEvidenceArchive } from './kane/evidence.js';
import { controlledAppUrl, runKaneAssessment } from './kane/run.js';

const usage = `Usage
  optimus gen-tests --pack <path> --nonce <id> [--scenario <id>] [--out <directory>]
  optimus lint <file_test.md> --pack <path> --nonce <id> [--scenario <id>]
  optimus evaluate <trace.json> --pack <path>
  optimus run --pack <path> --url <loopback-url> [--nonce <id>] [--scenario <id>] [--out <new-directory>]`;

const exitCodes: Record<Verdict, number> = {
  PASS: 0, FAIL: 10, INCONCLUSIVE: 20, NOT_RUN: 20, INFRA_ERROR: 30, UNSUPPORTED: 20,
};

async function main([command, ...args]: string[]): Promise<number> {
  if (command === undefined || command === '--help' || command === '-h') {
    console.log(usage);
    return 0;
  }
  if (!['gen-tests', 'lint', 'evaluate', 'run'].includes(command)) throw new Error(`Unknown command '${command}'.\n${usage}`);
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      pack: { type: 'string' },
      nonce: { type: 'string' },
      scenario: { type: 'string' },
      out: { type: 'string' },
      url: { type: 'string' },
    },
  });
  const takesFile = command === 'lint' || command === 'evaluate';
  if (!values.pack || positionals.length !== Number(takesFile)) throw new Error(usage);
  if ((takesFile && values.out !== undefined) || (command !== 'run' && values.url !== undefined) ||
    (command === 'evaluate' && (values.nonce !== undefined || values.scenario !== undefined))) throw new Error(usage);
  const loaded = await loadPack(values.pack);

  if (command === 'gen-tests') {
    const nonce = nonceSchema.parse(values.nonce);
    const files = generateTests(loaded.pack, nonce, values.scenario);
    const out = values.out ?? join('.optimus', 'generated', loaded.pack.pack, nonce);
    await mkdir(out, { recursive: true });
    for (const file of files) {
      const path = join(out, file.fileName);
      await writeFile(path, file.markdown, 'utf8');
      console.log(path);
    }
    return 0;
  }

  if (command === 'lint') {
    const nonce = nonceSchema.parse(values.nonce);
    const path = positionals[0];
    const scenarioId = values.scenario ?? basename(path).replace(/_test\.md$/u, '');
    const issues = lintGeneratedTest(await readFile(path, 'utf8'), loaded.pack, scenarioId, nonce);
    for (const issue of issues) console.error(`${path}:${issue.line} ${issue.message}`);
    return issues.length ? 10 : 0;
  }

  if (command === 'run') {
    if (!values.url) throw new Error(usage);
    const appUrl = controlledAppUrl(values.url);
    const out = values.out ? resolve(values.out) : undefined;
    if (out) {
      await mkdir(dirname(out), { recursive: true });
      await mkdir(out);
    }
    try {
      const { directory, ...report } = await runKaneAssessment({
        loaded, appUrl, nonce: values.nonce, scenarioId: values.scenario,
      });
      const reportDirectory = out ?? directory;
      await writeReport(reportDirectory, report);
      console.log(JSON.stringify({ ...report, reportDirectory, runDirectory: directory }, null, 2));
      const selected = report.results.filter(({ scenarioId }) => values.scenario === undefined || scenarioId === values.scenario);
      return Math.max(...selected.map(({ verdict }) => exitCodes[verdict]));
    } catch (error) {
      if (out) await rmdir(out).catch(() => undefined);
      throw error;
    }
  }

  const path = positionals[0];
  const input: unknown = JSON.parse(await readFile(path, 'utf8'));
  const collection = Array.isArray(input);
  const traces = z.array(scenarioTraceSchema).min(1).parse(collection ? input : [input]);
  const seen = new Set<string>();
  const evidenceIds = new Set<string>();
  const results: ScenarioResult[] = [];
  for (const trace of traces) {
    if (seen.has(trace.scenarioId)) throw new Error(`The trace repeats scenario '${trace.scenarioId}'.`);
    if (trace.run.appUrl !== traces[0].run.appUrl || trace.run.nonce !== traces[0].run.nonce) {
      throw new Error('A trace collection must describe one app URL and one run nonce.');
    }
    seen.add(trace.scenarioId);
    const evidenceId = trace.run.evidencePackPath && trace.run.packHash === loaded.packHash
      ? await checkEvidenceArchive(resolve(dirname(path), trace.run.evidencePackPath)) : undefined;
    if (evidenceId === null) trace.run.evidencePackPath = null;
    const result = evaluateScenario(loaded, trace);
    if (evidenceId === null && result.reasonCode === 'evidence_pack_missing') {
      result.reasonCode = 'invalid_evidence_archive';
      result.reason = 'The referenced file is missing or lacks the documented single-test evidence archive structure.';
    }
    if (result.verdict !== 'INFRA_ERROR' && evidenceId) {
      if (evidenceIds.has(evidenceId)) throw new Error('A trace collection must use a separate evidence archive for each scenario.');
      evidenceIds.add(evidenceId);
    }
    results.push(result);
  }
  if (!collection) {
    console.log(JSON.stringify(results[0], null, 2));
    return exitCodes[results[0].verdict];
  }
  const missing = loaded.pack.scenarios.filter(({ id }) => !seen.has(id));
  for (const { id } of missing) results.push({
    scenarioId: id, verdict: 'NOT_RUN', reasonCode: 'trace_missing', reason: 'No trace was supplied for this scenario.',
  });
  const resolved = results.every(({ verdict }) => verdict === 'PASS' || verdict === 'FAIL');
  const score = resolved ? results.filter(({ verdict }) => verdict === 'PASS').length / results.length : 'provisional';
  console.log(JSON.stringify({ packHash: loaded.packHash, score, results }, null, 2));
  return Math.max(...results.map(({ verdict }) => exitCodes[verdict]));
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 30;
}
