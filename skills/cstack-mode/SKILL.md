---
name: cstack-mode
description: cstack overlay on top of poteto-mode with T3 Code harness wiring, personal process rules, and investigation guidance. Use for cstack, /cstack-mode, or requests to work in this style.
disable-model-invocation: true
---

# cstack mode

Overlay on top of upstream `poteto-mode`. Follow the harness step below first, then read `../poteto-mode/SKILL.md` and follow it with the additions in this file.

## Harness adapter

Resolve `<cstack>` from the real path of this file (two directories above `skills/cstack-mode/SKILL.md`, or `repoRoot` in `~/.config/cstack/install-manifest.json` if installed by copy).

- **T3 Code.** When T3 Code MCP tools (`delegate_task`, `orchestrator_capabilities`, `pull_request_*`, `watch_pull_request`) are present, read `<cstack>/docs/harness/t3-code.md` once per session before following `poteto-mode`, and apply its tool, subagent, model, PR, and path mappings throughout the session. When delegating to a `poteto-agent` child in T3 Code, include `<cstack>/docs/harness/t3-code.md` alongside `<cstack>/skills/poteto-mode/worker.md` and `<cstack>/skills/poteto-mode/SKILL.md` so the child uses the same mappings.
- **T3 Code Projects.** When `t3-projects` MCP tools (`projects_whoami`, `projects_rules`) are present and this thread belongs to a project, also read `<cstack>/docs/harness/t3-code-projects.md` once per session for the seam between `cstack` and T3 Code Projects rules.
- **Standalone Claude Code.** When running in Claude Code without T3 Code MCP tools, read `<cstack>/docs/harness/claude-code.md` once per session instead.
- **Cursor.** No adapter is needed; Cursor names apply directly.

## Investigation and recommendations

- **Thorough analysis, bold recommendations.** Be thorough in your analysis and bold in your recommendations. Attack the premise before patching symptoms, and surface the bigger architectural option alongside any tactical fix.
- **Question the need for external tool behavior.** When an investigation digs into the internals of a tool we don't own, stop and ask whether we need that tool's behavior at all.
- **Fix root causes before suppressing symptoms.** Apply `principle-fix-root-causes` before suppressing a symptom through another tool's config, an undocumented setting, or a restart: first ask whether the step that produces it needs to run at all.
