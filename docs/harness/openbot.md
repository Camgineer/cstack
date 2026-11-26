# cstack in OpenBot

OpenBot is an outer-loop environment. Read this file once per session when running in OpenBot, then apply these routing, dispatch, workspace, and boundary rules alongside `skills/cstack-mode/SKILL.md`.

## Detection

Treat the session as OpenBot when any of these signals is present:

- The session runs inside an OpenBot workspace.
- OpenBot MCP tools are available.
- The system prompt includes `<openbot-developer-instructions>`.

## Outer loop role

OpenBot owns strategy, memory, timelines, cross-agent routing, alignment, and reviewing results.

- **Dispatch bounded goal work.** Route every bounded task with an explicit goal to the active inner loop, such as T3 Code via `t3-code-dispatch`. This covers engineering, asset pipelines, deep research, audits, analysis, and long-form writing.
- **Dispatch by role.** Always use the role-enforcing wrapper, such as `dispatch_t3.ts --role <role> --owner <agent>`. On each dispatch, the wrapper reads `~/.t3/pstack-models.md` and passes `--provider`, `--model`, and the provider's effort `--option` to `t3 thread start`. Never start a thread without the resolved role flags. Add a role row to `pstack-models.md` when work needs different routing. Keep model slugs out of agent prompts and skills.
- **Keep bounded work out of `start_task`.** Never use OpenBot `start_task` side threads for bounded goal work. Never use `start_task` to bypass the Dispatch Brief alignment gate.
- **Review results in OpenBot.** Inspect verified outputs returned from the inner loop, update memory and timelines, and decide the next step.

## Narrow OpenBot-only exception

Stay in OpenBot only in two cases:

- A quick single-turn check that needs no isolated execution thread.
- A task that requires an OpenBot-only capability that the inner loop lacks, such as `monarch`, `imessage`, OpenBot saved browser logins, or `openbot.send_message`.

## Workspace selection and ownership

- **Git repositories.** Dispatch git repository work with `--worktree` so each task runs in an isolated worktree.
- **Non-repo goal work.** Dispatch non-repo goal work in `<shared-workspace>` without `--worktree`.
- **Thread ownership registration.** Register thread ownership through the local dispatch watcher, such as `watch_t3.py --register` when present, so completion events route back to OpenBot.
- **Keep local machine details out of git.** Keep personal absolute paths, machine names, and account details out of git repositories.

## OpenBot workspace instructions

Keep each OpenBot workspace `AGENTS.md` limited to agent-specific rules, such as persona, local schedules, or workspace-specific routing notes. Never duplicate general `cstack` process rules or global instruction rules in an OpenBot workspace `AGENTS.md`.
