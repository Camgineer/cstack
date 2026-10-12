# Intent delivery

Intent delivery links visible skills and records what the installer owns while preserving personal entries.

## Sub-features

- delivery.checkout links visible skills from a checkout and leaves specialist setup alone.
- delivery.package keeps a fetched copy working after its package cache disappears.
- delivery.ownership preserves personal or unrecorded destinations.
- delivery.recovery finishes an interrupted fetched delivery through the public command.

## How to get to it (user POV)

Run the install command with `--hosts intent` for package delivery. `sh hooks/intent-deliver.sh` is the checkout delivery entry point. An installed copy and its ownership record live under the disposable home's data directory.

## Driving it with Bun public-command fixtures

Preconditions: complete Launch and Doctor in [the skill](../SKILL.md). Keep its shell variables and scripts working directory.

- Run the recipe against [the existing consumer](../../../../tests/integration/intent-install.test.ts). Its named cases pair the real command with observable assertions.

```sh
bun check-receipt.ts --receipts "$verifyReceipts" record delivery 'bun test ../../../tests/integration/intent-install.test.ts -t "links every visible skill into Intent|run by npx, it links to its own copy|a missing record preserves unrecorded retired links|fetched delivery recovers a killed mode link"' > "$verifyRun/delivery.log" 2>&1
```

- Read the saved log and require matching passing cases with zero failures. Expect the visible-skill link list, matching targets and skill bytes, no specialist directory, and readable skills after the fetched cache is removed. Ownership tests assert that unrecorded retired links and personal files survive. Recovery uses the existing file-change kit to kill a real write, reruns the public command, and inspects its final Intent table and record.

## Gotchas

Use the fixture's stand-in intentd only. A delivery record proves ownership, not live skill discovery or specialist creation. The fetched-package fixture prepares a local package-shaped copy; it does not execute upstream code.
