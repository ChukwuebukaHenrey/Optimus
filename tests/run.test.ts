import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it, vi } from 'vitest';
import { generateTests } from '../src/core/generate.js';
import { parsePack } from '../src/core/pack.js';
import { controlledAppUrl, runKaneAssessment } from '../src/kane/run.js';

// Synthetic evidence for one successful navigation with a matching action ID.
const archive = [
  'UEsDBBQAAAAAAAAAdV2hLGZ2EQAAABEAAAAIAAAAcnVuLnlhbWxydW5faWQ6IGZha2UtcnVuClBLAwQUAAAAAAAAAHVd',
  'WtS95QsAAAALAAAAEgAAAHRlc3RzL2Zha2UvdGVzdC5tZCMgU2NlbmFyaW8KUEsDBBQAAAAAAAAAdV3DCRpQDwAAAA8A',
  'AAAWAAAAdGVzdHMvZmFrZS9yZXN1bHQueWFtbHN0YXR1czogcGFzc2VkClBLAwQUAAAAAAAAAHVdZZujbD8AAAA/AAAA',
  'IAAAAHRlc3RzL2Zha2Uvc3RlcHMvMS0wLTEvc3RlcC5qc29ueyJraW5kIjoibmF2aWdhdGUiLCJzdGF0dXMiOiJwYXNz',
  'ZWQiLCJhY3Rpb25faWQiOiJvcGVuLWFjdGlvbiJ9UEsBAhQAFAAAAAAAAAB1XaEsZnYRAAAAEQAAAAgAAAAAAAAAAAAA',
  'AIABAAAAAHJ1bi55YW1sUEsBAhQAFAAAAAAAAAB1XVrUveULAAAACwAAABIAAAAAAAAAAAAAAIABNwAAAHRlc3RzL2Zh',
  'a2UvdGVzdC5tZFBLAQIUABQAAAAAAAAAdV3DCRpQDwAAAA8AAAAWAAAAAAAAAAAAAACAAXIAAAB0ZXN0cy9mYWtlL3Jl',
  'c3VsdC55YW1sUEsBAhQAFAAAAAAAAAB1XWWbo2w/AAAAPwAAACAAAAAAAAAAAAAAAIABtQAAAHRlc3RzL2Zha2Uvc3Rl',
  'cHMvMS0wLTEvc3RlcC5qc29uUEsFBgAAAAAEAAQACAEAADIBAAAAAA==',
].join('');

const packSource = `pack: example
version: 1
support: Local web applications
persistence: Browser storage
scenarios:
${['one', 'two'].map((id) => `  - id: ${id}
    title: Scenario ${id}
    preconditions: fresh session
    steps:
      - id: open
        do: Open the page.
        record:
          value: the visible number
    expect:
      - { op: equals_number, value: value, arg: 7 }
    evidence: navigation and recording`).join('\n')}
`;
const loaded = parsePack(packSource);

type FakeOptions = {
  profile?: string;
  auth?: string;
  notices?: boolean;
  uploadFailure?: 'first' | 'every';
  evidence?: 'missing' | 'ambiguous';
};

type FakeEvent = { state: string; scenario?: string; args?: string[]; source?: string };

const directories: string[] = [];
const appUrl = 'http://127.0.0.1:43190/';
const nonce = 'fixture';

