# Status

Current state of in-flight work. Checked against GitHub on 2026-10-09. This file is a snapshot, so run `gh pr view <number>` before you act on a row.

Keep this file an index. Give each open pull request one row, and put review evidence, logs, and run narrative in the pull request.

## Open pull requests

"Behind" means main moved past the branch, and "Retro" is the status described in [CONTEXT.md](CONTEXT.md). A recommendation is the coordinator's, and the operator decides each one.

| PR | Branch | State | What it does | Open item |
| --- | --- | --- | --- | --- |
| #115 | `feat/claude-projects-cli-br38hs` | Draft. Retro pending. | Adds a Playwright CLI under `contrib/` that reads and posts claude.ai Projects. | Its claude.ai selectors were never checked against the live site. Recommendation: close, because the work no longer runs in Claude Code Projects. |
| #114 | `feat/grokbot-bridge-lishmi` | Ready. Retro pending. | Adds a webhook bridge MCP server under `contrib/` so a Project thread can notify a chat bot. | The live webhook, the Cloudflare deploy, and the connector never ran. Recommendation: close, because the bot now drives the coding host directly. |
| #113 | `feat/codex-parity-alzu8z` | Draft. Behind. Retro pending. | Says that Codex skips the mode until its hooks are trusted. Touches the README, the Codex host note, and `tests/e2e/plugin-discovery.ts`. | In progress under a child thread. |
| #110 | `feat/cursor-typed-mode` | Draft. Stacked on #109. Retro passed. | Has the agent record a typed mode command itself, because Cursor's CLI skips the plugin's `beforeSubmitPrompt` hook. | The last live run passed 6 of 8 checks. The typed "on" path failed, and its cause is unproven. Blocked on a fresh live run. |
| #109 | `feat/cursor-parity-i8e7q6` | Draft. Behind. Retro passed, with lessons in #111. | Adds a live Cursor CLI harness with eight checks. | Lands before #110. |
| #108 | `claude/project-thread-4yoeuq` | Ready. Behind. Retro pending. | Adds an `explore` model role for read-only fan-out, across nine skill files. | No eval has run. In progress under a child thread. |
| #87 | `plain-domain-names` | Draft since 2026-10-04. Behind. Retro pending. | Tells `domain-modeling` to prefer the plainest unambiguous word. Three changed lines in two files. | Stale. Recommendation: revive, because it is small and still applies. |
| #38 | `feat/merge-gate-ci` | Draft since 2026-10-04. Conflicts with main. Retro pending. | Adds a merge-gate reference for auto-merge on green. | Stale. Recommendation: close and specify it again if still wanted, because it changes the merge policy across three playbooks and the mode skill. |
| #37 | `feat/principle-config-over-code` | Draft since 2026-10-04. Behind. Retro pending. | Adds a config-over-code principle skill. | Stale, with no eval. Its description says it bumped the version, which the current rule forbids. The operator decides. |

#114 and #115 each add a contrib test step to `.github/workflows/checks.yml`, so they conflict if both are kept.

## Blockers

- #110 needs a fresh live run in a signed-in Cursor CLI, which needs the operator's authorization.
- #114, #115, #87, #38, and #37 each wait on the operator's call to close, keep, or revive.

## Other state

- Seventeen worktrees from earlier sessions remain registered and are not yet triaged. Counted with `git worktree list` on 2026-10-09, leaving out the main checkout and the worktree that wrote this file.
- Graphite (`gt`) is not installed, so the Orchestrate playbook's stack-frontier helper is unavailable.

## Recently merged

Newest first: #100, #112, #111, #107, #106, #105. Read a title with `gh pr view <number>`.

## Next steps

1. The operator rules on #114, #115, #87, #38, and #37.
2. The child threads on #113 and #108 merge main into their branches and finish.
3. The operator authorizes the live Cursor run that #110 waits on.
4. A child triages the leftover worktrees with `skills/cstack-mode/playbooks/worktree-cleanup.md`.
