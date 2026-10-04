### Authoring or modifying a skill

**You own the skill's voice.**

1. Invoke `writing-for-agents` and read its `SKILL-MECHANICS.md`.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Read `playbooks/eval.md` before any eval run, even a quick old-against-new comparison, and follow its skill section: realistic tasks run with the skill and against a baseline, plus trigger evals when the description is new or changed. Bundle into `scripts/` any helper the run transcripts show every run writing for itself. Prove each bundled check twice: it fails on a planted violation and passes on a few real changes. A check for new violations reads only the lines a change adds.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
