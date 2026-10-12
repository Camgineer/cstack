---
name: no-comments
description: "Strip unneeded code comments from a diff or files before review, then fix accepted findings and offer encodings for claimed constraints. Use when a workflow says to run no-comments or the user asks for it."
---

# No comments

Inspect the scoped comments yourself. Act on accepted findings.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. Delete scoped comments except legal or license headers, public API contracts, issue or RFC links for constraints code cannot express, and non-obvious behavior forced by an external dependency or platform you cannot reshape. Keep formatting suppressions and suppressions for faulty, pedantic, or style-only rules. For surprises in code we own, and correctness or safety suppressions, delete the comment and flag the exact symbol `MUST KILL` for a rename, extraction, type, or reshape. Read nearby code and use `how` or `why` to check ambiguous claims. Touch only comments in this pass; collect code fixes for step 3.
2. Inspect the deletions and flags. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty. Reshape flags on our-code surprises stay actionable. Do not restore those comments. A keep survives only with proof it is about something we cannot change. Audit missed scoped lint and TypeScript suppressions. Correctness or safety suppressions stay actionable `MUST KILL`s. Restore deletions only with exact exceptions and scoped proof. Before accepting thin `IMPORTANT` or `do not remove` kills or keeps, run `how` or `why` on their symbol. If a kill is ambiguous, do not restore. If a keep is refuted or still ambiguous, delete it. Correct any mistaken deletion or flag before continuing.
3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. The [fix-root-causes](../principles/fix-root-causes.md) and [redesign-from-first-principles](../principles/redesign-from-first-principles.md) skills guide intent only. Neither authorizes widening the fence nor fixing instances outside it. Never bolt on symptom guards.
5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for interactive approval. Unattended and eval require caller pre-approval. If approved, encode then delete. Otherwise delete, report the constraint open, and sketch out-of-scope work.
6. Report the deletion count, restored comments, reruns, architect sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.
