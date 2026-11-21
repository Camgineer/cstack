---
name: slash-tests
description: "Spawn Test Slasher on the test cases a change touches, delete the low-value ones, and rewrite unclear survivors. Use for /slash-tests, after /no-comments and before review, whenever a change adds, edits, or removes tests."
disable-model-invocation: true
---

# Slash tests

Spawn Test Slasher. Act on accepted proposals.

## Scope

Use the caller's files or diff. Otherwise diff against the actual PR base whenever one exists, such as a release branch or a stacked PR's parent branch, and fall back to `main`. Include staged, unstaged, and relevant untracked tests. Scope by the test cases the change affects. If the change affects no test case, report that and skip the subagent.

Run `/no-comments` before `/slash-tests` when both run before review. `/no-comments` can add a test to enforce a claimed constraint, and that test needs this audit too.

## Steps

1. Spawn a read-only fresh subagent that runs Test Slasher. Pass the scope. Pick its reasoning level for the job, per the Subagents section of the **poteto-mode** skill. Do not restate its rules.
   - When the active harness registers `test-slasher` (for example, the Cursor plugin install) or maps it through a harness adapter (`<cstack>/docs/harness/orca.md` or `<cstack>/docs/harness/t3-code.md`), use that path.
   - Otherwise, including skills-only Cursor, standalone Claude Code, and copied Antigravity installs, spawn a read-only general-purpose subagent. Pass it the resolved path of `<cstack>/agents/test-slasher.md` and tell it to follow that file verbatim. Resolve `<cstack>` from the real path of this skill on a linked install. On a copied install, read `repoRoot` from `~/.config/cstack/install-manifest.json`.
   - When a child runs in a checkout that lacks the changes (such as a remote worktree or a local isolated worktree), pass the actual diff and relevant untracked test contents. For a remote worker, also pass a persona path that exists on that host.
   - If the persona file does not resolve, fail `/slash-tests` and name the missing path. Never improvise the persona.
2. Inspect every proposal. Reject any edit to production code, CI thresholds, or test-selection config. Reject any proposal outside the affected cases. Reject a deletion of any case present on the PR base unless the proposal names the retired contract or the retained check that catches the same failure.
3. Apply accepted deletions and rewrites in the parent. Rewrites change test names, structure, and failure messages. Keep regressions the owner explicitly requested, checks the repository requires, and proof that an active `/tdd` run or refactor needs.
4. Run the affected test suite again. Confirm that the test runner still discovers every remaining case you intended to keep. If a deletion turns a failing suite green, accept it only with an explicit contract change or a named duplicate check.
5. Report the deleted case count and list, the kept cases in scope, and the rewrites as a subset of the kept cases. For every flagged deletion or weakening, state the lost assertion and identify any retained coverage or retired contract. Report remaining risks, checks run, and unresolved items. A run with zero deletions is a valid pass.
