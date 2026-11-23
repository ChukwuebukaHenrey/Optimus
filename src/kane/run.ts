import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, open, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { isIPv4 } from 'node:net';
import { delimiter, extname, join, resolve } from 'node:path';
import { text as streamText } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';
import { evaluateScenario } from '../core/evaluate.js';
import { generateTests } from '../core/generate.js';
import type { LoadedPack, Scenario } from '../core/pack.js';
import { nonceSchema, type ScenarioResult } from '../core/types.js';
import { loadKaneEvidence } from './evidence.js';
import { parseKaneNdjson } from './parse.js';

interface KaneCommand {
  executable: string;
  args: string[];
}

interface RunOptions {
  loaded: LoadedPack;
  appUrl: string;
  nonce?: string;
  scenarioId?: string;
  /** Run exactly these scenarios, in pack order. Overrides scenarioId. */
  scenarioIds?: readonly string[];
  workingDirectory?: string;
  kaneExecutable?: string;
  /** Pause before retrying after an upload failure; TestMu can refuse an immediate relaunch. Default 90 s. */
  retryDelayMs?: number;
}

type GeneratedTest = ReturnType<typeof generateTests>[number];

export interface KaneAssessment {
  directory: string;
  packHash: string;
  appUrl: string;
  nonce: string;
  results: ScenarioResult[];
  score: number | 'provisional';
  /** The attempt that produced each scenario's result. */
  executions: ScenarioExecution[];
}

export interface ScenarioExecution {
  scenarioId: string;
  attempts: number;
  directory: string;
  executionId: string | null;
  evidencePackPath: string | null;
}

const attemptLimit = 2;
const kanePackageEntry = ['node_modules', '@testmuai', 'kane-cli', 'bin', 'kane-cli.cjs'];

export function controlledAppUrl(input: string): string {
  const url = new URL(input);
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' ||
    (isIPv4(url.hostname) && url.hostname.startsWith('127.'));
  if (!loopback || (url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('Use an HTTP or HTTPS loopback URL without credentials for the app under test.');
  }
  return url.href;
}

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

async function resolveKaneCommand(workingDirectory: string, explicit?: string): Promise<KaneCommand> {
  if (explicit) {
    const path = resolve(workingDirectory, explicit);
    if (!await isFile(path)) throw new Error('The configured Kane launcher was not found.');
    const extension = extname(path).toLowerCase();
    if (['.js', '.cjs', '.mjs'].includes(extension)) return { executable: process.execPath, args: [path] };
    if (['.cmd', '.bat', '.ps1'].includes(extension)) {
      throw new Error('Use the Kane executable or its Node entry file as the launcher.');
    }
    return { executable: path, args: [] };
  }

  const local = join(workingDirectory, ...kanePackageEntry);
  if (await isFile(local)) return { executable: process.execPath, args: [local] };
  if (process.platform !== 'win32') return { executable: 'kane-cli', args: [] };

  for (const entry of (process.env.PATH ?? '').split(delimiter)) {
    const directory = entry.trim().replace(/^"|"$/gu, '');
    if (!directory) continue;
    const executable = resolve(workingDirectory, directory, 'kane-cli.exe');
    if (await isFile(executable)) return { executable, args: [] };
    const nodeEntry = resolve(workingDirectory, directory, ...kanePackageEntry);
    if (await isFile(nodeEntry)) return { executable: process.execPath, args: [nodeEntry] };
  }
  throw new Error('Kane CLI was not found on PATH. Install @testmuai/kane-cli or set OPTIMUS_KANE_CLI to its Node entry file.');
}

function launchKane(command: KaneCommand, cwd: string, args: string[]) {
  const child = spawn(command.executable, [...command.args, ...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
  });
  const exit = new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', resolveExit);
  });
  return { child, exit };
}

function readKaneConfig(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    const jsonLine = stdout.split(/\r?\n/u).map((line) => line.trim())
      .find((line) => line.startsWith('{') && line.endsWith('}'));
    return jsonLine ? JSON.parse(jsonLine) : null;
  }
}

