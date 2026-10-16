---
name: cursor-thin-delegator
description: Run a Cursor Project as a thin coordinator that hands real work to the Claude Code and Codex CLIs. Use when a Cursor Project's included model should only plan and delegate.
---

The Cursor Project's included coordinator model is cheap and fast, so it acts as a **dispatcher**: it splits the work into slices, writes each slice's brief, runs the CLIs, reads their results, and decides what happens next. It writes no code itself. Every slice of real work runs in the official Claude Code CLI (`claude`) or Codex CLI (`codex`), each signed in directly with the person's own subscription.

## Guardrail

Sign each CLI in through its own login (`claude auth login`, or a `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`; `codex login`). Route no subscription through a proxy or relay that re-exposes it as an API, such as CLIProxyAPI. That breaks the subscription terms and risks a ban on the account. When a CLI is signed out, stop and ask the person to sign it in.

## Routing

Check every flag against the installed CLI's `--help` before first use. Flags change between releases.

| Step | Command | Why |
|---|---|---|
| Plan and implement | `claude -p "<brief>" --model sonnet --advisor opus --effort high` | Sonnet does the work, Opus advises on hard calls. |
| Review | `codex exec -m gpt-6.1-sol -c model_reasoning_effort=medium -s read-only "<review brief>"` | A model from a different company checks the work. |
| Cheap steps (summaries, lookups, formatting) | `claude -p "<brief>" --model haiku` or `codex exec -m gpt-6-luna "<brief>"` | Spend the large models only where judgement matters. |

`--advisor` is accepted by `claude -p` but is not listed in `claude --help`. If it errors, set the `advisorModel` setting instead, or drop the advisor and say so in the slice report.

Put the prompt directly after `-p`. Options that take a list, such as `--allowedTools`, swallow any argument after them. Redirect stdin from `/dev/null` so a print run never waits on input. Write each run's output to a file (`codex exec -o <file>` keeps the final message) and read the file.

## Shared pool

All CLIs draw on the same subscriptions, so the person's own sessions compete with yours.

- Run at most the person's concurrency cap of CLI jobs at once. With no cap given, run two.
- Set the retry watchdog on every `claude` run so a rate limit waits instead of failing the slice: `CLAUDE_CODE_RETRY_WATCHDOG=1`, `CLAUDE_CODE_RETRY_WATCHDOG_MAX_WAIT_MS`, and `CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS`.
- When a job hits a usage limit after the watchdog's wait, park that slice and report it.

## Slice loop

1. **Plan.** Run the plan step. Done when each slice has a goal, the files it may touch, and a check that proves it.
2. **Implement.** Run one implement job per slice, each in its own branch or worktree.
3. **Review.** Run the review step on the slice's diff. Done when the reviewer returns pass, or after three rounds. After round three, review only the diff added since the last review.
4. **Fix.** Send review findings back to the implement step for that slice only. When one slice fails, reopen only that slice and leave the others as they are.
5. **Merge decision.** Decide by how hard the change is to undo, never by how confident a model sounds. A change reverted with one revert, touching no data, secrets, or shared settings, may merge once its checks pass if the person allows it. A change that deletes, migrates, publishes, or touches files outside the repo waits for the person's yes.

## Where the CLIs run

The Cursor coordinator reaches the CLIs through its terminal tool, so the CLIs must exist on whatever machine runs that tool.

- **Self-hosted worker (My Machines).** `agent worker start` on the person's machine connects it to Cursor over outbound HTTPS. Cursor keeps the agent loop and inference, and the worker runs terminal commands and file edits. Install `claude` and `codex` on the worker and sign each in as the user the worker runs under. This is the supported path for subscription CLIs.
- **Cursor-managed cloud environment.** Unverified: whether a subscription login can persist there. Each run starts fresh, so a login would need a stored token secret, which puts a subscription credential in Cursor's environment. Prefer a self-hosted worker.
- **Team Pools** need an Enterprise plan and a service account key, and route one agent per machine.

Before the first slice, run `claude -p "reply ok" --model haiku < /dev/null` and `codex exec "reply ok" < /dev/null` on the worker. Done when both print ok.
