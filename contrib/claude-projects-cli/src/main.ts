#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, toRequest, UsageError } from './args.ts';
import { send, serve, type WireRequest } from './daemon.ts';
import type { Envelope } from './types.ts';

// Everything the CLI writes or reads lives under one folder, so nothing about
// a particular account or user is baked into the code.
const home = process.env.CPC_HOME ?? join(homedir(), '.claude-projects-cli');
const socketPath = join(home, 'daemon.sock');
const logPath = join(home, 'daemon.log');
const STARTUP_TIMEOUT_MS = 60_000;

const USAGE = `usage: claude-projects-cli <command> [args]

  list-projects
  list-threads <project-id>
  read-coordinator <project-id>
  read-thread <project-id> <thread-id>
  post <project-id> [<thread-id>] (--text <s> | --file <path|->) [--dry-run] [--allow-duplicate]
  clear-draft <project-id> [<thread-id>]
  stop                              stop the warm browser daemon
  serve                             run the daemon in the foreground

Environment: CPC_HOME (state folder), CPC_BASE_URL (default https://claude.ai),
CPC_HEADLESS=1, CPC_EXECUTABLE_PATH (browser binary).
Exit codes: 0 ok, 1 error, 2 usage, 3 post sent but not verified.`;

function print(envelope: Envelope): void {
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

function fail(code: string, message: string, exitCode: number): never {
  print({ ok: false, command: 'cli', timing_ms: 0, error: { code, message } });
  process.exit(exitCode);
}

function readText(file: string): string {
  return readFileSync(file === '-' ? 0 : file, 'utf8');
}

async function startDaemonInBackground(): Promise<void> {
  mkdirSync(home, { recursive: true });
  const log = openSync(logPath, 'a');
  const child = spawn(process.execPath, [import.meta.path, 'serve'], {
    detached: true,
    stdio: ['ignore', 'ignore', log],
  });
  child.unref();
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (!existsSync(socketPath)) {
    if (Date.now() > deadline) throw new Error(`daemon did not start; see ${logPath}`);
    await Bun.sleep(100);
  }
}

// Sends to the warm daemon, starting it when no one is listening.
async function call(request: WireRequest): Promise<Envelope> {
  try {
    return await send(socketPath, request);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ECONNREFUSED') throw error;
    await startDaemonInBackground();
    return send(socketPath, request);
  }
}

async function startDaemon(): Promise<void> {
  // Loaded here so client calls skip Playwright's import cost.
  const { openPlaywrightPort } = await import('./playwright-port.ts');
  mkdirSync(home, { recursive: true });
  const port = await openPlaywrightPort({
    profileDir: process.env.CPC_PROFILE_DIR ?? join(home, 'profile'),
    baseUrl: process.env.CPC_BASE_URL ?? 'https://claude.ai',
    headless: process.env.CPC_HEADLESS === '1',
    executablePath: process.env.CPC_EXECUTABLE_PATH,
  });
  const server = serve(socketPath, port);
  server.on('close', () => process.exit(0));
}

async function main(argv: string[]): Promise<void> {
  if (argv.length === 0 || argv[0] === 'help' || argv[0] === '--help') {
    process.stderr.write(`${USAGE}\n`);
    process.exit(argv.length === 0 ? 2 : 0);
  }
  if (argv[0] === 'serve') return startDaemon();

  const parsed = parseArgs(argv);
  if (parsed.command === 'stop') {
    if (!existsSync(socketPath)) return print({ ok: true, command: 'stop', timing_ms: 0, data: { stopped: false } });
    return print(await call({ command: 'stop' }));
  }

  const request = toRequest(parsed, readText);
  const envelope = await call(request);
  print(envelope);
  if (!envelope.ok) process.exit(1);
  const status = (envelope.data as { status?: string } | undefined)?.status;
  if (status === 'unverified') process.exit(3);
}

main(process.argv.slice(2)).catch((error) => {
  if (error instanceof UsageError) fail(error.code, error.message, 2);
  fail('error', error instanceof Error ? error.message : String(error), 1);
});
