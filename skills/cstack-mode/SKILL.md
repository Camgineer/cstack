---
name: cstack-mode
description: cstack overlay on top of poteto-mode with Orca and T3 Code harness wiring, personal process rules, and investigation guidance. Use for cstack, /cstack-mode, or requests to work in this style.
disable-model-invocation: true
---

# cstack mode

Overlay on top of upstream `poteto-mode`. Follow the harness step below first, then read `../poteto-mode/SKILL.md` and follow it with the additions in this file.

## Harness adapter

Resolve `<cstack>` from the real path of this file (two directories above `skills/cstack-mode/SKILL.md`, or `repoRoot` in `~/.config/cstack/install-manifest.json` if installed by copy).

- **Orca (including Orca Bots).** When running in Orca (an `ORCA_*` environment variable is set, the workspace is under `~/.orca/bots/`, or the `orca` CLI is active without T3 Code MCP tools), read `<cstack>/docs/harness/orca.md` once per session before following `poteto-mode`, and apply its orchestration, harness, model, PR, bot, and path mappings throughout the session. When delegating to a `poteto-agent` worker in Orca, include `<cstack>/docs/harness/orca.md` alongside `<cstack>/skills/poteto-mode/worker.md` and `<cstack>/skills/poteto-mode/SKILL.md` so the worker uses the same mappings.
- **T3 Code.** When T3 Code MCP tools (`delegate_task`, `orchestrator_capabilities`, `pull_request_*`, `watch_pull_request`) are present, read `<cstack>/docs/harness/t3-code.md` once per session before following `poteto-mode`, and apply its tool, subagent, model, PR, and path mappings throughout the session. When delegating to a `poteto-agent` child in T3 Code, include `<cstack>/docs/harness/t3-code.md` alongside `<cstack>/skills/poteto-mode/worker.md` and `<cstack>/skills/poteto-mode/SKILL.md` so the child uses the same mappings.
- **Standalone Claude Code.** When running in Claude Code without Orca or T3 Code tools, read `<cstack>/docs/harness/claude-code.md` once per session instead.
- **Cursor.** No adapter is needed; Cursor names apply directly.

## PR lifecycle

- **Open a draft early while work is in progress.** As soon as a branch has work worth tracking, open a draft PR (`gh pr create --draft`, or `draft: true`) and keep it up to date so in-flight work is clearly visible in one place.
- **Mark ready for review once verified.** Completing `pstack` verification and cross-model review is the signal that the PR is ready for review. As soon as the change is agentically proven and done in `pstack` terms, mark the PR ready for review (`gh pr ready`, or `pull_request_update` with `ready: true` in T3 Code), or open it ready directly if verification is already complete. Never leave verified, finished work sitting in draft.

## Investigation and recommendations

- **Thorough analysis, bold recommendations.** Be thorough in your analysis and bold in your recommendations. Attack the premise before patching symptoms, and surface the bigger architectural option alongside any tactical fix.
- **Question the need for external tool behavior.** When an investigation digs into the internals of a tool we don't own, stop and ask whether we need that tool's behavior at all.
- **Fix root causes before suppressing symptoms.** Apply `principle-fix-root-causes` before suppressing a symptom through another tool's config, an undocumented setting, or a restart: first ask whether the step that produces it needs to run at all.
