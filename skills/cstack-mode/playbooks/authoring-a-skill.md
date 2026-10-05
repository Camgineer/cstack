### Authoring or modifying a skill

**You own the skill's voice.**

1. Invoke `writing-for-agents` and read its `SKILL-MECHANICS.md`.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve. Place each new rule in the file agents read at the decision it governs. Name that file from a pilot run's opened files or the workflow's routing, and put the rule's key words and the case that failed there. When the edit changes or redefines a rule that other skills restate, or changes when an agent stops, acts, or reports instead of fixing, sweep the toolkit for the rules it overrides. Search by the rule's object and its synonyms, not only the new rule's own words. Reconcile each rule the edit overrides in the same PR, or write it as an explicit exception at that rule, pointing to the new rule. Then have a fresh-context reader hunt contradictions by meaning before **Opening a PR**.
3. Read `playbooks/eval.md` before any eval run, even a quick old-against-new comparison, and follow its skill section: realistic tasks run with the skill and against a baseline, plus trigger evals when the description is new or changed. Bundle into `scripts/` any helper the run transcripts show every run writing for itself. Prove each bundled check twice: it fails on a planted violation and passes on a few real changes. A check for new violations reads only the lines a change adds.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
