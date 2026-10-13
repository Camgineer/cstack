#!/usr/bin/env bash
# Doctor: report the health of this plugin's installations on this machine.
#
# Read-only. An installation can look current in one place and stale in
# another: the host's installed record, its marketplace clone, and its cache
# folders are separate copies. This script prints each one it can find, with
# its version and commit where known, and flags cache folders that do not
# match the installed version as stale. It changes nothing.
#
# Usage: bash tools/doctor.sh

set -u

say() { printf '%s\n' "$*"; }

claude_dir="$HOME/.claude/plugins"
installed_version=""

say "== Claude Code =="
if [ -f "$claude_dir/installed_plugins.json" ]; then
  if command -v python3 >/dev/null 2>&1; then
    report="$(python3 - "$claude_dir/installed_plugins.json" <<'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    first = data["plugins"]["cstack@cstack"][0]
    print("VERSION=" + first.get("version", ""))
    print("installed: version %s, commit %s, path %s" % (
        first.get("version", "UNKNOWN"),
        first.get("gitCommitSha", "UNKNOWN"),
        first.get("installPath", "UNKNOWN")))
except Exception:
    pass
PY
)"
    installed_version="$(printf '%s\n' "$report" | sed -n 's/^VERSION=//p')"
    if [ -n "$installed_version" ]; then
      printf '%s\n' "$report" | grep '^installed:'
    else
      say "installed: UNKNOWN (could not parse installed_plugins.json)"
    fi
  else
    say "installed: UNKNOWN (python3 not found to parse installed_plugins.json)"
  fi
else
  say "installed: none found at $claude_dir/installed_plugins.json"
fi

marketplace="$claude_dir/marketplaces/cstack"
if [ -d "$marketplace/.git" ]; then
  head_commit="$(git -C "$marketplace" rev-parse --short HEAD 2>/dev/null || echo UNKNOWN)"
  clone_version="$(grep -m1 '"version"' "$marketplace/.claude-plugin/plugin.json" 2>/dev/null | sed 's/[^0-9.]*//g')"
  say "marketplace clone: version ${clone_version:-UNKNOWN}, commit $head_commit, path $marketplace"
else
  say "marketplace clone: none found at $marketplace"
fi

cache_dir="$claude_dir/cache/cstack/cstack"
if [ -d "$cache_dir" ]; then
  for folder in "$cache_dir"/*/; do
    [ -d "$folder" ] || continue
    name="$(basename "$folder")"
    if [ -n "$installed_version" ] && [ "$name" != "$installed_version" ]; then
      say "cache: $name STALE (installed version is $installed_version)"
    else
      say "cache: $name"
    fi
  done
else
  say "cache: none found at $cache_dir"
fi

say ""
say "== Codex =="
codex_cache="$HOME/.codex/plugins/cache/cstack"
if [ -d "$codex_cache" ]; then
  found=0
  for manifest in "$codex_cache"/*/.codex-plugin/plugin.json "$codex_cache"/*/*/.codex-plugin/plugin.json; do
    [ -f "$manifest" ] || continue
    found=1
    version="$(grep -m1 '"version"' "$manifest" | sed 's/[^0-9.]*//g')"
    say "install: version ${version:-UNKNOWN}, path $(dirname "$(dirname "$(dirname "$manifest")")")"
  done
  for staging in "$codex_cache"/plugin-install-*; do
    [ -d "$staging" ] && say "staging leftover: $staging (an interrupted install; safe to remove)"
  done
  [ "$found" -eq 0 ] && say "install: UNKNOWN (cache exists at $codex_cache, no plugin manifest found)"
else
  say "install: none found at $codex_cache"
fi

say ""
say "== Cursor =="
cursor_cache="$HOME/.cursor/plugins/cache/cstack"
if [ -d "$cursor_cache" ]; then
  contents="$(find "$cursor_cache" -type f | head -1)"
  if [ -n "$contents" ]; then
    say "cache: files present under $cursor_cache"
  else
    say "cache: only empty folders at $cursor_cache (not an install)"
  fi
else
  say "cache: none found at $cursor_cache"
fi
if [ -d "$HOME/.cursor/plugins/local" ]; then
  local_hits="$(ls "$HOME/.cursor/plugins/local" | grep -i cstack || true)"
  [ -n "$local_hits" ] && say "local plugins: $local_hits"
fi

say ""
say "A version shown by a host app can come from any of the copies above,"
say "including a synced package served from your account, which this script"
say "cannot see. When two copies disagree, the installed record is the one"
say "the host loads."
