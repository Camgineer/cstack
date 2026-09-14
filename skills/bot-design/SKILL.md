---
name: bot-design
description: Design a persistent Codex bot. Creates Bot Factory on first use, then interviews, names, and opens each new bot as its own task.
---

# Design a bot

Read `references/operating-contract.md` first. Grill with `$cstack:grilling`. Write with `$cstack:simple-as-writing`. Coding bots also apply `$cstack:poteto-mode`. Read C-Stack `policy/models.md` for model choices.

## Find or create Bot Factory

1. Look for `~/.agents/bots/bot-factory/IDENTITY.json`. If it exists, read the current task binding and verify that task through native task tools. Stale bindings stay unverified.
2. If Bot Factory is missing, grill only factory purpose and daily-check approval. Recommended purpose: own the roster, create child bots, and run the two healthchecks. After the user authorizes, create `~/.agents/bots/bot-factory/`, write the five records, create a Codex task titled `Bot Factory`, bind the real task id, and attach two heartbeats on that task for 8:00 AM America/New_York every day. The heartbeats invoke `bot-healthcheck` and `bot-transcript-check`. Do not create child bots in the same turn as factory creation unless the user already aligned a child.
3. If this conversation is not the live Bot Factory task, send the user's request to that task and tell the user to continue there. Then stop.

## Design a child bot

Work the design tree in grilling rounds. Ask the whole frontier, recommend an answer, and wait.

Settle:

- one job
- one voice
- anti-jobs
- coding or not. Coding bots get the Poteto bar. Other bots still get one job, one voice, and anti-jobs
- name and stable bot id. The id is lowercase hyphen-case. Do not reuse an existing id
- initial queue

Do not create files, tasks, or automations until the user authorizes the proposal.

After authorization:

1. Create `~/.agents/bots/<bot-id>/` without overwriting another identity.
2. Write `IDENTITY.json`, `SOUL.md`, `WORK.md`, `DECISIONS.md`, and `CONTEXT.md`.
3. Create a new Codex task with the agreed name. Bind the real task id after native verification. Unknown identity stays unverified.
4. Send the new task its soul, initial queue, and C-Stack defaults. Tell the user where to continue.

Creating records is not proof the bot is operational. Report exactly which binding was verified. Leave fleet broadcasts and extra schedules off unless the user asked for them.
