import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { send, serve } from '../src/daemon.ts';
import { FakePort } from './fake-port.ts';

let dir: string;
let socketPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cpc-daemon-'));
  socketPath = join(dir, 'daemon.sock');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('daemon', () => {
  test('answers a request over the socket with the same envelope run() produces', async () => {
    const port = new FakePort();
    const server = serve(socketPath, port);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));

    const envelope = await send(socketPath, {
      command: 'post',
      projectId: 'p1',
      threadId: 't1',
      text: 'Round trip',
    });

    expect(envelope).toMatchObject({
      ok: true,
      command: 'post',
      data: { status: 'sent', verified: true },
    });
    expect(port.sent[0].text).toBe('Round trip');
    server.close();
  });

  test('serves requests one after another on the same socket', async () => {
    const server = serve(socketPath, new FakePort());
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));

    const [first, second] = await Promise.all([
      send(socketPath, { command: 'list-projects' }),
      send(socketPath, { command: 'list-threads', projectId: 'p1' }),
    ]);

    expect(first).toMatchObject({ ok: true, data: { projects: [{ id: 'p1', name: 'Ops' }] } });
    expect(second).toMatchObject({ ok: true, data: { threads: [{ id: 'p1-t1', title: 'Blockers' }] } });
    server.close();
  });

  test('stop replies, closes the port, and removes the socket', async () => {
    let closed = false;
    const port = Object.assign(new FakePort(), {
      close: async () => {
        closed = true;
      },
    });
    const server = serve(socketPath, port);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));

    const envelope = await send(socketPath, { command: 'stop' });

    expect(envelope).toMatchObject({ ok: true, data: { stopped: true } });
    expect(closed).toBe(true);
    expect(existsSync(socketPath)).toBe(false);
  });
});
