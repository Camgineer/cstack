# Codex host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Codex.

| Capability | Native route |
| --- | --- |
| **Delegate** | Codex's native subagent tools. Their names and fields differ between the local CLI, the desktop app, and cloud tasks, so read the schemas in this session. Resolve a seated call through **Seat files** below. Unmigrated calls keep their complete persona file in the child's instructions. |
| **Ask** | The user-question tool when the session exposes one. Otherwise ask in the reply and continue on reversible work. |
| **Shared document** | None mapped. See [grill-with-docs](../../../grill-with-docs/SKILL.md). |
| **Plan** | The native plan tool. |
| **Invoke a skill** | `$<plugin>:<skill>`. Skills marked explicit-only in `agents/openai.yaml` stay out of the default selector, but their files remain readable. |
| **History** | Thread and history tools when the session exposes them. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A native automation or scheduled task the user authorized. Otherwise report the gap. |
| **Generate an image** | The built-in `image_gen` tool, through the `$imagegen` skill. It saves under `~/.codex/generated_images/<session-id>/` and takes no output path, size, or quality, so copy the file into place and resize it. `codex exec` from another host reaches the same tool. |

## Seat files

Codex starts a seat through this session's native subagent schema with the seat file as the child's instructions under [Seat delivery](../runtime.md#seat-delivery). This plugin's Markdown seats have no registration in the legacy manifest path, read from [the applying parser at Codex 0.162.1](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core-plugins/src/manifest.rs#L267-L295) and [its resolved paths](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core-plugins/src/manifest.rs#L380-L398). Whole-file delivery here does not indicate missing setup. Local TOML custom agents are a separate route, per the [custom agents docs](https://developers.openai.com/codex/multi-agent#custom-agents).

Skill directories. `<project-skills>` is `.agents/skills` in the project. `<user-skills>` is `~/.agents/skills`.

Instructions file. Codex reads `AGENTS.md` at the project root at session start.

User instructions file. `~/.codex/AGENTS.md`, which Codex loads in every project.

Model roles. A `native` role passes its model and reasoning effort through the subagent tool's fields when this session's schema has them. Otherwise use a custom agent file in `~/.codex/agents/` or `.codex/agents/` that sets `model` and `model_reasoning_effort`.

Plugin root. Three levels above a loaded skill's `SKILL.md`, or two levels above its directory, per the runtime contract.

Invocation policy. Codex reads explicit-only policy from `agents/openai.yaml` beside a skill's `SKILL.md`, not from frontmatter. A project skill that sets `disable-model-invocation: true` also needs that file with `policy.allow_implicit_invocation: false`. The plugin generates its own copies from frontmatter, so edit the frontmatter in the plugin source and regenerate.

Persistent mode. Codex runs the plugin's `hooks/hooks.json` once the user reviews and trusts the hooks. Until then, the mode lasts for the current session only. Typing the `cstack-mode` command turns the mode on for the project, and the SessionStart hook restores it at startup, resume, `/clear`, and compaction. When the environment variable `CSTACK_MODE` is `on`, the SessionStart hook turns the mode on in every project the user has not turned off, with no typed command. The host must start with the variable in its environment, such as from a shell profile or a cloud environment's settings.

Attribution. The current Codex configuration reference has no commit or PR attribution key, so the **Authorship** rule in `playbooks/opening-a-pr.md` is the whole control.

Install and update. Use `npx -y github:<owner>/<repo>` and select Codex, or pass `--hosts codex`. As observed in Codex 0.162.1's command help and JSON lists, `codex plugin marketplace add <owner>/<repo>` accepts a GitHub source without a local checkout. `codex plugin list --json` reports installed copies and their `marketplaceSource`; `codex plugin marketplace list --json` reports configured sources. The command refreshes a Git source with `codex plugin marketplace upgrade <marketplace>`, then runs `codex plugin add <plugin>@<marketplace>`. When a source is local, it announces the move, removes that marketplace registration, adds the GitHub source, and adds the plugin again. Fresh installs and local-source moves require `--source` or npx's Git metadata. Missing source and command failures appear in the final table, while other hosts continue. Start a new session after an update and review hook trust when Codex asks.

Headless runs. To prove a hook change, run `codex exec` with stdin closed, because it otherwise waits for more input. Install the plugin into a disposable `CODEX_HOME` with `codex plugin marketplace add <plugin-root>` and `codex plugin add <plugin>@<plugin>`. Codex skips untrusted hooks with only a startup warning, so pass the hook-trust bypass flag that [the hooks docs](https://learn.chatgpt.com/docs/hooks) name, and only in that disposable home.
