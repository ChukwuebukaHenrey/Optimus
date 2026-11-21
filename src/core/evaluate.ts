import { evaluateAssertion, normalizeText, parseRecordedList } from './expect.js';
import { actionForStep, type LoadedPack, type Scenario } from './pack.js';
import type { ScenarioResult, ScenarioTrace, Verdict } from './types.js';

function hasObservableChange(scenario: Scenario, values: Record<string, string | null>, index: number, nonce: string) {
  const earlier = scenario.steps.slice(0, index).reverse().flatMap((step) => Object.entries(step.record));
  let hasComparableValues = false;
  for (const [key, prompt] of Object.entries(scenario.steps[index].record)) {
    const explicit = scenario.expect.find((assertion) => assertion.op === 'delta' && assertion.value === key);
    const priorKey = explicit?.op === 'delta' ? explicit.from : earlier.find(([prior, priorPrompt]) =>
      prior === key.replace(/_after$/u, '_before') || normalizeText(priorPrompt) === normalizeText(prompt),
    )?.[0];
    if (priorKey === undefined || values[priorKey] == null || values[key] == null) continue;
    if (explicit?.op === 'delta') {
      const delta = evaluateAssertion({ ...explicit, by: 0 }, values, nonce).outcome;
      if (delta === 'inconclusive') continue;
      if (delta === 'fail') return 'changed';
    } else {
      const assertions = scenario.expect.filter(({ value }) => value === key);
      const exact = assertions.some((assertion) => 'case' in assertion && assertion.case === 'exact');
      const mode = exact ? 'exact' : 'insensitive';
      if (assertions.some(({ op }) => op === 'list_contains' || op === 'list_not_contains')) {
        const before = parseRecordedList(values[priorKey], mode)?.sort();
        const after = parseRecordedList(values[key], mode)?.sort();
        if (!before || !after) continue;
        if (before.length !== after.length || before.some((value, position) => value !== after[position])) return 'changed';
      } else if (normalizeText(values[priorKey], mode) !== normalizeText(values[key], mode)) {
        return 'changed';
      }
    }
    hasComparableValues = true;
  }
  return hasComparableValues ? 'unchanged' : 'unavailable';
}

