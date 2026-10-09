import type { Request } from './types.ts';

export class UsageError extends Error {
  readonly code = 'usage';
}

const SWITCHES = new Set(['dry-run', 'allow-duplicate']);

export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (SWITCHES.has(name)) {
      flags[name] = true;
      continue;
    }
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new UsageError(`--${name} needs a value`);
    }
    flags[name] = value;
    i++;
  }
  return { command, positionals, flags };
}

// Maps a parsed command line to a request. Positionals are project id first, then thread id.
export function toRequest(parsed: ParsedArgs, readText: (file: string) => string): Request {
  const [projectId, threadId] = parsed.positionals;
  const need = (value: string | undefined, label: string): string => {
    if (!value) throw new UsageError(`${parsed.command} needs ${label}`);
    return value;
  };
  switch (parsed.command) {
    case 'list-projects':
      return { command: 'list-projects' };
    case 'list-threads':
      return { command: 'list-threads', projectId: need(projectId, '<project-id>') };
    case 'read-coordinator':
      return { command: 'read-coordinator', projectId: need(projectId, '<project-id>') };
    case 'read-thread':
      return {
        command: 'read-thread',
        projectId: need(projectId, '<project-id>'),
        threadId: need(threadId, '<thread-id>'),
      };
    case 'post':
      return {
        command: 'post',
        projectId: need(projectId, '<project-id>'),
        threadId,
        text: textFlag(parsed, readText),
        dryRun: parsed.flags['dry-run'] === true,
        allowDuplicate: parsed.flags['allow-duplicate'] === true,
      };
    case 'clear-draft':
      return { command: 'clear-draft', projectId: need(projectId, '<project-id>'), threadId };
    default:
      throw new UsageError(`unknown command: ${parsed.command ?? '(none)'}`);
  }
}

function textFlag(parsed: ParsedArgs, readText: (file: string) => string): string {
  const { text, file } = parsed.flags;
  if (typeof text === 'string' && typeof file === 'string') {
    throw new UsageError('pass --text or --file, not both');
  }
  if (typeof text === 'string') return text;
  if (typeof file === 'string') return readText(file);
  throw new UsageError('post needs --text or --file (use --file - for stdin)');
}
