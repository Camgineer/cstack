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
| **Generate an image** | The built-in `image_gen` tool, through the `$imagegen` skill. It saves under `~/.codex/generated_images/<session-id>/` and takes no output path, size, or quality, so copy the file into place and resize it. `codex exec` from another host reaches the same tool. |

Skill directories. `<project-skills>` is `.agents/skills` in the project. `<user-skills>` is `~/.agents/skills`.

Instructions file. Codex reads `AGENTS.md` at the project root at session start.

User instructions file. `~/.codex/AGENTS.md`, which Codex loads in every project.

Model roles. A `native` role passes its model and reasoning effort through the subagent tool's fields when this session's schema has them. Otherwise use a custom agent file in `~/.codex/agents/` or `.codex/agents/` that sets `model` and `model_reasoning_effort`.

Plugin root. Two levels above a loaded skill's `SKILL.md`, per the runtime contract.

Invocation policy. Codex reads explicit-only policy from `agents/openai.yaml` beside a skill's `SKILL.md`, not from frontmatter. A project skill that sets `disable-model-invocation: true` also needs that file with `policy.allow_implicit_invocation: false`. The plugin generates its own copies from frontmatter, so edit the frontmatter in the plugin source and regenerate.

Persistent mode. Codex discovers the plugin's `hooks/hooks.json`, but installing or enabling the plugin does not trust its hooks. Codex skips each untrusted hook definition and warns at startup when hooks need review. In the CLI, `/hooks` opens the review and trust flow. Codex requires review again when a hook definition changes. See [Plugin-bundled hooks](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks) and [Review and trust hooks](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks).

When the plugin hooks are untrusted, the typed `$cstack:cstack-mode` command does not record a project choice through `UserPromptSubmit`. `CSTACK_MODE=on` cannot activate the mode through `SessionStart` either. With trusted hooks, `UserPromptSubmit` records the typed choice, and `SessionStart` restores the mode at startup, resume, `/clear`, and compaction. The [Codex hooks reference](https://learn.chatgpt.com/docs/hooks#matcher-patterns) lists those start sources. The host must start with `CSTACK_MODE=on` in its environment for the variable to reach the hook, such as from a shell profile or a cloud environment's settings.

Attribution. The current Codex configuration reference has no commit or PR attribution key, so the **Authorship** rule in `playbooks/opening-a-pr.md` is the whole control.

Headless runs. To prove a hook change, run `codex exec` with stdin closed, because it otherwise waits for more input. Install the plugin into a disposable `CODEX_HOME` with `codex plugin marketplace add <plugin-root>` and `codex plugin add <plugin>@<plugin>`. Codex skips untrusted hooks with only a startup warning, so pass the hook-trust bypass flag that [the hooks docs](https://learn.chatgpt.com/docs/hooks) name, and only in that disposable home.
