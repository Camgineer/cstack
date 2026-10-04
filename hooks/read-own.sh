#!/bin/sh
# Hosts ask before reading outside the project, which blocks skills from reading the plugin's own references and principles.
# Allows a read only when its file resolves inside the plugin root, so `..` and symlinks can't reach anything else.
set -eu

root=$(cd -- "$(dirname -- "$0")/.." && pwd -P)
file=$(tr '\n' ' ' | sed -E -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)".*/\1/p')
case "$file" in /*) ;; *) exit 0 ;; esac
dir=$(cd -- "$(dirname -- "$file")" 2>/dev/null && pwd -P) || exit 0
[ ! -L "$file" ] || exit 0
case "$dir/" in
  "$root"/*) printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Reads the plugin'"'"'s own files."}}\n' ;;
esac
