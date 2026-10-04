# Codex host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Codex.

| Capability | Native route |
| --- | --- |
| **Delegate** | Codex's native subagent tools. Their names and fields differ between the local CLI, the desktop app, and cloud tasks, so read the schemas in this session. Codex does not register plugin agents, so pass the complete persona file from `agents/` as the child's instructions. |
| **Ask** | The user-question tool when the session exposes one. Otherwise ask in the reply and continue on reversible work. |
| **Plan** | The native plan tool. |
| **Invoke a skill** | `$<plugin>:<skill>`. Skills marked explicit-only in `agents/openai.yaml` stay out of the default selector, but their files remain readable. |
| **History** | Thread and history tools when the session exposes them. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A native automation or scheduled task the user authorized. Otherwise report the gap. |

Skill directories. `<project-skills>` is `.agents/skills` in the project. `<user-skills>` is `~/.agents/skills`.

Instructions file. Codex reads `AGENTS.md` at the project root at session start.

Plugin root. Two levels above a loaded skill's `SKILL.md`, per the runtime contract.

Invocation policy. Codex reads explicit-only policy from `agents/openai.yaml` beside a skill's `SKILL.md`, not from frontmatter. A project skill that sets `disable-model-invocation: true` also needs that file with `policy.allow_implicit_invocation: false`. The plugin generates its own copies from frontmatter, so edit the frontmatter in the plugin source and regenerate.

Persistent mode. Codex runs the plugin's `hooks/hooks.json` once the user reviews and trusts the hooks. Until then, the mode lasts for the current session only. Typing the `cstack-mode` command turns the mode on for the project, and the SessionStart hook restores it at startup, resume, `/clear`, and compaction.

Attribution. The current Codex configuration reference has no commit or PR attribution key, so the **Authorship** rule in `playbooks/opening-a-pr.md` is the whole control.
