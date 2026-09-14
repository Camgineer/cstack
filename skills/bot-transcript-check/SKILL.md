---
name: bot-transcript-check
description: "Daily Bot Factory work-record check."
disable-model-invocation: true
---

# Bot transcript check

Run from the Bot Factory task, or after `bot-design` has sent you there.

1. Read each bot's `WORK.md` and `DECISIONS.md` when present.
2. Look for executed-awaiting-review decisions, empty result evidence on Done items, and work that drifted outside the soul's one job or anti-jobs.
3. Reply with bots that need the user, what to review, and whether the factory should message that bot. Do not change child-bot files unless the user asked.
