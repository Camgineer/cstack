### Authoring or modifying a skill

**You own the skill's voice.**

1. Invoke `writing-for-agents` and read its `SKILL-MECHANICS.md`.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve. When the edit changes when an agent stops, acts, or reports instead of fixing, read the conditions that skill and its sibling playbooks already set, and write each one the edit overrides as an explicit exception at that rule, pointing to the new rule.
3. Eval the skill per **Eval**'s skill section: realistic tasks run with the skill and against a baseline, plus trigger evals when the description is new or changed. Bundle into `scripts/` any helper the run transcripts show every run writing for itself.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
