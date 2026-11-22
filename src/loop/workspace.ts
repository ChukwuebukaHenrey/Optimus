import { spawn } from 'node:child_process';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';

const skipped = new Set(['node_modules', '.git', '.optimus', '.testmuai']);

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const child = spawn('git', ['-c', `safe.directory=${cwd.replaceAll('\\', '/')}`, '-c', 'core.autocrlf=false', ...args], {
      cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolveRun(stdout) : reject(new Error(`git ${args[0]} failed: ${stderr.trim()}`)));
  });
}

export function isInside(child: string, parent: string): boolean {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep) && !/^[A-Za-z]:/u.test(path));
}

export interface Workspace {
  root: string;
  appDirectory: string;
  briefDirectory: string;
}

/** Copies the app into a disposable git-tracked workspace and records the starting revision. */
export async function createWorkspace(source: string, root: string, forbidden: string): Promise<{ workspace: Workspace; revision: string }> {
  if (isInside(root, forbidden)) throw new Error('The repair workspace must be outside the Optimus folder.');
  const appDirectory = join(root, 'app');
  const briefDirectory = join(root, 'brief');
  await mkdir(briefDirectory, { recursive: true });
  await cp(resolve(source), appDirectory, { recursive: true, filter: (path) => !skipped.has(basename(path)) });
  await git(appDirectory, ['init', '-q']);
  return { workspace: { root, appDirectory, briefDirectory }, revision: await snapshot(appDirectory, 'Baseline app before repair') };
}

/** Commits the current app state and returns its revision. */
export async function snapshot(appDirectory: string, message: string): Promise<string> {
  await git(appDirectory, ['add', '-A']);
  await git(appDirectory, ['-c', 'user.name=Optimus repair controller', '-c', 'user.email=optimus@localhost',
    'commit', '-q', '--allow-empty', '--no-verify', '-m', message]);
  return (await git(appDirectory, ['rev-parse', 'HEAD'])).trim();
}

export interface Change {
  files: string[];
  diff: string;
  stat: string;
}

export async function changeBetween(appDirectory: string, from: string, to: string): Promise<Change> {
  const files = (await git(appDirectory, ['diff', '--name-only', from, to])).split(/\r?\n/u).filter(Boolean);
  return { files, diff: await git(appDirectory, ['diff', from, to]), stat: (await git(appDirectory, ['diff', '--stat', from, to])).trim() };
}

export async function readText(path: string): Promise<string | null> {
  return readFile(path, 'utf8').catch(() => null);
}
