# pstack in Orca

pstack skills use Cursor names. In Orca, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` (or `<cstack>`) means the folder that holds `skills/` and `docs/`. If a Cursor field has no row, drop it and say so. Never pass a field or value a CLI or tool rejects.

Orca runs across Claude Code (`claude`), Codex (`codex`), and Antigravity (`antigravity`) in both coding workspaces (chats, terminals, and worktrees) and native Orca Bots (`~/.orca/bots/<name>/`). Orca Bots are built into Orca, so this single adapter covers both workspace agents and bots.

Use the `orca` CLI (or `${ORCA_CLI_COMMAND:-orca}` when set) for orchestration, worktrees, terminals, automations, workspace references, browser checks, and emulators. Orca ships bundled guides for these surfaces (`orca skills get orca-cli`, `orca skills get orchestration`, `orca skills get orca-linear`, `orca skills get orca-jira`, `orca skills get orca-emulator`, `orca skills get orca-emulator-android`).

## Tools

| Cursor | Orca |
| --- | --- |
| `Task` | Use the harness's native subagent tool (`Agent` on Claude, `spawn_agent` on Codex, `invoke_subagent` on Antigravity) for searches, reads, and research inside the same workspace and harness. Use `orca orchestration worker-start` whenever a child needs another harness or model family (such as cross-model review), its own worktree or branch, or supervised parallel code changes. |
| `AskQuestion` | Use the harness's native question tool (`AskUserQuestion` on Claude, `request_user_input` on Codex, `ask_question` on Antigravity) when available. Otherwise ask in plain text. |
| Open a todolist, or copy steps into the todolist tool | Use the harness's native todolist tool if available. Otherwise keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` directly and follow it. Do not rely on slash-command dispatch for skills that set `disable-model-invocation: true` or live outside the harness's skill catalog. |
| `Grep`, `Glob` | Use the harness's file-search tools if available, or shell `rg`, `grep`, and `find`. |
| Inline charts, diagrams, or HTML mockups | Use the harness's native artifact or preview support, or write a local HTML file and inspect it with Orca's embedded browser (`orca-cli`). |

## Orchestration and worker fields

When `Task` maps to `orca orchestration worker-start`, follow the `orchestration` skill (`orca skills get orchestration`): start independent workers in parallel (up to about 4 at once), then end your turn and let Orca wake you. Never poll with `check` or `sleep` loops. Before you nudge or retry a worker that sent an idle `stopReason=finished` escalation, check `orca orchestration worker-read` and the worker's live child processes. A structured worker can still be running a long background build or test command.

