import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScenarioResult } from './types.js';

export interface AssessmentReport {
  packHash: string;
  appUrl: string;
  nonce: string;
  score: number | 'provisional';
  results: readonly ScenarioResult[];
}

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => htmlEntities[character]);
}

function renderResult(result: ScenarioResult): string {
  const verdict = escapeHtml(result.verdict);
  const field = (label: string, value: unknown) => {
    const serialized = JSON.stringify(value, null, 2);
    return serialized === undefined ? '' :
      `<div><dt>${label}</dt><dd><pre>${escapeHtml(serialized)}</pre></dd></div>`;
  };

  return `<li><article>
    <header><h3>${escapeHtml(result.scenarioId)}</h3><span class="verdict" data-verdict="${verdict}">${verdict}</span></header>
    <p>${escapeHtml(result.reason)}</p>
    <dl class="details">
      <div><dt>Reason code</dt><dd><code>${escapeHtml(result.reasonCode)}</code></dd></div>
      ${result.stepId === undefined ? '' : `<div><dt>Step</dt><dd><code>${escapeHtml(result.stepId)}</code></dd></div>`}
      ${field('Expected', result.expected)}
      ${field('Observed', result.observed)}
    </dl>
  </article></li>`;
}

function renderReport({ packHash, appUrl, nonce, score, results }: AssessmentReport): string {
  const scoreLabel = score === 'provisional' ? 'Provisional' : new Intl.NumberFormat('en', {
    style: 'percent', maximumFractionDigits: 2,
  }).format(score);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <title>Optimus results</title>
  <style>
    :root { color-scheme: light; font: 1rem/1.55 system-ui, sans-serif; color: #18232c; background: #f4f7fa; }
    main { box-sizing: border-box; max-width: 54rem; margin: 0 auto; padding: 2rem 1rem; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 2rem; }
    h2 { margin-bottom: .75rem; font-size: 1.35rem; }
    h3 { font-size: 1.12rem; overflow-wrap: anywhere; }
    dl { display: grid; gap: .75rem; margin: 0; }
    dt { color: #3f5265; font-weight: 600; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .summary { margin: 1rem 0 2rem; }
    ol { display: grid; gap: .85rem; margin: 0; padding: 0; list-style: none; }
    article { padding: 1rem; border: 1px solid #d4dee8; border-radius: .5rem; background: #fff; }
    article header { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
    article p { margin: .55rem 0 .85rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .details { grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); }
    .verdict { color: #263c53; background: #e9eef6; border-radius: .25rem; font-size: .8rem; font-weight: 700; padding: .2rem .5rem; }
    [data-verdict="PASS"] { color: #11563b; background: #e4f4eb; }
    [data-verdict="FAIL"] { color: #842b24; background: #fbece9; }
    pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Optimus results</h1>
    <dl class="summary">
      <div><dt>Score</dt><dd>${escapeHtml(scoreLabel)}</dd></div>
      <div><dt>App URL</dt><dd>${escapeHtml(appUrl)}</dd></div>
      <div><dt>Pack hash</dt><dd><code>${escapeHtml(packHash)}</code></dd></div>
      <div><dt>Run nonce</dt><dd><code>${escapeHtml(nonce)}</code></dd></div>
    </dl>
    <section aria-labelledby="scenario-results">
      <h2 id="scenario-results">Scenario results</h2>
      ${results.length === 0 ? '<p>No scenario results.</p>' : `<ol role="list">${results.map(renderResult).join('\n')}</ol>`}
    </section>
  </main>
</body>
</html>
`;
}

export async function writeReport(directory: string, report: AssessmentReport): Promise<void> {
  const reportId = randomUUID();
  const files = [
    { name: 'report.html', contents: renderReport(report) },
    { name: 'result.json', contents: JSON.stringify(report, null, 2) + '\n' },
  ].map((file) => ({
    ...file, pending: join(directory, `.${file.name}.${reportId}.tmp`), output: join(directory, file.name),
  }));

  await mkdir(directory, { recursive: true });
  try {
    for (const { pending, contents } of files) await writeFile(pending, contents, { flag: 'wx' });
    for (const { pending, output } of files) await rename(pending, output);
  } finally {
    await Promise.all(files.map(({ pending }) => rm(pending, { force: true })));
  }
}