async function checkFreshProfile(command: KaneCommand, directory: string): Promise<void> {
  const { child, exit } = launchKane(command, directory, ['config', 'show']);
  child.stderr.resume();
  const [code, stdout] = await Promise.all([exit, streamText(child.stdout)]);
  if (code !== 0) throw new Error('Kane configuration could not be read.');
  let config: unknown;
  try {
    config = readKaneConfig(stdout);
  } catch {
    throw new Error('Kane config show did not return a JSON object.');
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Kane config show did not return a JSON object.');
  }
  const settings = config as Record<string, unknown>;
  if (settings.auth === false || (typeof settings.auth === 'string' && settings.auth.trim().toLowerCase() === 'not configured')) {
    throw new Error('Sign in to Kane before running Optimus.');
  }
  for (const key of ['chrome_profile', 'chrome_profile_path'] as const) {
    const profile = settings[key];
    if (profile !== undefined && profile !== null && profile !== '') {
      throw new Error('Clear the configured Kane Chrome profile before running Optimus.');
    }
  }
}

async function evidencePaths(directory: string): Promise<string[]> {
  const evidenceDirectory = join(directory, '.testmuai', 'evidence');
  const entries = await readdir(evidenceDirectory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.evidence')
    .map((entry) => join(evidenceDirectory, entry.name));
}

function hasUploadFailure(ndjson: string): boolean {
  // The parser has already validated the event stream and its summary order.
  for (const line of ndjson.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type === 'test_md_summary') return event.upload?.succeeded === false;
  }
  return false;
}

async function recordKaneAttempt(
  command: KaneCommand, directory: string, testPath: string, appUrl: string,
): Promise<number | null> {
  const stdout = await open(join(directory, 'stdout.ndjson'), 'wx');
  try {
    const stderr = await open(join(directory, 'stderr.log'), 'wx');
    try {
      const { child, exit } = launchKane(command, directory, [
        'testmd', 'run', testPath, '--url', appUrl, '--author', '--agent', '--headless',
      ]);
      // Keep attempts sequential even if a log stream fails while Kane is still running.
      const [status, output, errors] = await Promise.allSettled([
        exit,
        pipeline(child.stdout, stdout.createWriteStream()),
        pipeline(child.stderr, stderr.createWriteStream()),
      ]);
      if (status.status === 'rejected') throw status.reason;
      if (output.status === 'rejected' || errors.status === 'rejected') {
        throw new Error('The Kane command finished but its raw streams could not be saved.');
      }
      return status.value;
    } finally {
      await stderr.close();
    }
  } finally {
    await stdout.close();
  }
}

async function runAttempt(
  command: KaneCommand,
  directory: string,
  assessment: KaneAssessment,
  loaded: LoadedPack,
  scenario: Scenario,
  test: GeneratedTest,
): Promise<{ result: ScenarioResult; uploadFailed: boolean; executionId: string | null; evidencePackPath: string | null }> {
  await mkdir(directory, { recursive: true });
  await checkFreshProfile(command, directory);
  const testPath = join(directory, test.fileName);
  await writeFile(testPath, test.markdown, { encoding: 'utf8', flag: 'wx' });
  const kaneExitCode = await recordKaneAttempt(command, directory, testPath, assessment.appUrl);
  const ndjson = await readFile(join(directory, 'stdout.ndjson'), 'utf8');
  const paths = await evidencePaths(directory);
  const archive = paths.length === 1 ? await loadKaneEvidence(paths[0]) : null;
  const trace = parseKaneNdjson(ndjson, scenario, {
    kaneExitCode, evidencePackPath: archive ? paths[0] : null,
    nonce: assessment.nonce, packHash: assessment.packHash, appUrl: assessment.appUrl,
  }, archive ?? undefined);
  await writeFile(join(directory, 'trace.json'), JSON.stringify(trace, null, 2) + '\n', 'utf8');
  const result = evaluateScenario(loaded, trace);
  const uploadFailed = hasUploadFailure(ndjson);
  if (uploadFailed) {
    result.reasonCode = 'kane_upload_failed';
    result.reason = 'Kane reported an upload failure.';
  } else if (result.reasonCode === 'evidence_pack_missing' && paths.length > 0) {
    result.reasonCode = 'invalid_evidence_archive';
    result.reason = 'Kane did not produce exactly one readable single-test evidence archive.';
  }
  return { result, uploadFailed, executionId: trace.run.executionId, evidencePackPath: trace.run.evidencePackPath };
}

