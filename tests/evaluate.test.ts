import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateScenario } from '../src/core/evaluate.js';
import { actionForStep, loadPack, type LoadedPack } from '../src/core/pack.js';
import type { Observation, RunRecord, ScenarioTrace } from '../src/core/types.js';

const library = await loadPack(join('packs', 'library'));
const calculator = await loadPack(join('tests', 'fixtures', 'calculator.pack.yaml'));

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
    ['adds the wrong title', add('Unexpected book'), 'FAIL', 'assertion_failed'],
    ['adds two books', add('GP Book sample | Unexpected book', '2'), 'FAIL', 'assertion_failed'],
    ['adds to an existing list', add('Sample A | Sample B | GP Book sample', '3', 'Sample A | Sample B', '2'), 'PASS', 'assertions_satisfied'],
    ['produces an unparseable count', add('GP Book sample', 'many'), 'INCONCLUSIVE', 'recording_unavailable'],
    ['removes the chosen book', remove(), 'PASS', 'assertions_satisfied'],
    ['removes the wrong book', remove('GP Alpha sample'), 'FAIL', 'assertion_failed'],
    ['shows no change after remove', remove('GP Beta sample | GP Alpha sample', '2.0'), 'INCONCLUSIVE', 'no_observable_change'],
    ['does not establish the requested starting books', remove('GP Beta sample', '1', 'GP Beta sample | Sample A'), 'INCONCLUSIVE', 'prerequisite_not_established'],
    ['persists across reload', reload(), 'PASS', 'assertions_satisfied'],
    ['loses the book on reload', reload('none', '0'), 'FAIL', 'assertion_failed'],
    ['does not establish a book before reload', reload('none', '0', 'Sample A'), 'INCONCLUSIVE', 'prerequisite_not_established'],
    ['changes read status', trace(library, 'L2', { add: { status_before: 'To read' }, toggle: { status_after: 'Finished' } }), 'PASS', 'assertions_satisfied'],
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
});

it.each([['19', 'PASS'], ['20', 'FAIL']])('evaluates a calculator display of %s', (result, verdict) => {
  const input = trace(calculator, 'C1', { calculate: { result } });
  expect(evaluateScenario(calculator, input)).toMatchObject({ verdict });
});
