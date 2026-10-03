# Claude Code host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Claude Code.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Agent` tool. The bundled personas register as plugin subagents named `<plugin>:poteto-agent` and `<plugin>:comment-sicko`; pass that name as the subagent type. Use `run_in_background` for parallel lanes and `SendMessage` to resume a child when those are listed. |
| **Ask** | `AskUserQuestion`. |
| **Plan** | The task tools (`TaskCreate`, `TaskUpdate`), or `TodoWrite` where the task tools are absent. Use `EnterPlanMode` only when the user asked for plan mode. |
| **Invoke a skill** | The `Skill` tool with `<plugin>:<skill>`. Users type `/<plugin>:<skill>`. The `Skill` tool refuses a skill that sets `disable-model-invocation`, such as a user's explicit-only skill. Read that skill's `SKILL.md` instead. |
| **History** | No portable history tool. Use a transcript or digest the user supplies. |
| **Continue later** | A scheduling tool such as `ScheduleWakeup` or `CronCreate` when the tool list includes one. Otherwise report the gap. |

Skill directories. `<project-skills>` is `.claude/skills` in the project. `<user-skills>` is `~/.claude/skills`.

Plugin root. A loaded skill reports its base directory. The plugin root is two levels above a skill's `SKILL.md`.
