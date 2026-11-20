---
name: cstack-mode
description: cstack overlay on top of poteto-mode with personal process rules and investigation guidance. Use for cstack, /cstack-mode, or requests to work in this style.
disable-model-invocation: true
---

# cstack mode

Overlay on top of upstream `poteto-mode`. Read `../poteto-mode/SKILL.md` and follow it, with the additions below.

## Investigation and recommendations

- **Thorough analysis, bold recommendations.** Be thorough in your analysis and bold in your recommendations. Attack the premise before patching symptoms, and surface the bigger architectural option alongside any tactical fix.
- **Question the need for external tool behavior.** When an investigation digs into the internals of a tool we don't own, stop and ask whether we need that tool's behavior at all.
- **Fix root causes before suppressing symptoms.** Apply `principle-fix-root-causes` before suppressing a symptom through another tool's config, an undocumented setting, or a restart: first ask whether the step that produces it needs to run at all.
