import { lintTestMarkdown } from './lint.js';
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
