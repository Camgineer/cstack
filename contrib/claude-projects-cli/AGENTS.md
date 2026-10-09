# claude-projects-cli

Agent-facing notes for the Playwright CLI that reads and posts to claude.ai Projects. The CLI prints JSON on stdout. Usage is in `claude-projects-cli --help`.

## Shape

- `src/commands.ts` holds the logic: dedupe, dry-run, verify-after-send, clear-draft. It takes a `ChatPort`.
- `src/playwright-port.ts` implements `ChatPort` on a persistent Chromium profile. Its `SELECTORS` object is the only place claude.ai DOM is named.
- `src/daemon.ts` keeps one browser and its tabs warm behind a Unix socket. The first call starts it. Later calls skip the browser launch and navigation.
- `test/` runs against `FakePort`, an in-memory `ChatPort`. Tests cover behavior at `dispatch`, `run`, and the socket, not Playwright internals.

## Working rules

- Keep the code free of account names, profile paths, and project ids. State lives under `CPC_HOME`.
- A selector change needs a live check on claude.ai before it merges. The fake port cannot catch DOM drift.
- Exit codes: 0 ok, 1 error, 2 usage, 3 post sent but not verified. A caller that posts should treat 3 as unknown, not as sent.
- Run `bun test` and `bun run typecheck` from this folder. Install with `bun install` here first.
