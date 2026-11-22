import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : Promise.resolve(entry.isFile() ? [path] : []);
  }));
  return nested.flat().sort();
}

export interface Fingerprint {
  packHash: string;
  graderHash: string;
  files: Record<string, string>;
}

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

/** Hashes the pack file and every grader source file (src/core and src/kane). */
export async function graderFingerprint(root: string, packFile: string): Promise<Fingerprint> {
  const packHash = sha256(await readFile(packFile));
  const hashes: Record<string, string> = {};
  for (const directory of ['src/core', 'src/kane']) {
    for (const file of await files(join(root, directory))) {
      hashes[relative(root, file).replaceAll('\\', '/')] = sha256(await readFile(file));
    }
  }
  const graderHash = sha256(Object.entries(hashes).map(([path, hash]) => `${path}\0${hash}\n`).join(''));
  return { packHash, graderHash, files: hashes };
}

export function changedGraderFiles(before: Fingerprint, after: Fingerprint): string[] {
  const paths = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
  return [...paths].filter((path) => before.files[path] !== after.files[path]).sort();
}
