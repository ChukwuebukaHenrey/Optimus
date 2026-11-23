import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ScenarioTrace } from '../src/core/types.js';
import { lastStepScreenshots } from '../src/kane/screens.js';
import { renderReport } from '../src/report/render.js';
import { comparisonBundleSchema, type ComparisonBundle } from '../src/report/schema.js';

const fixture = join('tests', 'fixtures', 'report-bundle');
const raw = JSON.parse(await readFile(join(fixture, 'bundle.json'), 'utf8'));
const temporary: string[] = [];
afterAll(async () => { await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true }))); });

describe('report data contract', () => {
  it('accepts the committed real-data fixture', () => {
    const bundle = comparisonBundleSchema.parse(raw);
    expect(bundle.builds.map(({ buildId, repairState }) => [buildId, repairState])).toEqual([
      ['a-vanilla', 'no_repair'], ['b-react', 'no_repair'], ['c-remove-wrong', 'repaired'], ['d-no-persist', 'no_repair'],
    ]);
  });

  it('keeps every evidence file the fixture references', async () => {
    const bundle = comparisonBundleSchema.parse(raw);
    const paths = [
      ...bundle.runs.flatMap(({ scenarios }) => scenarios.flatMap(({ steps }) => steps.flatMap(({ screenshot }) => screenshot ? [screenshot] : []))),
      ...bundle.repairs.flatMap(({ attempts }) => attempts.flatMap(({ briefScreenshot }) => briefScreenshot ? [briefScreenshot] : [])),
    ];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect((await stat(join(fixture, path))).isFile()).toBe(true);
  });

  it('contains no local absolute paths', () => {
    expect(JSON.stringify(raw)).not.toMatch(/[A-Za-z]:\\\\|\/Users\/|\/home\//u);
  });

  const broken: [string, (bundle: ComparisonBundle) => void][] = [
    ['a build pointing at a missing run', (bundle) => { bundle.builds[0].latestRunId = 'nowhere'; }],
    ['a run assessed with another contract', (bundle) => { bundle.runs[0].packHash = '0'.repeat(64); }],
    ['a screenshot path leaving the bundle', (bundle) => { bundle.runs[0].scenarios[0].steps[0].screenshot = 'evidence/../../secret.jpg'; }],
    ['a repaired build without a repair record', (bundle) => { bundle.builds[0].repairState = 'repaired'; }],
    ['a repair referencing another build\'s run', (bundle) => { bundle.repairs[0].baselineRunId = bundle.builds[0].baselineRunId; }],
    ['a duplicate run ID', (bundle) => { bundle.runs[1].runId = bundle.runs[0].runId; }],
    ['a latest verdict taken from another build run', (bundle) => { bundle.builds[0].latestRuns.L1 = bundle.builds[2].baselineRunId; }],
    ['a build without a latest run for a scenario in scope', (bundle) => { delete bundle.builds[0].latestRuns.L4; }],
  ];
  it.each(broken)('rejects %s', (_name, corrupt) => {
    const bundle = structuredClone(raw) as ComparisonBundle;
    corrupt(bundle);
    expect(comparisonBundleSchema.safeParse(bundle).success).toBe(false);
  });
});

it('renders the placeholder report with escaped text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'optimus-render-'));
  temporary.push(directory);
  const bundle = comparisonBundleSchema.parse(raw);
  bundle.builds[0].label = '<script>alert(1)</script>';
  const html = await readFile(await renderReport(bundle, directory), 'utf8');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain("img-src 'self'");
});

it('finds the last screenshot Kane took during each step', () => {
  const trace = {
    scenarioId: 'L1', run: {} as ScenarioTrace['run'],
    observations: [{ stepIndex: 0, stepId: 'open', actionKind: 'open', actionRecorded: true, targetAgreement: 'unknown', values: {}, screenshotRef: 'tests/t1/steps/1-0-1/screenshot.jpg', evidenceRef: null }],
  } satisfies ScenarioTrace;
  const ndjson = [
    { type: 'test_md_step_start', step_index: 1 },
    { type: 'step_end', ordinal: 1, id: '0-1', screenshot: 'screenshot.jpg' },
    { type: 'step_end', ordinal: 3, id: '0-3', screenshot: 'screenshot.jpg' },
    { type: 'test_md_step_start', step_index: 2 },
    { type: 'step_end', ordinal: 4, id: '1-1', screenshot: '../escape.jpg' },
    { type: 'step_end', ordinal: 5, id: '1-2', screenshot: 'screenshot.jpg' },
  ].map((event) => JSON.stringify(event)).join('\n');
  expect(lastStepScreenshots(ndjson, trace)).toEqual(new Map([
    [0, 'tests/t1/steps/3-0-3/screenshot.jpg'],
    [1, 'tests/t1/steps/5-1-2/screenshot.jpg'],
  ]));
});
