import { normalizeText } from './expect.js';
import { substituteNonce, type Scenario } from './pack.js';

const replayMarker = /@(?:import|db|api|js|smartui|network_query|network_assertion|gps|accessibility|media_injection|network_throttle|deeplink)\b/iu;
const checkInstruction = /(?:^|[.!?]\s+)(?:[\s#>*+\-]*|\d+\.\s+)(?:verify|assert|expect|confirm|ensure|validate|check\s+that)\b/iu;

export interface LintIssue {
  line: number;
  message: string;
}

function containsLiteral(line: string, literal: string): boolean {
  const escaped = normalizeText(literal).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'u').test(normalizeText(line));
}

export function lintTestMarkdown(markdown: string, scenario: Scenario, nonce: string): LintIssue[] {
  const actions = scenario.steps.map((step) => substituteNonce(step.do, nonce));
  const literals = new Set(scenario.expect.flatMap((assertion) => {
    if (!('arg' in assertion)) return [];
    const args = Array.isArray(assertion.arg) ? assertion.arg : [assertion.arg];
    return args.map((arg) => substituteNonce(String(arg), nonce));
  }).filter((arg) => !actions.some((action) => containsLiteral(action, arg))));

  const issues: LintIssue[] = [];
  for (const [index, line] of markdown.split(/\r?\n/u).entries()) {
    if (replayMarker.test(line)) issues.push({ line: index + 1, message: 'Replay-only directive.' });
    if (checkInstruction.test(line)) issues.push({ line: index + 1, message: 'Verdict or verification instruction.' });
    for (const literal of literals) {
      if (containsLiteral(line, literal)) issues.push({ line: index + 1, message: 'Evaluator-only expected value.' });
    }
  }
  return issues;
}
