#!/bin/sh
# Intent loads no host plugin, so this links the plugin's skills and personas into the folders Intent scans.
# Rerun it after updating the checkout so added and removed skills follow.
set -eu

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
skills="$HOME/.intent/skills"
specialists="$HOME/.intent/specialists"
conflicts=0

explicit_only() {
  awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } NR > 1 && /^disable-model-invocation:[[:space:]]*true[[:space:]]*$/ { found = 1 } END { exit !found }' "$1"
}

ours() {
  [ -L "$1" ] && case $(readlink "$1") in "$root"/*) true ;; *) false ;; esac
}

link() {
  if [ -L "$2" ] && [ "$(readlink "$2")" = "$1" ]; then return; fi
  if [ -e "$2" ] || [ -L "$2" ]; then
    if ! ours "$2"; then
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
    if ours "$entry" && ! [ -e "$(readlink "$entry")" ]; then
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
  link "$persona" "$specialists/$(basename "$persona")"
done

exit "$conflicts"
