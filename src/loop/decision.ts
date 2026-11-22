import type { ScenarioResult } from '../core/types.js';

export type LoopDecision = 'COMPLETE' | 'REPAIR' | 'NEEDS_EVIDENCE' | 'RETRY_INFRASTRUCTURE' | 'STOP';

export interface DecisionOutcome {
  decision: LoopDecision;
  reason: string;
  /** Verified failures in scope order. Only set for REPAIR. */
  failures: ScenarioResult[];
}

/**
 * Decide the next loop step from every scenario result in scope. Exit codes are never consulted.
 * Only a verified FAIL with nothing unresolved can start a repair.
 */
export function decide(results: readonly ScenarioResult[], scope: readonly string[], infraRetriesLeft: number): DecisionOutcome {
  const inScope = scope.map((id) => results.find((result) => result.scenarioId === id) ??
    { scenarioId: id, verdict: 'NOT_RUN' as const, reasonCode: 'result_missing', reason: 'No result was recorded for this scenario.' });
  const ids = (verdicts: string[]) => inScope.filter(({ verdict }) => verdicts.includes(verdict)).map(({ scenarioId }) => scenarioId);
  const outcome = (decision: LoopDecision, reason: string, failures: ScenarioResult[] = []) => ({ decision, reason, failures });

  const unsupported = ids(['UNSUPPORTED']);
  if (unsupported.length) return outcome('STOP', `The app is outside the pack's supported type (${unsupported.join(', ')}).`);
  const infra = ids(['INFRA_ERROR']);
  if (infra.length) {
    return infraRetriesLeft > 0
      ? outcome('RETRY_INFRASTRUCTURE', `The browser run did not complete for ${infra.join(', ')}; the whole scope is run again without code changes.`)
      : outcome('STOP', `The browser run did not complete for ${infra.join(', ')} and the infrastructure retry is used up.`);
  }
  const failed = ids(['FAIL']);
  const unresolved = ids(['INCONCLUSIVE', 'NOT_RUN']);
  if (failed.length && unresolved.length) {
    return outcome('STOP', `${failed.join(', ')} failed while ${unresolved.join(', ')} could not be judged; a person should review before any repair.`);
  }
  if (unresolved.length) return outcome('NEEDS_EVIDENCE', `${unresolved.join(', ')} could not be judged from the evidence; no code is changed.`);
  if (failed.length) {
    return outcome('REPAIR', `${failed.join(', ')} failed after an established action.`, inScope.filter(({ verdict }) => verdict === 'FAIL'));
  }
  return outcome('COMPLETE', 'Every scenario in scope passed.');
}
