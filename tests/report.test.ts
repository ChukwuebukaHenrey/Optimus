import { mkdtemp, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { writeReport, type AssessmentReport } from '../src/core/report.js';

const report: AssessmentReport = {
  packHash: 'a'.repeat(64),
  appUrl: 'http://localhost:43184/',
  nonce: 'demo',
  score: 0.5,
  results: [
    { scenarioId: 'one', verdict: 'PASS', reasonCode: 'assertions_satisfied', reason: 'The assertions passed.' },
    {
      scenarioId: 'two', verdict: 'FAIL', reasonCode: 'assertion_failed', reason: 'The count differs.',
      stepId: 'add', expected: { from: 'before', by: 1 }, observed: '0',
    },
  ],
};

async function withDirectory(check: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'optimus-report-'));
  try {
    await check(directory);
  } finally {
    for (const name of await readdir(directory)) await rm(join(directory, name));
    await rmdir(directory);
  }
}

it('writes matching report formats and preserves adjacent evidence', async () => {
  await withDirectory(async (directory) => {
    await writeFile(join(directory, 'trace.ndjson'), 'saved evidence\n');
    await writeReport(directory, report);

    const json = JSON.parse(await readFile(join(directory, 'result.json'), 'utf8'));
    const html = await readFile(join(directory, 'report.html'), 'utf8');
    expect(json).toEqual(report);
    expect(html).toContain('<dt>Score</dt><dd>50%</dd>');
    expect(html).toContain('data-verdict="PASS">PASS');
    expect(html).toContain('data-verdict="FAIL">FAIL');
    expect(html).toContain('<dt>Step</dt><dd><code>add</code>');
    expect(html).toContain('&quot;by&quot;: 1');
    expect(html).toContain('<dt>Observed</dt><dd><pre>&quot;0&quot;</pre>');
    expect(await readFile(join(directory, 'trace.ndjson'), 'utf8')).toBe('saved evidence\n');
    expect((await readdir(directory)).sort()).toEqual(['report.html', 'result.json', 'trace.ndjson']);
  });
});

it('keeps provisional scores visible and escapes dynamic report strings', async () => {
  await withDirectory(async (directory) => {
    const unsafe = `<img src=x onerror="alert(1)"> & 'text'`;
    await writeReport(directory, {
      ...report, packHash: unsafe, appUrl: unsafe, nonce: unsafe, score: 'provisional',
      results: [{
        scenarioId: unsafe, verdict: 'INCONCLUSIVE', reasonCode: unsafe, reason: unsafe, stepId: unsafe,
        expected: { data: unsafe }, observed: null,
      }],
    });

    const html = await readFile(join(directory, 'report.html'), 'utf8');
    expect(html).toContain('<dt>Score</dt><dd>Provisional</dd>');
    expect(html).toContain('<dt>Observed</dt><dd><pre>null</pre>');
    expect(html.match(/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;text&#39;/gu)).toHaveLength(7);
    expect(html).toContain('&quot;data&quot;: &quot;&lt;img');
    expect(html).not.toContain('<img');
  });
});
