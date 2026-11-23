import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { renderReport } from '../src/report/render.js';
import { comparisonBundleSchema, type ComparisonBundle } from '../src/report/schema.js';

const raw = JSON.parse(await readFile(join('tests', 'fixtures', 'report-bundle', 'bundle.json'), 'utf8'));
const temporary: string[] = [];
afterAll(async () => { await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true }))); });

const fresh = (): ComparisonBundle => structuredClone(comparisonBundleSchema.parse(raw));
async function render(bundle: ComparisonBundle) {
  const directory = await mkdtemp(join(tmpdir(), 'optimus-report-'));
  temporary.push(directory);
  return readFile(await renderReport(bundle, directory), 'utf8');
}

const hostile = `<img src=x onerror="alert(1)"><script>alert(2)</script> & 'q'`;

it('escapes every untrusted string from the bundle', async () => {
  const bundle = fresh();
  bundle.builds[2].label = hostile;
  const run = bundle.runs.find((r) => r.runId === bundle.builds[2].baselineRunId)!;
  run.scenarios[0].result.reason = hostile;
  run.scenarios[0].steps[0].values = { note: hostile };
  const attempt = bundle.repairs[0].attempts[0];
  attempt.briefMarkdown = hostile;
  attempt.diff = `+${hostile}`;
  if (attempt.agent) attempt.agent.finalMessage = hostile;
  const html = await render(bundle);
  expect(html).not.toMatch(/<script/iu);
  expect(html).not.toMatch(/<img src=x/iu);
  expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  expect(html).toContain('onerror=&quot;alert(1)&quot;');
});

it('loads nothing remote and declares a strict content security policy', async () => {
  const html = await render(fresh());
  expect(html).toContain(`default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; font-src data:`);
  expect(html).not.toMatch(/(?:src|href)="https?:/iu);
  expect(html).not.toMatch(/url\(https?:/iu);
  expect(html).toContain('src="evidence/');
});

it('shows a repaired build as baseline and verified, read through latestRuns', async () => {
  const html = await render(fresh());
  const cRow = html.slice(html.indexOf('C · Removes the wrong book'), html.indexOf('D · Loses books on reload'));
  expect(cRow).toMatch(/baseline<\/span><span class="v v-FAIL">/u);
  expect(cRow).toMatch(/verified<\/span><span class="v v-PASS">/u);

  const bundle = fresh();
  const c = bundle.builds[2];
  c.latestRuns = Object.fromEntries(bundle.scope.map((id) => [id, c.baselineRunId]));
  const unrepaired = await render(bundle);
  const row = unrepaired.slice(unrepaired.indexOf('C · Removes the wrong book'), unrepaired.indexOf('D · Loses books on reload'));
  expect(row).not.toContain('verified</span>');
});

it('renders the repair record only for a session with attempts, in the order things happened', async () => {
  const html = await render(fresh());
  expect(html).toContain('id="repairs"');
  const order = ['>REPAIR<', 'Attempt 1: brief sent to the coding agent', 'Agent action', 'Code change', 'Integrity checks', 'Fresh Kane run', '>COMPLETE<'];
  const positions = order.map((marker) => html.indexOf(marker, html.indexOf('id="repairs"')));
  expect(positions.every((p) => p > 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);

  const bundle = fresh();
  bundle.repairs[0].attempts = [];
  bundle.builds[2].repairState = 'repair_stopped';
  expect(await render(bundle)).not.toContain('id="repairs"');
});

it('keeps a score provisional while any scenario is unresolved', async () => {
  const bundle = fresh();
  const a = bundle.builds[0];
  const run = bundle.runs.find((r) => r.runId === a.latestRuns[bundle.scope[0]])!;
  run.scenarios.find((s) => s.scenarioId === bundle.scope[0])!.result.verdict = 'INCONCLUSIVE';
  const html = await render(bundle);
  const aRow = html.slice(html.indexOf('A · Vanilla JS'), html.indexOf('B · React'));
  expect(aRow).toContain('Provisional');
  expect(aRow).toContain('v-INCONCLUSIVE');
});
