# Cursor host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Cursor.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Task` tool. The bundled personas register as plugin subagents; pass `cstack-agent` or `comment-sicko` as `subagent_type`. Use `generalPurpose` for an unconfigured role. |
| **Ask** | `AskQuestion`. |
| **Plan** | The native todo list. |
| **Invoke a skill** | Cursor selects a skill by its description. Users type `/<skill>`. A skill that sets `disable-model-invocation` stays out of automatic selection. Read its `SKILL.md` when a workflow names it. |
| **History** | Conversation history tools when the session exposes them. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A Cursor automation the user authorized. Otherwise report the gap. |
| **Generate an image** | An image tool when this session's tool list has one. Otherwise an `image` line naming a CLI runner, such as `codex exec`, provides it. |

Skill directories. `<project-skills>` is `.cursor/skills` in the project. `<user-skills>` is `~/.cursor/skills`.

Instructions file. Cursor reads `AGENTS.md` at the project root at session start.

User instructions file. None. Cursor keeps user rules in its settings, so give the person the rule text to paste there.

Model roles. A `native` role passes its model to the `Task` tool's model field when the schema has one, with options in brackets, as in `claude-opus-5[effort=high,fast=true]`. Otherwise use a subagent file in `.cursor/agents/` whose `model` field has the same form.

Plugin root. Two levels above a loaded skill's `SKILL.md`, per the runtime contract.

Persistent mode. The plugin ships no Cursor hooks, so `cstack-mode` lasts for the current chat. Re-invoke it in a new chat.

Attribution. Cursor adds a "Made with Cursor" trailer to agent commits and a footer to agent PRs. In the IDE, turn off Commit Attribution and PR Attribution in Cursor Settings. For the CLI, set `"attribution": { "attributeCommitsToAgent": false, "attributePRsToAgent": false }` in `~/.cursor/cli-config.json`. Cloud agents sign their commits as Cursor Agent, which no setting changes. Apply the **Authorship** rule in `playbooks/opening-a-pr.md` on every surface.
