#!/bin/sh
# Keeps the plugin's <plugin>-mode skill on for a project across sessions, /clear, and compaction.
# Hosts call this from hooks/hooks.json; the agent runs `mode.sh off` when the user opts out in plain words.
set -eu

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
name=$(sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$root/tools/metadata.json" 2>/dev/null | head -n 1)
mode="${name:-plugin}-mode"
state="${XDG_STATE_HOME:-$HOME/.local/state}/${name:-plugin}/$mode"

json_string() {
  printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk 'NR > 1 { printf "\\n" } { printf "%s", $0 }')"
}

json_field() {
  printf '%s' "$1" | tr '\n' ' ' | sed -E -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"(([^\"\\\\]|\\\\.)*)\".*/\\1/p"
}

project_of() {
  git -C "$1" rev-parse --show-toplevel 2>/dev/null || printf '%s\n' "$1"
}

flag_for() {
  printf '%s/%s\n' "$state" "$(printf '%s' "$1" | cksum | cut -d ' ' -f 1)"
}

emit() {
  printf '{"hookSpecificOutput":{"hookEventName":%s,"additionalContext":%s}}\n' "$(json_string "$1")" "$(json_string "$2")"
}

# Hosts load a named skill without a file-read permission prompt, so name it first and keep the path as the fallback.
reminder() {
  printf '%s is on for %s. Invoke the %s skill now and apply it to every task in this session. If you cannot invoke a skill by name, read %s in full instead. It stays on until the user turns it off. If the user asks to turn it off, run: sh %s off\n' \
    "$mode" "$1" "${name:-plugin}:$mode" "$root/skills/$mode/SKILL.md" "'$root/hooks/mode.sh'"
}

command=${1:-}
case "$command" in
  on | off | status)
    project=$(project_of "$(pwd)")
    flag=$(flag_for "$project")
    case "$command" in
      on) mkdir -p "$state" && printf '%s\n' "$project" >"$flag" && echo "$mode is on for $project." ;;
      off) rm -f "$flag" && echo "$mode is off for $project." ;;
      status) if [ -f "$flag" ]; then echo "$mode is on for $project."; else echo "$mode is off for $project."; fi ;;
    esac
    ;;
  session-start | prompt)
    input=$(cat)
    cwd=${CLAUDE_PROJECT_DIR:-$(json_field "$input" cwd)}
    project=$(project_of "${cwd:-$(pwd)}")
    flag=$(flag_for "$project")
    if [ "$command" = session-start ]; then
      if [ -f "$flag" ]; then emit SessionStart "$(reminder "$project")"; fi
      exit 0
    fi
    # Only an explicit command toggles the mode: /<plugin>:<plugin>-mode, $<plugin>:<plugin>-mode, or /<plugin>-mode.
    rest=$(json_field "$input" prompt | sed -E -n "s/^[[:space:]]*[/\$]([A-Za-z0-9_.-]*:)?$mode(([[:space:]]|\\\\n).*)?\$/x\\2/p")
    case "$rest" in
      "") exit 0 ;;
      x) args= ;;
      *) args=$(printf '%s' "${rest#x}" | sed -e 's/\\n/ /g' -e 's/^[[:space:]]*//') ;;
    esac
    case "$args" in
      off | "off "* | "off."*)
        rm -f "$flag"
        emit UserPromptSubmit "$mode is now off for $project. Stop applying it."
        ;;
      *)
        mkdir -p "$state" && printf '%s\n' "$project" >"$flag"
        emit UserPromptSubmit "$mode is now on for $project and stays on in later sessions until the user turns it off. If the user asks to turn it off, run: sh '$root/hooks/mode.sh' off"
        ;;
    esac
    ;;
  *)
    echo "usage: mode.sh on|off|status|session-start|prompt" >&2
    exit 2
    ;;
esac
