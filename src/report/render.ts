/**
 * The offline comparison report (docs/UI_STRUCTURE.md, docs/UI_DATA_CONTRACT.md, DESIGN.md).
 *
 * Reading path: Level 1 comparison matrix → Level 2 build detail → Level 3 scenario evidence →
 * Level 4 repair record (only for builds with a recorded repair session), plus the contract and
 * the calibration summary. Static HTML: no scripts, inline styles, embedded fonts (the report's own
 * assets in ./assets), screenshots from the bundle's evidence/ folder. Apart from those fonts it
 * reads nothing but the bundle. Every string from the bundle is untrusted and escaped.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BundleBuild, BundleRepair, BundleRun, ComparisonBundle } from './schema.js';
import { MARK_PATH, MARK_VIEWBOX } from './mark.js';
import { stylesheet } from './styles.js';

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/gu, (character) => entities[character]);
const e = escapeHtml;

type Verdict = BundleRun['scenarios'][number]['result']['verdict'];
type ScenarioRun = BundleRun['scenarios'][number];
type Decision = BundleRepair['outcome']['decision'];

/** Anchor ids built from bundle ids: restricted to a safe alphabet, then escaped where used. */
const anchor = (...parts: string[]) => parts.join('-').replace(/[^A-Za-z0-9_-]/gu, '-');

const ICONS: Record<Verdict, string> = {
  PASS: '<path d="M3 8.5l3 3 7-7"/>',
  FAIL: '<path d="M4 4l8 8M12 4l-8 8"/>',
  INCONCLUSIVE: '<path d="M6 6a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.8M8 12.5v.5"/>',
  NOT_RUN: '<path d="M4 8h8"/>',
  INFRA_ERROR: '<path d="M6 2v3M10 2v3M4 5h8v2a4 4 0 0 1-8 0zM8 11v3"/>',
  UNSUPPORTED: '<circle cx="8" cy="8" r="5.5"/><path d="M4.2 11.8l7.6-7.6"/>',
};
const LABELS: Record<Verdict, string> = {
  PASS: 'PASS', FAIL: 'FAIL', INCONCLUSIVE: 'INCONCLUSIVE', NOT_RUN: 'NOT RUN', INFRA_ERROR: 'INFRA ERROR', UNSUPPORTED: 'UNSUPPORTED',
};
const MEANINGS: Record<Verdict, string> = {
  PASS: 'The required behaviour was performed and observed.',
  FAIL: 'The action happened and the result was visibly wrong.',
  INCONCLUSIVE: 'The evidence cannot support either answer. No judgement.',
  NOT_RUN: 'A needed step was skipped or no trace was supplied. No judgement.',
  INFRA_ERROR: 'The browser run or tooling failed. Says nothing about the app.',
  UNSUPPORTED: 'The app is outside the contract’s supported type.',
};
const SCENARIO_NAMES: Record<string, string> = { L1: 'Add', L2: 'Toggle read', L3: 'Remove', L4: 'Persist' };

