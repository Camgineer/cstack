# Cursor host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Cursor.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Task` tool. The bundled personas register as plugin subagents; pass `poteto-agent` or `comment-sicko` as `subagent_type`. Use `generalPurpose` for an unconfigured role. |
| **Ask** | `AskQuestion`. |
| **Plan** | The native todo list. |
| **Invoke a skill** | Users type `/<skill>`. Skills that set `disable-model-invocation` stay out of automatic selection; read their `SKILL.md` from the plugin root when a workflow names them. |
| **History** | Conversation history tools when the session exposes them. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A Cursor automation the user authorized. Otherwise report the gap. |

Skill directories. `<project-skills>` is `.cursor/skills` in the project. `<user-skills>` is `~/.cursor/skills`.

Plugin root. Two levels above a loaded skill's `SKILL.md`, per the runtime contract.
