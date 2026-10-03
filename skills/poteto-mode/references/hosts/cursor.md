# Cursor host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Cursor.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Task` tool. The bundled personas register as plugin subagents; pass `poteto-agent` or `comment-sicko` as `subagent_type`. Use `generalPurpose` for an unconfigured role. |
| **Ask** | `AskQuestion`. |
| **Plan** | The native todo list. |
| **Invoke a skill** | Cursor selects a skill by its description. Users type `/<skill>`. A skill that sets `disable-model-invocation` stays out of automatic selection. Read its `SKILL.md` when a workflow names it. |
| **History** | Conversation history tools when the session exposes them. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A Cursor automation the user authorized. Otherwise report the gap. |

Skill directories. `<project-skills>` is `.cursor/skills` in the project. `<user-skills>` is `~/.cursor/skills`.

Plugin root. Two levels above a loaded skill's `SKILL.md`, per the runtime contract.