function badge(verdict: Verdict): string {
  return `<span class="v v-${verdict}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">${ICONS[verdict]}</svg>${LABELS[verdict]}</span>`;
}
const decisionBadge = (decision: Decision) => `<span class="d">${e(decision.replace(/_/gu, ' '))}</span>`;
const shortHash = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-4)}`;
const hashChip = (hash: string) => `<details class="hash mono"><summary>${e(shortHash(hash))}</summary>${e(hash)}</details>`;
const fmt = (n: number | null, digits = 2) => (n === null ? '—' : n.toFixed(digits));
const show = (value: unknown) => (value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const check = (label: string, ok: boolean) =>
  `<li class="${ok ? 'ok' : 'bad'}"><span aria-hidden="true">${ok ? '✓' : '✗'}</span> ${e(label)}<span class="sr"> — ${ok ? 'passed' : 'problem'}</span></li>`;

export async function renderReport(bundle: ComparisonBundle, bundleDirectory: string): Promise<string> {
  const runs = new Map(bundle.runs.map((run) => [run.runId, run]));
  const contractTitle = new Map(bundle.contract.map((scenario) => [scenario.id, scenario.title]));
  const name = (id: string) => SCENARIO_NAMES[id] ?? contractTitle.get(id) ?? id;
  const scenarioOf = (runId: string, scenarioId: string): ScenarioRun | undefined =>
    runs.get(runId)?.scenarios.find((scenario) => scenario.scenarioId === scenarioId);
  const verdictOf = (runId: string, scenarioId: string): Verdict => scenarioOf(runId, scenarioId)?.result.verdict ?? 'NOT_RUN';
  // Latest verdicts come from latestRuns (bundle v2), never from latestRunId.
  const latestOf = (build: BundleBuild, scenarioId: string) => build.latestRuns[scenarioId] ?? build.baselineRunId;
  const repairs = new Map(bundle.repairs.filter((repair) => repair.attempts.length > 0).map((repair) => [repair.sessionId, repair]));

  const scoreOf = (build: BundleBuild) => {
    const verdicts = bundle.scope.map((id) => verdictOf(latestOf(build, id), id));
    return verdicts.every((v) => v === 'PASS' || v === 'FAIL')
      ? `${Math.round((verdicts.filter((v) => v === 'PASS').length / verdicts.length) * 100)}%`
      : 'Provisional';
  };

  /* ------------------------------------------------------------ summary */
  const latestVerdicts = bundle.builds.flatMap((build) => bundle.scope.map((id) => verdictOf(latestOf(build, id), id)));
  const resolved = latestVerdicts.filter((v) => v === 'PASS' || v === 'FAIL').length;
  const totals: [string, number][] = [
    ['Builds', bundle.builds.length],
    ['Scenarios in scope', bundle.scope.length],
    ['Verdicts issued', latestVerdicts.length],
    ['Resolved', resolved],
    ['No judgement', latestVerdicts.length - resolved],
    ...(repairs.size ? [['Repair sessions', repairs.size] as [string, number]] : []),
  ];

  /* ------------------------------------------------------------ level 1: matrix */
  const repairStateCell = (build: BundleBuild) => {
    if (build.repairState === 'no_repair') return '<span class="muted">No repair</span>';
    const label = build.repairState === 'repaired' ? 'Repaired' : 'Stopped';
    return build.repairSessionId && repairs.has(build.repairSessionId)
      ? `<a href="#${e(anchor('repair', build.repairSessionId))}">${label}</a>`
      : label;
  };
  const matrixCell = (build: BundleBuild, scenarioId: string) => {
    const baselineRun = build.baselineRunId;
    const latestRun = latestOf(build, scenarioId);
    const link = (runId: string) => `#${e(anchor('ev', build.buildId, runId, scenarioId))}`;
    if (latestRun === baselineRun) return `<a href="${link(baselineRun)}">${badge(verdictOf(baselineRun, scenarioId))}</a>`;
    return `<div class="cell">
      <a class="state" href="${link(baselineRun)}"><span class="label">baseline</span>${badge(verdictOf(baselineRun, scenarioId))}</a>
      <a class="state" href="${link(latestRun)}"><span class="label">verified</span>${badge(verdictOf(latestRun, scenarioId))}</a>
    </div>`;
  };
  const matrix = `<div class="table-scroll"><table>
    <caption class="label">Verdict for every build and scenario. Each cell links to its evidence.</caption>
    <thead><tr><th scope="col">Build</th>${bundle.scope.map((id) => `<th scope="col" class="mtx-name">${e(name(id))}<small>${e(id)}</small></th>`).join('')}<th scope="col">Score</th><th scope="col">Repair</th></tr></thead>
    <tbody>${bundle.builds.map((build) => `<tr>
      <th scope="row"><a href="#${e(anchor('build', build.buildId))}">${e(build.label)}</a></th>
      ${bundle.scope.map((id) => `<td>${matrixCell(build, id)}</td>`).join('')}
      <td class="mono num">${e(scoreOf(build))}</td>
      <td>${repairStateCell(build)}</td></tr>`).join('')}
    </tbody></table></div>
    <dl class="legend">${(Object.keys(LABELS) as Verdict[]).map((v) => `<div><dt>${badge(v)}</dt><dd>${e(MEANINGS[v])}</dd></div>`).join('')}</dl>`;

  /* ------------------------------------------------------------ level 3: evidence */
  const evidence = (scenario: ScenarioRun) => {
    if (!scenario.steps.length) return '<p class="noshot">No steps were recorded for this scenario.</p>';
    return `<ol class="steps">${scenario.steps.map((step) => {
      const decisive = scenario.result.stepId === step.stepId;
      const recorded = step.actionRecorded === null ? 'unknown' : step.actionRecorded ? 'yes' : 'no';
      const values = Object.entries(step.values);
      return `<li class="step${decisive ? ' decisive' : ''}">
        <div>
          <p class="label">${e(step.stepId)}${decisive ? ' · decided the verdict' : ''}</p>
          <p class="gap wrap-any">${e(step.action)}</p>
          <p class="muted gap">Action recorded: <span class="strong">${recorded}</span> · target agreement: ${e(step.targetAgreement)}</p>
          ${values.length ? `<dl class="vals mono">${values.map(([k, v]) => `<dt class="muted">${e(k)}</dt><dd>${v === null ? '<span class="muted">missing</span>' : e(v)}</dd>`).join('')}</dl>` : ''}
        </div>
        ${step.screenshot
          ? `<a class="shot" href="${e(step.screenshot)}"><img src="${e(step.screenshot)}" alt="End-of-step screenshot: ${e(step.action)}" loading="lazy" width="320" height="180"></a>`
          : '<p class="noshot">No screenshot archived for this step.</p>'}
      </li>`;
    }).join('')}</ol>`;
  };

  /* ------------------------------------------------------------ level 2: build detail */
  const scenarioCard = (build: BundleBuild, runId: string, scenarioId: string, role: string) => {
    const scenario = scenarioOf(runId, scenarioId);
    const id = anchor('ev', build.buildId, runId, scenarioId);
    if (!scenario) {
      return `<li class="scenario" id="${e(id)}"><div class="scenario-head"><h4>${e(name(scenarioId))} <span class="mono muted">${e(scenarioId)}</span></h4>${badge('NOT_RUN')}</div><p class="reason">No trace was supplied for this scenario in ${e(runId)}.</p></li>`;
    }
    const result = scenario.result;
    const hasEO = result.expected !== undefined || (result.observed !== undefined && result.observed !== null);
    return `<li class="scenario" id="${e(id)}">
      <div class="scenario-head">
        <h4>${e(name(scenarioId))} <span class="mono muted">${e(scenarioId)}</span></h4>
        ${badge(result.verdict)}
        <span class="label">${e(role)} · run ${e(runId)}</span>
      </div>
      <p class="reason">${e(result.reason)}</p>
      <p class="muted gap">Reason code <code>${e(result.reasonCode)}</code>${result.stepId ? ` · step <code>${e(result.stepId)}</code>` : ''}${scenario.executionId ? ` · Kane execution <code>${e(scenario.executionId)}</code>` : ''}</p>
      ${hasEO ? `<dl class="eo"><dt class="label">Expected</dt><dd><pre>${e(show(result.expected))}</pre></dd><dt class="label">Observed</dt><dd><pre>${e(show(result.observed ?? 'missing'))}</pre></dd></dl>` : ''}
      <details${result.verdict === 'FAIL' ? ' open' : ''}><summary>Evidence: ${scenario.steps.length} steps, recorded values and screenshots</summary>${evidence(scenario)}</details>
    </li>`;
  };

  const integrity = (run: BundleRun) => {
    const all = run.scenarios;
    return `<ul class="checks">${[
      check('Run completed', all.every((s) => s.integrity.completed)),
      check('Replay decisions = 0', all.every((s) => s.integrity.replayDecisions === 0)),
      check('Evidence archive present', all.every((s) => s.integrity.evidenceArchive)),
      check('Contract hash matches the comparison', run.packHash === bundle.assessment.pack.packHash),
    ].join('')}</ul>`;
  };

  const buildSection = (build: BundleBuild) => {
    const baseline = runs.get(build.baselineRunId)!;
    const kaneVersion = baseline.scenarios.find((s) => s.integrity.kaneVersion)?.integrity.kaneVersion ?? null;
    const later = [...new Set(bundle.scope.map((id) => latestOf(build, id)).filter((runId) => runId !== build.baselineRunId))];
    const titleId = anchor('build', build.buildId, 'title');
    return `<article class="build" id="${e(anchor('build', build.buildId))}" aria-labelledby="${e(titleId)}">
      <h3 id="${e(titleId)}">${e(build.label)}</h3>
      <dl class="meta">
        <div><dt class="label">Score</dt><dd class="mono">${e(scoreOf(build))}</dd></div>
        <div><dt class="label">App source</dt><dd class="mono">${e(build.appSource)}</dd></div>
        <div><dt class="label">Baseline run</dt><dd class="mono">${e(baseline.runId)} · nonce ${e(baseline.nonce)}</dd></div>
        <div><dt class="label">Kane version</dt><dd class="mono">${e(kaneVersion ?? 'not recorded')}</dd></div>
        <div><dt class="label">Credits (baseline)</dt><dd class="mono">${e(fmt(baseline.creditsUsed))}</dd></div>
        ${build.repairState !== 'no_repair' ? `<div><dt class="label">Repair</dt><dd>${repairStateCell(build)}</dd></div>` : ''}
      </dl>
      <p class="label gap-l">Run integrity · baseline</p>
      ${integrity(baseline)}
      ${later.map((runId) => `<p class="label gap-l">Run integrity · ${e(runId)}</p>${integrity(runs.get(runId)!)}`).join('')}
      <ol class="scenarios">${bundle.scope.map((id) => {
        const latest = latestOf(build, id);
        return latest === build.baselineRunId
          ? scenarioCard(build, build.baselineRunId, id, 'verdict')
          : scenarioCard(build, build.baselineRunId, id, 'baseline') + scenarioCard(build, latest, id, 'verified after repair');
      }).join('')}</ol>
    </article>`;
  };

  /* ------------------------------------------------------------ level 4: repair record */
  const runVerdicts = (runId: string) =>
    `<ul class="checks">${bundle.scope.map((id) => `<li><span>${e(name(id))} <span class="mono muted">${e(id)}</span></span> ${badge(verdictOf(runId, id))}</li>`).join('')}</ul>`;
  const meter = (label: string, used: number | null, cap: number) => {
    const share = used === null ? 0 : Math.min(1, used / cap);
    const shown = used === null ? '—' : String(Math.round(used * 100) / 100);
    return `<div><span class="label">${e(label)}</span><span class="bar" role="img" aria-label="${e(`${shown} of ${cap}`)}"><i style="width:${(share * 100).toFixed(1)}%"></i></span><span class="mono num">${e(shown)} / ${e(cap)}</span></div>`;
  };
  const diffView = (diff: string) =>
    `<pre class="diff">${diff.split('\n').filter((line) => !line.startsWith('index ')).map((line) => {
      const kind = line.startsWith('+') && !line.startsWith('+++') ? 'add' : line.startsWith('-') && !line.startsWith('---') ? 'del' : line.startsWith('@@') ? 'hunk' : '';
      const sr = kind === 'add' ? '<span class="sr">added: </span>' : kind === 'del' ? '<span class="sr">removed: </span>' : '';
      return `<span${kind ? ` class="${kind}"` : ''}>${sr}${e(line || ' ')}</span>`;
    }).join('')}</pre>`;

  const repairSection = (repair: BundleRepair) => {
    const build = bundle.builds.find((b) => b.buildId === repair.buildId)!;
    let step = 0;
    const stage = (title: string, body: string) => `<li class="stage"><span class="dot" aria-hidden="true">${++step}</span><h4>${title}</h4>${body}</li>`;
    // Built in reading order so the stage numbers run 1, 2, 3…
    const baselineStage = stage('Baseline run', `<p class="muted">Run <code>${e(repair.baselineRunId)}</code> · contract ${e(shortHash(repair.packHash))}</p>${runVerdicts(repair.baselineRunId)}`);
    const attemptStages = (attempt: BundleRepair['attempts'][number]) => [
      stage(`Attempt ${attempt.attempt}: brief sent to the coding agent`, `<div class="agent">
        <p class="label">Sent to the coding agent — exactly this, nothing else</p>
        <pre class="gap">${e(attempt.briefMarkdown)}</pre>
        ${attempt.briefScreenshot ? `<a class="shot gap-l narrow" href="${e(attempt.briefScreenshot)}"><img src="${e(attempt.briefScreenshot)}" alt="Screenshot sent with the brief" loading="lazy" width="480" height="270"></a>` : ''}
        <p class="muted gap">The agent received this failure’s plain-language requirement and expected-versus-observed behaviour — never the full contract, unrelated checks or the evaluator.</p>
      </div>`),
      stage('Agent action', attempt.agent ? `<dl class="meta">
          <div><dt class="label">Agent</dt><dd class="mono">${e(attempt.agent.agent)}</dd></div>
          <div><dt class="label">Exit</dt><dd class="mono">${e(attempt.agent.exitCode ?? 'none')}${attempt.agent.timedOut ? ' · timed out' : ''}</dd></div>
          <div><dt class="label">Started</dt><dd class="mono">${e(attempt.agent.startedAt)}</dd></div>
          <div><dt class="label">Finished</dt><dd class="mono">${e(attempt.agent.finishedAt)}</dd></div>
        </dl>
        ${attempt.agent.finalMessage ? `<details class="agent"><summary>Agent’s final message (agent output, not a verdict)</summary><pre class="gap">${e(attempt.agent.finalMessage)}</pre></details>` : ''}`
        : '<p class="muted">The agent was not invoked for this attempt.</p>'),
      stage('Code change', `<p class="muted">Source revision <code>${e(attempt.sourceRevisionBefore)}</code> → <code>${e(attempt.sourceRevisionAfter ?? 'none')}</code> · files: ${attempt.changedFiles.map((f) => `<code>${e(f)}</code>`).join(', ') || 'none'}</p>
        <pre class="muted gap">${e(attempt.diffStat)}</pre>
        ${attempt.diff ? `<details open><summary>Diff</summary>${diffView(attempt.diff)}</details>` : ''}`),
      stage('Integrity checks', attempt.integrity ? `<ul class="checks">${[
        check('Only files inside the isolated app copy changed', attempt.integrity.workspaceOutsideOptimus),
        check('Contract hash recomputed and unchanged', attempt.integrity.packHashUnchanged),
        check('Evaluator and Kane adapter unchanged', attempt.integrity.graderUnchanged),
      ].join('')}</ul>
        ${attempt.integrity.changedGraderFiles.length ? `<p class="bad">Changed grader files: ${attempt.integrity.changedGraderFiles.map((f) => `<code>${e(f)}</code>`).join(', ')}</p>` : ''}
        <p class="muted gap">Matching hashes do not prove a protected file was never read; the isolated workspace is the primary control.</p>`
        : '<p class="muted">No integrity record for this attempt.</p>'),
      stage('Fresh Kane run', attempt.verificationRunId
        ? `<p class="muted">Run <code>${e(attempt.verificationRunId)}</code> · new nonce ${e(runs.get(attempt.verificationRunId)?.nonce ?? '')} · same contract · every calibrated scenario</p>${runVerdicts(attempt.verificationRunId)}`
        : '<p class="muted">No verification run was recorded for this attempt.</p>'),
    ].join('');
    const decisions = repair.decisions.map((decision) => stage(`Decision gate ${decisionBadge(decision.decision)}`,
      `<p class="reason">${e(decision.reason)}</p>
       <p class="muted gap">Based on: ${decision.basis.map((b) => `${e(b.scenarioId)} ${badge(b.verdict)} from <code>${e(b.runId)}</code>`).join(' · ')}</p>`) + repair.attempts.filter((attempt) => attempt.decisionId === decision.decisionId).map(attemptStages).join('')).join('');

    return `<article class="build" id="${e(anchor('repair', repair.sessionId))}">
      <h3>${e(build.label)}</h3>
      <p class="muted gap">Session <code>${e(repair.sessionId)}</code> · started ${e(repair.startedAt)}${repair.finishedAt ? ` · finished ${e(repair.finishedAt)}` : ''}</p>
      <ol class="timeline">
        ${baselineStage}
        ${decisions}
        ${stage(`Outcome ${decisionBadge(repair.outcome.decision)}`, `<p class="reason">${e(repair.outcome.reason)}</p>`)}
      </ol>
      <p class="label">Budget</p>
      <div class="meter">
        ${meter('Attempts', repair.budget.attemptsUsed, repair.caps.attempts)}
        ${meter('Credits', repair.budget.creditsUsed, repair.caps.credits)}
        ${meter('Minutes', repair.budget.repairMinutesUsed, repair.caps.minutes)}
      </div>
      <p class="muted gap">Infrastructure retries used: ${e(repair.budget.infrastructureRetriesUsed)} (counted separately).</p>
    </article>`;
  };

  /* ------------------------------------------------------------ contract */
  const contract = bundle.contract.map((scenario) => `<article class="build" id="${e(anchor('contract', scenario.id))}">
    <h4>${e(scenario.title)} <span class="mono muted">${e(scenario.id)}${scenario.inScope ? '' : ' · not in this comparison'}</span></h4>
    <div class="contract">
      <div class="panel"><p class="label">Sent to Kane</p><ol>${scenario.sentToKane.steps.map((step) => `<li><p>${e(step.action)}</p>${Object.entries(step.record).map(([k, prompt]) => `<p class="muted"><code>${e(k)}</code>: ${e(prompt)}</p>`).join('')}</li>`).join('')}</ol></div>
      <div class="panel judged"><p class="label">Judged by Optimus — never sent to Kane</p><ol>${scenario.judgedByOptimus.checks.map((c) => `<li>${c.prerequisite ? '<span class="label">prerequisite · </span>' : ''}${e(c.text)}</li>`).join('')}</ol>
        ${scenario.judgedByOptimus.newValues.length ? `<p class="muted gap">Designated new values: ${scenario.judgedByOptimus.newValues.map((v) => `<code>${e(v)}</code>`).join(', ')}</p>` : ''}
        <p class="muted gap">Evidence rule: ${e(scenario.judgedByOptimus.evidenceRule)}</p></div>
    </div>
  </article>`).join('');

  /* ------------------------------------------------------------ calibration */
  const cal = bundle.calibration;
  const calibration = cal ? `<section id="calibration" aria-labelledby="calibration-title"><div class="wrap">
    <header><p class="label">Calibration</p><h2 id="calibration-title" class="display">${e(cal.title)}</h2>
    <p>Proof that the grader agrees with known answers before it judges anyone: ${cal.rows.filter((r) => r.expected === r.verdict).length} of ${cal.rows.length} cases matched.</p></header>
    <div class="table-scroll"><table class="calib"><thead><tr><th scope="col">App</th><th scope="col">Trial</th><th scope="col">Scenario</th><th scope="col">Expected</th><th scope="col">Verdict</th><th scope="col">Match</th><th scope="col">Seconds</th><th scope="col">Credits</th></tr></thead>
    <tbody>${cal.rows.map((r) => `<tr><td>${e(r.app)}</td><td class="num">${e(r.trial)}</td><td class="mono">${e(r.scenario)}</td><td>${badge(r.expected)}</td><td>${badge(r.verdict)}</td><td class="${r.expected === r.verdict ? 'ok' : 'bad'}">${r.expected === r.verdict ? '✓ match' : '✗ differs'}</td><td class="num mono">${e(r.seconds ?? '—')}</td><td class="num mono">${e(fmt(r.credits))}</td></tr>`).join('')}</tbody></table></div>
    ${cal.notes.length ? `<ul class="notes">${cal.notes.map((n) => `<li>${e(n)}</li>`).join('')}</ul>` : ''}
  </div></section>` : '';

  /* ------------------------------------------------------------ page */
  const pack = bundle.assessment.pack;
  const repairList = [...repairs.values()];
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; font-src data:; base-uri 'none'; form-action 'none'">
<title>${e(bundle.assessment.name)} · Optimus report</title>
<style>${await stylesheet()}</style>
</head>
<body>
<div class="identity"><div class="wrap">
  <p class="brand"><svg viewBox="${MARK_VIEWBOX}" aria-hidden="true"><path d="${MARK_PATH}" fill="currentColor" fill-rule="evenodd"/></svg><span class="strong">Optimus</span> <span class="label">report</span> · <span class="strong">${e(bundle.assessment.name)}</span></p>
  <p><a href="#contract">Contract ${e(pack.name)} v${e(pack.version)}</a> · <span class="mono">${e(shortHash(pack.packHash))}</span> · <span class="same">every build used this contract hash</span></p>
