import { rmSync } from 'node:fs';
import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { run, type Settings } from './commands.ts';
import type { ChatPort, Envelope, Request } from './types.ts';

// The daemon keeps one browser and its claude.ai tabs open. Each CLI call sends
// one JSON line over a Unix socket and reads one JSON line back.
export type WireRequest = Request | { command: 'stop' };

export function serve(socketPath: string, port: ChatPort, settings: Settings = {}): Server {
  rmSync(socketPath, { force: true });
  // Requests share one browser, so they run one at a time, in arrival order.
  let queue: Promise<void> = Promise.resolve();
  const server = createServer((socket) => attach(socket));

  function attach(socket: Socket) {
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      for (let end = buffer.indexOf('\n'); end >= 0; end = buffer.indexOf('\n')) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        queue = queue.then(() => handle(socket, line));
      }
    });
    socket.on('error', () => socket.destroy());
  }

  async function handle(socket: Socket, line: string): Promise<void> {
    let request: WireRequest;
    try {
      request = JSON.parse(line) as WireRequest;
    } catch {
      return reply(socket, {
        ok: false,
        command: 'unknown',
        timing_ms: 0,
        error: { code: 'bad-request', message: 'request is not JSON' },
      });
    }
    if (request.command === 'stop') {
      server.close();
      rmSync(socketPath, { force: true });
      await port.close();
      reply(socket, { ok: true, command: 'stop', timing_ms: 0, data: { stopped: true } });
      return;
    }
    reply(socket, await run(port, request, settings));
  }

  server.listen(socketPath);
  return server;
}

function reply(socket: Socket, envelope: Envelope): void {
  socket.write(`${JSON.stringify(envelope)}\n`);
}

export function send(socketPath: string, request: WireRequest): Promise<Envelope> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    let buffer = '';
    socket.on('connect', () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      socket.end();
      resolve(JSON.parse(buffer.slice(0, end)) as Envelope);
    });
    socket.on('error', reject);
    socket.on('close', () => reject(new Error('daemon closed the connection before replying')));
  });
}