| Cursor | Orca |
| --- | --- |
| `subagent_type: generalPurpose` | `orca orchestration worker-start --spec "<task>" --worktree current --agent <agent>` (or a native subagent when staying in the same harness and checkout). |
| `poteto-agent` | Put `Read <pstack>/skills/poteto-mode/worker.md before anything else.` as line 1 of `--spec`, then instruct the worker to read `<pstack>/docs/harness/orca.md` and `<pstack>/skills/poteto-mode/SKILL.md` (including its inline Principles index) before doing any work. Never pass Cursor model slugs from `agents/poteto-agent.md`. |
| `comment-sicko` | Start a worker with `--spec` instructing it to read `<pstack>/agents/comment-sicko.md` and follow it verbatim on the given scope. |
| `readonly: true` | Use a read-only native subagent (`Explore` on Claude, `research` on Antigravity) when staying in the same harness, or state "do not edit files" in `--spec` and verify `git status` afterward. |
| `readonly: false` | Default worker permissions in the target workspace or worktree. |
| `environment: "cloud"` | `--worktree new-child --name <short-name>` (nested under your workspace) or `--worktree new-top-level --repo id:<repoId> --name <short-name>` (get `repoId` from `orca repo list --json`). Let `worker-start` create the worktree; never hand-roll checkouts. |
| `environment: "local"` | `--worktree current`, or a native subagent in the shared checkout. |
| `cloud_base_branch: <b>` | Pass `--base-branch <b>` to `orca orchestration worker-start` (or `orca worktree create`). |
| Running on another machine | Run `orca host list` or `orca environment list` to find saved paired Orca servers, then pass `--on <server>` to `worker-start` (or `--environment <server>` to other `orca` commands). |
| `run_in_background: true` | `orca orchestration worker-start` runs asynchronously and wakes you on completion; end your turn after launching. |
| `resume` / follow-up to a worker | `orca orchestration send --to dispatch:<dispatch_id> --subject "<topic>" --body "<message>"` (never steer through a worker's terminal). On a paired remote server, start a fresh `worker-start --on <server>` once a worker finishes. |
| Handing work off with nothing expected back | `orca worktree create --name <name> --no-parent --agent <agent> --prompt "<brief>" --json` or `orca agent launch --agent <agent> --prompt "<brief>"`. |
| `file_attachments` | List the absolute file paths in `--spec`. |
| `model` | Map to `--agent <id>` (and optional `--model <id> --effort <level>`) with the Harnesses and models table below. |

## Harnesses and models

Check which agent harnesses are installed on the target machine with `orca agent installed`. On this stack, the three standard harnesses are `claude` (Claude Code), `codex` (Codex), and `antigravity` (Antigravity).

For cross-model reviews and `arena` vendor checks, classify by the underlying model family (Anthropic Claude, OpenAI GPT/Codex, Google Gemini), not the wrapper name. Pick an `--agent` backed by a different model family than the author of the change.

| Cursor | Orca |
| --- | --- |
| `claude-opus-*`, `claude-fable-*`, `claude-sonnet-*`, `claude-haiku-*` | `--agent claude` (add `--model <base-id> --effort <effort>` only when an explicit model or effort is requested; drop `-fast`). |
| `gpt-*`, Codex models | `--agent codex` (add `--model <id> --effort <effort>` when requested). |
| `gemini-*`, Antigravity models | `--agent antigravity` (add `--model <id>` when requested, using an effort-suffixed slug from `agy models` such as `gemini-4-neon-xhigh`, and omit `--effort`; pass `--effort` only with an un-suffixed model ID). |
| `auto` or `inherit-parent` | Omit `--model` and `--effort`, or use a native subagent. |
| An unavailable harness or model | Say so and stop that seat. Never silently switch to another model family when a specific model family was requested. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.config/cstack/pstack-models.md`. Orca does not auto-load `.mdc` files across harnesses, so read `~/.config/cstack/pstack-models.md` at session start if it exists. If the file or a role's line is missing, map the skill's default slug through this table. |
| A role value `<agent>/<model> <effort>`, such as `claude/opus xhigh`, `claude/fable high`, or `codex/gpt-6.2-sol high` | `orca orchestration worker-start --agent <agent> --model <model> --effort <effort>`. Use this form for harnesses with separate model and effort flags. Orca rejects `--effort` without `--model`. |
| A role value `<agent>/<model>`, such as `antigravity/gemini-4-neon-xhigh` | `orca orchestration worker-start --agent <agent> --model <model>`, with no `--effort`. Use this form for harnesses whose model IDs already encode the effort, such as the Antigravity slugs `agy models` lists. |

## setup-pstack

Orca does not share one auto-loaded rules folder across Claude Code, Codex, and Antigravity, so `setup-pstack` writes its model file to `~/.config/cstack/pstack-models.md`. That file is local to each machine and never goes into git. Follow `skills/setup-pstack/SKILL.md` with these changes:

- **Detect.** Run `orca agent installed` to see which harnesses this machine has (`claude`, `codex`, `antigravity`). Then confirm real model IDs for each installed harness. For `antigravity`, run `agy models`, which lists effort-suffixed slugs such as `gemini-4-neon-xhigh`. For `codex`, read the model slugs and supported reasoning levels from `~/.codex/models_cache.json` (or `$CODEX_HOME/models_cache.json`). For `claude`, use verified aliases (`opus`, `fable`, `sonnet`) or exact model IDs that `claude --model` accepts, with `--effort` set to `low`, `medium`, `high`, `xhigh`, or `max`. Never write a model ID you have not confirmed on this host.
- **Format and defaults.** Write each real entry as `<agent>/<model> <effort>` for a harness with a separate effort flag, or `<agent>/<model>` for an effort-suffixed Antigravity slug. Map the `setup-pstack` defaults onto the installed harnesses: `claude/opus xhigh` for the code and judgment roles, `claude/opus high` for `swarm workers`, and panels spread across the installed model families, such as `claude/fable high`, `claude/opus high`, `antigravity/gemini-4-neon-xhigh`, or `codex/<model> high`. If a seat's harness is not installed, mark it as needing a choice or drop it so the panel fits this host.
- **Budget.** Apply the `setup-pstack` ladder (`xhigh` > `high` > `medium` > `low`) with `large` at `xhigh`, `medium` at `high`, and `small` at `medium`. Move the `<effort>` token, or the trailing `-xhigh`, `-high`, `-medium`, or `-low` suffix on an effort-suffixed Antigravity slug.
- **Write.** Write `~/.config/cstack/pstack-models.md` with no YAML frontmatter, then the comment lines, `# defaults: 3`, the `# budget: <label> (<effort>)` line, and one line per role from step 5 of `setup-pstack`. Overwrite the whole file so re-runs stay idempotent. Never put the role lines in `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`, and never commit `~/.config/cstack/pstack-models.md`.

## Pull requests, CI, issues, scheduling, and worktrees

Orca uses standard CLIs for git and GitHub alongside native `orca` commands for workspace links, issue trackers, automations, and worktrees.

| Cursor | Orca |
| --- | --- |
| Built-in PR tool, `gh pr *`, or `origin pr *` | Use `gh pr create --draft` early while work is in progress, `gh pr ready` as soon as verification and cross-model review pass, and `gh pr view`, `gh pr checks`, `gh pr diff`, `gh pr merge`. Link PRs and issues to the workspace with `orca reference add <url>` (`orca reference list`, `orca reference find`). |
| `gh run view` or re-running CI | Use `gh run view --log-failed` and `gh run rerun --failed`. |
| `scripts/watch-pr/watch-pr` or PR waiting | Handle existing comments first, push branch updates, and use `gh pr checks` or an Orca automation when ongoing monitoring is needed. Never run `sleep` polling loops. |
| Issue tracker lookups and updates | Use `gh issue *` for GitHub, `orca linear *` (`orca-linear` skill) for Linear, and `orca jira *` (`orca-jira` skill) for Jira. |
| Cursor `/loop` (recurring check or webhook wake) | Use `orca automations create|list|edit|run|remove` for durable recurring or event-triggered jobs. For one-shot timers inside an active session, use the harness's native timer tool if available. |
| Worktrees and terminals | Use `orca worktree create|list|show|rm` and `orca terminal create|read|wait|send|close` rather than ad-hoc PTYs. |

## Orca Bots

Orca Bots are built into Orca and live in `~/.orca/bots/<name>/`. When running as an Orca Bot:

- **Always-on `cstack-mode`.** Every Orca bot, thread, and workspace runs `cstack-mode` for the whole session, not only when asked.
- **Bot files.** Orca owns and regenerates `AGENTS.md`, `CLAUDE.md`, and `bot.json`; never expect manual edits to those three files to persist. Durable bot identity and operating rules live in `SOUL.md`, and durable facts live in `MEMORY.md` (one dated line per fact, details in `memory/<topic>.md`; remove or replace a line with `orca bot memory forget --fact "<words>"`).
- **Safety rules.** Honor the bot's `## Never` section in `SOUL.md`. Orca seeds new bots with a first-run read-only rule there ("Change anything ... until my owner says I can. I start by reading and reporting only."). Once the bot is onboarded and the owner confirms the `SOUL.md` edit, remove that boilerplate so it does not clash with `cstack-mode` autonomy. Keep only genuine project or owner safety boundaries, such as a repository's merge authority or a privacy boundary.
- **Coordinate, don't solo-code.** A bot plans, delegates, verifies, and synthesizes in the bot chat. It hands engineering work (implementation, verification, cross-model review) to fresh Orca workers in isolated worktrees, each with a clear task and objective: `orca orchestration worker-start --spec "<task>" --worktree new-top-level --repo id:<repoId> --base-branch <ref> --name <short-name> --agent <agent>`, or `--worktree new-child` to nest under the current workspace. It does not edit repositories directly in the bot chat.
- **Worker kickoff packet.** Line 1 of every delegated `--spec` is `Read <cstack>/skills/poteto-mode/worker.md before anything else.` The spec then lists `<cstack>/docs/harness/orca.md`, `<cstack>/skills/poteto-mode/SKILL.md`, and the absolute path of every matching repo-local `.agents/skills/*/SKILL.md` (or `.claude/skills/` and `.codex/skills/` fallbacks).
- **Multi-host compute.** Before fanning out, check paired Orca servers with `orca host list` or `orca environment list`, and machine capabilities in `~/.config/cstack/local.md`. Send platform-specific builds, OS-specific verification, and parallel work to the right host on purpose with `worker-start --on <server>`, using an isolated worktree on each host. Keep concrete machine names out of git; they belong in `~/.config/cstack/local.md` and the bot's local `SOUL.md`.
- **Bot-to-bot coordination.** Discover other bots with `orca bot list`. Delegate with `orca orchestration send --to bot:<name> --type handoff --subject "<task>" --body "<bounds>"`, ask for input with `--type question`, or share updates with `--type status`. Do not message other bots unless the task or owner asks for it.
- **Connectors.** Check sign-in and wake status with `orca bot connectors`. Only offer a connector (`orca bot connectors --offer <service>`) when the work actually needs it.

## Paths

| Cursor | Orca |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `<pstack>/skills/` in this repo, or the active harness's skills directory (`~/.claude/skills/`, `~/.agents/skills/`, `~/.codex/skills/`, `~/.gemini/config/skills/`). |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<pstack>/` and `<pstack>/plugin.json`. |
| `.cursor/rules/*.mdc`, always-applied rules | `~/.claude/CLAUDE.md` (Claude Code), `~/.codex/AGENTS.md` (Codex), `~/.gemini/GEMINI.md` (Antigravity), or repo-local `AGENTS.md` / `CLAUDE.md`. Orca Bots use `SOUL.md`. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists locally. Read the local copy and never fetch it. Give the user the URL when they need a public link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Use `orca search` to search agent sessions on an Orca host, or `orca bot chats` for bot chat history. |
| Worktrees in `.cursor/worktrees/<repo>/` | Read active paths from `orca worktree list` or `git worktree list` instead of hardcoding a directory. |

## Cursor-only features

Orca has no Cursor Automations (`api2.cursor.sh/automations`, `update_state` routines), Bugbot service, Cursor cloud-agent VMs, Custom Mode toggle, or `cursor-team-kit` plugin. When a step requires a Cursor-only feature with no Orca equivalent, put one line in your reply, `Skipped in Orca: <step>. <reason>.`, then continue to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, leave a placeholder and name it in the line.

| Cursor | Orca |
| --- | --- |
| Cursor Automations (`api2.cursor.sh/automations`, Benny) | Use `orca automations` when the task only needs a recurring or event-triggered check. Skip steps that specifically require Cursor's automation API or Benny with the skip line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads; triage them with `gh` per `skills/poteto-mode/references/bugbot-triage.md`. Skip steps that start or configure Bugbot when no Bugbot check exists. |
| Cursor cloud agents | `environment: "cloud"` maps to `orca orchestration worker-start --worktree new-child`. Skip steps that need the Cursor cloud-agent VM dashboard itself. |
| `control-ui` from `cursor-team-kit` | Use Orca's embedded browser (`orca-cli`), or `orca-emulator` / `orca-emulator-android` for mobile devices, or `orca-computer-use` when native app GUI control is required. |
| `control-cli` from `cursor-team-kit` | Drive the CLI directly in the shell or an Orca terminal (`orca terminal *`). |
| `/deslop` from `cursor-team-kit` | Run `skills/unslop/SKILL.md` on prose and audit code diffs directly. |