async function fakeKane(options: FakeOptions = {}) {
  const workingDirectory = await mkdtemp(join(tmpdir(), 'optimus-run-test-'));
  directories.push(workingDirectory);
  const kaneExecutable = join(workingDirectory, 'fake-kane.mjs');
  const events = join(workingDirectory, 'invocations.ndjson');
  await writeFile(kaneExecutable, `
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const options = ${JSON.stringify(options)};
const args = process.argv.slice(2);
const note = (value) => appendFileSync(${JSON.stringify(events)}, JSON.stringify(value) + '\\n');
if (args.join(' ') === 'config show') {
  note({ state: 'config' });
  if (options.notices) console.log('Synthetic Kane update notice');
  console.log(JSON.stringify({ chrome_profile: options.profile ?? '', auth: options.auth }));
} else {
  const scenario = basename(args[2], '_test.md');
  const source = readFileSync(args[2], 'utf8');
  note({ state: 'start', scenario, args, source });
  writeFileSync(args[2], 'Provider rewrote the attempt file.');
  await setTimeout(50);
  const evidenceDirectory = join('.testmuai', 'evidence');
  mkdirSync(evidenceDirectory, { recursive: true });
  if (options.evidence !== 'missing') {
    const bytes = Buffer.from(${JSON.stringify(archive)}, 'base64');
    writeFileSync(join(evidenceDirectory, 'fake.evidence'), bytes);
    if (options.evidence === 'ambiguous') writeFileSync(join(evidenceDirectory, 'another.evidence'), bytes);
  }
  const upload = options.uploadFailure === 'every' ||
    (options.uploadFailure === 'first' && basename(process.cwd()) === 'attempt-1');
  const records = [
    { type: 'stream_start', surface: 'testmd', cli_version: 'fixture' },
    { type: 'test_md_step_start', step_index: 1 },
    { type: 'step_event', index: 1, event: 'action', action_type: 'navigate', success: true },
    { type: 'step_end', index: 1, ordinal: 1, id: '0-1', kind: 'navigate', action_id: 'open-action' },
    { type: 'run_end', status: 'passed', final_state: { value: scenario === 'one' ? '7' : '8' } },
    { type: 'test_md_step_end', step_index: 1, status: 'passed' },
    { type: 'test_md_summary', steps: { total: 1, author_decisions: 1, replay_decisions: upload ? undefined : 0 },
      upload: { succeeded: !upload } },
    { type: 'test_md_done' },
  ];
  for (const record of records) console.log(JSON.stringify(record));
  process.stderr.write('Synthetic stdout and stderr are preserved.\\n');
  note({ state: 'end', scenario });
  process.exitCode = upload ? 2 : 0;
}
`, 'utf8');
  return {
    options: { workingDirectory, kaneExecutable, loaded, appUrl, nonce },
    async events(): Promise<FakeEvent[]> {
      const source = await readFile(events, 'utf8');
      return source.trimEnd().split('\n').map((line) => JSON.parse(line));
    },
  };
}

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

it('accepts loopback URLs and refuses destinations outside the local controlled scope', () => {
  expect(controlledAppUrl('http://[::1]:8080')).toBe('http://[::1]:8080/');
  expect(controlledAppUrl('http://localhost:8080/test')).toBe('http://localhost:8080/test');
  for (const url of ['https://127.example.com', 'https://example.com', 'ftp://localhost', 'http://person:password@localhost']) {
    expect(() => controlledAppUrl(url)).toThrow();
  }
});

it('authors one scenario at a time, saves separate archives, and scores with the evaluator', async () => {
  const fake = await fakeKane({ notices: true });
  const assessment = await runKaneAssessment(fake.options);
  expect(assessment.results.map(({ verdict }) => verdict)).toEqual(['PASS', 'FAIL']);
  expect(assessment.score).toBe(0.5);
  const calls = await fake.events();
  expect(calls.map(({ state, scenario }) => state + (scenario ? ':' + scenario : ''))).toEqual([
    'config', 'start:one', 'end:one', 'config', 'start:two', 'end:two',
  ]);
  for (const { args } of calls.filter(({ state }) => state === 'start')) {
    expect(args?.slice(3)).toEqual(['--url', appUrl, '--author', '--agent', '--headless']);
  }
  const traces = await Promise.all(['one', 'two'].map(async (id) =>
    JSON.parse(await readFile(join(assessment.directory, `scenario-${id}`, 'attempt-1', 'trace.json'), 'utf8'))));
  expect(traces.map((trace) => trace.run.packHash)).toEqual([loaded.packHash, loaded.packHash]);
  expect(traces[0].run.evidencePackPath).not.toEqual(traces[1].run.evidencePackPath);
  expect(await readFile(join(assessment.directory, 'scenario-one', 'attempt-1', 'stderr.log'), 'utf8'))
    .toContain('Synthetic stdout and stderr');
}, 20000);

