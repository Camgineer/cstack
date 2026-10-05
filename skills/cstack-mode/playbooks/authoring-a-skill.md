### Authoring or modifying a skill

**You own the skill's voice.**

1. Invoke `writing-for-agents` and read its `SKILL-MECHANICS.md`.
2. Validate the skill and sweep its rules.
   - Frontmatter has `name` and `description`, referenced files exist, and cross-skill links resolve.
   - Place each new rule in the file agents read at the decision it governs. Find that file from a pilot run's opened files or the workflow's routing. Put the rule's leading word there, and add the case that failed only when the rule is unclear without it.
   - When the edit adds, changes, or redefines a rule that other skills restate, or changes when an agent stops, acts, or reports instead of fixing, sweep for the rules it overrides. Search by the rule's object and its synonyms, not only the new rule's own words. When the edit widens what an agent may change, also sweep by meaning for every rule that limits scope, such as a brief's assigned paths, a signed spec's out-of-scope list and tripwires, a review or stack fence, and a comment fence. Cover trunk and the open and recently merged PRs in the same area.
   - Count the mode's principle index lines and an overridden principle's description as restatements, because runs act on the index line without opening the leaf.
   - Rewrite an overridden rule on trunk in this PR when the new rule replaces it everywhere. Otherwise add an explicit exception at that rule, pointing to the new rule. Comment on an open PR whose rule the edit overrides.
   - Before you adopt a new leading word, search the skills tree for it, and pick another word when it already means something there.
   - Rerun the sweep each time the branch takes in trunk commits, by merge or rebase.
   - Done when every hit is rewritten, excepted, or commented on, and the hit list goes to the fresh-context reviewer in **Readiness** in `playbooks/opening-a-pr.md`, which hunts contradictions by meaning across it.
3. Read `playbooks/eval.md` before any eval run, even a quick old-against-new comparison, and follow its skill section: realistic tasks run with the skill and against a baseline, plus trigger evals when the description is new or changed. Bundle into `scripts/` any helper the run transcripts show every run writing for itself. Prove each bundled check twice: it fails on a planted violation and passes on a few real changes. A check for new violations reads only the lines a change adds.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
