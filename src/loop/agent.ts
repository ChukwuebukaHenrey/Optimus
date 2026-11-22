import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export interface AgentCommand {
  executable: string;
  args: string[];
  name: string;
}

/** Claude Code in headless mode, limited to file tools inside its working folder. */
export function claudeCodeCommand(executable = 'claude', extraDirectories: string[] = []): AgentCommand {
  return {
    name: 'claude-code',
    executable,
    args: [
      '-p', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--no-session-persistence',
      ...extraDirectories.flatMap((directory) => ['--add-dir', directory]),
      '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
      '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch', 'Task',
    ],
  };
}

/** Any other agent: an executable (or a .js/.mjs file run with Node) that reads the brief on stdin. */
export function customAgentCommand(path: string): AgentCommand {
  return ['.js', '.mjs', '.cjs'].includes(extname(path).toLowerCase())
    ? { name: 'custom', executable: process.execPath, args: [path] }
    : { name: 'custom', executable: path, args: [] };
}

export interface AgentRun {
  agentInvocationId: string;
  agent: string;
  exitCode: number | null;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
  finalMessage: string | null;
  agentSessionId: string | null;
  stdoutPath: string;
  stderrPath: string;
}

function finalMessage(stdout: string): { message: string | null; session: string | null } {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      return {
        message: typeof record.result === 'string' ? record.result : null,
        session: typeof record.session_id === 'string' ? record.session_id : null,
      };
    }
  } catch {
    // Not JSON: keep the tail of the plain output.
  }
  const text = stdout.trim();
  return { message: text ? text.slice(-4000) : null, session: null };
}

/** Runs the agent once in the app folder, sending the brief on stdin, and records its output. */
export async function invokeAgent(command: AgentCommand, cwd: string, prompt: string, timeoutMs: number, logDirectory: string): Promise<AgentRun> {
  const agentInvocationId = `agent-${randomUUID()}`;
  const env = { ...process.env };
  // A nested Claude Code session must not inherit this session's identity.
  for (const key of Object.keys(env)) if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_')) delete env[key];
  const startedAt = new Date().toISOString();
  const child = spawn(command.executable, command.args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, Math.max(1000, timeoutMs));
  child.stdin.end(prompt);
  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.once('error', (error) => { stderr += String(error); resolveExit(null); });
    child.once('close', resolveExit);
  });
  clearTimeout(timer);
  const stdoutPath = join(logDirectory, 'agent-stdout.txt');
  const stderrPath = join(logDirectory, 'agent-stderr.txt');
  await writeFile(stdoutPath, stdout, 'utf8');
  await writeFile(stderrPath, stderr, 'utf8');
  const { message, session } = finalMessage(stdout);
  return {
    agentInvocationId, agent: command.name, exitCode, timedOut, startedAt, finishedAt: new Date().toISOString(),
    finalMessage: message, agentSessionId: session, stdoutPath, stderrPath,
  };
}
