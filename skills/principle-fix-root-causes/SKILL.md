---
name: principle-fix-root-causes
description: "Apply when fixing any defect: a reported bug, one you found mid-task, or one a check or reviewer flagged. Trace it to its root cause, name the class of bug it belongs to, and fix the class once at the most upstream chokepoint every instance passes through."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Fix Root Causes

A bug is one instance of a class. Fix the class, once, at the most upstream chokepoint every instance passes through, so no instance of it can happen again.

**Why:** A leaf fix patches the site where the symptom surfaced. It leaves every sibling site broken, and the next agent copies it to the next site as one more duct-tape patch. One fix at the chokepoint closes the instances that exist and the ones not yet written.

**Pattern:**
- **Reproduce first.**
- **Ask "why" until you reach the root cause.** When stuck, instrument rather than guess: add logging and read the actual error.
- **Name the class.** Write one sentence that covers every site where this bug can happen, in terms of the shape that causes it: "every handler that joins a request parameter into a file path", not "export fails when the name has a slash".
- **Take a census.** Search for every instance of the class: the same unparsed input, the same call, the same copied shape. Count them. A class with one instance today is still a class, because the next caller copies it.
- **Walk upstream to the chokepoint.** Follow the data and control flow back from the failing site to the most upstream place every instance passes through: where input enters and gets parsed, the one type or constructor, the shared helper, the source of truth a copy drifted from, the generator or template that stamped the copies. Fix it there, with the strongest mechanism per [Encode Lessons in Structure](../principle-encode-lessons-in-structure/SKILL.md).
- **Delete the leaves.** Remove every per-site patch, guard, and special case the chokepoint fix makes dead, including ones earlier agents added.
- **Prove the class is closed.** The original repro passes, and so does a second instance of the class: a sibling site from the census, or a new caller written the obvious way.
- **Keep the class in scope.** A class fix that is larger than the leaf fix, or that changes behavior at sibling sites, is still this bug's fix, because those sites are wrong the same way. Make it, and name each behavior it changes in your report. A chokepoint is out of reach only when it sits in another repository, a vendor, or a public contract this change cannot break. Then fix at the most upstream point you own, and report the class, the chokepoint, and the census as an open finding.

A leaf fix looks like this: it lives in the function that crashed, it special-cases one input, it adds a nil check that silences a crash, or it would need copying to each sibling site. A workaround that needs a paragraph-long comment to justify it means the code is wrong. Fix the code, not the comment.

**Restart bugs: suspect state before code**

When something "fails after restart," suspect stale persistent state first: config files, caches, lock files, serialized state. If clearing a state file restores behavior, prioritize state validation as the fix.
