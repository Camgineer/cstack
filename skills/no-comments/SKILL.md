---
name: no-comments
description: "Use when asked to remove unnecessary code comments and fix the design problems they conceal."
---

# No comments

Remove comments that conceal a design problem or repeat the code. Use the caller's files or diff; otherwise use the working tree and current diff against its named base, default `main`.

## Inspect

Keep legal notices, public API contracts, and explanations of constraints imposed by an external dependency or platform. Keep formatting suppressions and suppressions for faulty or style-only rules. Read nearby code and use `how` or `why` for ambiguous claims.

Delete other scoped comments. For a surprise in code we own, or a correctness or safety suppression, record the symbol and the rename, extraction, type, or reshape it needs. Touch only comments during this pass.

## Check the findings

Inspect each deletion and proposed fix. Restore a comment only with evidence that it meets an exception. Correct mistaken flags. Scope boundaries still hold: a comment's claim does not authorize changing unrelated code.

## Fix

Apply accepted trivial fixes directly. When the accepted set needs a new shape, use `architect` to sketch it before implementing the accepted design. Fix the root cause inside the authorized scope and remove the workarounds it makes dead. Report any cause outside that scope.

For a claimed constraint that can be enforced, offer the cheapest type, runtime check, test, or lint. Implement it within existing authorization, or wait for the person's decision. Preserve a valid constraint comment until its replacement enforces it. Report an unenforced constraint as open.

Run the checks that cover the edits. Report deletions, restorations, design fixes, enforcement, and remaining findings.
