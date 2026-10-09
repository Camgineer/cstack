import { describe, expect, test } from 'bun:test';
import { dispatch, run } from '../src/commands.ts';
import { FakePort } from './fake-port.ts';

const thread = { projectId: 'p1', threadId: 't1' };

describe('post', () => {
  test('sends the text and confirms it on the page', async () => {
    const port = new FakePort();
    const data = await dispatch(port, { command: 'post', ...thread, text: 'Ship it' });
    expect(data).toEqual({ status: 'sent', duplicate: false, sent: true, verified: true });
    expect(port.sent).toEqual([{ target: thread, text: 'Ship it' }]);
  });

  test('skips text already sent in the thread, ignoring whitespace differences', async () => {
    const port = new FakePort();
    port.messages = [{ id: '0', author: 'user', text: 'Ship   it\n' }];
    const data = await dispatch(port, { command: 'post', ...thread, text: 'Ship it' });
    expect(data).toEqual({ status: 'duplicate', duplicate: true, sent: false, verified: false });
    expect(port.sent).toEqual([]);
  });

  test('ignores a matching assistant message when checking for duplicates', async () => {
    const port = new FakePort();
    port.messages = [{ id: '0', author: 'assistant', text: 'Ship it' }];
    const data = await dispatch(port, { command: 'post', ...thread, text: 'Ship it' });
    expect(data).toMatchObject({ status: 'sent' });
  });

  test('allow-duplicate sends even when the text was already sent', async () => {
    const port = new FakePort();
    port.messages = [{ id: '0', author: 'user', text: 'Ship it' }];
    const data = await dispatch(port, {
      command: 'post',
      ...thread,
      text: 'Ship it',
      allowDuplicate: true,
    });
    expect(data).toMatchObject({ status: 'sent', verified: true });
    expect(port.sent).toHaveLength(1);
  });

  test('dry-run reports what would happen and sends nothing', async () => {
    const port = new FakePort();
    const fresh = await dispatch(port, { command: 'post', ...thread, text: 'Ship it', dryRun: true });
    expect(fresh).toEqual({ status: 'dry-run', duplicate: false, would_send: true });

    port.messages = [{ id: '0', author: 'user', text: 'Ship it' }];
    const repeat = await dispatch(port, { command: 'post', ...thread, text: 'Ship it', dryRun: true });
    expect(repeat).toEqual({ status: 'dry-run', duplicate: true, would_send: false });
    expect(port.sent).toEqual([]);
  });

  test('reports unverified when the message never shows up', async () => {
    const port = new FakePort();
    port.dropSends = true;
    const data = await dispatch(
      port,
      { command: 'post', ...thread, text: 'Ship it' },
      { verifyTimeoutMs: 20 },
    );
    expect(data).toEqual({ status: 'unverified', duplicate: false, sent: true, verified: false });
  });

  test('rejects empty text as an error envelope', async () => {
    const envelope = await run(new FakePort(), { command: 'post', ...thread, text: '   ' });
    expect(envelope).toMatchObject({
      ok: false,
      command: 'post',
      error: { message: 'post text is empty' },
    });
  });

  test('a coordinator post targets the project, not a thread', async () => {
    const port = new FakePort();
    await dispatch(port, { command: 'post', projectId: 'p1', text: 'Status?' });
    expect(port.sent[0].target).toEqual({ projectId: 'p1' });
  });
});

describe('clear-draft', () => {
  test('empties the composer and confirms it', async () => {
    const port = new FakePort();
    port.draft = 'half a sentence';
    const data = await dispatch(port, { command: 'clear-draft', ...thread });
    expect(data).toEqual({ status: 'cleared', remaining_chars: 0 });
  });

  test('reports not-empty when the composer keeps its text', async () => {
    const port = new FakePort();
    port.draft = 'stuck';
    port.keepDraft = true;
    const data = await dispatch(port, { command: 'clear-draft', ...thread });
    expect(data).toEqual({ status: 'not-empty', remaining_chars: 5 });
  });
});

describe('reads', () => {
  test('list-projects and list-threads return the port data', async () => {
    const port = new FakePort();
    expect(await dispatch(port, { command: 'list-projects' })).toEqual({
      projects: [{ id: 'p1', name: 'Ops' }],
    });
    expect(await dispatch(port, { command: 'list-threads', projectId: 'p1' })).toEqual({
      threads: [{ id: 'p1-t1', title: 'Blockers' }],
    });
  });

  test('read-coordinator reads the project chat and read-thread reads one thread', async () => {
    const port = new FakePort();
    port.messages = [{ id: '0', author: 'assistant', text: 'Hello' }];
    expect(await dispatch(port, { command: 'read-coordinator', projectId: 'p1' })).toEqual({
      messages: [{ id: '0', author: 'assistant', text: 'Hello' }],
    });
    await dispatch(port, { command: 'read-thread', ...thread });
    expect(port.readTargets).toEqual([{ projectId: 'p1' }, thread]);
  });
});

describe('run', () => {
  test('wraps success with the command name and a timing', async () => {
    const envelope = await run(new FakePort(), { command: 'list-projects' });
    expect(envelope.ok).toBe(true);
    expect(envelope.command).toBe('list-projects');
    expect(typeof envelope.timing_ms).toBe('number');
  });
});
