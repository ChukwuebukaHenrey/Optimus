import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../src/core/evaluate.js';
import { actionForStep, loadPack, parsePack, type LoadedPack } from '../src/core/pack.js';
import type { Observation, RunRecord, ScenarioTrace } from '../src/core/types.js';

const library = await loadPack(join('packs', 'library'));
const calculator = await loadPack(join('tests', 'fixtures', 'calculator.pack.yaml'));
// Byte-identical copy of Library v2 and sanitized normalized traces from the first Gate 1 trial.
const v2Source = await readFile(join('tests', 'fixtures', 'library-v2.pack.yaml'), 'utf8');
const v2 = parsePack(v2Source);
// Test-only: v2 with each added title designated as a new value, to exercise the check on real recordings.
// Its hash differs from v2, so results against it are implementation checks, never verdicts on an app.
const v2Designated = parsePack(v2Source.replace(/^( +)do: Add a new book with title "([^"]+)",.*\n/gmu, "$&$1new_values: ['$2']\n"));
const asDesignated = (input: ScenarioTrace): ScenarioTrace => ({ ...input, run: { ...input.run, packHash: v2Designated.packHash } });
const traces: Record<string, ScenarioTrace> = JSON.parse(await readFile(join('tests', 'fixtures', 'gate1-v2-traces.json'), 'utf8'));

function trace(loaded: LoadedPack, scenarioId: string, byStep: Record<string, Observation['values']>): ScenarioTrace {
  const scenario = loaded.pack.scenarios.find(({ id }) => id === scenarioId)!;
  return {
    scenarioId,
    run: {
      completed: true, kaneExitCode: 0, replayDecisions: 0, authorDecisions: scenario.steps.length,
      evidencePackPath: 'example.evidence', kaneVersion: 'fixture', executionId: 'synthetic',
      stepsSkipped: [], packHash: loaded.packHash, nonce: 'sample', appUrl: 'http://localhost:8080',
    },
    observations: scenario.steps.map((step, index) => ({
      stepIndex: index, stepId: step.id, actionKind: actionForStep(step, index),
      actionRecorded: true, targetAgreement: 'unknown', values: byStep[step.id] ?? {},
      screenshotRef: null, evidenceRef: null,
    })),
  };
}

const add = (titlesAfter = 'GP Book sample', countAfter = '1', titlesBefore = 'none', countBefore = '0') => trace(library, 'L1', {
  before: { titles_before: titlesBefore, count_before: countBefore },
  add: { titles_after: titlesAfter, count_after: countAfter },
});
const remove = (titlesAfter = 'GP Beta sample', countAfter = '1', titlesBefore = 'GP Beta sample | GP Alpha sample') => trace(library, 'L3', {
  add_alpha: { titles_before: titlesBefore, count_before: '2' },
  remove: { titles_after: titlesAfter, count_after: countAfter },
});
const reload = (titlesAfter = 'GP Keep sample', countAfter = '1', titlesBefore = 'GP Keep sample') => trace(library, 'L4', {
  add: { titles_before: titlesBefore, count_before: '1' },
  reload: { titles_after: titlesAfter, count_after: countAfter },
});

