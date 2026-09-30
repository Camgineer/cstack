#!/usr/bin/env python3
"""Prepare a pinned PStack update for review; never commit, push, merge, or install."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / 'upstream/pstack.json'


def git(*args, check=True, data=None):
    return subprocess.run(['git', '-C', str(ROOT), *args],
                          input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)


def output(*args):
    return git(*args).stdout.decode().strip()


def tree(commit, subpath):
    spec = f'{commit}:{subpath}'
    oid = output('rev-parse', '--verify', spec)
    if output('cat-file', '-t', oid) != 'tree':
        raise ValueError('upstream path is not a tree')
    entries = {}
    for row in git('ls-tree', '-rz', oid).stdout.split(b'\0'):
        if row:
            metadata, raw_path = row.split(b'\t', 1)
            mode, kind, blob = metadata.decode().split()
            path = raw_path.decode()
            if mode not in ('100644', '100755') or kind != 'blob':
                raise ValueError(f'unsupported upstream entry: {path} ({mode})')
            if any(part in ('.git', '..', '') for part in path.split('/')):
                raise ValueError(f'unsafe upstream path: {path}')
            entries[path] = (mode, blob)
    if 'LICENSE' not in entries:
        raise ValueError('upstream tree has no LICENSE')
    return oid, entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['diff', 'prepare'])
    parser.add_argument('commit', help='full 40-character upstream commit SHA')
    parser.add_argument('--source', help='verified local cursor/plugins clone (default: pinned remote)')
    parser.add_argument('--branch', help='new review branch (prepare only)')
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.commit):
        raise ValueError('use an exact lowercase 40-character commit SHA')
    if args.action == 'prepare':
        if output('status', '--porcelain', '--untracked-files=all'):
            raise ValueError('working tree and index must be clean; preserve local work first')
        if output('rev-parse', '--show-toplevel') != str(ROOT):
            raise ValueError('run from a repository checkout, not an installed plugin cache')
        for marker in ('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply'):
            if (ROOT / output('rev-parse', '--git-path', marker)).exists():
                raise ValueError('finish the existing Git operation before preparing an update')
        branch = args.branch or f'upstream/pstack-{args.commit[:12]}'
        git('check-ref-format', '--branch', branch)
    lock = json.loads(LOCK.read_text())
    source = args.source or lock['repository']
    if args.source:
        source = str(Path(args.source).expanduser().resolve(strict=True))
    # Fetch objects only. No source hooks, submodules, code, or dependencies run.
    git('fetch', '--no-tags', '--no-recurse-submodules', '--no-write-fetch-head',
        source, lock['commit'], args.commit)
    old_tree, old = tree(lock['commit'], lock['path'])
    new_tree, new = tree(args.commit, lock['path'])
    if old_tree != lock['tree']:
        raise ValueError('pinned commit/tree mismatch')
    if git('merge-base', '--is-ancestor', lock['commit'], args.commit, check=False).returncode:
        raise ValueError('target is not a descendant of the current pin; review rewritten history manually')
    current = {p.decode() for p in git('ls-tree', '-rz', '--name-only', 'HEAD').stdout.split(b'\0') if p}
    changed = sorted(p for p in old.keys() | new.keys() if old.get(p) != new.get(p))
    retained = [p for p in changed if p in lock['excluded_paths']
                or any(p.startswith(prefix) for prefix in lock['excluded_prefixes'])
                or (p in old and p not in current)]
    included = [p for p in changed if p not in retained]
    patch = git('diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', '--no-renames',
                old_tree, new_tree, '--', *(':(literal)' + p for p in included)).stdout if included else b''
    print(json.dumps({'from': lock['commit'], 'to': args.commit, 'to_tree': new_tree,
                      'included': included, 'retained_deletions_or_exclusions': retained}), file=sys.stderr)
    if args.action == 'diff':
        sys.stdout.buffer.write(patch)
        return 0
    if args.commit == lock['commit']:
        print('Already pinned to this commit; no branch or file changed.')
        return 0
    if git('show-ref', '--verify', '--quiet', f'refs/heads/{branch}', check=False).returncode == 0:
        raise ValueError('review branch already exists; inspect it before another update')
    git('switch', '-c', branch)
    result = git('apply', '--3way', '--index', '--whitespace=nowarn', check=False, data=patch) if patch else None
    if result and result.returncode:
        sys.stderr.buffer.write(result.stderr)
        print('Update stopped. Inspect git status and resolve the patch on this review branch. '
              'The pin is unchanged. Review the full diff before advancing it manually. '
              'No commit, push, merge, or install occurred.', file=sys.stderr)
        return 1
    lock['commit'], lock['tree'] = args.commit, new_tree
    LOCK.write_text(json.dumps(lock, indent=2) + '\n')
    git('add', '--', 'upstream/pstack.json')
    print('Prepared on ' + branch + '. Review git diff --cached, run checks, then commit and open a draft PR. '
          'The pin is proposed until review and merge. No commit, push, merge, or install occurred.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError):
            sys.stderr.buffer.write(error.stderr or b'')
        raise SystemExit(2)
