#!/bin/sh
set -eu

self=$0
while [ -L "$self" ]; do
  target=$(readlink "$self")
  case $target in
    /*) self=$target ;;
    *) self=$(dirname -- "$self")/$target ;;
  esac
done
source=$(cd -- "$(dirname -- "$self")/.." && pwd -P)
skills="$HOME/.intent/skills"
specialists="$HOME/.intent/specialists"
conflicts=0

if [ ! -f "$source/tools/metadata.json" ] || [ ! -d "$source/skills" ] || [ ! -d "$source/agents" ]; then
  printf '%s is not inside the plugin.\n' "$self" >&2
  exit 2
fi

name=$(sed -n 's/^[[:space:]]*"name":[[:space:]]*"\([a-z0-9-]*\)".*/\1/p' "$source/tools/metadata.json" | head -n 1)
if [ -z "$name" ]; then
  printf '%s has no plugin name.\n' "$source/tools/metadata.json" >&2
  exit 2
fi
first_install=true
if [ -e "$skills/$name-mode" ] || [ -L "$skills/$name-mode" ]; then first_install=false; fi

# npx and host plugin caches can vanish or move on update, so only a git checkout is linked in place.
if [ -e "$source/.git" ]; then
  root=$source
else
  root="${XDG_DATA_HOME:-$HOME/.local/share}/$name"
  if [ -e "$root" ] && [ ! -f "$root/tools/metadata.json" ]; then
    printf 'kept %s: it is not a copy of this plugin\n' "$root" >&2
    exit 2
  fi
  rm -rf "$root.new"
  mkdir -p "$root.new/tools"
  cp -R "$source/agents" "$source/hooks" "$source/skills" "$root.new/"
  cp "$source/tools/metadata.json" "$root.new/tools/"
  if [ -f "$source/LICENSE" ]; then cp "$source/LICENSE" "$root.new/"; fi
  rm -rf "$root"
  mv "$root.new" "$root"
  root=$(cd -- "$root" && pwd -P)
  printf 'copied the plugin to %s\n' "$root"
fi

explicit_only() {
  awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 && /^disable-model-invocation:[[:space:]]*true[[:space:]]*$/ { found = 1 } END { exit !found }' "$1"
}

ours() {
  [ -L "$1" ] && case $(readlink "$1") in "$root"/*) true ;; *) false ;; esac
}

dangling() {
  [ -L "$1" ] && [ ! -e "$1" ]
}

link() {
  if [ -L "$2" ] && [ "$(readlink "$2")" = "$1" ]; then return; fi
  if [ -e "$2" ] || [ -L "$2" ]; then
    # A broken link with the same name is usually this plugin from a checkout that has since moved.
    if ! ours "$2" && ! dangling "$2"; then
      printf 'kept %s: it is not a link into this plugin\n' "$2" >&2
      conflicts=1
      return
    fi
    rm "$2"
  fi
  ln -s "$1" "$2"
  printf 'linked %s\n' "$2"
}

unlink_stale() {
  for entry in "$1"/*; do
    if ours "$entry" && dangling "$entry"; then
      rm "$entry"
      printf 'removed %s\n' "$entry"
    fi
  done
}

mkdir -p "$skills" "$specialists"
unlink_stale "$skills"
unlink_stale "$specialists"

# The principles stay out of Intent's skill list, which ignores disable-model-invocation; the mode skill reads them by path.
for skill in "$root"/skills/*/SKILL.md; do
  [ -f "$skill" ] || continue
  directory=$(dirname "$skill")
  target="$skills/$(basename "$directory")"
  if explicit_only "$skill"; then
    if ours "$target"; then
      rm "$target"
      printf 'removed %s\n' "$target"
    fi
  else
    link "$directory" "$target"
  fi
done

for persona in "$root"/agents/*.md; do
  [ -f "$persona" ] || continue
  link "$persona" "$specialists/$(basename "$persona")"
done

find_intentd() {
  command -v intentd && return
  # The desktop app ships intentd inside its bundle rather than on PATH.
  find /Applications "$HOME/Applications" -maxdepth 5 -path '*Intent*.app/*' -name intentd -type f -perm -u+x 2>/dev/null | head -n 1
}

# A rerun is an update, and leaves the rule alone so a person who removed it keeps the mode off.
if [ "$first_install" = true ]; then
  rule="Before any other step, read the \`$name-mode\` skill's SKILL.md from your skills list and follow it for the rest of the session."
  intentd=$(find_intentd)
  status=1
  if [ -n "$intentd" ] && command -v node >/dev/null 2>&1; then
    INTENTD="$intentd" RULE="$rule" MODE="$name-mode" node -e '
      const { execFileSync } = require("node:child_process");
      const call = (method, params) => JSON.parse(execFileSync(process.env.INTENTD, ["call", method, "--params", JSON.stringify(params)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
      const key = { workspaceId: "global", ruleType: "workspace" };
      const current = call("rules.get", key);
      if (current.content.includes(process.env.MODE)) process.exit(3);
      if (!current.enabled && current.content.trim() !== "") process.exit(1);
      const content = current.content.trim() === "" ? process.env.RULE : `${process.env.RULE}\n\n${current.content}`;
      call("rules.update", { ...key, content, enabled: true });
    ' 2>/dev/null && status=0 || status=$?
  fi
  case $status in
    0) printf 'added the %s rule to Intent'"'"'s Settings, under Agent Behavior\n' "$name-mode" ;;
    3) ;;
    *) printf 'To keep the mode on, paste this into Intent'"'"'s Settings, under Agent Behavior:\n%s\n' "$rule" ;;
  esac
  if [ "$status" != 1 ] && "$intentd" settings git.autoCommit 2>/dev/null | grep -q '= true'; then
    printf 'Intent commits agent work with Agent-Id trailers. To stop it, run: %s settings git.autoCommit false\n' "$intentd"
  fi
fi

exit "$conflicts"
