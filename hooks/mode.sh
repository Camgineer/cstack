#!/bin/sh
# Keeps the plugin's <plugin>-mode skill on for a project across sessions, /clear, and compaction.
# Hosts call this from hooks/hooks.json or hooks/cursor.json; the agent runs `mode.sh off` when the user opts out in plain words.
set -eu

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
name=$(sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$root/tools/metadata.json" 2>/dev/null | head -n 1)
mode="${name:-plugin}-mode"
state="${XDG_STATE_HOME:-$HOME/.local/state}/${name:-plugin}/$mode"
env_switch=$(printf '%s' "$mode" | tr '[:lower:]-' '[:upper:]_')

json_string() {
  printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | awk 'NR > 1 { printf "\\n" } { printf "%s", $0 }')"
}

json_field() {
  printf '%s' "$1" | tr '\n' ' ' | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\\(\\([^\"\\\\]\\|\\\\.\\)*\\)\".*/\\1/p"
}

project_of() {
  git -C "$1" rev-parse --show-toplevel 2>/dev/null || printf '%s\n' "$1"
}

flag_for() {
  printf '%s/%s\n' "$state" "$(printf '%s' "$1" | cksum | cut -d ' ' -f 1)"
}

# A project is on or off once the user says so. Until then the environment switch decides.
# Flags written before `off` was recorded hold only the project path, and read as on.
choice_of() {
  if [ ! -f "$1" ]; then echo none
  elif [ "$(head -n 1 "$1")" = off ]; then echo off
  else echo on
  fi
}

choose() {
  mkdir -p "$state" && printf '%s\n%s\n' "$2" "$3" >"$1"
}

on_by_env_switch() {
  [ "$(printenv "$env_switch")" = on ]
}

mode_is_on() {
  case $(choice_of "$1") in
    on) true ;;
    off) false ;;
    none) on_by_env_switch ;;
  esac
}

env_switch_note() {
  if on_by_env_switch; then printf ' %s=on in the environment turns it on in every project the user has not turned off. Unsetting it turns that off.' "$env_switch"; fi
}

# Cursor's sessionStart hook reads a flat additional_context field. Claude Code and Codex read hookSpecificOutput.additionalContext.
emit() {
  case "$1" in
    cursor) printf '{"additional_context":%s}\n' "$(json_string "$3")" ;;
    *) printf '{"hookSpecificOutput":{"hookEventName":%s,"additionalContext":%s}}\n' "$(json_string "$2")" "$(json_string "$3")" ;;
  esac
}

# Hosts load a named skill without a file-read permission prompt, so name it first and keep the path as the fallback.
reminder() {
  printf '%s is on for %s. Invoke the %s skill now and apply it to every task in this session. If you cannot invoke a skill by name, read %s in full instead. It stays on until the user turns it off. If the user asks to turn it off, run: sh %s off.%s\n' \
    "$mode" "$1" "${name:-plugin}:$mode" "$root/skills/$mode/SKILL.md" "'$root/hooks/mode.sh'" "$(env_switch_note)"
}

command=${1:-}
case "$command" in
  on | off | status)
    project=$(project_of "$(pwd)")
    flag=$(flag_for "$project")
    case "$command" in
      on | off) choose "$flag" "$command" "$project" && echo "$mode is $command for $project.$(env_switch_note)" ;;
      status) if mode_is_on "$flag"; then echo "$mode is on for $project.$(env_switch_note)"; else echo "$mode is off for $project.$(env_switch_note)"; fi ;;
    esac
    ;;
  session-start | prompt)
    input=$(cat)
    cwd=${CLAUDE_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$(json_field "$input" cwd)}}
    project=$(project_of "${cwd:-$(pwd)}")
    flag=$(flag_for "$project")
    if [ "$command" = session-start ]; then
      if mode_is_on "$flag"; then emit "${2:-}" SessionStart "$(reminder "$project")"; fi
      exit 0
    fi
    # Only an explicit command toggles the mode: /<plugin>:<plugin>-mode, $<plugin>:<plugin>-mode, or /<plugin>-mode.
    rest=$(json_field "$input" prompt | sed -n "s/^[[:space:]]*[/\$]\\([A-Za-z0-9_.-]*:\\)\\{0,1\\}$mode\\(\\([[:space:]]\\|\\\\n\\).*\\)\\{0,1\\}\$/x\\2/p")
    case "$rest" in
      "") exit 0 ;;
      x) args= ;;
      *) args=$(printf '%s' "${rest#x}" | sed -e 's/\\n/ /g' -e 's/^[[:space:]]*//') ;;
    esac
    case "$args" in
      off | "off "* | "off."*)
        choose "$flag" off "$project"
        emit "" UserPromptSubmit "$mode is now off for $project and stays off in later sessions until the user turns it on. Stop applying it."
        ;;
      *)
        choose "$flag" on "$project"
        emit "" UserPromptSubmit "$mode is now on for $project and stays on in later sessions until the user turns it off. If the user asks to turn it off, run: sh '$root/hooks/mode.sh' off"
        ;;
    esac
    ;;
  *)
    echo "usage: mode.sh on|off|status|session-start [cursor]|prompt" >&2
    exit 2
    ;;
esac