</div></div>
<main>
<section class="hero"><div class="wrap">
  <p class="mega num" aria-hidden="true">${e(bundle.builds.length)}</p>
  <div>
    <p class="label">${e(bundle.builds.length)} builds · one contract</p>
    <h1 class="display">Which builds meet the contract? <span class="muted">Verdicts from Optimus; evidence from Kane CLI.</span></h1>
  </div>
</div>
<div class="wrap gap-xl"><dl class="totals">${totals.map(([label, value]) => `<div><dt class="label">${e(label)}</dt><dd class="num">${e(value)}</dd></div>`).join('')}</dl></div>
</section>

<section id="matrix" aria-labelledby="matrix-title"><div class="wrap">
  <header><p class="label">Level 1 · comparison</p><h2 id="matrix-title" class="display">Verdict matrix</h2>
  <p>One row per build, one column per scenario. A repaired build shows its baseline verdict and its verified verdict as two labelled states; the baseline is never overwritten. A score appears only when every scenario is resolved.</p></header>
  ${matrix}
</div></section>

<section id="builds" aria-labelledby="builds-title"><div class="wrap">
  <header><p class="label">Levels 2 and 3 · build detail and evidence</p><h2 id="builds-title" class="display">Why each build got its verdicts</h2>
  <p>Each scenario shows its verdict, the plain reason and, for a failure, expected against observed. Open the evidence for the steps Kane performed, the values it recorded and the end-of-step screenshots.</p></header>
  ${bundle.builds.map(buildSection).join('')}
