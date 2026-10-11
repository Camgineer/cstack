#!/bin/sh
# Keeps the plugin's <plugin>-mode skill on for a project across sessions, /clear, and compaction.
# Hosts call this from hooks/hooks.json or hooks/cursor.json; the agent runs `mode.sh off` when the user opts out in plain words.
set -eu

root=$(cd -- "$(dirname -- "$0")/.." && pwd)
name=$(sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$root/tools/metadata.json" 2>/dev/null | head -n 1)
mode="${name:-plugin}-mode"
case "${HOME:-}" in /*) ;; *) echo "HOME must be an absolute path." >&2; exit 2 ;; esac
case "${XDG_STATE_HOME:-}" in
  /*) state_home=$XDG_STATE_HOME ;;
  *) state_home=$HOME/.local/state ;;
esac
state="$state_home/${name:-plugin}/$mode"
env_switch=$(printf '%s' "$mode" | tr '[:lower:]-' '[:upper:]_')

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

# Cursor's sessionStart reads a flat additional_context field, and its beforeSubmitPrompt can only let the prompt continue.
# Claude Code and Codex read hookSpecificOutput.additionalContext.
emit() {
  case "$1:$2" in
    cursor:SessionStart) printf '{"additional_context":%s}\n' "$(json_string "$3")" ;;
    cursor:*) printf '{"continue":true}\n' ;;
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
    cwd=$(json_field "$input" cwd)
    for directory in "${CURSOR_PROJECT_DIR:-}" "${CLAUDE_PROJECT_DIR:-}"; do
      case "$directory" in /*) cwd=$directory ;; esac
    done
    case "$cwd" in /*) ;; *) cwd=$(pwd) ;; esac
    project=$(project_of "$cwd")
    flag=$(flag_for "$project")
    host=${2:-}
    if [ "$command" = session-start ]; then
      if mode_is_on "$flag"; then emit "$host" SessionStart "$(reminder "$project")"; fi
      exit 0
    fi
    # Only an explicit command toggles the mode: /<plugin>:<plugin>-mode, $<plugin>:<plugin>-mode, or /<plugin>-mode.
    rest=$(json_field "$input" prompt | sed -E -n "s/^[[:space:]]*[/\$]([A-Za-z0-9_.-]*:)?$mode(([[:space:]]|\\\\n).*)?\$/x\\2/p")
    case "$rest" in
      "")
        if [ "$host" = cursor ]; then emit cursor UserPromptSubmit ""; fi
        exit 0
        ;;
      x) args= ;;
      *) args=$(printf '%s' "${rest#x}" | sed -e 's/\\n/ /g' -e 's/^[[:space:]]*//') ;;
    esac
    case "$args" in
      off | "off "* | "off."*)
        choose "$flag" off "$project"
        emit "$host" UserPromptSubmit "$mode is now off for $project and stays off in later sessions until the user turns it on. Stop applying it."
        ;;
      *)
        choose "$flag" on "$project"
        emit "$host" UserPromptSubmit "$mode is now on for $project and stays on in later sessions until the user turns it off. If the user asks to turn it off, run: sh '$root/hooks/mode.sh' off"
        ;;
    esac
    ;;
  *)
    echo "usage: mode.sh on|off|status|session-start [cursor]|prompt [cursor]" >&2
    exit 2
    ;;
esac
