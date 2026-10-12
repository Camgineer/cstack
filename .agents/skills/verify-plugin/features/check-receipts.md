# Check receipts

The receipt helper records a command against Git content and rejects failed, stale, or mismatched evidence before a head is reported as checked.

## Sub-features

- receipts.record stores command, exit code, timestamp, and tree identity; the caller captures output.
- receipts.check accepts unchanged content and rejects failures or tree edits.
- receipts.head requires the index and named commit to hold the checked tree.
- receipts.storage refuses unsafe paths and preserves the real index.

## How to get to it (user POV)

From `skills/cstack-mode/scripts`, run `bun check-receipt.ts --receipts "$verifyReceipts" record typecheck 'bun run typecheck'` in the launch shell. Use `check --head HEAD` after staging and committing the checked tree.

## Driving it with Bun public-command fixtures

Preconditions: complete Launch and Doctor in [the skill](../SKILL.md). Keep its shell variables and scripts working directory.

- Run the recipe against [the existing consumer](../../../../tests/integration/helpers.test.ts). Its named cases pair the real command with observable assertions.

```sh
bun test ../../../tests/integration/helpers.test.ts -t "check receipt" > "$verifyRun/receipts.log" 2>&1
bun check-receipt.ts --receipts "$verifyReceipts" record receipts 'cat "$verifyRun/receipts.log"' > "$verifyRun/receipt-evidence.log" 2>&1
```

- Read the saved log and require matching passing cases with zero failures. Expect successful record/check on unchanged trees, refusal after content or mode changes and command failure, and refusal when the named commit or index differs. Existing tests inspect saved receipt values, exercise unsafe-storage refusals, and compare real index bytes before and after operations. They prepare isolated Git repositories and invoke the actual helper. Bun's own exit code and the test summary determine this recipe's result. Its log remains after fixture cleanup.

## Gotchas

The helper is the command under test, so run its tests directly. Launch enables `set -e`; a failed Bun command stops this recipe before any bookkeeping. Read the direct log for a positive pass count and zero failures. The later receipt records a display of that completed log as extra evidence; it does not rerun or determine the tests.

`--receipts` is relative to the project root, even from a subdirectory. A receipt is local bookkeeping, not authenticated proof. It covers Git-normalized content, excludes ignored untracked scratch and state outside the repo, and can miss changes restored before command exit. It refuses sparse checkouts, submodules, and caller Git redirection variables. Passing saved receipts does not establish that every needed check ran.
