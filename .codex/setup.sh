#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
tool_root="${CSTACK_TOOL_ROOT:-/workspace/.cstack-tools}"
scripts="$repo_root/skills/poteto-mode/scripts"
bun_version="$(node -p 'require(process.argv[1]).packageManager.replace(/^bun@/, "")' "$scripts/package.json")"
if [[ ! "$bun_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'Expected a pinned Bun version in package.json\n' >&2
  exit 1
fi
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  printf 'This setup script targets Linux x86_64 cloud environments\n' >&2
  exit 1
fi

bun="$tool_root/bun/node_modules/@oven/bun-linux-x64/bin/bun"
if [[ ! -x "$bun" ]] || [[ "$("$bun" --version)" != "$bun_version" ]]; then
  npm install --prefix "$tool_root/bun" --cache "$tool_root/npm-cache" \
    --ignore-scripts --no-audit --no-fund "@oven/bun-linux-x64@$bun_version"
fi
mkdir -p "$tool_root/bin"
ln -sfn "$bun" "$tool_root/bin/bun"
export PATH="$tool_root/bin:$PATH"
export BUN_INSTALL_CACHE_DIR="${CSTACK_BUN_CACHE:-/workspace/.cache/bun}"
bun install --cwd "$scripts" --frozen-lockfile --ignore-scripts
bun run --cwd "$scripts" typecheck
bun run --cwd "$scripts" test
printf 'Cloud setup verified with Bun %s. Keep %s on the environment PATH.\n' "$bun_version" "$tool_root/bin"
