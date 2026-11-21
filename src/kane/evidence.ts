import { realpath, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import yauzl, { type Entry, type ZipFile } from 'yauzl';
import { parse as parseYaml } from 'yaml';

export interface KaneActionEvidence {
  actionId: string;
  kind: string;
  evidenceRef: string;
  screenshotRef: string | null;
}

export interface KaneEvidence {
  executionId: string | null;
  actions: ReadonlyMap<string, KaneActionEvidence>;
  refreshes: ReadonlyMap<string, string>;
  recordings?: ReadonlyMap<string, ReadonlyMap<string, string | null>>;
}

function openArchive(path: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, zip) => {
      if (error) reject(error);
      else resolve(zip);
    });
  });
}

function scanEntries(zip: ZipFile, includeSteps: boolean): Promise<Map<string, Entry> | null> {
  return new Promise((resolve, reject) => {
    const entries = new Map<string, Entry>();
    let invalidMetadata = false;
    zip.once('error', reject);
    zip.on('entry', (entry) => {
      const name = entry.fileName;
      const isMetadata = name === 'run.yaml' || /^tests\/[^/]+\/(?:test\.md|result\.yaml)$/u.test(name);
      const isStep = includeSteps && /^tests\/[^/]+\/steps\/[^/]+\/(?:step\.json|screenshot\.(?:png|jpe?g))$/u.test(name);
      const isActionLog = includeSteps && /^tests\/[^/]+\/logs\/\d+-actions\.ndjson$/u.test(name);
      const readable = entry.uncompressedSize > 0 && !(entry.generalPurposeBitFlag & 1);
      if (isMetadata || ((isStep || isActionLog) && readable)) {
        invalidMetadata ||= entries.has(name) || !readable;
        entries.set(name, entry);
      }
      zip.readEntry();
    });
    zip.once('end', () => {
      const definitions = Array.from(entries.keys()).filter((name) => name.endsWith('/test.md'));
      const valid = !invalidMetadata && entries.has('run.yaml') && definitions.length === 1 &&
        entries.has(definitions[0].replace(/test\.md$/u, 'result.yaml'));
      resolve(valid ? entries : null);
    });
    zip.readEntry();
  });
}

async function evidenceFile(path: string): Promise<{ path: string; id: string } | null> {
  if (extname(path).toLowerCase() !== '.evidence' || /^[\\/]{2}/u.test(path)) return null;
  const resolved = await realpath(path);
  if (/^[\\/]{2}/u.test(resolved)) return null;
  const file = await stat(resolved, { bigint: true });
  return file.isFile() ? { path: resolved, id: file.ino === 0n ? resolved : `${file.dev}:${file.ino}` } : null;
}

// Validate the documented single-test envelope. The normalized trace still comes from a trusted caller.
export async function checkEvidenceArchive(path: string): Promise<string | null> {
  let zip: ZipFile | undefined;
  try {
    const file = await evidenceFile(path);
    if (!file) return null;
    zip = await openArchive(file.path);
    return await scanEntries(zip, false) ? file.id : null;
  } catch {
    return null;
  } finally {
    zip?.close();
  }
}

async function readSmallEntry(zip: ZipFile, entry: Entry): Promise<string | null> {
  // These are metadata files. Screenshot data and browser logs are never inflated here.
  if (entry.uncompressedSize > 64 * 1024) return null;
  const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else resolve(stream);
    });
  });
  const data: Buffer[] = [];
  for await (const chunk of stream) data.push(Buffer.from(chunk));
  return Buffer.concat(data).toString('utf8');
}

function readActionLog(source: string | null): { refresh: boolean; recordings: Map<string, string | null> } {
  const recordings = new Map<string, string | null>();
  let refresh = false;
  try {
    for (const line of source?.split(/\r?\n/u) ?? []) {
      if (!line.trim()) continue;
      const record: unknown = JSON.parse(line);
      if (!record || typeof record !== 'object' || !('status' in record) || record.status !== 'success' ||
        !('action_type' in record) || !('action_id' in record) || typeof record.action_id !== 'string' || !record.action_id) continue;
      if (record.action_type === 'refresh') refresh = true;
      if (record.action_type !== 'analyze' || !('output_variable' in record) || typeof record.output_variable !== 'string' ||
        !record.output_variable || !('output_value' in record)) continue;
      const value = record.output_value;
      const output = typeof value === 'number' && Number.isFinite(value) ? String(value) : typeof value === 'string' ? value : null;
      const previous = recordings.get(record.output_variable);
      recordings.set(record.output_variable, previous !== undefined && previous !== output ? null : output);
    }
    return { refresh, recordings };
  } catch {
    return { refresh: false, recordings: new Map() };
  }
}

export async function loadKaneEvidence(path: string): Promise<KaneEvidence | null> {
  let zip: ZipFile | undefined;
  try {
    const file = await evidenceFile(path);
    if (!file) return null;
    zip = await openArchive(file.path);
    const entries = await scanEntries(zip, true);
    if (!entries) return null;
    const manifestText = await readSmallEntry(zip, entries.get('run.yaml')!);
    const manifest: unknown = manifestText && parseYaml(manifestText, { maxAliasCount: 0 });
    const executionId = manifest && typeof manifest === 'object' && 'run_id' in manifest && typeof manifest.run_id === 'string'
      ? manifest.run_id : null;
    const testDirectory = Array.from(entries.keys()).find((name) => name.endsWith('/test.md'))!.slice(0, -'test.md'.length);
    const actions = new Map<string, KaneActionEvidence>();
    const refreshes = new Map<string, string>();
    const recordings = new Map<string, ReadonlyMap<string, string | null>>();
    for (const [name, entry] of entries) {
      if (!name.startsWith(testDirectory)) continue;
      const relative = name.slice(testDirectory.length);
      const actionLog = /^logs\/(\d+)-actions\.ndjson$/u.exec(relative);
      if (actionLog) {
        const runId = `run-${actionLog[1]}`;
        const log = readActionLog(await readSmallEntry(zip, entry));
        if (log.refresh) refreshes.set(runId, name);
        if (log.recordings.size > 0) recordings.set(runId, log.recordings);
        continue;
      }
      const stepPath = /^steps\/([^/]+)\/step\.json$/u.exec(relative);
      if (!stepPath) continue;
      const source = await readSmallEntry(zip, entry);
      const step: unknown = source && JSON.parse(source);
      if (!step || typeof step !== 'object' || !('action_id' in step) || typeof step.action_id !== 'string' || !step.action_id ||
        !('kind' in step) || typeof step.kind !== 'string' || !('status' in step) || step.status !== 'passed') continue;
      const directory = name.slice(0, -'step.json'.length);
      const screenshotRef = ['screenshot.jpg', 'screenshot.png', 'screenshot.jpeg']
        .map((fileName) => directory + fileName).find((candidate) => entries.has(candidate)) ?? null;
      actions.set(stepPath[1], { actionId: step.action_id, kind: step.kind, evidenceRef: name, screenshotRef });
    }
    return { executionId, actions, refreshes, recordings };
  } catch {
    return null;
  } finally {
    zip?.close();
  }
}
