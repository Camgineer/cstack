# Codex runtime contract

Read this contract before running a CStack workflow. Preserve its task steps, specialist prompts, review coverage, panel size, and evidence format. User instructions and host permissions govern every action, including commits, external messages, merges, deployment, and cleanup.

## Native tools and delegation

Use the tools actually exposed by the session. Inspect their schemas for delegation, steering, status, waiting, resumption, planning, and user questions. Tool names and supported fields differ between local Codex and managed cloud hosts. A role name in a workflow describes the assignment; it does not register a native tool or agent profile.

For Poteto implementation delegates, read `agents/poteto-agent.md` from the plugin root and pass its complete instructions to an available native child. The child must read Poteto Mode and its Principles index. For comment review, use the complete `agents/comment-sicko.md` prompt. Routed workflows such as How, Why, Interrogate, and Reflect use their own specialist reference prompts. Existing user-configured profiles may be used when their instructions match; no generated profile is required.

Give investigators read-only scope for both files and connected apps. A filesystem sandbox does not grant connector write authority. Use the least permissions needed. Assign exclusive writable paths or isolated worktrees before parallel edits. If the spawn tool has no working-directory field, name the prepared worktree in the brief and have the child verify its directory before writing. Schedule lanes within actual capacity and report any missing coverage.

Reuse a child only when the host reports it resumable. Read status without waking or duplicating it. Each follow-up carries the current objective, constraints, and evidence pointers. The parent reviews results and resolves disagreements. A persistent cloud task and a native child have different lifecycles; use the host's supported route for each.

## Models and panels

Use the user's current supported model choices when provided. Otherwise inherit the host's model for ordinary single-role work. Pass overrides only through exposed native fields or an existing supported profile. Model ID and reasoning effort are separate choices; validate them against the available catalog and the tool schema. A requested model is not proof of served identity. Report identity only when supported host metadata establishes it.

Preserve the workflow's default three-seat panel unless the user selected another size. Before a diverse-model panel, establish supported choices for its seats and cross-judge. If the host cannot provide the requested diversity, report that limitation and obtain a choice between a reduced panel and waiting for the missing capability. Independent prompts or seats alone do not establish model diversity. Rejected model IDs are an explicit missing lane, never a reason to guess provider slugs or change model families silently.

Role labels remain useful for briefs and user preferences. This core port requires no CStack model configuration file, provider gateway, or setup script. Use `setup-pstack` to assess available capabilities when needed.

## Skills, resources, and writing

Resolve bundled paths from the loaded skill directory or plugin root, independently of the consumer project's working directory. In Poteto playbooks, `playbooks/`, `references/`, and `scripts/` are relative to `skills/poteto-mode/`. Material written into another project must use resolved absolute paths or explicit Markdown links back to the installed resources. Keep consumer source-control paths separate from plugin paths.

Explicit invocation uses the registered identity, such as `$cstack:how`, where the host supports that syntax. A cross-skill reference means read and apply the bundled skill and its prerequisites. Project-authored skills live in `.agents/skills/`; personal scope requires the user's choice. Keep installed plugin files immutable.

When drafting or editing human-facing text, read and apply `skills/simple-as-prose/SKILL.md` from the plugin root. For agent instructions, apply `skills/writing-for-agents/SKILL.md`. Apply both for mixed audiences; skill edits also require its `SKILL-MECHANICS.md`. Review the result against the relevant guidance before returning it.

## History, connectors, and verification

Use available authorized thread/history APIs for the requested project and date range. When unavailable, use a supplied transcript or digest plus current repository evidence and name the missing history. Current-context memory does not establish a historical tool call. Private transcript files and databases are not a portable history API.

Check source-control and connector access before selecting a workflow backend. An available GitHub connector can supply authorized repository evidence when `gh` is missing or denied. CLI helpers still require their own dependencies. Report a missing backend rather than claiming its checks ran. Permission denial is not permission to alter authentication or security settings.

Cursor Team Kit's `deslop`, `control-ui`, and `control-cli` are optional external capabilities. Use an installed equivalent that exercises the real target. Report unavailable live verification. Static checks and bundled CLI tests do not prove Desktop UI behavior.

## Continuation and host qualification

Apply Poteto Mode to the current task when requested. Honor opt-out immediately. This core port has no hooks or stored activation and makes no claim of automatic restoration across sessions or compaction. On a handoff, record the requested mode and let the receiving host apply current user instructions.

Run iterative work in the active task. If the objective requires future wake-ups or execution after that task ends, first identify an available, authorized native lifecycle and its limits. Record the program objective, completion predicate, owner gates, continuation mechanism, and cadence in the plan. If the requested cadence or persistence is unsupported, report it as blocked and preserve a resumable handoff. Do not create a daemon or silently convert an event-driven request into polling. Current-task iteration needs no separate scheduler.

Local CLI/Desktop, saved-cloud tasks, and managed assistants must each be qualified with their own evidence. Local configuration is not evidence of cloud plugin loading. After restart or environment startup, use the host's readiness/status tools and reconcile durable files, Git/PR state, and surviving agents before continuing. A new cloud task does not necessarily share another task's unpublished files.

## Helpers and optional workflows

The Bun helpers provide bookkeeping and PR watching. They require an existing Bun runtime and their declared dependencies in an owned working copy; discovery and startup never install them. `watch-pr` also requires authorized `gh` access. The Orchestrate stack frontier requires Graphite and its authoritative local stack metadata. Without those, report that workflow capability as unavailable; a plain GitHub base-ref list does not establish the same frontier.

Benny and `make-bot-ui` retain optional Cursor-specific automation sources. They are not native Codex automations. Their setup, credentials, webhook exposure, and external writes require separately authorized adaptation and verification. The rest of the skill catalog does not depend on them.
