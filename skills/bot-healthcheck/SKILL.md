---
name: bot-healthcheck
description: Daily Bot Factory roster check.
disable-model-invocation: true
---

# Bot healthcheck

Run on the live Bot Factory task.

1. List every `~/.agents/bots/*/IDENTITY.json`. Done when the roster of bot ids is complete.
2. Verify each binding against native task state. Done when every bot is live, stale, missing, or unverified.
3. Read each `WORK.md` that exists. Done when stalled Working items, unanswered Needs you items, and missing checkpoints are listed.
4. Reply with that roster and the next factory action. Done when the reply names every bot and proposes at most one next action. Do not create bots or edit souls.
