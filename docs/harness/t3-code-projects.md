# cstack in T3 Code Projects

Thin seam adapter for running `cstack` (and upstream `pstack`) inside a **T3 Code Projects** thread.

Use this file only when `t3-projects` MCP tools (`projects_whoami`, `projects_rules`) are present and `projects_whoami` reports that this thread belongs to a project. For standalone T3 Code threads, skip this file and use [docs/harness/t3-code.md](./t3-code.md) alone.

## Layering and precedence

- **T3 Code harness ([docs/harness/t3-code.md](./t3-code.md))** maps Cursor tool names, models, subagents, PR/CI tools, and paths to T3 Code.
- **T3 Code Projects (`projects_rules`)** governs project coordination, reporting, checklists, shared files, shared memory, decisions, and approvals. Defer to `projects_rules` for those rules rather than duplicating them here.
- **cstack (`skills/cstack-mode/SKILL.md` and upstream `poteto-mode`)** governs engineering rigor, playbooks, subagent kickoffs, code quality, and verification.

Where a `pstack` playbook rule conflicts with a T3 Code Projects coordination rule inside a project thread, follow the seam table below.

## Seams

| Area | pstack default | Inside T3 Code Projects |
| --- | --- | --- |
| **Opening a PR** | `opening-a-pr` and `worker.md` open PRs ready for review (`draft: false`). | Open a **draft** PR (`draft: true` on `pull_request_create`) per T3 Code Projects thread rules unless the user explicitly asks for a ready PR. |
| **New top-level threads** | Plain T3 Code allows `t3_thread_launch` / `create_threads` when the user asks. | Work threads must never spawn top-level threads directly. Use `projects_ask` (`kind: "new_thread"`) with the user's verbatim quote. Use `delegate_task` or native subagents only for hidden helpers inside your own task. |
| **Checklists and todolists** | Copy playbook steps into the provider's todolist tool. | Keep playbook steps in sync with the T3 Code Projects checklist (`projects_report` when available) alongside any provider-native todolist tool. |
| **Questions and irreversible steps** | Ask via `AskQuestion` (mapped to the provider's question tool). | For forks that change the goal, visible output, or an irreversible step, pair the question tool with `decision_open` / `decision_choose` (setting `irreversible: true` on irreversible steps) per `projects_rules`. |
| **Durable outputs and artifacts** | Write files in the repo or reply inline. | Save reports, audits, designs, and HTML visuals that should outlive your worktree with `files_save` and link the returned absolute path. |
| **Missing external services** | Ask the user or skip with a note. | Check `connection_check` first and record asks with `connection_record` so the project does not re-ask across threads. |
| **Project memory** | Session-local or repo docs. | Read relevant entries from the project memory index with `memory_read` before relying on them, and keep personal machine details or boundaries in project memory rather than committing them to the repo. |
