---
name: cstack-mode
description: cstack overlay on top of poteto-mode with Orca and T3 Code harness wiring, personal process rules, and investigation guidance. Use for cstack, /cstack-mode, or requests to work in this style.
disable-model-invocation: true
---

# cstack mode

Overlay on top of upstream `poteto-mode`. Follow the harness step below first, then read `../poteto-mode/SKILL.md` and follow it with the additions in this file.

## Harness adapter

Resolve `<cstack>` from the real path of this file (two directories above `skills/cstack-mode/SKILL.md`, or `repoRoot` in `~/.config/cstack/install-manifest.json` if installed by copy).

- **Orca workspaces and bots.** Treat the session as Orca if its environment contains an `ORCA_*` variable, the workspace lives under `~/.orca/bots/`, or the `orca` CLI is active without T3 Code MCP tools. Read `<cstack>/docs/harness/orca.md` once per session before following `poteto-mode`. Apply its orchestration, harness, model, PR, bot, and path mappings throughout the session. Also read `~/.config/cstack/pstack-models.md` when it exists for per-role model and effort overrides. When delegating to a `poteto-agent` worker in Orca, include `<cstack>/docs/harness/orca.md` alongside `<cstack>/skills/poteto-mode/worker.md` and `<cstack>/skills/poteto-mode/SKILL.md` so the worker uses the same mappings. For bot chats, follow the coordination and delegation rules in `<cstack>/docs/harness/orca.md`.
- **T3 Code.** When T3 Code MCP tools (`delegate_task`, `orchestrator_capabilities`, `pull_request_*`, `watch_pull_request`) are present, read `<cstack>/docs/harness/t3-code.md` once per session before following `poteto-mode`, and apply its tool, subagent, model, PR, and path mappings throughout the session. When delegating to a `poteto-agent` child in T3 Code, include `<cstack>/docs/harness/t3-code.md` alongside `<cstack>/skills/poteto-mode/worker.md` and `<cstack>/skills/poteto-mode/SKILL.md` so the child uses the same mappings.
- **Standalone Claude Code.** When running in Claude Code without Orca or T3 Code tools, read `<cstack>/docs/harness/claude-code.md` once per session instead.
- **Cursor.** No adapter is needed; Cursor names apply directly.

## Repo-local domain skills

Keep general engineering process in `cstack` and project- or domain-specific skills (such as Unity or repo-specific eval workflows) inside each repository.

- **Canonical location.** Store repo-embedded domain skills at `<repo>/.agents/skills/<skill-name>/SKILL.md` (no git symlinks needed, so macOS and Windows checkouts work identically). When discovering skills in existing repos, also check `<repo>/.claude/skills/*/SKILL.md` and `<repo>/.codex/skills/*/SKILL.md` as fallbacks.
- **Scan cheaply at task start.** When starting work in a repository, scan its repo-local skill directories and read only each skill's short frontmatter (`name` and `description`) so the context window stays small.
- **Load on match.** Before planning or editing in a domain covered by a repo-local skill, read that skill's full `SKILL.md` and only the specific reference files that match the task.
- **Pass matches to workers.** Whenever delegating to a `poteto-agent` worker inside a repository, include the absolute paths of any relevant repo-local `SKILL.md` files alongside `worker.md`, `poteto-mode/SKILL.md`, and the harness adapter so workers apply the same domain rules.
- **Precedence.** `cstack` owns engineering process (playbooks, verification, review, PR lifecycle, and communication style). Repo-local skills own domain knowledge and repo tooling. Where a third-party domain skill conflicts with `cstack` on process, `cstack` wins unless the repository's own `AGENTS.md` or `CLAUDE.md` explicitly sets a project rule (such as merge authority).
- **Keep repo instructions project-specific.** Put only rules unique to that repository (such as merge authority, build and test commands, or codebase constraints) in its `AGENTS.md` or `CLAUDE.md`. Do not copy general engineering process that `cstack` owns into those files.

## PR lifecycle

- **Open ready once verified.** Open pull requests ready after verification and cross-model review pass, or mark drafts ready.
- **Keep artifacts out of git.** Attach verification screenshots, recordings, and traces to the pull request or write them to gitignored or temporary paths.
- **Review exact commits before slow jobs and merge.** Commit after cleanup and get an explicit `PASS` from another model family before discretionary slow or remote jobs or merge. Fast local checks or one requested platform job may run during review. Repeat after fixes or rebases, keep design review separate, and give workers this rule.
- **Bound review rounds.** Give design and code reviewers the acceptance criteria and **Do not build** list. A finding is **Blocking** only if it breaks an acceptance criterion, fails a run or user progress, opens an authority or security hole, loses data, or makes an irreversible data or interface mistake. Mark all else **Defer** and never patch it. Round one lists every defect class and instance. Pause on `NEEDS_CHANGES` with over six findings or several in an optional subsystem to cut optional scope. On round-two recurrence, pause, name the state owner and event, and give one user action and expected change.

## Investigation and recommendations

- **Thorough analysis, bold recommendations.** Test the assumption behind a proposed fix, compare a design fix with a local patch, and recommend one. Flag flaws, exploits, or conflicts in an owner choice with evidence before acting. Reopen an accepted tradeoff only on new evidence.
- **Prioritize and scope before coding.** Run [prioritize](../prioritize/SKILL.md) before picking work or starting multi-part tasks. Ship one capability per pull request, give workers a **Do not build** list, reassess past 500 first-party changed lines, and split before adding a second capability. Separate moves, vendoring, fixes, and features along genuine review and reversion seams. Apply [principle-laziness-protocol](../principle-laziness-protocol/SKILL.md) and [principle-subtract-before-you-add](../principle-subtract-before-you-add/SKILL.md).
- **Scale alignment to rework pain.** Rate choices by redo cost. Execute low rework pain fast per [principle-never-block-on-the-human](../principle-never-block-on-the-human/SKILL.md). For high rework pain such as architecture, migrations, shared interfaces, asset packs, or slow passes, align on a cheap preview first, then stop. Workers pause with a preview on new ones. Before coding high rework pain work, run a read-only cross-model stage gate, or `architect` for contested designs, asking "What can we cut or defer to PR 2?" and marking **Blocking for PR 1** or **Defer** under **Bound review rounds**.
- **Question external tools.** Before debugging a tool we do not own, ask whether we need its behavior.
- **Fix root causes.** Apply `principle-fix-root-causes` before suppressing symptoms with config, flags, or restarts, and ask whether that step needs to run.
- **Attack the bottleneck.** Before optimizing a pipeline or fan-out, apply [principle-attack-the-bottleneck](../principle-attack-the-bottleneck/SKILL.md).

## Reflection

Read [reflect.md](reflect.md) only when running `/reflect`.

## Testing and verification

- **Default to no test.** Add a test only when required or when an undetected failure causes security, authority, data-loss, soft-lock, invariant, or contract harm that outweighs maintenance cost. Test observable behavior per **principle-test-behavior-not-implementation** with clear names and failure messages, and run `/slash-tests` after `/no-comments` before review whenever tests change.
- **Verification strategy.** Pick the cheapest high-confidence proof. Store repo-local real-app verification skills under `<repo>/.agents/skills/verify-<app>/`, checking `.cursor/skills/` during maintenance to avoid duplicates, and formal verification skills under `<repo>/.agents/skills/`.
