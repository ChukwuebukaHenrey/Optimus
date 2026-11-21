import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { checkEvidenceArchive, loadKaneEvidence } from '../src/kane/evidence.js';

// Synthetic ZIP with a manifest, matching test files, repeated action IDs, and two refresh attempts.
const archive = Buffer.from([
  'UEsDBBQAAAAIAMuGdV0HC/j2FQAAABMAAAAIAAAAcnVuLnlhbWwrKs2Lz0yxUihOzC3ISdUtKs3jAgBQSwMEFAAAAAgA',
  'y4Z1XVrUveUNAAAACwAAABQAAAB0ZXN0cy9zYW1wbGUvdGVzdC5tZFNWCE5OzUssysznAgBQSwMEFAAAAAgAy4Z1XcMJ',
  'GlARAAAADwAAABgAAAB0ZXN0cy9zYW1wbGUvcmVzdWx0LnlhbWwrLkksKS22UihILC5OTeECAFBLAwQUAAAACADLhnVd',
  'ihJDVDoAAABAAAAAIgAAAHRlc3RzL3NhbXBsZS9zdGVwcy8xLTAtMS9zdGVwLmpzb26rVsrOzEtRslJQykssy0xPLElV',
  '0lFQKi5JLCktBokWJBYXp6aAxBKTSzLz8+IzwYqLE3NTdTNTlGoBUEsDBBQAAAAIAMuGdV2MevW0NwAAAD0AAAAiAAAA',
  'dGVzdHMvc2FtcGxlL3N0ZXBzLzItMS0xL3N0ZXAuanNvbqtWys7MS1GyUlBKzslMzlbSUVAqLkksKS0GCRUkFhenpoDE',
  'EpNLMvPz4jPBKosTc1N1M1OUagFQSwMEFAAAAAgAy4Z1XWzI7Ic0AAAARQAAACIAAAB0ZXN0cy9zYW1wbGUvbG9ncy8x',
  'LWFjdGlvbnMubmRqc29uq1ZKTC7JzM+LL6ksSFWyUlAqSk0rSi3OUNJRUCouSSwpLQYJpiVm5qSmgMSgqjNTkIRrAVBL',
  'AwQUAAAACADLhnVdLVFq6zkAAABKAAAAIgAAAHRlc3RzL3NhbXBsZS9sb2dzLzItYWN0aW9ucy5uZGpzb26rVkpMLsnM',
  'z4svqSxIVbJSUCpKTStKLc5Q0lFQKi5JLCktBgkWlyYnpxYXgwShyjNTkMTTSnOUagFQSwECFAAUAAAACADLhnVdBwv4',
  '9hUAAAATAAAACAAAAAAAAAAAAAAAgAEAAAAAcnVuLnlhbWxQSwECFAAUAAAACADLhnVdWtS95Q0AAAALAAAAFAAAAAAA',
  'AAAAAAAAgAE7AAAAdGVzdHMvc2FtcGxlL3Rlc3QubWRQSwECFAAUAAAACADLhnVdwwkaUBEAAAAPAAAAGAAAAAAAAAAA',
  'AAAAgAF6AAAAdGVzdHMvc2FtcGxlL3Jlc3VsdC55YW1sUEsBAhQAFAAAAAgAy4Z1XYoSQ1Q6AAAAQAAAACIAAAAAAAAA',
  'AAAAAIABwQAAAHRlc3RzL3NhbXBsZS9zdGVwcy8xLTAtMS9zdGVwLmpzb25QSwECFAAUAAAACADLhnVdjHr1tDcAAAA9',
  'AAAAIgAAAAAAAAAAAAAAgAE7AQAAdGVzdHMvc2FtcGxlL3N0ZXBzLzItMS0xL3N0ZXAuanNvblBLAQIUABQAAAAIAMuG',
  'dV1syOyHNAAAAEUAAAAiAAAAAAAAAAAAAACAAbIBAAB0ZXN0cy9zYW1wbGUvbG9ncy8xLWFjdGlvbnMubmRqc29uUEsB',
  'AhQAFAAAAAgAy4Z1XS1Raus5AAAASgAAACIAAAAAAAAAAAAAAIABJgIAAHRlc3RzL3NhbXBsZS9sb2dzLzItYWN0aW9u',
  'cy5uZGpzb25QSwUGAAAAAAcABwD+AQAAnwIAAAAA',
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
});
