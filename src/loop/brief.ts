import { randomUUID } from 'node:crypto';
import { substituteNonce, type Assertion, type Pack, type Scenario } from '../core/pack.js';
import type { ScenarioResult } from '../core/types.js';

export interface RepairBrief {
  briefId: string;
  scenarioId: string;
  scenarioTitle: string;
  /** What a user does in this scenario, in order. */
  actions: string[];
  /** The one expectation that failed, in plain language. */
  requirement: string;
  failingStep: { id: string; action: string } | null;
  expected: string;
  observed: string;
  screenshot: string | null;
  appPath: string;
  allowedScope: string;
}

const quote = (value: unknown) => `"${String(value)}"`;

/**
 * One check in plain language, for example: After "Remove the book …", the title of every book … should include "GP Beta".
 * `fill` expands the run nonce, or leaves the placeholder visible for a contract view.
 */
export function describeCheck(scenario: Scenario, assertion: Assertion, fill: (text: string) => string = (text) => text): string {
  const prompt = (recordKey: string) => scenario.steps.map((step) => step.record[recordKey]).find((text) => text !== undefined) ?? recordKey;
  const step = scenario.steps.find((candidate) => Object.hasOwn(candidate.record, assertion.value));
  const subject = `After "${fill(step?.do ?? '')}", ${prompt(assertion.value)}`;
  const arg = 'arg' in assertion
    ? Array.isArray(assertion.arg) ? assertion.arg.map((value) => quote(fill(value))).join(' or ')
      : quote(typeof assertion.arg === 'string' ? fill(assertion.arg) : assertion.arg)
    : '';
  switch (assertion.op) {
    case 'list_contains': return `${subject} should include ${arg}.`;
    case 'list_not_contains': return `${subject} should not include ${arg}.`;
    case 'contains': return `${subject} should contain ${arg}.`;
    case 'not_contains': return `${subject} should not contain ${arg}.`;
    case 'equals': case 'equals_number': case 'count_equals': return `${subject} should be ${arg}.`;
    case 'one_of': return `${subject} should be one of ${arg}.`;
    case 'matches': return `${subject} should match the pattern ${arg}.`;
    case 'absent': return `${subject} should be empty.`;
    case 'delta': {
      const change = assertion.by === 0 ? 'stay the same as' : assertion.by > 0 ? `be ${assertion.by} more than` : `be ${-assertion.by} fewer than`;
      return `${subject} should ${change} ${prompt(assertion.from)} before that action.`;
    }
  }
}

function render(value: unknown): string {
  if (value === undefined || value === null) return 'not recorded';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Builds the brief for the first failing expectation of one verified FAIL. */
export function buildBrief(pack: Pack, result: ScenarioResult, nonce: string, appPath: string, screenshot: string | null): RepairBrief {
  if (result.verdict !== 'FAIL') throw new Error('Only a verified FAIL can produce a repair brief.');
  const scenario: Scenario | undefined = pack.scenarios.find(({ id }) => id === result.scenarioId);
  if (!scenario) throw new Error(`Scenario '${result.scenarioId}' is not in the pack.`);
  const failingIndex = scenario.steps.findIndex(({ id }) => id === result.stepId);
  const failingStep = failingIndex >= 0 ? scenario.steps[failingIndex] : undefined;
  // The evaluator reports the failing recording and operation; the expected value separates assertions that share both.
  const [, key, op] = /'([^']+)' did not satisfy '([^']+)'/u.exec(result.reason) ?? [];
  const candidates = scenario.expect.filter((candidate) => candidate.value === key && candidate.op === op && !candidate.prerequisite);
  const sameExpected = (candidate: Assertion) => 'arg' in candidate && !Array.isArray(candidate.arg) &&
    substituteNonce(String(candidate.arg), nonce) === result.expected;
  const assertion = candidates.length === 1 ? candidates[0] : candidates.find(sameExpected);
  const expected = assertion?.op === 'delta'
    ? `a change of ${assertion.by > 0 ? '+' : ''}${assertion.by} from the earlier value`
    : render(result.expected);
  return {
    briefId: `brief-${randomUUID()}`,
    scenarioId: scenario.id,
    scenarioTitle: substituteNonce(scenario.title, nonce),
    actions: scenario.steps.map((step) => substituteNonce(step.do, nonce)),
    requirement: assertion ? describeCheck(scenario, assertion, (text) => substituteNonce(text, nonce)) : result.reason,
    failingStep: failingStep ? { id: failingStep.id, action: substituteNonce(failingStep.do, nonce) } : null,
    expected,
    observed: render(result.observed),
    screenshot,
    appPath,
    allowedScope: 'Only the files of this app folder. Do not create or edit anything outside it.',
  };
}

export function briefMarkdown(brief: RepairBrief): string {
  return [
    '# Repair brief',
    '',
    `A behavioural check of this web app failed. Fix the app so the behaviour below works for any data, not only the example values. (Brief ${brief.briefId}.)`,
    '',
    '## What a user does',
    '',
    ...brief.actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    '## What went wrong',
    '',
    `- Requirement: ${brief.requirement}`,
    ...(brief.failingStep ? [`- Checked after step: ${brief.failingStep.action}`] : []),
    `- Expected: ${brief.expected}`,
    `- Observed: ${brief.observed}`,
    ...(brief.screenshot ? [`- Screenshot of the page after that step: ${brief.screenshot}`] : []),
    '',
    '## Rules',
    '',
    `- App folder: ${brief.appPath}`,
    `- Allowed scope: ${brief.allowedScope}`,
    '- Fix the general behaviour. Do not special-case the example titles or detect that a test is running.',
    '- Keep every other behaviour of the app working. The full set of behavioural checks runs again after your change.',
    '- When the fix is done, stop. Do not run browsers or test tools; the app will be re-checked independently.',
    '',
  ].join('\n');
}
