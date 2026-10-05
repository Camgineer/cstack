# Claude Code host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Claude Code.

| Capability | Native route |
| --- | --- |
| **Delegate** | The `Agent` tool. The bundled personas register as plugin subagents named `<plugin>:cstack-agent` and `<plugin>:comment-sicko`; pass that name as the subagent type. Use `run_in_background` for parallel lanes and `SendMessage` to resume a child when those are listed. A subagent has no `Agent` tool, so only the top-level session can delegate. |
| **Ask** | `AskUserQuestion`. |
| **Plan** | The task tools (`TaskCreate`, `TaskUpdate`), or `TodoWrite` where the task tools are absent. Use `EnterPlanMode` only when the user asked for plan mode. |
| **Invoke a skill** | The `Skill` tool with `<plugin>:<skill>`. Users type `/<plugin>:<skill>`. The `Skill` tool refuses a skill that sets `disable-model-invocation`, such as a user's explicit-only skill. Read that skill's `SKILL.md` instead. |
| **History** | In a cloud or remote session whose tool list includes the remote-session MCP tools, find a session with `list_sessions`, or `list_thread_sessions` in a project thread, and read it with `list_events`. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | A scheduling tool such as `ScheduleWakeup` or `CronCreate` when the tool list includes one. Otherwise report the gap. |
| **Generate an image** | None. An `image` line naming a CLI runner, such as `codex exec`, provides it. |

GitHub API. In a Claude Code cloud session, every `gh` command that uses GraphQL returns HTTP 403. That includes `gh pr view`, `gh pr list`, `gh pr ready`, `gh pr merge`, and `gh api graphql`, so `scripts/watch-pr/watch-pr` fails too. Read PR state through REST with `gh api repos/<owner>/<repo>/pulls/<number>` and its `/reviews` and `/comments` routes. Read checks from both `commits/<sha>/check-runs` and `commits/<sha>/status`. For review threads, ready, draft, and auto-merge, use the routes the 403 message names, or a GitHub MCP tool when one is listed. Poll with the **Continue later** capability instead of the watcher.

Skill directories. `<project-skills>` is `.claude/skills` in the project. `<user-skills>` is `~/.claude/skills`.

Instructions file. Claude Code reads `CLAUDE.md` at the project root at session start, not `AGENTS.md`. A `CLAUDE.md` line `@AGENTS.md` imports `AGENTS.md`, so one file can serve every host.

User instructions file. `~/.claude/CLAUDE.md`, which Claude Code loads in every project.

Model roles. A `native` role passes its model to the `Agent` tool's `model` field, which takes only the aliases its schema lists, such as `opus`. That tool has no effort or speed field. A full model ID or an effort therefore needs a subagent definition whose frontmatter sets `model` and `effort`, which Claude Code loads only at session start, or the `claude -p` runner, which takes `--model` and `--effort`. Neither carries `fast`. Report each setting that was not applied.

Plugin root. A loaded skill reports its base directory. The plugin root is two levels above a skill's `SKILL.md`.

Plugin files. Under default permissions, Claude Code asks before it reads a file outside the project, and a non-interactive run refuses the read. The plugin's PreToolUse hook allows the file-read tool on any file that resolves inside the plugin root, so skills read their references and principles without a prompt. The user's deny rules still win. A refused read of a plugin file means the hooks did not load, so report that instead of working from memory.

Pull requests. Cloud sessions block GitHub GraphQL, so `gh pr ready`, `gh pr merge --auto`, `gh pr merge --disable-auto`, `gh pr ready --undo`, and `gh pr view --json` fail with HTTP 403. Use the GitHub MCP tools where listed, such as `update_pull_request` with `draft` and `enable_pr_auto_merge`, or `gh api` REST with the proxy's `repos/<owner>/<repo>/pulls/<number>/ccr/` routes: `PUT` or `DELETE` on `auto_merge`, `POST` on `ready_for_review` or `convert_to_draft`.

Persistent mode. Claude Code runs the plugin's `hooks/hooks.json`. Typing the `cstack-mode` command turns the mode on for the project, and the SessionStart hook restores it at startup, resume, `/clear`, and compaction. When the environment variable `CSTACK_MODE` is `on`, the SessionStart hook turns the mode on in every project the user has not turned off, with no typed command. The host must start with the variable in its environment, such as from a shell profile or a cloud environment's settings.

Attribution. Claude Code adds a model co-author trailer to commits, a "Generated with Claude Code" line to PR bodies, and a session link to cloud and Remote Control commits. The `attribution` settings key turns all three off. In `~/.claude/settings.json` or a project's `.claude/settings.json`, set `"attribution": { "commit": "", "pr": "", "sessionUrl": false }`. Version 2.1.281 and later also accept `"attribution": false`, but earlier versions skip the whole settings file that holds it. A cloud session's PR tool can still append a footer and a session link with the setting off, as observed in a cloud session, so read back each posted body per **Authorship** in `playbooks/opening-a-pr.md`. Cloud sessions can also start with a git identity that names Claude, so check it there too.

Privileged steps. Auto mode's safety check, and the permission mode of a connected device, refuse a whole compound command when any part weakens access control or handles a secret. Run each step that weakens access control or handles a secret as its own command, apart from routine edits and from each other, so a refusal blocks only that step.

Cloud sessions. A cloud session assigns its working branch, so push the session's work to that branch. A separate PR can use a new branch of its own. The cloud proxy can drop a remote branch delete without an error, so confirm a delete with `git ls-remote --heads origin <branch>` and report any branch you could not remove.

Headless runs. For a trigger eval, run each request in a project copy with `claude -p --plugin-dir <plugin-root> --output-format stream-json --verbose "<request>"`. A run triggered the skill when its stream has a `Skill` tool call naming `<plugin>:<skill>`. A tight `--max-turns` ends the run while the agent is still looking around, before it chooses a skill. A run that shells out to a CLI runner needs that command pre-approved, or a skip-permissions flag inside a sandbox. Pass `--add-dir <plugin-root>` so the agent reads the variant instead of searching the disk for another copy, and turn off other installed plugins with `--settings '{"enabledPlugins":{"<name>@<marketplace>":false}}'`, per the [CLI reference](https://code.claude.com/docs/en/cli-reference) and the [settings reference](https://code.claude.com/docs/en/settings-reference#enabledplugins). `--allowedTools` pre-approves tools but does not confine reads. To confine them, add `--restricted` (version 2.1.248 and later), which keeps the file tools inside the working directories and drops the tools that run commands or code, and WebFetch, unless `--tools` names each one individually. It also refuses the skip-permissions mode and reads only managed settings and `--settings`, so under it name a runner's command tool in `--tools` and pre-approve the command with `--allowedTools` or `--settings`. As observed in version 2.1.289, the stream's `system/init` event lists each loaded plugin, and the variant shows as `source: "<plugin>@inline"` with its path, replacing an installed plugin of the same name. Before scoring any run, read `permission_denials` in the stream's `result` event, because a refused tool call changes the run's path without failing it, and a refused runner falls back to the host model.