it('retries an explicit upload failure once with unchanged neutral Markdown', async () => {
  const fake = await fakeKane({ uploadFailure: 'first' });
  const assessment = await runKaneAssessment({ retryDelayMs: 0, ...fake.options, scenarioId: 'one' });
  const sources = (await fake.events()).filter(({ state }) => state === 'start').map(({ source }) => source);
  const [generated] = generateTests(loaded.pack, nonce, 'one');
  expect(sources).toEqual([generated.markdown, generated.markdown]);
  expect(await readFile(join(assessment.directory, 'generated', generated.fileName), 'utf8')).toBe(generated.markdown);
  expect(assessment.results.map(({ verdict }) => verdict)).toEqual(['PASS', 'NOT_RUN']);
  expect(assessment.score).toBe('provisional');
}, 20000);

it('leaves credits untouched when a Chrome profile is configured', async () => {
  const fake = await fakeKane({ profile: 'configured-profile' });
  const assessment = await runKaneAssessment({ retryDelayMs: 0, ...fake.options, scenarioId: 'one' });
  expect(await fake.events()).toEqual([{ state: 'config' }]);
  expect(assessment.results[0]).toMatchObject({ verdict: 'INFRA_ERROR', reason: expect.stringContaining('Chrome profile') });
}, 20000);

it('refuses an explicitly unauthenticated Kane configuration before authoring', async () => {
  const fake = await fakeKane({ auth: 'not configured', notices: true });
  const assessment = await runKaneAssessment({ retryDelayMs: 0, ...fake.options, scenarioId: 'one' });
  expect(await fake.events()).toEqual([{ state: 'config' }]);
  expect(assessment.results[0]).toMatchObject({ verdict: 'INFRA_ERROR', reason: expect.stringContaining('Sign in to Kane') });
}, 20000);

it('stops retrying after the second explicit upload failure', async () => {
  const fake = await fakeKane({ uploadFailure: 'every' });
  const assessment = await runKaneAssessment({ retryDelayMs: 0, ...fake.options, scenarioId: 'one' });
  expect(assessment.results[0]).toMatchObject({ verdict: 'INFRA_ERROR', reasonCode: 'kane_upload_failed' });
  expect(await readdir(join(assessment.directory, 'scenario-one'))).toHaveLength(2);
}, 20000);

it.each([
  ['missing', 'evidence_pack_missing'],
  ['ambiguous', 'invalid_evidence_archive'],
] as const)('rejects %s evidence without retrying', async (evidence, reasonCode) => {
  const fake = await fakeKane({ evidence });
  const assessment = await runKaneAssessment({ retryDelayMs: 0, ...fake.options, scenarioId: 'one' });
  expect(assessment.results[0]).toMatchObject({ verdict: 'INFRA_ERROR', reasonCode });
  expect(await readdir(join(assessment.directory, 'scenario-one'))).toEqual(['attempt-1']);
}, 20000);

it('routes the live CLI to the runner and publishes the selected result with a provisional pack score', async () => {
  const fake = await fakeKane();
  const { workingDirectory, kaneExecutable } = fake.options;
  const packPath = join(workingDirectory, 'pack.yaml');
  const out = join(workingDirectory, 'report');
  await writeFile(packPath, packSource, 'utf8');
  const previousArgs = process.argv;
  const previousExitCode = process.exitCode;
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(workingDirectory);
  const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.stubEnv('OPTIMUS_KANE_CLI', kaneExecutable);
  process.argv = [...previousArgs.slice(0, 2), 'run', '--pack', packPath, '--url', appUrl, '--scenario', 'one', '--out', out];
  try {
    await import('../src/cli.js');
    expect(process.exitCode).toBe(0);
    expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({ reportDirectory: out, score: 'provisional', results: [
      { scenarioId: 'one', verdict: 'PASS' }, { scenarioId: 'two', verdict: 'NOT_RUN' },
    ] });
  } finally {
    process.argv = previousArgs;
    process.exitCode = previousExitCode;
    vi.unstubAllEnvs();
    cwd.mockRestore();
    output.mockRestore();
  }
  expect(JSON.parse(await readFile(join(out, 'result.json'), 'utf8'))).toMatchObject({ score: 'provisional' });
  expect(await readFile(join(out, 'report.html'), 'utf8')).toMatch(/PASS/u);
}, 30000);
