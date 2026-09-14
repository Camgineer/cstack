---
name: bot-transcript-check
description: Daily Bot Factory work-record check.
disable-model-invocation: true
---

# Bot transcript check

Run on the live Bot Factory task.

1. Read each bot's `WORK.md` and `DECISIONS.md` when they exist. Done when those files have been opened or noted missing.
2. Collect executed-awaiting-review decisions, Done items without result evidence, and work outside the soul's one job or anti-jobs. Done when that list is complete.
3. Reply with which bots need the user, what to review, and whether the factory should message them. Done when each flagged bot has a review item. Leave child-bot files unchanged unless the user asked.