/** Reads the Kane credit balance, or null when it cannot be established. */
export async function readKaneBalance(workingDirectory = process.cwd(), kaneExecutable?: string): Promise<number | null> {
  const directory = resolve(workingDirectory);
  const command = await resolveKaneCommand(directory, kaneExecutable ?? process.env.OPTIMUS_KANE_CLI);
  // The balance service can be briefly unavailable after a failed run; back off before giving up.
  for (const pause of [0, 5000, 15000, 45000]) {
    if (pause) await new Promise((resolveDelay) => setTimeout(resolveDelay, pause));
    const { child, exit } = launchKane(command, directory, ['balance']);
    const [code, stdout, stderr] = await Promise.all([exit, streamText(child.stdout), streamText(child.stderr)]);
    const match = code === 0 ? /Available credits:\s*([0-9][0-9,]*(?:\.[0-9]+)?)/iu.exec(`${stdout}
${stderr}`) : null;
    if (match) return Number(match[1].replaceAll(',', ''));
  }
  return null;
}

export async function runKaneAssessment(options: RunOptions): Promise<KaneAssessment> {
  const { loaded, scenarioId, scenarioIds } = options;
  if (scenarioIds) {
    const unknown = scenarioIds.filter((id) => !loaded.pack.scenarios.some((scenario) => scenario.id === id));
    if (unknown.length || !scenarioIds.length) throw new Error(`Unknown or empty scenario selection: ${unknown.join(', ')}`);
  }
  const wanted = (id: string) => scenarioIds ? scenarioIds.includes(id) : scenarioId === undefined || id === scenarioId;
  const appUrl = controlledAppUrl(options.appUrl);
  const nonce = nonceSchema.parse(options.nonce ?? randomBytes(8).toString('hex'));
  const selected = loaded.pack.scenarios.filter((scenario) => wanted(scenario.id));
  const tests = selected.map((scenario) => generateTests(loaded.pack, nonce, scenario.id)[0]);
  const workingDirectory = resolve(options.workingDirectory ?? process.cwd());
  const command = await resolveKaneCommand(workingDirectory, options.kaneExecutable ?? process.env.OPTIMUS_KANE_CLI);
  const runParent = join(workingDirectory, '.optimus', 'runs', `pack-${loaded.pack.pack}`);
  await mkdir(runParent, { recursive: true });
  const directory = await mkdtemp(join(runParent, `${nonce}-`));
  const generated = join(directory, 'generated');
  await mkdir(generated);
  await Promise.all(tests.map((test) => writeFile(join(generated, test.fileName), test.markdown, 'utf8')));
  const assessment: KaneAssessment = {
    directory, packHash: loaded.packHash, appUrl, nonce, results: [], score: 'provisional', executions: [],
  };

  for (const [index, scenario] of selected.entries()) {
    try {
      for (let attempt = 1; attempt <= attemptLimit; attempt++) {
        const attemptDirectory = join(directory, `scenario-${scenario.id}`, `attempt-${attempt}`);
        const outcome = await runAttempt(command, attemptDirectory, assessment, loaded, scenario, tests[index]);
        if (outcome.uploadFailed && attempt < attemptLimit) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, options.retryDelayMs ?? 90000));
          continue;
        }
        assessment.results.push(outcome.result);
        assessment.executions.push({
          scenarioId: scenario.id, attempts: attempt, directory: attemptDirectory,
          executionId: outcome.executionId, evidencePackPath: outcome.evidencePackPath,
        });
        break;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The Kane attempt could not be completed.';
      assessment.results.push({ scenarioId: scenario.id, verdict: 'INFRA_ERROR', reasonCode: 'kane_attempt_error', reason });
    }
  }
  const missing = loaded.pack.scenarios.filter((scenario) => !selected.includes(scenario));
  for (const { id } of missing) {
    assessment.results.push({ scenarioId: id, verdict: 'NOT_RUN', reasonCode: 'scenario_not_selected', reason: 'This scenario was outside the requested run.' });
  }
  if (assessment.results.every(({ verdict }) => verdict === 'PASS' || verdict === 'FAIL')) {
    assessment.score = assessment.results.filter(({ verdict }) => verdict === 'PASS').length / assessment.results.length;
  }
  return assessment;
}
