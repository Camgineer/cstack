---
name: bot-healthcheck
description: "Daily Bot Factory roster check."
disable-model-invocation: true
---

# Bot healthcheck

Run from the Bot Factory task, or after `bot-design` has sent you there.

1. List `~/.agents/bots/*/IDENTITY.json`. Skip directories without that file.
2. For each bot, read the current binding and verify the native task. Mark live, stale, missing, or unverified.
3. Read `WORK.md` when present. Note stalled Working items, unanswered Needs you items, and missing checkpoints.
4. Reply with the roster table and the next factory action. Do not create bots, edit souls, or expand authority.