export function evaluateScenario({ pack, packHash }: LoadedPack, trace: ScenarioTrace): ScenarioResult {
  const { scenarioId, run } = trace;
  const result = (verdict: Verdict, reasonCode: string, reason: string, stepId?: string): ScenarioResult => ({
    scenarioId, verdict, reasonCode, reason, ...(stepId === undefined ? {} : { stepId }),
  });
  const scenario = pack.scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) return result('INFRA_ERROR', 'unknown_scenario', 'The scenario is absent from the loaded pack.');
  if (run.packHash !== packHash) return result('INFRA_ERROR', 'pack_hash_mismatch', 'The run and loaded pack have different hashes.');
  if (!run.completed || (run.kaneExitCode !== 0 && run.kaneExitCode !== 1)) {
    return result('INFRA_ERROR', 'run_incomplete', 'The browser run did not finish with a usable exit status.');
  }
  if (run.replayDecisions === null) return result('INFRA_ERROR', 'replay_count_missing', 'The run did not report its replay count.');
  if (run.replayDecisions !== 0) return result('INFRA_ERROR', 'replay_detected', 'The browser run did not establish a zero replay count.');
  if (!run.evidencePackPath?.trim()) return result('INFRA_ERROR', 'evidence_pack_missing', 'The run has no evidence pack reference.');

  const recordSteps = new Map(scenario.steps.flatMap((step, index) => Object.keys(step.record).map((key) => [key, index] as const)));
  const decisiveIndex = Math.max(...scenario.expect.map((assertion) => recordSteps.get(assertion.value)!));
  const skipped = new Set(run.stepsSkipped);
  if (skipped.size !== run.stepsSkipped.length || run.stepsSkipped.some((index) => !scenario.steps[index])) {
    return result('INFRA_ERROR', 'invalid_skipped_step', 'A skipped step is duplicated or does not exist in the pack.');
  }
  let previousIndex = -1;
  for (const observation of trace.observations) {
    if (observation.stepIndex <= previousIndex || skipped.has(observation.stepIndex) || scenario.steps[observation.stepIndex]?.id !== observation.stepId) {
      return result('INFRA_ERROR', 'invalid_observation_order', 'An observation is out of order, marked skipped, or disagrees with its pack step.', observation.stepId);
    }
    previousIndex = observation.stepIndex;
  }
  const earlySkip = [...skipped].sort((a, b) => a - b).find((index) => index <= decisiveIndex);
  if (earlySkip !== undefined) {
    return result('NOT_RUN', 'decisive_step_skipped', 'A step needed to reach the decisive recording was skipped.', scenario.steps[earlySkip].id);
  }
  if (!Number.isSafeInteger(run.authorDecisions) || !run.authorDecisions || run.authorDecisions < 0) {
    return result('INFRA_ERROR', 'author_count_missing', 'The run did not establish that author decisions were made.');
  }

  const byIndex = new Map(trace.observations.map((observation) => [observation.stepIndex, observation]));
  const values: Record<string, string | null> = Object.create(null);
  for (const [index, step] of scenario.steps.entries()) {
    if (skipped.has(index)) continue;
    const observation = byIndex.get(index);
    const action = actionForStep(step, index);
    if (action !== 'none' && (observation?.actionKind !== action || observation.actionRecorded !== true)) {
      return result('INCONCLUSIVE', 'action_not_recorded', 'The required action was not established by the evidence.', step.id);
    }
    if (observation?.targetAgreement === 'contradicted') {
      return result('INCONCLUSIVE', 'action_target_contradicted', 'The recorded action target disagrees with the pack step.', step.id);
    }
    for (const key of Object.keys(step.record)) {
      values[key] = observation && Object.hasOwn(observation.values, key) ? observation.values[key] : null;
    }
  }

  const checks = scenario.expect.map((assertion) => ({ assertion, check: evaluateAssertion(assertion, values, run.nonce) }));
  const unavailableKey = checks.find(({ check }) => check.outcome === 'inconclusive')?.check.unavailableKey;
  if (unavailableKey !== undefined) {
    return result('INCONCLUSIVE', 'recording_unavailable', `The recording '${unavailableKey}' is missing or unusable.`, scenario.steps[recordSteps.get(unavailableKey)!].id);
  }
  for (const [index, step] of scenario.steps.entries()) {
    if (!step.expects_change || skipped.has(index)) continue;
    const change = hasObservableChange(scenario, values, index, run.nonce);
    if (change === 'unchanged') {
      return result('INCONCLUSIVE', 'no_observable_change', 'The comparable recordings are unchanged after the action.', step.id);
    }
    if (change === 'unavailable') {
      return result('INCONCLUSIVE', 'change_evidence_unavailable', 'The action has no comparable before and after recordings.', step.id);
    }
  }

  const failedPrerequisite = checks.find(({ assertion, check }) => assertion.prerequisite && check.outcome === 'fail');
  if (failedPrerequisite) {
    const key = failedPrerequisite.assertion.value;
    return result('INCONCLUSIVE', 'prerequisite_not_established', `The recording '${key}' did not establish the required starting state.`, scenario.steps[recordSteps.get(key)!].id);
  }
  for (const { assertion, check } of checks) {
    if (check.outcome === 'fail') {
      return {
        ...result('FAIL', 'assertion_failed', `The recording '${assertion.value}' did not satisfy '${assertion.op}'.`, scenario.steps[recordSteps.get(assertion.value)!].id),
        expected: check.expected,
        observed: check.observed,
      };
    }
  }
  return result('PASS', 'assertions_satisfied', 'The required actions were recorded and all assertions were satisfied.');
}