</div></section>

${repairList.length ? `<section id="repairs" aria-labelledby="repairs-title"><div class="wrap">
  <header><p class="label">Level 4 · repair record</p><h2 id="repairs-title" class="display">Did the fix work, and can it be trusted?</h2>
  <p>Rendered only from the recorded repair history. Only a verified FAIL can start a repair; INCONCLUSIVE never does. Content that went to or came from the coding agent is in dashed agent panels — verdicts always come from Optimus.</p></header>
  ${repairList.map(repairSection).join('')}
</div></section>` : ''}

<section id="contract" aria-labelledby="contract-title"><div class="wrap">
  <header><p class="label">Contract</p><h2 id="contract-title" class="display">What every build was tested against</h2>
  <p>${e(pack.name)} v${e(pack.version)} · hash ${hashChip(pack.packHash)}</p>
  <p>Supports: ${e(pack.support)}. Persistence: ${e(pack.persistence)}.</p>
  <p class="muted"><code>{{nonce}}</code> is filled with a fresh run id for every run; the hash covers the unexpanded contract.</p></header>
  ${contract}
</div></section>
${calibration}
</main>
<footer><div class="wrap"><p>Generated ${e(bundle.generatedAt)} from comparison bundle version ${e(bundle.bundleVersion)}. Verdicts are decided by Optimus’s deterministic evaluator; no language model decides or rewrites a verdict.</p></div></footer>
</body>
</html>
`;
  const path = join(bundleDirectory, 'index.html');
  await writeFile(path, html, 'utf8');
  return path;
}
