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

Persistent mode. Cursor runs the plugin's `hooks/cursor.json`. Its sessionStart hook turns the mode on at the start of a chat when the mode is on for the project on this machine, or when the environment variable `CSTACK_MODE` is `on` and the user has not turned the project off. The host must start with the variable in its environment, such as from a shell profile or a cloud environment's settings. Its beforeSubmitPrompt hook records a typed `/cstack-mode` or `/cstack-mode off` for the project, so the choice holds in later chats. No Cursor hook adds context after compaction, so a mode started this way can lapse when a long chat compacts. A [Custom Mode](https://cursor.com/docs/agent/prompting#custom-modes) needs no hook. The user picks `cstack-mode` from the `/` menu with Option+Enter on Mac or Alt+Enter on Windows, or chooses **Use as Mode** on the skill, and Cursor keeps the skill in context on every turn until they exit the mode. Cursor offers Custom Modes in the Agents Window and the CLI. When the user says the mode lapsed in a long chat on those surfaces, tell them to restart it as a Custom Mode. Cursor cloud agents run no sessionStart hook, so neither the variable nor a recorded choice turns the mode on there.

Attribution. Cursor adds a "Made with Cursor" trailer to agent commits and a footer to agent PRs. In the IDE, turn off Commit Attribution and PR Attribution in Cursor Settings. For the CLI, set `"attribution": { "attributeCommitsToAgent": false, "attributePRsToAgent": false }` in `~/.cursor/cli-config.json`. Cloud agents sign their commits as Cursor Agent, which no setting changes. Apply the **Authorship** rule in `playbooks/opening-a-pr.md` on every surface.

Headless runs. Install the CLI with `curl -fsS https://cursor.com/install | bash`, per [the installation docs](https://cursor.com/docs/cli/installation). Read from the install script at release 2026.10.01-e373342, it unpacks each release under `~/.local/share/cursor-agent/versions/<version>/`, where the CLI's bundled source can be searched. `cursor-agent` runs no hook until it is signed in, by login or with an API key through `--api-key` or `CURSOR_API_KEY`, so a session without the operator's credential cannot prove a Cursor hook. Load the plugin with `--plugin-dir <plugin-root>`, so the run uses the plugin's own hook file, and pass `--trust` and a model the account's plan allows. As observed at that release, `--plugin-dir` loads the plugin beside an installed copy of the same plugin instead of replacing it, and the installed copy still serves skills and reads, so attribute each load in a run to the candidate's path. On macOS, as observed at that release, the hook shells read `~/.zshenv`, so a variable stripped from the CLI's environment can still reach the hooks, and a separate `HOME` signs the CLI out. To keep a variable out, keep the real `HOME`, point `ZDOTDIR` at an empty directory, and strip the variable. Run a chat that needs no tools with `--mode ask`, which [the CLI overview](https://cursor.com/docs/cli/overview) lists as read-only. As observed, such a chat runs no commands and needs no approval. To pre-approve one command, add a `Shell(<command>:<args glob>)` rule, such as `Shell(sh:*<script path>*)`, to `permissions.allow` in the project's `.cursor/cli.json`, per [the permissions docs](https://cursor.com/docs/cli/reference/permissions). Read from [the CLI source](https://downloads.cursor.com/lab/2026.10.01-e373342/darwin/arm64/agent-cli-package.tar.gz) at that release, the rule matches the command's literal text. So, as observed on macOS, a rule for a script under a temp path names both that path and its real path, such as `/var/...` and `/private/var/...`. [The hooks docs](https://cursor.com/docs/agent/hooks) list each event's input and output.
