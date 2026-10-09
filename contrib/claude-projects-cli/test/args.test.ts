import { describe, expect, test } from 'bun:test';
import { parseArgs, toRequest, UsageError } from '../src/args.ts';

const noFiles = () => {
  throw new Error('no file reads expected');
};

describe('toRequest', () => {
  test('maps a post with flags to a request', () => {
    const request = toRequest(
      parseArgs(['post', 'p1', 't1', '--text', 'Hi', '--dry-run']),
      noFiles,
    );
    expect(request).toEqual({
      command: 'post',
      projectId: 'p1',
      threadId: 't1',
      text: 'Hi',
      dryRun: true,
      allowDuplicate: false,
    });
  });

  test('reads post text from a file, including stdin', () => {
    const files: string[] = [];
    const readText = (file: string) => {
      files.push(file);
      return 'from file';
    };
    const request = toRequest(parseArgs(['post', 'p1', '--file', '-']), readText);
    expect(files).toEqual(['-']);
    expect(request).toMatchObject({ command: 'post', text: 'from file', threadId: undefined });
  });

  test('a post with no project id is a usage error', () => {
    expect(() => toRequest(parseArgs(['post', '--text', 'Hi']), noFiles)).toThrow(UsageError);
  });

  test('a post needs exactly one text source', () => {
    expect(() => toRequest(parseArgs(['post', 'p1']), noFiles)).toThrow('--text or --file');
    expect(() =>
      toRequest(parseArgs(['post', 'p1', '--text', 'a', '--file', 'b']), noFiles),
    ).toThrow('not both');
  });

  test('read-thread needs both ids', () => {
    expect(() => toRequest(parseArgs(['read-thread', 'p1']), noFiles)).toThrow(
      'needs <thread-id>',
    );
  });

  test('an unknown command is a usage error', () => {
    expect(() => toRequest(parseArgs(['delete-everything']), noFiles)).toThrow(UsageError);
  });
});

describe('parseArgs', () => {
  test('a flag with no value is a usage error', () => {
    expect(() => parseArgs(['post', 'p1', '--text'])).toThrow('--text needs a value');
  });
});
