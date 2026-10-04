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

Model roles. A `native` role passes its model to the `Agent` tool's `model` field, which takes only the aliases its schema lists, such as `opus`. That tool has no effort or speed field. A full model ID or an effort therefore needs a subagent definition whose frontmatter sets `model` and `effort`, which Claude Code loads only at session start, or the `claude -p` runner, which takes `--model` and `--effort`. Neither carries `fast`. Report each setting that was not applied.

Plugin root. A loaded skill reports its base directory. The plugin root is two levels above a skill's `SKILL.md`.

Plugin files. Under default permissions, Claude Code asks before it reads a file outside the project, and a non-interactive run refuses the read. The plugin's PreToolUse hook allows the file-read tool on any file that resolves inside the plugin root, so skills read their references and principles without a prompt. The user's deny rules still win. A refused read of a plugin file means the hooks did not load, so report that instead of working from memory.

Pull requests. Cloud sessions block GitHub GraphQL, so `gh pr ready`, `gh pr merge --auto`, `gh pr merge --disable-auto`, `gh pr ready --undo`, and `gh pr view --json` fail with HTTP 403. Use the GitHub MCP tools where listed, such as `update_pull_request` with `draft` and `enable_pr_auto_merge`, or `gh api` REST with the proxy's `repos/<owner>/<repo>/pulls/<number>/ccr/` routes: `PUT` or `DELETE` on `auto_merge`, `POST` on `ready_for_review` or `convert_to_draft`.

Persistent mode. Claude Code runs the plugin's `hooks/hooks.json`. Typing the `cstack-mode` command turns the mode on for the project, and the SessionStart hook restores it at startup, resume, `/clear`, and compaction.

Attribution. Claude Code adds a model co-author trailer to commits, a "Generated with Claude Code" line to PR bodies, and a session link to cloud and Remote Control commits. The `attribution` settings key turns all three off. In `~/.claude/settings.json` or a project's `.claude/settings.json`, set `"attribution": { "commit": "", "pr": "", "sessionUrl": false }`. Version 2.1.281 and later also accept `"attribution": false`, but earlier versions skip the whole settings file that holds it. Cloud sessions can start with a git identity that names Claude, so check it per **Authorship** in `playbooks/opening-a-pr.md`.

Cloud sessions. A cloud session assigns its working branch, so push the session's work to that branch. A separate PR can use a new branch of its own. The cloud proxy can drop a remote branch delete without an error, so confirm a delete with `git ls-remote --heads origin <branch>` and report any branch you could not remove.

Headless runs. For a trigger eval, run each request in a project copy with `claude -p --plugin-dir <plugin-root> --output-format stream-json --verbose "<request>"`. A run triggered the skill when its stream has a `Skill` tool call naming `<plugin>:<skill>`. A tight `--max-turns` ends the run while the agent is still looking around, before it chooses a skill.
