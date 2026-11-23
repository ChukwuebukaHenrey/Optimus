/**
 * Report renderer entry point. PLACEHOLDER: the UI agent replaces the body of renderReport with the designed
 * report (docs/UI_STRUCTURE.md). The signature is part of the data contract (docs/UI_DATA_CONTRACT.md):
 * it receives a validated ComparisonBundle and writes index.html (plus any assets) into the bundle folder,
 * next to bundle.json and evidence/. It must not read anything except the bundle and the files it references.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ComparisonBundle } from './schema.js';

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/gu, (character) => entities[character]);

export async function renderReport(bundle: ComparisonBundle, bundleDirectory: string): Promise<string> {
  const runs = new Map(bundle.runs.map((run) => [run.runId, run]));
  const verdict = (runId: string, scenarioId: string) =>
    runs.get(runId)?.scenarios.find((scenario) => scenario.scenarioId === scenarioId)?.result.verdict ?? 'NOT_RUN';
  const rows = bundle.builds.map((build) => `<tr><th scope="row">${escapeHtml(build.label)}</th>${bundle.scope.map((id) => {
    const baseline = verdict(build.baselineRunId, id);
    const latestRun = build.latestRuns[id] ?? build.latestRunId;
    const latest = verdict(latestRun, id);
    return `<td>${escapeHtml(baseline)}${latestRun === build.baselineRunId ? '' : ` · latest ${escapeHtml(latest)}`}</td>`;
  }).join('')}<td>${escapeHtml(build.repairState)}</td></tr>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(bundle.assessment.name)}</title>
</head>
<body>
<main>
<h1>${escapeHtml(bundle.assessment.name)}</h1>
<p>Placeholder report. Contract ${escapeHtml(bundle.assessment.pack.name)} v${escapeHtml(bundle.assessment.pack.version)} · <code>${escapeHtml(bundle.assessment.pack.packHash.slice(0, 8))}</code></p>
<table>
<thead><tr><th scope="col">Build</th>${bundle.scope.map((id) => `<th scope="col">${escapeHtml(id)}</th>`).join('')}<th scope="col">Repair</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</main>
</body>
</html>
`;
  const path = join(bundleDirectory, 'index.html');
  await writeFile(path, html, 'utf8');
  return path;
}
