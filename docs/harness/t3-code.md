# pstack in T3 Code

pstack skills use Cursor names. In T3 Code, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

T3 Code runs across multiple providers (Claude, Codex, Antigravity, and others) and adds its own MCP tools (`delegate_task`, `orchestrator_capabilities`, `schedule_task`, `watch_pull_request`, `preview_*`, `device_*`, `request_secret`, and thread tools). Map each Cursor name to the T3 Code tool or provider-native tool below.

## Tools

| Cursor | T3 Code |
| --- | --- |
| `Task` | Use the provider's native subagent tool (`Agent` on Claude, `spawn_agent` on Codex, `invoke_subagent` on Antigravity) when the child uses the same provider, a model that provider offers, the same checkout, and no extra settings. Use `delegate_task` whenever the child needs another provider's model, explicit model options, a separate checkout (`isolation: "worktree"`), or background execution. Call `orchestrator_capabilities` once per thread before the first `delegate_task`. |
| `AskQuestion` | Use the provider's native question tool (`AskUserQuestion` on Claude, `ask_question` on Antigravity) when the session offers it. Otherwise ask in plain text. |
| Open a todolist, or copy steps into the todolist tool | Use the provider's native todolist tool (`TodoWrite` on Claude) if the session offers it. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` directly and follow it. Do not rely on slash-command dispatch for skills that set `disable-model-invocation: true` or live outside the provider's skill catalog. |
| `Grep`, `Glob` | Use the provider's file-search tools if available, or shell `rg`, `grep`, and `find`. |
| `SendToUser` secret requests | `request_secret`, one secret per card. Use `delivery: "secretRef"` for T3 tools such as webhook signatures, and `delivery: "file"` for shell commands such as `sudo`. |
| Inline charts, diagrams, or HTML mockups | `html_preview`, then `html_render`. Never use `preview_*` to display generated results. |

## Subagent fields

When `Task` maps to `delegate_task`, map its fields with the table below. Follow a running delegate's `next` instruction. Do not poll with `task_status`, `sleep`, or watchers. Read the final result with `task_status` after completion wakes you. Stop an unneeded delegate with `task_cancel`, never `t3_thread_interrupt`.

| Cursor | T3 Code |
| --- | --- |
| `subagent_type: generalPurpose` | `delegate_task` with `role: "general"`, or a more specific role (`"implementation"`, `"research"`, `"review"`, `"design"`, `"test"`). For a same-provider child in the shared checkout, use the provider's default general subagent. |
| `poteto-agent` | T3 Code does not load `agents/poteto-agent.md` automatically across providers. Put `Read <pstack>/skills/poteto-mode/worker.md before anything else.` as line 1 of `task`, then instruct the child to read `<pstack>/skills/poteto-mode/SKILL.md` in full, including its inline Principles index, before doing any work. Never pass the Cursor `model:` slug from `agents/poteto-agent.md`. |
| `comment-sicko` | `delegate_task` with `role: "review"`. Instruct the child in `task` to read `<pstack>/agents/comment-sicko.md` and follow it verbatim on the given scope. |
| `readonly: true` | `delegate_task` with `role: "research"` or `role: "review"`, or a read-only native subagent (`Explore` on Claude, `research` on Antigravity). State "do not edit files" in `task`, and check `git status` afterward. Do not set a narrower `runtimeMode` as a read-only substitute, because narrow runtime modes pause for human approval instead of blocking writes. |
| `readonly: false` | `delegate_task` with `runtimeMode` omitted so the child inherits your access level. |
| `environment: "cloud"` | `delegate_task` with `isolation: "worktree"`. T3 Code creates a prepared worktree from the parent commit, excluding uncommitted edits. Never create a child's worktree in the shell or inside `task`. |
| `environment: "local"` | `delegate_task` with `isolation: "shared"` (the default), or a native subagent in the shared checkout. |
| `cloud_base_branch: <b>` | `delegate_task` with `isolation: "worktree"` always branches from the parent commit. Tell the child in `task` to check out `<b>` inside its worktree first. Use `t3_thread_launch` with `workspaceStrategy: { type: "worktree", baseRef: "<b>", startFromOrigin: true }` only when the user explicitly asks for a new top-level thread. |
| `run_in_background: true` | `delegate_task` with `mode: "async"` (the default). Use `mode: "wait"` only when the current turn needs the result immediately (up to 45 seconds). |
| `resume` | Start a new `delegate_task` with the original brief, prior findings, and objections. Never use `t3_thread_send` for a new delegate review or re-check. |
| `file_attachments` | List the absolute file paths in `task`. |
| `model` | Map to `target: { providerInstanceId, model, options }` with the Models table below. |

