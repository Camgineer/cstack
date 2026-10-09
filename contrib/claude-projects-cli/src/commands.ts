import type { ChatPort, Envelope, Message, Request, Target } from './types.ts';

const DEDUPE_WINDOW = 20;
const VERIFY_TIMEOUT_MS = 5000;
const VERIFY_INTERVAL_MS = 250;

export const normalize = (text: string): string => text.trim().replace(/\s+/g, ' ');

const targetOf = (request: { projectId: string; threadId?: string }): Target =>
  request.threadId === undefined
    ? { projectId: request.projectId }
    : { projectId: request.projectId, threadId: request.threadId };

const countUserMessages = (messages: Message[], wanted: string): number =>
  messages.filter((m) => m.author === 'user' && normalize(m.text) === wanted).length;

async function waitFor(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await check()) return true;
    if (Date.now() >= deadline) return false;
    await Bun.sleep(VERIFY_INTERVAL_MS);
  }
}

export interface PostOptions {
  dryRun?: boolean;
  allowDuplicate?: boolean;
  verifyTimeoutMs?: number;
}

// Sends one user message. Skips it when the same text is already among the
// recent user messages, unless allowDuplicate is set. After sending, polls the
// thread until the message shows up, so "sent" means the page confirmed it.
export async function post(port: ChatPort, target: Target, text: string, options: PostOptions = {}) {
  const wanted = normalize(text);
  if (!wanted) throw new Error('post text is empty');

  const before = await port.readMessages(target);
  const duplicate = before.slice(-DEDUPE_WINDOW).some(
    (m) => m.author === 'user' && normalize(m.text) === wanted,
  );
  const willSend = !duplicate || options.allowDuplicate === true;

  if (options.dryRun) {
    return { status: 'dry-run', duplicate, would_send: willSend };
  }
  if (!willSend) {
    return { status: 'duplicate', duplicate, sent: false, verified: false };
  }

  const countBefore = countUserMessages(before, wanted);
  await port.sendMessage(target, text);
  const verified = await waitFor(
    async () => countUserMessages(await port.readMessages(target), wanted) > countBefore,
    options.verifyTimeoutMs ?? VERIFY_TIMEOUT_MS,
  );
  return { status: verified ? 'sent' : 'unverified', duplicate, sent: true, verified };
}

// Empties the composer and confirms it is empty.
export async function clearDraft(port: ChatPort, target: Target) {
  await port.clearDraft(target);
  const remaining = await port.readDraft(target);
  const empty = remaining.trim() === '';
  return { status: empty ? 'cleared' : 'not-empty', remaining_chars: remaining.length };
}

export interface Settings {
  verifyTimeoutMs?: number;
}

export async function dispatch(port: ChatPort, request: Request, settings: Settings = {}): Promise<unknown> {
  switch (request.command) {
    case 'list-projects':
      return { projects: await port.listProjects() };
    case 'list-threads':
      return { threads: await port.listThreads(request.projectId) };
    case 'read-coordinator':
      return { messages: await port.readMessages({ projectId: request.projectId }) };
    case 'read-thread':
      return { messages: await port.readMessages(targetOf(request)) };
    case 'post':
      return post(port, targetOf(request), request.text, {
        dryRun: request.dryRun,
        allowDuplicate: request.allowDuplicate,
        verifyTimeoutMs: settings.verifyTimeoutMs,
      });
    case 'clear-draft':
      return clearDraft(port, targetOf(request));
  }
}

// Wraps a dispatch result in the JSON envelope the CLI prints. Errors become
// `ok: false` envelopes instead of throwing, so callers always get one shape.
export async function run(port: ChatPort, request: Request, settings: Settings = {}): Promise<Envelope> {
  const started = performance.now();
  const timing = () => Math.round(performance.now() - started);
  try {
    const data = await dispatch(port, request, settings);
    return { ok: true, command: request.command, timing_ms: timing(), data };
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'error';
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, command: request.command, timing_ms: timing(), error: { code, message } };
  }
}
