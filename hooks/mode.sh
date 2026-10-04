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

on_by_env_switch() {
  [ "$(printenv "$env_switch")" = on ]
}

# Cursor's sessionStart hook reads a flat additional_context field. Claude Code and Codex read hookSpecificOutput.additionalContext.
emit() {
  case "$1" in
    sessionStart) printf '{"additional_context":%s}\n' "$(json_string "$2")" ;;
    *) printf '{"hookSpecificOutput":{"hookEventName":%s,"additionalContext":%s}}\n' "$(json_string "$1")" "$(json_string "$2")" ;;
  esac
}

# Hosts load a named skill without a file-read permission prompt, so name it first and keep the path as the fallback.
reminder() {
  printf '%s is on for %s. Invoke the %s skill now and apply it to every task in this session. If you cannot invoke a skill by name, read %s in full instead. ' \
    "$mode" "$1" "${name:-plugin}:$mode" "$root/skills/$mode/SKILL.md"
  if on_by_env_switch; then
    printf 'The %s=on environment variable keeps it on in every project. If the user asks to turn it off, stop applying it for this session and tell them to unset %s to keep it off in new sessions.\n' "$env_switch" "$env_switch"
  else
    printf 'It stays on until the user turns it off. If the user asks to turn it off, run: sh %s off\n' "'$root/hooks/mode.sh'"
  fi
}

env_switch_note() {
  if on_by_env_switch; then printf ' %s=on in the environment turns it back on in new sessions until the user unsets it.' "$env_switch"; fi
}

command=${1:-}
case "$command" in
  on | off | status)
    project=$(project_of "$(pwd)")
    flag=$(flag_for "$project")
    case "$command" in
      on) mkdir -p "$state" && printf '%s\n' "$project" >"$flag" && echo "$mode is on for $project." ;;
      off) rm -f "$flag" && echo "$mode is off for $project.$(env_switch_note)" ;;
      status)
        if on_by_env_switch; then echo "$mode is on for $project because $env_switch=on."
        elif [ -f "$flag" ]; then echo "$mode is on for $project."
        else echo "$mode is off for $project."
        fi
        ;;
    esac
    ;;
  session-start | prompt)
    input=$(cat)
    cwd=${CLAUDE_PROJECT_DIR:-$(json_field "$input" cwd)}
    project=$(project_of "${cwd:-$(pwd)}")
    flag=$(flag_for "$project")
    if [ "$command" = session-start ]; then
      event=$(json_field "$input" hook_event_name)
      if [ -f "$flag" ] || on_by_env_switch; then emit "${event:-SessionStart}" "$(reminder "$project")"; fi
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
        rm -f "$flag"
        emit UserPromptSubmit "$mode is now off for $project. Stop applying it.$(env_switch_note)"
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