## Models

Call `orchestrator_capabilities` once per thread before the first `delegate_task` to read the enabled `providerInstanceId` values, model `id` values, and option names. Option names differ by provider: `claudeAgent` uses `effort` (plus `fastMode`), `antigravity` uses `thought_level`, and `codex` uses `reasoningEffort`.

| Cursor | T3 Code |
| --- | --- |
| `claude-opus-5-5-<effort>-fast`, such as `claude-opus-5-5-xhigh-fast` | `target: { providerInstanceId: "claudeAgent", model: "claude-opus-5-5", options: { effort: "<effort>", fastMode: true } }`. Drop `-fast` from the model id. Omit `fastMode` if `orchestrator_capabilities` does not list it on that model. |
| `claude-fable-5-2-<effort>`, such as `claude-fable-5-2-high` | `target: { providerInstanceId: "claudeAgent", model: "claude-fable-5-2", options: { effort: "<effort>" } }`. |
| `claude-sonnet-*`, `claude-haiku-*` | `providerInstanceId: "claudeAgent"`, the base model id without the effort suffix, and `options: { effort: "<effort>" }`. |
| `gemini-4-neon-<effort>`, such as `gemini-4-neon-xhigh` | `target: { providerInstanceId: "antigravity", model: "gemini-4-neon", options: { thought_level: "<effort>" } }`. |
| Other providers, such as Codex `gpt-*` | Use the `providerInstanceId`, model `id`, and reasoning option name reported by `orchestrator_capabilities` (for example `providerInstanceId: "codex"` with `options: { reasoningEffort: "<effort>" }`). |
| `auto` or `inherit-parent` | Omit `target`, or run a native subagent on the inherited model. |
| An unavailable provider or model | Say so and stop that seat. Never silently switch to another provider or fall back to a native tool when a specific provider or model was requested. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.t3/pstack-models.md`. T3 Code does not auto-load `.mdc` files across providers, so read `~/.t3/pstack-models.md` at session start if it exists. If the file or a role's line is missing, use the skill's default slug mapped through this table. |
| A role value `<providerInstanceId>/<model> <effort>[ fast]` | `target: { providerInstanceId: "<providerInstanceId>", model: "<model>", options: { <reasoningKey>: "<effort>"[, fastMode: true] } }`, where `<reasoningKey>` is the option name from `orchestrator_capabilities`. |

## setup-pstack

T3 Code does not share one auto-loaded rules directory across every provider, so `setup-pstack` writes its model file to `~/.t3/pstack-models.md`. Follow `skills/setup-pstack/SKILL.md` with these changes:

- **Detect.** Call `orchestrator_capabilities` and collect every model from providers where `canRunChildTask` is `true`. Read each model's reasoning option values (`effort`, `thought_level`, or `reasoningEffort`) and whether `fastMode` is available. Format each real entry as `<providerInstanceId>/<model> <effort>[ fast]` so the effort token stays in the position the budget step expects.
- **Defaults.** Map each default slug through the Models table: `claude-opus-5-5-xhigh-fast` becomes `claudeAgent/claude-opus-5-5 xhigh fast`, `claude-opus-5-5-high-fast` becomes `claudeAgent/claude-opus-5-5 high fast`, `claude-fable-5-2-high` becomes `claudeAgent/claude-fable-5-2 high`, and `gemini-4-neon-xhigh` becomes `antigravity/gemini-4-neon xhigh`. If a default's provider is disabled in `orchestrator_capabilities`, mark that role as needing a choice.
- **Write.** Write `~/.t3/pstack-models.md` with no YAML frontmatter, then the comment lines, `# defaults: 3`, the `# budget` line, and one line per role from step 5 of `setup-pstack`. Overwrite the whole file. Never put the role lines in `AGENTS.md` or `CLAUDE.md`.

## Loops, PR watches, and worktrees

T3 Code provides native tools for recurring runs, PR monitoring, and thread worktrees. Prefer these over shell polling loops or manual worktree commands.

