---
name: authoring-a-skill
description: Use when the user asks for authoring a skill. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Authoring or modifying a skill

1. Invoke `writing-for-agents` and read its `SKILL-MECHANICS.md`.
2. Validate the skill and sweep its rules.
   - Frontmatter has `name` and `description`, referenced files exist, and cross-skill links resolve.
   - Place each new rule in the file agents read at the decision it governs. Find that file from a pilot run's opened files or the workflow's routing. Put the rule's leading word there, and add the case that failed only when the rule is unclear without it.
   - Before you adopt a new leading word, search the skills tree for it, and pick another word when it already means something else there.
   - When the edit adds, changes, or redefines a rule that other skills restate, or changes when an agent stops, acts, or reports instead of fixing, sweep for the rules it overrides. Search by the rule's object and its synonyms, not only the new rule's own words. Cover trunk and the open and recently merged PRs in the same area.
   - When the edit widens what an agent may change, also sweep by meaning for every rule that limits scope, such as a brief's assigned paths, a signed spec's out-of-scope list and tripwires, and no-comments' fence.
   - Count the principles index lines and an overridden reference's summary as restatements, because a run may act on the index line without opening the leaf.
   - Rewrite an overridden rule on trunk in this PR when the new rule replaces it everywhere. Otherwise add an explicit exception at that rule, pointing to the new rule. Record any open change whose rule the edit overrides.
   - Rerun the sweep each time the branch takes in trunk commits, by merge or rebase.
   - Done when every hit is rewritten, excepted, or recorded with its contradiction and evidence.
3. When an authorized evaluation harness is available, read [the evaluation reference](../eval/SKILL.md) for realistic task and trigger comparisons. Otherwise report workflow and trigger behavior as unverified. Bundle into `scripts/` any helper the run transcripts show every run writing for itself. Prove each bundled check twice: it fails on a planted violation and passes on a few real changes. A check for new violations reads only the lines a change adds.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the [encode-lessons-in-structure](../principles/encode-lessons-in-structure.md) reference. Point to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
