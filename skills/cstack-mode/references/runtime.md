# Runtime contract

Read this contract before running a workflow from this plugin. Then read the host note for the harness you are running in:

- Claude Code: [hosts/claude-code.md](hosts/claude-code.md)
- Codex: [hosts/codex.md](hosts/codex.md)
- Cursor: [hosts/cursor.md](hosts/cursor.md)

Identify the harness from your own tool list and system prompt. In the host notes, `<plugin>` stands for the `name` field of the plugin manifest you were loaded from. When none of the notes fits, apply this contract alone and inspect the tools you have.

Workflows name capabilities, not tools. The host note maps each capability to the native tool that provides it. Preserve every workflow's task steps, specialist prompts, review coverage, panel size, and evidence format on every host. User instructions and host permissions govern every action, including commits, external messages, merges, deployment, and cleanup.

## Capabilities

Each workflow uses these capabilities by name. Use the native tool the host note maps to each one, and inspect its actual schema before choosing fields.

| Capability | Meaning in a workflow |
| --- | --- |
| **Delegate** | Spawn a subagent with a brief, a role, and a scope. Check its status, wait for it, and resume it. |
| **Ask** | Put a structured question with options to the user. |
| **Plan** | Keep a visible todolist of the workflow's steps. |
| **Invoke a skill** | Load a bundled skill by name with the host's skill mechanism, then follow it. A workflow step that names a skill ("invoke `how`", "the **how** skill") is a call to make at that step, not background reading. The step is done only when the skill is loaded, or when the reply records `skip <skill>: <reason>`. A `principle-*` skill is the exception: read its `SKILL.md` file. |
| **History** | Read authorized past conversations for the current project. |
| **Continue later** | Wake the work again after the current task ends. |

When a capability is missing, say which workflow step it blocks. Keep going with the steps that do not need it. Never claim a check ran when its capability was missing.

## Delegation

Give each child the least permission it needs. Investigators get read-only scope for both files and connected apps. A filesystem sandbox does not grant connector write authority. Assign exclusive writable paths or isolated worktrees before parallel edits. If the spawn tool has no working-directory field, name the prepared worktree in the brief and have the child verify its directory before writing. Schedule lanes within actual capacity and report any missing coverage.

The bundled personas live in `agents/` at the plugin root. `agents/cstack-agent.md` is the implementation delegate. It must read CStack Mode and its Principles index. `agents/comment-sicko.md` is the comment reviewer. When the host registers plugin agents, spawn them by name. Otherwise pass the complete persona file as the child's instructions. Routed workflows such as How, Why, Interrogate, and Reflect use their own specialist reference prompts.

Reuse a child only when the host reports it resumable. Read its status without waking or duplicating it. Each follow-up carries the current objective, constraints, and evidence pointers. The parent reviews results and resolves disagreements.

## Model roles

A role names the kind of work a delegated step does. The person picks where each role runs with a `Models:` block in the instructions you loaded, such as the project's `AGENTS.md` or the person's own instructions file:

```markdown
Models:
- review: codex exec, gpt-6.1-sol, effort high, fast
- build: native, opus, effort xhigh
```

| Role | Steps that use it |
| --- | --- |
| `build` | Implementation delegates, such as the cstack agent a playbook hands a fix or a slice |
| `review` | The fresh-context reviewer in Readiness, each interrogate seat, and the verifiers in Shipping and Autopilot-full |

Each line is `<role>: <runner>, <model>, <options>`. Every field after the runner is optional, and a missing field takes the runner's default. The runner is `native`, the host's own Delegate capability, or a command that runs another agent CLI, such as `codex exec`, `claude -p`, or `cursor-agent -p`. Options are `effort <level>`, `fast`, and any other setting the runner documents. A role can list several runners separated by `;`, and a panel gives one to each seat.

Resolve a role before each delegated step:

