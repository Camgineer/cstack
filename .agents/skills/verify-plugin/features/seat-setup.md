# Seat setup

Setup shows proposed seat files, applies an approved report, and restores recorded originals without losing later edits.

## Sub-features

- setup.report changes no files and returns an approval digest.
- setup.apply writes explicit seat files only after approval and is repeatable.
- setup.revert previews undo and restores originals while preserving later edits.
- setup.recovery recovers an interrupted apply without removing unrelated leftovers.

## How to get to it (user POV)

Run `node hooks/intent-setup.mjs report --choices choices.json --catalog catalog.json`. After approving that exact report, use `apply` with `--yes --approval` and its digest. `revert --report-only` previews restoration; `revert` performs it. The fixture supplies synthetic choices and catalog files.

## Driving it with Bun public-command fixtures

Preconditions: complete Launch and Doctor in [the skill](../SKILL.md). Keep its shell variables and scripts working directory.

- Run the recipe against [the existing consumer](../../../../tests/integration/intent-install.test.ts). Its named cases pair the real command with observable assertions.

```sh
bun check-receipt.ts --receipts "$verifyReceipts" record setup 'bun test ../../../tests/integration/intent-install.test.ts -t "setup reports old and new files|setup keeps an edited file on revert|setup recovers an interrupted apply through revert"' > "$verifyRun/setup.log" 2>&1
```

- Read the saved log and require matching passing cases with zero failures. Expect identical home snapshots after report and unapproved apply, eight regular seat files with explicit triples after approved apply, and a ready setup record with permission 0600. Revert report writes nothing. Repeated apply and revert leave unchanged state. The personal-file case restores original bytes and mode while preserving a later-edited seat. The interruption case checks recovered files and an unrelated leftover through the existing file-change kit.

## Gotchas

The synthetic catalog is fixture input, never a real model recommendation. This recipe proves file setup and restoration. It launches no agents and makes no claim about hidden delegation. Use only the report digest produced by the same fixture state.
