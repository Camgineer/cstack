---
name: principle-fix-root-causes
description: "Apply when fixing any defect: a reported bug, one you found mid-task, or one a check or reviewer flagged. Trace it to its root cause, name the class of bug it belongs to, and fix the class once at the most upstream chokepoint every instance passes through."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Fix Root Causes

A bug is one instance of a class. Fix the class, once, at the most upstream chokepoint every instance passes through, so no instance of it can happen again.

**Why:** A leaf fix patches only the site where the symptom surfaced. It lives in the function that crashed, special-cases one input, adds a nil check that silences a crash, or would need copying to each sibling site. It leaves every sibling broken, and the next agent copies it to the next site. One fix at the chokepoint closes the instances that exist and the ones not yet written.

**Pattern:**
- **Reproduce first.**
- **Ask "why" until you reach the root cause.** When stuck, add logging and read the actual error rather than guess.
- **Name the class.** Write one sentence that covers every site where this bug can happen, in terms of the shape that causes it. Write "every handler that joins a request parameter into a file path", not "export fails when the name has a slash". A defect with no repeatable shape, such as a typo, a lint or format fix, or one bad data row, has no class. Fix it in place.
- **Take an inventory.** Search for every instance of the class, by meaning as well as by text: the same unparsed input, the same call, the same copied shape. Count them. A class with one instance today is still a class, because the next caller copies it. Confirm each instance is wrong the same way by reading its callers or running it. An instance that relies on the current behavior is outside the class, so report it instead of changing it.
- **Walk upstream to the chokepoint.** Follow the data and control flow back from the failing site to the most upstream place every instance passes through, usually where the value is parsed or created: the boundary that parses input, the one type or constructor, the shared helper, the source of truth a copy drifted from. Fix it there, with the strongest mechanism per [Encode Lessons in Structure](../principle-encode-lessons-in-structure/SKILL.md). When the instances share no place, as with copied code, create one (a type, constructor, or helper) and move every instance onto it per [Migrate Callers Then Delete Legacy APIs](../principle-migrate-callers-then-delete-legacy-apis/SKILL.md). When a generator or template stamped the copies, fix it and regenerate them.
- **Delete the leaves.** Remove each per-site patch, guard, and special case the chokepoint fix makes dead, including ones earlier agents added. Delete one only with evidence it is dead: the chokepoint makes its input unrepresentable, or the tests that reach it pass without it.
- **Prove the class is closed.** The original repro passes, and so does a second instance of the class: a sibling site from the inventory, or a new caller written the obvious way.
- **Keep the class in scope.** A class fix that is larger than a leaf fix, or that changes behavior at sibling sites, is still this bug's fix, because those sites are wrong the same way. Make it, and name each behavior it changes in your report. Fix a class you found mid-task in its own stacked PR, per **Size and stacks** in `../cstack-mode/playbooks/opening-a-pr.md`.
- **Stop at a fence.** A chokepoint is out of reach when it sits in another repository, a vendor, or a public contract whose outside callers this change would break, such as an exported API, a wire or storage format, or CLI flags. When the calling workflow fences the scope, such as a brief's assigned paths, a signed spec's out-of-scope list, or a babysit that may not change the stack, the fence wins. A class fix that would cross a spec's tripwire stops for a Grill round per the **align** skill. In each case, fix the class at the most upstream point inside the fence, and report the class, the chokepoint, and the inventory as an open finding.

A workaround that needs a paragraph-long comment to justify it means the code is wrong. Fix the code, not the comment.

**Restart bugs: suspect state before code**

When something "fails after restart," suspect stale persistent state first: config files, caches, lock files, serialized state. If clearing a state file restores behavior, prioritize state validation as the fix.
