import { realpath, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import yauzl from 'yauzl';

function checkArchive(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error) { reject(error); return; }
      const metadata = new Set<string>();
      let invalidMetadata = false;
      zip.once('error', (error) => {
        zip.close();
        reject(error);
      });
      zip.on('entry', (entry) => {
        const name = entry.fileName;
        if (name === 'run.yaml' || /^tests\/[^/]+\/(?:test\.md|result\.yaml)$/u.test(name)) {
          invalidMetadata ||= metadata.has(name) || entry.uncompressedSize === 0 || Boolean(entry.generalPurposeBitFlag & 1);
          metadata.add(name);
        }
        zip.readEntry();
      });
      zip.once('end', () => {
        const testDefinitions = Array.from(metadata).filter((name) => name.endsWith('/test.md'));
        resolve(!invalidMetadata && metadata.has('run.yaml') && testDefinitions.length === 1 &&
          metadata.has(testDefinitions[0].replace(/test\.md$/u, 'result.yaml')));
      });
      zip.readEntry();
    });
  });
}

// Validate the documented single-test envelope. The normalized trace still comes from a trusted caller.
export async function checkEvidenceArchive(path: string): Promise<string | null> {
  if (extname(path).toLowerCase() !== '.evidence' || /^[\\/]{2}/u.test(path)) return null;
  try {
    const resolved = await realpath(path);
    if (/^[\\/]{2}/u.test(resolved)) return null;
    const file = await stat(resolved, { bigint: true });
    if (!file.isFile() || !await checkArchive(resolved)) return null;
    return file.ino === 0n ? resolved : `${file.dev}:${file.ino}`;
  } catch {
    return null;
  }
}