1. With no line for the role, delegate on the host's model, as the workflow did before roles existed.
2. With `native`, delegate and pass the model and effort through the fields the host note names.
3. With a command, run it non-interactively in the same working directory, with the brief a native delegate would get and the persona file's path when the step names one. Read the runner's `--help` for its print mode and its model, effort, and speed flags, and put a value it has no flag for in the prompt. Give it the permissions the step needs, such as file edits for a `build` step, plus any sandbox or approval flag the line names. Its final message is the delegate's result.
4. When the runner fails, because the command is missing, signed out, or rejects the model, run the step on the host's model and name the missing lane in your report and the PR.

Model ID and reasoning effort are separate choices. A requested model is not proof of served identity. Report identity only when host metadata or the runner's output establishes it. Never guess a provider slug.

A panel keeps its default three seats unless the user selected another size. Its seats take the role's runners in order, and the host's model fills the rest. Call a panel model-diverse only when its seats resolve to different model families, and report a panel whose seats share one family. Independent prompts alone do not make a panel diverse.

## Skills, resources, and writing

Resolve bundled paths from the loaded skill directory or plugin root, independent of the consumer project's working directory. When the host note names no other way to find the plugin root, take it from a loaded skill: its `SKILL.md` sits at `<root>/skills/<name>/SKILL.md`, so the root is two levels above that file. In CStack Mode playbooks, `playbooks/`, `references/`, and `scripts/` are relative to `skills/cstack-mode/`. Material written into another project must use resolved absolute paths or Markdown links back to the installed resources. Keep consumer source-control paths separate from plugin paths. Keep installed plugin files immutable.

The host note names two skill directories. In workflows, `<project-skills>` stands for the project skill directory and `<user-skills>` for the personal one. Write project-authored skills, such as a verification skill, under `<project-skills>`. Use `<user-skills>` only when the user chooses personal scope.

When drafting or editing text for people, read and apply `skills/simple-as-prose/SKILL.md` from the plugin root. For agent instructions, apply `skills/writing-for-agents/SKILL.md`. Apply both for mixed audiences. Skill edits also need its `SKILL-MECHANICS.md`. Review the result against that guidance before returning it.

## Live verification

Playbooks pick a control skill by surface: **control-ui** for browser, Electron, and web UIs, and **control-cli** for CLIs and TUIs. A project verification skill from **create-verification-skill** can stand in for either. When no skill can drive the surface, report the missing live verification. Static checks and bundled CLI tests do not prove UI behavior.

## History, connectors, and verification

Use the host's authorized history tools for the requested project and date range. When they are unavailable, use a supplied transcript or digest plus current repository evidence, and name the missing history. Current-context memory does not establish a historical tool call. Private transcript files and databases are not a portable history API.

Check source-control and connector access before selecting a workflow backend. A GitHub connector can supply authorized repository evidence when `gh` is missing or denied. CLI helpers still need their own dependencies. Report a missing backend rather than claiming its checks ran. A permission denial is never permission to alter authentication or security settings.

## Continuation

Apply CStack Mode when requested. Honor an opt-out immediately. On hosts that run the plugin's hooks, the user's typed command keeps the mode on for that project across sessions, `/clear`, and compaction, and the `off` argument or `hooks/mode.sh off` ends it. The host note says whether the host runs the hooks. On other hosts, the mode lasts for the current session only. On a handoff, record the requested mode and let the receiving session apply current user instructions.

Run iterative work in the active task. If the objective needs wake-ups after the task ends, first find the host's authorized **Continue later** capability and its limits. Record the program objective, completion predicate, owner gates, continuation mechanism, and cadence in the plan. If the cadence or persistence is unsupported, report it as blocked and leave a resumable handoff. Never create a daemon or silently turn an event-driven request into polling.

Qualify each environment (local CLI, desktop app, cloud task) with its own evidence. Local configuration is not evidence of cloud plugin loading. After a restart, use the host's status tools and reconcile durable files, Git and PR state, and surviving agents before continuing. A new cloud task does not necessarily share another task's unpublished files.

## Helpers

The Bun helpers provide bookkeeping and PR watching. They need an existing Bun runtime and their declared dependencies in an owned working copy. Discovery and startup never install them. `watch-pr` also needs authorized `gh` access. The Orchestrate stack frontier needs Graphite and its local stack metadata. Without those, report that capability as unavailable. A plain GitHub base-ref list does not establish the same frontier.
