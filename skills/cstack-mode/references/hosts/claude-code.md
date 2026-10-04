# Claude Code host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Claude Code.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Agent` tool. The bundled personas register as plugin subagents named `<plugin>:cstack-agent` and `<plugin>:comment-sicko`; pass that name as the subagent type. Use `run_in_background` for parallel lanes and `SendMessage` to resume a child when those are listed. |
| **Ask** | `AskUserQuestion`. |
| **Plan** | The task tools (`TaskCreate`, `TaskUpdate`), or `TodoWrite` where the task tools are absent. Use `EnterPlanMode` only when the user asked for plan mode. |
| **Invoke a skill** | The `Skill` tool with `<plugin>:<skill>`. Users type `/<plugin>:<skill>`. The `Skill` tool refuses a skill that sets `disable-model-invocation`, such as a user's explicit-only skill. Read that skill's `SKILL.md` instead. |
| **History** | No portable history tool. Use a transcript or digest the user supplies. |
| **Continue later** | A scheduling tool such as `ScheduleWakeup` or `CronCreate` when the tool list includes one. Otherwise report the gap. |

Skill directories. `<project-skills>` is `.claude/skills` in the project. `<user-skills>` is `~/.claude/skills`.

Instructions file. Claude Code reads `CLAUDE.md` at the project root at session start, not `AGENTS.md`. A `CLAUDE.md` line `@AGENTS.md` imports `AGENTS.md`, so one file can serve every host.

Model roles. A `native` role passes its model to the `Agent` tool's `model` field, which takes only the aliases its schema lists, such as `opus`. That tool has no effort or speed field. A full model ID, an effort, or `fast` therefore needs a subagent definition whose frontmatter sets `model` and `effort`, or the `claude -p` runner, which takes `--model` and `--effort`. When neither applies, report the setting that was not applied.

Plugin root. A loaded skill reports its base directory. The plugin root is two levels above a skill's `SKILL.md`.

Plugin files. Under default permissions, Claude Code asks before it reads a file outside the project, and a non-interactive run refuses the read. The plugin's PreToolUse hook allows the file-read tool on any file that resolves inside the plugin root, so skills read their references and principles without a prompt. The user's deny rules still win. A refused read of a plugin file means the hooks did not load, so report that instead of working from memory.

Persistent mode. Claude Code runs the plugin's `hooks/hooks.json`. Typing the `cstack-mode` command turns the mode on for the project, and the SessionStart hook restores it at startup, resume, `/clear`, and compaction.

Attribution. Claude Code adds a model co-author trailer to commits, a "Generated with Claude Code" line to PR bodies, and a session link to cloud and Remote Control commits. The `attribution` settings key turns all three off. In `~/.claude/settings.json` or a project's `.claude/settings.json`, set `"attribution": { "commit": "", "pr": "", "sessionUrl": false }`. Version 2.1.281 and later also accept `"attribution": false`, but earlier versions skip the whole settings file that holds it. Cloud sessions can start with a git identity that names Claude, so check it per **Authorship** in `playbooks/opening-a-pr.md`.
