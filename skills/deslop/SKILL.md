---
name: deslop
description: Remove AI-generated code slop from the branch diff before commit. Use for deslop, a slop-strip step, or cleaning code style a model introduced.
license: MIT
metadata:
  source: "deslop from Cursor Team Kit by Cursor, https://github.com/cursor/plugins/tree/23e4138daa01c42d4969f7a5465f82704e64f798/cursor-team-kit/skills/deslop"
---

Read [the runtime contract](../poteto-mode/references/runtime.md) before executing this workflow.

# Remove AI code slop

Check the branch diff against its base and remove AI-generated slop the branch introduced.

## Find the diff

Use the base the user or the PR names. Otherwise take the remote default branch from `git symbolic-ref refs/remotes/origin/HEAD`. Review `git diff $(git merge-base HEAD <base>)`, plus uncommitted changes when the work is not yet committed. Edit only lines the branch added or changed.

## Focus areas

- Comments that are unnecessary or inconsistent with local style.
- Defensive checks or try/catch blocks that are abnormal for trusted code paths.
- Casts to `any`, or the language's equivalent escape hatch, used only to bypass type errors.
- Deeply nested code that early returns would flatten.
- Other patterns inconsistent with the file and the surrounding codebase.

Compare each candidate with neighbouring code in the same file and module. Local convention decides what counts as slop.

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Make minimal, focused edits rather than broad rewrites.
- Run the checks that cover the touched files after editing.
- Keep the final summary to one to three sentences.