describe('Library evaluation', () => {
  it.each([
    ['adds one new book', add(), 'PASS', 'assertions_satisfied'],
    ['adds a book without showing its title', add('Sample A', '2', 'Sample A', '1'), 'FAIL', 'assertion_failed'],
    ['adds the requested book twice', add('GP Book sample | GP Book sample', '2'), 'FAIL', 'assertion_failed'],
    ['records an unrequested new entry after add', add('GP Book sample | Unexpected book', '2'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['records a different title than requested', add('Unexpected book'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['records the new book author instead of its title', add('Sample A | Sample B | Ada Okafor', '3', 'Sample A | Sample B', '2'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['records the remove target as a new entry', remove('GP Beta sample | GP Gamma sample', '1', 'GP Beta sample | GP Alpha sample'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['records an unrequested new entry after remove', remove('GP Beta sample | Unexpected book', '1'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['records an unrequested new entry after reload', reload('GP Keep sample | Unexpected book', '2'), 'INCONCLUSIVE', 'recording_inconsistent'],
    ['adds to an existing list', add('Sample A | Sample B | GP Book sample', '3', 'Sample A | Sample B', '2'), 'PASS', 'assertions_satisfied'],
    ['produces an unparseable count', add('GP Book sample', 'many'), 'INCONCLUSIVE', 'recording_unavailable'],
    ['reports a fractional count', add('GP Book sample', '1.5', 'none', '0.5'), 'INCONCLUSIVE', 'recording_unavailable'],
    ['reports a negative baseline count', add('GP Book sample', '0', 'none', '-1'), 'INCONCLUSIVE', 'recording_unavailable'],
    ['removes the chosen book', remove(), 'PASS', 'assertions_satisfied'],
    ['removes the wrong book', remove('GP Alpha sample'), 'FAIL', 'assertion_failed'],
    ['shows no change after remove', remove('GP Beta sample | GP Alpha sample', '2.0'), 'INCONCLUSIVE', 'no_observable_change'],
    ['records the same books in a different order', remove('GP Alpha sample | GP Beta sample', '2'), 'INCONCLUSIVE', 'no_observable_change'],
    ['does not establish the requested starting books', remove('GP Beta sample', '1', 'GP Beta sample | Sample A'), 'INCONCLUSIVE', 'prerequisite_not_established'],
    ['persists across reload', reload(), 'PASS', 'assertions_satisfied'],
    ['loses the book on reload', reload('none', '0'), 'FAIL', 'assertion_failed'],
    ['does not establish a book before reload', reload('none', '0', 'Sample A'), 'INCONCLUSIVE', 'prerequisite_not_established'],
    ['changes read status', trace(library, 'L2', { add: { status_before: 'To read' }, toggle: { status_after: 'Finished' } }), 'PASS', 'assertions_satisfied'],
    ['starts with an already-read book', trace(library, 'L2', { add: { status_before: 'Read' }, toggle: { status_after: 'Finished' } }), 'INCONCLUSIVE', 'prerequisite_not_established'],
    ['leaves read status unchanged', trace(library, 'L2', { add: { status_before: 'To read' }, toggle: { status_after: 'To read' } }), 'INCONCLUSIVE', 'no_observable_change'],
  ] as const)('%s', (_name, input, verdict, reasonCode) => {
    expect(evaluateScenario(library, input)).toMatchObject({ verdict, reasonCode });
  });

  it.each([false, null])('requires a recorded action when actionRecorded is %s', (actionRecorded) => {
    const input = add();
    input.observations[1].actionRecorded = actionRecorded;
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INCONCLUSIVE', reasonCode: 'action_not_recorded', stepId: 'add' });
  });

  it('requires navigation evidence for a reload', () => {
    const input = reload('none', '0');
    input.observations[2].actionKind = 'interact';
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INCONCLUSIVE', reasonCode: 'action_not_recorded', stepId: 'reload' });
  });

  it('rejects contradicted targets', () => {
    const input = add();
    input.observations[1].targetAgreement = 'contradicted';
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INCONCLUSIVE', reasonCode: 'action_target_contradicted' });
  });

  const brokenRuns: [Partial<RunRecord>, string, string][] = [
    [{ replayDecisions: 1 }, 'INFRA_ERROR', 'replay_detected'],
    [{ replayDecisions: null }, 'INFRA_ERROR', 'replay_count_missing'],
    [{ authorDecisions: 0 }, 'INFRA_ERROR', 'author_count_missing'],
    [{ authorDecisions: null }, 'INFRA_ERROR', 'author_count_missing'],
    [{ packHash: '0'.repeat(64) }, 'INFRA_ERROR', 'pack_hash_mismatch'],
    [{ kaneExitCode: 2 }, 'INFRA_ERROR', 'run_incomplete'],
    [{ kaneExitCode: 3 }, 'INFRA_ERROR', 'run_incomplete'],
    [{ completed: false }, 'INFRA_ERROR', 'run_incomplete'],
    [{ evidencePackPath: null }, 'INFRA_ERROR', 'evidence_pack_missing'],
    [{ stepsSkipped: [0] }, 'NOT_RUN', 'decisive_step_skipped'],
    [{ stepsSkipped: [1] }, 'NOT_RUN', 'decisive_step_skipped'],
  ];
  it.each(brokenRuns)('enforces run integrity with %j', (update, verdict, reasonCode) => {
    const input = add();
    Object.assign(input.run, update);
    input.observations = input.observations.filter(({ stepIndex }) => !input.run.stepsSkipped.includes(stepIndex));
    expect(evaluateScenario(library, input)).toMatchObject({ verdict, reasonCode });
  });

  it('does not backfill an earlier step with a value from a later observation', () => {
    const input = add();
    input.observations[0].values.count_before = null;
    input.observations[1].values.count_before = '0';
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INCONCLUSIVE', reasonCode: 'recording_unavailable', stepId: 'before' });
  });

  it('rejects duplicate step observations', () => {
    const input = add();
    input.observations.push(input.observations[1]);
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INFRA_ERROR', reasonCode: 'invalid_observation_order' });
  });

  it('rejects a step reported as both observed and skipped', () => {
    const input = add();
    input.run.stepsSkipped = [1];
    expect(evaluateScenario(library, input)).toMatchObject({ verdict: 'INFRA_ERROR', reasonCode: 'invalid_observation_order' });
  });
});

describe('Gate 1 v2 traces', () => {
  it('keeps the Gate 1 pack hash', () => {
    expect(v2.packHash).toBe('259613c83f6ff13aa3b3bb832092c214cc4fefbdfbc3cabaaa636882e63a1c80');
    expect(v2Designated.packHash).not.toBe(v2.packHash);
  });

  // v2 designates no new values, so a recording that gains the added title cannot be trusted under it.
  it.each([
    ['g1-a-1/L1', 'INCONCLUSIVE', 'recording_inconsistent'],
    ['g1-a-1/L3', 'PASS', 'assertions_satisfied'],
    ['g1-a-1/L4', 'PASS', 'assertions_satisfied'],
    ['g1-b-1/L1', 'INCONCLUSIVE', 'recording_inconsistent'],
    ['g1-b-1/L3', 'INCONCLUSIVE', 'recording_inconsistent'],
    ['g1-b-1/L4', 'PASS', 'assertions_satisfied'],
  ] as const)('%s under the unchanged v2 pack', (id, verdict, reasonCode) => {
    expect(evaluateScenario(v2, traces[id])).toMatchObject({ verdict, reasonCode });
  });

  it.each([
    ['g1-a-1/L1', 'PASS', 'assertions_satisfied'],
    ['g1-a-1/L3', 'PASS', 'assertions_satisfied'],
    ['g1-a-1/L4', 'PASS', 'assertions_satisfied'],
    ['g1-b-1/L1', 'PASS', 'assertions_satisfied'],
    ['g1-b-1/L3', 'INCONCLUSIVE', 'recording_inconsistent'],
    ['g1-b-1/L4', 'PASS', 'assertions_satisfied'],
  ] as const)('%s with designated new values', (id, verdict, reasonCode) => {
    expect(evaluateScenario(v2Designated, asDesignated(traces[id]))).toMatchObject({ verdict, reasonCode });
  });

  it('reports authors stored as titles on the React removal as inconsistent', () => {
    expect(evaluateScenario(v2Designated, asDesignated(traces['g1-b-1/L3']))).toMatchObject({
      stepId: 'remove', observed: 'J. R. R. Tolkien|Octavia E. Butler|Ada Okafor',
    });
  });

  // C removes the first card. On the vanilla build Beta is listed first, so Beta disappears and Alpha stays.
  it('fails a removal of the wrong book on the real A recording shape', () => {
    const input = asDesignated(structuredClone(traces['g1-a-1/L3']));
    input.observations[3].values = { titles_after: 'GP Alpha g1-a-1', count_after: '1' };
    expect(evaluateScenario(v2Designated, input)).toMatchObject({ verdict: 'FAIL', reasonCode: 'assertion_failed', stepId: 'remove' });
  });

  // D keeps books only in memory, so the reloaded vanilla build is empty.
  it('fails a book lost on reload on the real A recording shape', () => {
    const input = asDesignated(structuredClone(traces['g1-a-1/L4']));
    input.observations[2].values = { titles_after: 'none', count_after: '0' };
    expect(evaluateScenario(v2Designated, input)).toMatchObject({ verdict: 'FAIL', reasonCode: 'assertion_failed', stepId: 'reload' });
  });
});

it.each([['19', 'PASS'], ['20', 'FAIL']])('evaluates a calculator display of %s', (result, verdict) => {
  const input = trace(calculator, 'C1', { calculate: { result } });
  expect(evaluateScenario(calculator, input)).toMatchObject({ verdict });
});
