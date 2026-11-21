import { lintTestMarkdown, type LintIssue } from './lint.js';
import { substituteNonce, type Pack } from './pack.js';
import { nonceSchema } from './types.js';

export function generateTests(pack: Pack, nonce: string, scenarioId?: string) {
  nonceSchema.parse(nonce);
  const scenarios = scenarioId === undefined ? pack.scenarios : pack.scenarios.filter(({ id }) => id === scenarioId);
  if (!scenarios.length) throw new Error(`Unknown scenario '${scenarioId}'.`);

  return scenarios.map((scenario) => {
    const lines = ['---', 'mode: testing', '---', '', `# ${substituteNonce(scenario.title, nonce)}`, ''];
    for (const [index, step] of scenario.steps.entries()) {
      lines.push(`## Step ${index + 1}`, '', substituteNonce(step.do, nonce));
      for (const [key, prompt] of Object.entries(step.record)) {
        lines.push(`Store ${substituteNonce(prompt, nonce)} as '${key}'.`);
      }
      lines.push('');
    }
    const fileName = `${scenario.id}_test.md`;
    const markdown = lines.join('\n');
    const issues = lintTestMarkdown(markdown, scenario, nonce);
    if (issues.length) {
      const summary = issues.map(({ line, message }) => `${fileName}:${line} ${message}`).join('\n');
      throw new Error(summary);
    }
    return { fileName, markdown };
  });
}

export function lintGeneratedTest(markdown: string, pack: Pack, scenarioId: string, nonce: string): LintIssue[] {
  const scenario = pack.scenarios.find(({ id }) => id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario '${scenarioId}'. Pass --scenario for renamed files.`);
  const issues = lintTestMarkdown(markdown, scenario, nonce);
  if (issues.length) return issues;
  const [expected] = generateTests(pack, nonce, scenarioId);
  const actualLines = markdown.replace(/\r\n/gu, '\n').trimEnd().split('\n');
  const expectedLines = expected.markdown.trimEnd().split('\n');
  for (let index = 0; index < Math.max(actualLines.length, expectedLines.length); index++) {
    if (actualLines[index] !== expectedLines[index]) {
      return [{ line: index + 1, message: 'Test Markdown differs from the loaded pack. Regenerate it with the same nonce.' }];
    }
  }
  return [];
}
