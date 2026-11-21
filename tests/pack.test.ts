import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateTests } from '../src/core/generate.js';
import { lintTestMarkdown } from '../src/core/lint.js';
import { loadPack, parsePack } from '../src/core/pack.js';

const libraryPath = join('packs', 'library');
const calculatorPath = join('tests', 'fixtures', 'calculator.pack.yaml');
const calculatorSource = await readFile(calculatorPath, 'utf8');

describe('pack validation', () => {
  it('loads a pack directory and hashes its original bytes before nonce substitution', async () => {
    const source = await readFile(join(libraryPath, 'pack.yaml'));
    const loaded = await loadPack(libraryPath);
    expect(loaded.pack.pack).toBe('library');
    expect(loaded.packHash).toBe(createHash('sha256').update(source).digest('hex'));
    generateTests(loaded.pack, 'differentNonce');
    expect(loaded.pack.scenarios[0].steps[1].do).toContain('{{nonce}}');
    expect(parsePack(source.toString().replaceAll('{{nonce}}', 'differentNonce')).packHash).not.toBe(loaded.packHash);
  });

  it.each([
    ['missing required field', (source: string) => source.replace(/^support:.+\r?\n/mu, '')],
    ['unknown assertion type', (source: string) => source.replace('equals_number', 'approximate')],
    ['unknown recording key', (source: string) => source.replace('value: result', 'value: absent_key')],
    ['invalid regular expression', (source: string) => source.replace('equals_number, value: result, arg: 19', 'matches, value: result, arg: "["')],
  ])('rejects %s', (_name, edit) => {
    expect(() => parsePack(edit(calculatorSource))).toThrow();
  });

  it('allows a nonce placeholder in a regex expectation', () => {
    const source = calculatorSource.replace('equals_number, value: result, arg: 19', () => "matches, value: result, arg: '^item {{nonce}}$'");
    expect(parsePack(source).pack.scenarios[0].expect[0]).toMatchObject({ op: 'matches' });
  });
});

describe('neutral test Markdown', () => {
  it('emits one file for every scenario with only actions and observations', async () => {
    const { pack } = await loadPack(libraryPath);
    const files = generateTests(pack, 'demo');
    expect(files.map(({ fileName }) => fileName)).toEqual(['L1_test.md', 'L3_test.md', 'L4_test.md', 'L2_test.md']);
    const { markdown } = files[0];
    expect(markdown).toMatch(/^---\nmode: testing\n---\n/u);
    expect(markdown.match(/^## /gmu)).toHaveLength(2);
    expect(markdown).toContain('GP Book demo');
    expect(markdown).toContain("Store the number of books currently shown as 'count_after'.");
    expect(markdown).not.toMatch(/expects_change|preconditions|recorded interaction|\{\{nonce\}\}/u);
  });

  it('supports generating a single named scenario and rejects unsafe nonces', async () => {
    const { pack } = await loadPack(libraryPath);
    expect(generateTests(pack, 'demo', 'L4')).toHaveLength(1);
    expect(() => generateTests(pack, 'demo', 'unknown')).toThrow('Unknown scenario');
    expect(() => generateTests(pack, '../unsafe')).toThrow();
  });

  it.each(['@import','@db','@api','@js','@smartui','@network_query','@network_assertion',
    '@gps','@accessibility','@media_injection','@network_throttle','@deeplink',
    '- Verify the display.', '1. Assert the result.', 'Open the page. Expect output.', 'Store the visible 19.'])('rejects %s', async (line) => {
    const { pack } = await loadPack(calculatorPath);
    const [scenario] = pack.scenarios;
    const [{ markdown }] = generateTests(pack, 'demo');
    expect(lintTestMarkdown(markdown, scenario, 'demo')).toEqual([]);
    expect(lintTestMarkdown(`${markdown}${line}\n`, scenario, 'demo')).toHaveLength(1);
  });
});
