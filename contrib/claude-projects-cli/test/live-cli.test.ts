import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startStandIn, type StandIn } from './support/stand-in.ts';

// Runs the real CLI in a subprocess against a Chromium at CPC_EXECUTABLE_PATH.
// Skipped unless that variable is set, because it needs a browser binary.
const executablePath = process.env.CPC_EXECUTABLE_PATH;
const mainPath = join(import.meta.dir, '..', 'src', 'main.ts');

describe.skipIf(!executablePath)('CLI against a local claude.ai stand-in', () => {
  let standIn: StandIn;
  let home: string;
  let env: Record<string, string>;

  async function cli(...args: string[]) {
    const proc = Bun.spawn(['bun', mainPath, ...args], { env, stdout: 'pipe', stderr: 'pipe' });
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    return { exitCode, envelope: JSON.parse(stdout) };
  }

  beforeAll(() => {
    standIn = startStandIn();
    home = mkdtempSync(join(tmpdir(), 'cpc-live-'));
    env = {
      ...(process.env as Record<string, string>),
      CPC_HOME: home,
      CPC_BASE_URL: standIn.baseUrl,
      CPC_HEADLESS: '1',
      CPC_EXECUTABLE_PATH: executablePath ?? '',
    };
  });

  afterAll(async () => {
    await cli('stop');
    standIn.stop();
    rmSync(home, { recursive: true, force: true });
  });

  test('lists projects and threads through the warm daemon', async () => {
    const projects = await cli('list-projects');
    expect(projects.envelope).toMatchObject({ ok: true, data: { projects: [{ id: 'p1', name: 'Ops' }] } });

    const threads = await cli('list-threads', 'p1');
    expect(threads.envelope).toMatchObject({ ok: true, data: { threads: [{ id: 'p1-t1', title: 'Blockers' }] } });
  });

  test('posts a message, verifies it, and skips a repeat', async () => {
    const first = await cli('post', 'p1', 'p1-t1', '--text', 'Blocked on review');
    expect(first.exitCode).toBe(0);
    expect(first.envelope.data).toMatchObject({ status: 'sent', verified: true });

    const repeat = await cli('post', 'p1', 'p1-t1', '--text', 'Blocked on review');
    expect(repeat.envelope.data).toMatchObject({ status: 'duplicate', sent: false });

    const thread = await cli('read-thread', 'p1', 'p1-t1');
    expect(thread.envelope.data.messages).toEqual([
      { id: '0', author: 'user', text: 'Blocked on review' },
    ]);
  });

  test('dry-run and clear-draft never leave a message behind', async () => {
    const dry = await cli('post', 'p1', 'p1-t1', '--text', 'Only a dry run', '--dry-run');
    expect(dry.envelope.data).toEqual({ status: 'dry-run', duplicate: false, would_send: true });

    const cleared = await cli('clear-draft', 'p1', 'p1-t1');
    expect(cleared.envelope.data).toEqual({ status: 'cleared', remaining_chars: 0 });

    const thread = await cli('read-thread', 'p1', 'p1-t1');
    expect(thread.envelope.data.messages).toHaveLength(1);
  });

  test('stop shuts the daemon down', async () => {
    const stopped = await cli('stop');
    expect(stopped.envelope).toMatchObject({ ok: true, data: { stopped: true } });
  });
});
