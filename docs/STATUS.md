# Status

Current state of in-flight work. Checked against GitHub on 2026-10-10. Dates here are UTC. This file is a snapshot, so run `gh pr view <number>` before you act on a row.

Keep this file an index. Give each open pull request one row, and put review evidence, logs, and run narrative in the pull request.

## Open pull requests

"Behind" means main moved past the branch, and "Retro" is the status described in [CONTEXT.md](CONTEXT.md). Each recommendation is the coordinator's, and the operator decides it.

| PR | Branch | State | What it does | Open item |
| --- | --- | --- | --- | --- |
| #117 | `docs/coordinator-memory` | Draft. Retro pending. | Adds `docs/` as the coordinator's memory. | Its description puts three questions to the operator. |
| #115 | `feat/claude-projects-cli-br38hs` | Draft. Retro pending. | Adds a Playwright CLI under `contrib/` that reads and posts claude.ai Projects. | Never run against the live site. The coordinator recommends closing it, because the work no longer runs in Claude Code Projects. |
| #114 | `feat/grokbot-bridge-lishmi` | Ready. Retro pending. | Adds a webhook bridge MCP server under `contrib/` so a Project thread can notify a chat bot. | Never run against its live services. The coordinator recommends closing it, because the bot now drives the coding host directly. |
| #113 | `feat/codex-parity-alzu8z` | Draft. Behind. Retro pending. | Says that Codex skips the mode until its hooks are trusted. Touches the README, the Codex host note, and `tests/e2e/plugin-discovery.ts`. | In progress under a child thread. |
| #110 | `feat/cursor-typed-mode` | Draft. Stacked on #109. Retro passed, with lessons in #111. | Has the agent record a typed mode command itself, because Cursor's CLI skips the plugin's `beforeSubmitPrompt` hook. | Blocked on a fresh live Cursor run. Its description has the last run. |
| #109 | `feat/cursor-parity-i8e7q6` | Draft. Behind. Retro passed, with lessons in #111. | Adds a live Cursor CLI harness with eight checks. | Lands before #110. |
| #108 | `claude/project-thread-4yoeuq` | Ready. Behind. Retro pending. | Adds an `explore` model role for read-only fan-out, across nine skill files. | No eval has run. In progress under a child thread. |
| #87 | `plain-domain-names` | Draft since 2026-10-04. Behind. Retro pending. | Tells `domain-modeling` to prefer the plainest unambiguous word. Three changed lines in two files. | Untouched since it opened. The coordinator recommends reviving it, because it is small and still applies. |
| #38 | `feat/merge-gate-ci` | Draft since 2026-10-04. Conflicts with main. Retro pending. | Adds a merge-gate reference for auto-merge on green. | Untouched since 2026-10-04. The coordinator recommends closing it and specifying it again if still wanted, because it changes the merge policy across three playbooks and the mode skill. |
| #37 | `feat/principle-config-over-code` | Draft since 2026-10-04. Behind. Retro pending. | Adds a config-over-code principle skill. | Untouched since 2026-10-04, with no eval. The operator decides. |

#114 and #115 each add a contrib test step to `.github/workflows/checks.yml`. The two branches merge cleanly, so keeping both needs a check that the steps do not repeat. The descriptions of #38 and #37 still mention a version bump that neither diff carries.

## Blockers

- #110 needs a fresh live run in a signed-in Cursor CLI, which needs the operator's authorization.
- #114, #115, #87, #38, and #37 each wait on the operator's call to close, keep, or revive.

## Other state

- Seventeen worktrees from earlier sessions are not yet triaged. `git worktree list` shows them beside the main checkout and the coordinator's own `coord-*` worktrees.
- Graphite (`gt`) is not installed, so the Orchestrate playbook's stack-frontier helper is unavailable.

## Recently merged

Newest first: #100, #112, #111, #107, #106, #104. Read a title with `gh pr view <number>`.

## Next steps

1. The operator rules on #114, #115, #87, #38, and #37.
2. The child threads on #113 and #108 merge main into their branches and finish.
3. The operator authorizes the live Cursor run that #110 waits on.
4. A child triages the leftover worktrees with `skills/cstack-mode/playbooks/worktree-cleanup.md`.