| Cursor | T3 Code |
| --- | --- |
| Built-in PR tool (`draft: false`) | Create the PR with `gh pr create` (or `origin pr create --status open` when Origin resolves the repo), then call `link_pull_request` (or `link_pull_requests` for a stack) with the full URL. That is not a skip, so write no skip line. |
| `scripts/watch-pr/watch-pr`, `gh pr checks --watch`, or polling a PR | Handle existing comments first, push any branch update, then call `watch_pull_request` and end your turn. T3 Code wakes the thread on failed checks, passed required checks, new comments or reviews, or conflicts. Call `unwatch_pull_request` before handing back if you are stopping the watch. Never use `sleep` or shell polling loops for PR waits. |
| Cursor `/loop` (fixed interval, one-shot check, or webhook wake) | `schedule_task` with `bindToCurrentThread: true`. Use `schedule: { type: "interval", everyMs: <ms> }` (minimum `60000`) for a recurring heartbeat, `schedule: { type: "once", runAt: "<ISO>" }` for a one-shot check, or `schedule: { type: "webhook" }` for an external trigger. Remove the schedule with `delete_scheduled_task` when the exit condition is met. |
| Moving the current thread into a git worktree | Check `t3_worktree_status`. If the thread has no worktree yet, call `t3_worktree_handoff` last in the turn with `branch` and `continuationPrompt`. |

## Paths

| Cursor | T3 Code |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `<pstack>/skills/` in this repository, or the active provider's skills directory (such as `.claude/skills/` and `~/.claude/skills/`). |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<pstack>/` and `<pstack>/plugin.json`. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or `CLAUDE.md` on Claude. T3 Code does not read `.mdc` files. The model config file is `~/.t3/pstack-models.md` (see Models). |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists locally. Read the local copy and never fetch it. Give the user the URL when they need a public link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Use `t3_thread_list` and `t3_thread_search` to find threads in this project, and `t3_thread_read` (`view: "messages"` or `view: "activity"`) to inspect them. Stay in the current project (omit `allProjects`) unless the user asks to search across projects. |
| Worktrees in `.cursor/worktrees/<repo>/` | `~/.t3/worktrees/<repo>/`. Read active paths from `t3_worktree_list` or `git worktree list` instead of hardcoding a directory. |

## Cursor-only features

T3 Code has no Cursor Automations (`api2.cursor.sh/automations`, `update_state` routines), Bugbot service, Cursor cloud-agent VMs, Custom Mode toggle, or `cursor-team-kit` plugin. When a step requires a Cursor-only feature with no T3 Code equivalent, put one line in your reply, `Skipped in T3 Code: <step>. <reason>.`, then continue to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | T3 Code |
| --- | --- |
| Cursor Automations: `update_state` routines, `api2.cursor.sh/automations` webhooks, and the Benny automation pack | When the task only needs a recurring check or webhook wake in T3 Code, use `schedule_task` and `request_secret`. Skip steps that specifically require Cursor's `api2.cursor.sh/automations` or Benny with the skip line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with `gh` per `skills/poteto-mode/references/bugbot-triage.md`. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to `delegate_task` with `isolation: "worktree"`. Skip a step that needs the Cursor cloud-agent VM itself, such as its dashboard status or remote machine. |
| `control-ui` from `cursor-team-kit` | For web UIs when browser work was requested, use T3 Code's `preview_*` tools (`preview_status`, `preview_open`, `preview_navigate`, `preview_snapshot`, `preview_act`, `preview_wait_for`, `preview_evaluate`, `preview_resize`, `preview_recording_start`, `preview_recording_stop`, `t3_preview_close`). For iOS Simulators and Android Emulators, use `device_list`, `device_open`, `device_screenshot`, `device_close`, and the `agent-device` CLI that `device_open` returns. |
| `control-cli` from `cursor-team-kit` | Drive the CLI directly in the shell. |
| `/deslop` from `cursor-team-kit` | Run `skills/unslop/SKILL.md` on prose and audit code diffs directly. Skip with the skip line only if a step requires the external plugin itself. |
| Custom Modes (`Option+Enter` or `Alt+Enter`) | T3 Code has no Custom Mode toggle. Re-invoke the mode skill when starting a new task, or reference it in project instructions if you want it active in every thread. |

## T3 Projects seam

cstack stays separate from T3 Projects. None of the mappings above require `t3-projects` tools. When you run a pstack playbook inside a T3 Projects work thread, keep T3 Projects' reporting rules (`projects_report`, `projects_ask`, and `t3_thread_organize`) intact, and do not call `t3_thread_launch` to create top-level threads that belong to the project coordinator.
