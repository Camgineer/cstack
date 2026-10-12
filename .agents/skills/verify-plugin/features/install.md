# Install and update

The install command shows which hosts have the plugin, previews changes, and installs or updates selected copies.

## Sub-features

- install.report shows the before and after table without updates.
- install.update updates installed hosts through their configured sources.
- install.select installs selected fresh hosts from package Git metadata.
- install.source uses an explicit Git source during a local-source move.
- install.failure prints a retry command while other hosts finish.

## How to get to it (user POV)

Run `sh hooks/intent-install.sh --report-only` to preview the host table. Use `--yes` for updates, `--hosts claude,codex` to select fresh hosts, and `--source other/fork` to choose the source. The documented npx command reaches this same entry script.

## Driving it with Bun public-command fixtures

Preconditions: complete Launch and Doctor in [the skill](../SKILL.md). Keep its shell variables and scripts working directory.

- Run the recipe against [the existing consumer](../../../../tests/integration/intent-install.test.ts). Its named cases pair the real command with observable assertions.

```sh
bun check-receipt.ts --receipts "$verifyReceipts" record install 'bun test ../../../tests/integration/intent-install.test.ts -t "the public command reports all hosts|without a terminal or with --yes|the host selection flag installs fresh copies|--source wins over npx metadata|a failing host leaves its retry command"' > "$verifyRun/install.log" 2>&1
```

- Read the saved log and require matching passing cases with zero failures. Expect host rows with before and after versions, no mutations in report mode, the expected selected host commands, and a retry message for a failed host. The fixture inspects its host command journal and asserts that unselected Intent files remain absent.

## Gotchas

The fixture stands in for host CLIs. It does not fetch through npx or change real host installations. A table printed without the command-journal assertions is insufficient.
