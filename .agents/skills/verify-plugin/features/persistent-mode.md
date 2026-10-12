# Persistent mode

The mode hook stores a project choice, restores it in later sessions, and respects an explicit opt-out.

## Sub-features

- mode.typed stores typed on/off commands and restores across startup and compaction.
- mode.cli supports on/off/status from project subdirectories.
- mode.environment supplies a default until the project has its own choice.
- mode.cursor stores Cursor commands and restores them in later chats.

## How to get to it (user POV)

Type the mode skill command, with `off` to opt out. For a plain-language opt-out, the agent runs `sh hooks/mode.sh off` from the project. `on` and `status` use the same script. Hosts invoke the registered session and prompt hooks.

## Driving it with Bun public-command fixtures

Preconditions: complete Launch and Doctor in [the skill](../SKILL.md). Keep its shell variables and scripts working directory.

- Run the recipe against [the existing consumer](../../../../tests/integration/mode-hooks.test.ts). Its named cases pair the real command with observable assertions.

```sh
bun check-receipt.ts --receipts "$verifyReceipts" record mode 'bun test ../../../tests/integration/mode-hooks.test.ts -t "a typed command keeps the mode on|the agent can turn the mode off from a subdirectory|turns the mode on at session start in every host|the user.s choice for a project beats|a command typed in Cursor keeps its choice"' > "$verifyRun/mode.log" 2>&1
```

- Read the saved log and require matching passing cases with zero failures. Expect hook context after on, restored context on later startup/resume/clear/compact events, empty context after off, and on/off status text from the real shell script. The environment-default case checks accepted and ignored variable values. The explicit-choice case proves opt-out beats the default. Cursor prompt and session events use the registered Cursor commands.

## Gotchas

Hook fixtures supply event JSON and disposable state directories. They do not prove a host trusts or loads the hooks. Static terminal feedback has no motion or sound branch. Never run mode.sh against this verification agent's actual project state.
