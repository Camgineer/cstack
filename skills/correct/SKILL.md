---
name: correct
description: Find the mistakes agents keep repeating in a repo and make each one impossible, with architecture first, then types, a lint, or a test, and agent rules last. Use for correct, or when the operator corrects the same agent mistake twice.
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.

# Correct

The operator keeps correcting agents in this repo for the same mistakes. Change the repo so the next agent can't make them.

Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Design the repo so a change that looks right from one file is right for the whole repo.

## 1. Find the mistake classes

Read recent commits, reverts, review comments, agent instruction files, and comments that explain workarounds. When the **History** capability is available, also read the operator's past corrections through the **recall** skill. Group the mistakes into classes. A class counts once it has happened twice. Done when every class has at least two cited instances, each a commit, a review comment, or a quoted correction.

## 2. Pick the highest level that works

Fix each class at the first level that can stop it. This is the **encode-lessons-in-structure** principle skill run over the repo's history.

1. **Architecture.** Give each piece of state one owner and each task one supported way. Hide internals so the wrong import fails. Replace hand-synced lists with one source of truth. Delete old ways and dead code an agent would copy.
2. **Types.** Make the bad state impossible to write. If bad code still compiles, add a lint or CI check whose error names the file, type, or function to use instead. If the pattern is already common, fail only when a change adds more of it.
3. **Tests.** Test the behavior per the **test-behavior-not-implementation** principle skill. Fix or delete any test that would still pass if every function it calls returned nothing.
4. **Agent rules.** Write docs or agent rules last, and only for judgment calls. Nothing fails when an agent skips them.

Human review is the fallback when every level fails, never the fix.

## 3. Fix and prove

Fix the most frequent classes now, one commit each. Prove each new check fails on a real past mistake by running it against that commit or a reverted copy of it. Run the same command locally and in CI. An exception goes on the offending line with a reason, an expiry date, and the name of the human who approved it.

## 4. Keep the rule table

Keep a table in the agent instruction file that pairs each rule with what enforces it. When the operator corrects you, fix the mistake and add the rule. If the rule was already there and nothing enforces it, the mistake is a repeat, so fix it at the highest level in the same change. Drop a rule once its mistake can't happen.

**Reply:** each class with its evidence, the level you picked, and why a higher level didn't work. Link each check's failing run on the past mistake.
