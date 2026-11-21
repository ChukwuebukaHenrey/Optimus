import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { evaluateScenario } from './core/evaluate.js';
import { generateTests } from './core/generate.js';
import { lintTestMarkdown } from './core/lint.js';
import { loadPack } from './core/pack.js';
import { nonceSchema, scenarioTraceSchema, type Verdict } from './core/types.js';

const usage = `Usage
  optimus gen-tests --pack <path> --nonce <id> [--scenario <id>] [--out <directory>]
  optimus lint <file_test.md> --pack <path> --nonce <id> [--scenario <id>]
  optimus evaluate <trace.json> --pack <path>`;

const exitCodes: Record<Verdict, number> = {
  PASS: 0, FAIL: 10, INCONCLUSIVE: 20, NOT_RUN: 20, INFRA_ERROR: 30, UNSUPPORTED: 20,
};

async function main([command, ...args]: string[]): Promise<number> {
  if (command === undefined || command === '--help' || command === '-h') {
    console.log(usage);
    return 0;
  }
  if (!['gen-tests', 'lint', 'evaluate'].includes(command)) throw new Error(`Unknown command '${command}'.\n${usage}`);
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      pack: { type: 'string' },
      nonce: { type: 'string' },
      scenario: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (!values.pack || positionals.length !== (command === 'gen-tests' ? 0 : 1)) throw new Error(usage);
  if ((command !== 'gen-tests' && values.out !== undefined) ||
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
    const scenario = loaded.pack.scenarios.find(({ id }) => id === scenarioId);
    if (!scenario) throw new Error(`Unknown scenario '${scenarioId}'. Pass --scenario for renamed files.`);
    const issues = lintTestMarkdown(await readFile(path, 'utf8'), scenario, nonce);
    for (const issue of issues) console.error(`${path}:${issue.line} ${issue.message}`);
    return issues.length ? 10 : 0;
  }

  const path = positionals[0];
  const input: unknown = JSON.parse(await readFile(path, 'utf8'));
  const collection = Array.isArray(input);
  const traces = z.array(scenarioTraceSchema).min(1).parse(collection ? input : [input]);
  const seen = new Set<string>();
  for (const trace of traces) {
    if (seen.has(trace.scenarioId)) throw new Error(`The trace repeats scenario '${trace.scenarioId}'.`);
    if (trace.run.appUrl !== traces[0].run.appUrl) throw new Error('A trace collection must describe one app URL.');
    seen.add(trace.scenarioId);
    if (trace.run.evidencePackPath) {
      const evidence = resolve(dirname(path), trace.run.evidencePackPath);
      try {
        trace.run.evidencePackPath = (await stat(evidence)).isFile() ? evidence : null;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        trace.run.evidencePackPath = null;
      }
    }
  }
  const results = traces.map((trace) => evaluateScenario(loaded, trace));
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
