import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { checkEvidenceArchive, loadKaneEvidence, loggedRecording } from '../src/kane/evidence.js';

// Synthetic ZIP with a manifest, matching test files, repeated action IDs, and two refresh attempts.
const archive = Buffer.from([
  'UEsDBBQAAAAIAKeKdV0HC/j2FQAAABMAAAAIAAAAcnVuLnlhbWwrKs2Lz0yxUihOzC3ISdUtKs3jAgBQSwMEFAAAAAgA',
  'p4p1XVrUveUNAAAACwAAABQAAAB0ZXN0cy9zYW1wbGUvdGVzdC5tZFNWCE5OzUssysznAgBQSwMEFAAAAAgAp4p1XcMJ',
  'GlARAAAADwAAABgAAAB0ZXN0cy9zYW1wbGUvcmVzdWx0LnlhbWwrLkksKS22UihILC5OTeECAFBLAwQUAAAACACninVd',
  'ihJDVDoAAABAAAAAIgAAAHRlc3RzL3NhbXBsZS9zdGVwcy8xLTAtMS9zdGVwLmpzb26rVsrOzEtRslJQykssy0xPLElV',
  '0lFQKi5JLCktBokWJBYXp6aAxBKTSzLz8+IzwYqLE3NTdTNTlGoBUEsDBBQAAAAIAKeKdV2MevW0NwAAAD0AAAAiAAAA',
  'dGVzdHMvc2FtcGxlL3N0ZXBzLzItMS0xL3N0ZXAuanNvbqtWys7MS1GyUlBKzslMzlbSUVAqLkksKS0GCRUkFhenpoDE',
  'EpNLMvPz4jPBKosTc1N1M1OUagFQSwMEFAAAAAgAp4p1XWzI7Ic0AAAARQAAACIAAAB0ZXN0cy9zYW1wbGUvbG9ncy8x',
  'LWFjdGlvbnMubmRqc29uq1ZKTC7JzM+LL6ksSFWyUlAqSk0rSi3OUNJRUCouSSwpLQYJpiVm5qSmgMSgqjNTkIRrAVBL',
  'AwQUAAAACACninVdRsPb6qwAAACuAgAAIgAAAHRlc3RzL3NhbXBsZS9sb2dzLzItYWN0aW9ucy5uZGpzb26lj0EOgjAQ',
  'RfeegnTtQtGVO70ImZYBmtSWdGZIELm7gbhQQxMiq0lefv77MygwbIMvuG9RXTIVsYpIjdpnihhYaIIkxiDRBN9xW37w',
  'Spwad8NvFXhw/QPXVR0mEoRb4aKDaEG7uYQtO6RCYxUifmWczIEbMjyvrm1g84ZjYoMJ4jk9Id/qzRNeuGtbSxBa+hs2',
  'v3v6R6uXtPNd5TwnnOIjOmAsl5y29iFiqcYXUEsBAhQAFAAAAAgAp4p1XQcL+PYVAAAAEwAAAAgAAAAAAAAAAAAAAIAB',
  'AAAAAHJ1bi55YW1sUEsBAhQAFAAAAAgAp4p1XVrUveUNAAAACwAAABQAAAAAAAAAAAAAAIABOwAAAHRlc3RzL3NhbXBs',
  'ZS90ZXN0Lm1kUEsBAhQAFAAAAAgAp4p1XcMJGlARAAAADwAAABgAAAAAAAAAAAAAAIABegAAAHRlc3RzL3NhbXBsZS9y',
  'ZXN1bHQueWFtbFBLAQIUABQAAAAIAKeKdV2KEkNUOgAAAEAAAAAiAAAAAAAAAAAAAACAAcEAAAB0ZXN0cy9zYW1wbGUv',
  'c3RlcHMvMS0wLTEvc3RlcC5qc29uUEsBAhQAFAAAAAgAp4p1XYx69bQ3AAAAPQAAACIAAAAAAAAAAAAAAIABOwEAAHRl',
  'c3RzL3NhbXBsZS9zdGVwcy8yLTEtMS9zdGVwLmpzb25QSwECFAAUAAAACACninVdbMjshzQAAABFAAAAIgAAAAAAAAAA',
  'AAAAgAGyAQAAdGVzdHMvc2FtcGxlL2xvZ3MvMS1hY3Rpb25zLm5kanNvblBLAQIUABQAAAAIAKeKdV1Gw9vqrAAAAK4C',
  'AAAiAAAAAAAAAAAAAACAASYCAAB0ZXN0cy9zYW1wbGUvbG9ncy8yLWFjdGlvbnMubmRqc29uUEsFBgAAAAAHAAcA/gEA',
  'ABIDAAAAAA==',
].join(''), 'base64');

const directory = await mkdtemp(join(tmpdir(), 'optimus-evidence-test-'));
const path = join(directory, 'sample.evidence');
const invalidPath = join(directory, 'invalid.evidence');
await writeFile(path, archive);
await writeFile(invalidPath, 'This is an ordinary text file.');

afterAll(async () => {
  await Promise.all([unlink(path), unlink(invalidPath)]);
  await rmdir(directory);
});

it('accepts a ZIP with the documented single-test evidence structure', async () => {
  const id = await checkEvidenceArchive(path);
  expect(id).toBeTruthy();
  expect(await checkEvidenceArchive(join(directory, '.', 'sample.evidence'))).toBe(id);
});

it('rejects a plain file or a missing file with the evidence extension', async () => {
  expect(await checkEvidenceArchive(invalidPath)).toBeNull();
  expect(await checkEvidenceArchive(join(directory, 'missing.evidence'))).toBeNull();
});

it('reads the execution ID, step-specific actions, and only successful refreshes', async () => {
  const evidence = await loadKaneEvidence(path);
  expect(evidence?.executionId).toBe('sample-run');
  expect(evidence?.actions.get('1-0-1')).toMatchObject({ actionId: 'same-id', kind: 'navigate', screenshotRef: null });
  expect(evidence?.actions.get('2-1-1')).toMatchObject({ actionId: 'same-id', kind: 'click' });
  expect(evidence?.refreshes).toEqual(new Map([['run-2', 'tests/sample/logs/2-actions.ndjson']]));
  expect(evidence?.recordings?.get('run-2')).toEqual(new Map([
    ['titles_before', 'Beta|Alpha'],
    ['count_before', '2'],
    ['ambiguous', null],
  ]));
});

it.each([
  ['["GP Beta d","GP Alpha d"]', 'GP Beta d|GP Alpha d'],
  [' ["Only one"]', 'Only one'],
  ['GP Beta d|GP Alpha d', 'GP Beta d|GP Alpha d'],
  ['[Draft] notes', '[Draft] notes'],
  ['[]', ''],
  ['["a|b","c"]', '["a|b","c"]'],
  ['["a",2]', '["a",2]'],
  ['["a",""]', '["a",""]'],
  [2, '2'],
  [Number.NaN, null],
  [null, null],
] as const)('translates the logged recording %j only when it is an unambiguous list', (value, expected) => {
  expect(loggedRecording(value)).toBe(expected);
});
