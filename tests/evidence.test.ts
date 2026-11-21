import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { checkEvidenceArchive } from '../src/kane/evidence.js';

// Synthetic ZIP with a manifest and one matching test definition and result.
const archive = Buffer.from([
  'UEsDBBQAAAAAAAs/dV3DdgvxBgAAAAYAAAAIAAAAcnVuLnlhbWxzYW1wbGVQSwMEFAAAAAAACz91XcN2C/EG',
  'AAAABgAAABQAAAB0ZXN0cy9zYW1wbGUvdGVzdC5tZHNhbXBsZVBLAwQUAAAAAAALP3Vdw3YL8QYAAAAGAAAA',
  'GAAAAHRlc3RzL3NhbXBsZS9yZXN1bHQueWFtbHNhbXBsZVBLAQIUABQAAAAAAAs/dV3DdgvxBgAAAAYAAAAI',
  'AAAAAAAAAAAAAACAAQAAAABydW4ueWFtbFBLAQIUABQAAAAAAAs/dV3DdgvxBgAAAAYAAAAUAAAAAAAAAAAA',
  'AACAASwAAAB0ZXN0cy9zYW1wbGUvdGVzdC5tZFBLAQIUABQAAAAAAAs/dV3DdgvxBgAAAAYAAAAYAAAAAAAA',
  'AAAAAACAAWQAAAB0ZXN0cy9zYW1wbGUvcmVzdWx0LnlhbWxQSwUGAAAAAAMAAwC+AAAAoAAAAAAA',
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
