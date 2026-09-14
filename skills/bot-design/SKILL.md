---
name: bot-design
description: Design a persistent Codex bot. Missing Bot Factory, design a child bot, or invoked away from the factory task.
---

# Design a bot

Read `references/operating-contract.md` before any write. Grill with `$cstack:grilling`. For a coding bot, also apply `$cstack:poteto-mode`. Read model choices from C-Stack `policy/models.md`.

## Find Bot Factory

1. Read `~/.agents/bots/bot-factory/IDENTITY.json` if it exists. Done when you know whether the factory exists.
2. If it exists, verify the bound Codex task with native task tools. Done when the binding is live or marked unverified.
3. If this conversation is not that live factory task, send the user request there and tell the user to continue in Bot Factory. Done when the factory task has the message and this turn stops.

## Create Bot Factory

Use this branch only when the factory is missing. Grill factory purpose and the two daily checks. Recommended purpose: own the roster, create child bots, and run the checks.

After the user authorizes:

1. Create `~/.agents/bots/bot-factory/` with the five records. Done when those files exist and do not overwrite another identity.
2. Create a Codex task titled `Bot Factory` and bind the real task id. Done when native task state matches `IDENTITY.json`.
3. Attach two heartbeats on that task for 08:00 America/New_York every day, one for `bot-healthcheck` and one for `bot-transcript-check`. Done when both automations exist on the factory task.
4. Tell the user to continue in Bot Factory. Done when this turn names that task. Create a child bot in this turn only if the user already aligned one.

## Design a child bot

Stay on the live Bot Factory task. Grill until these are settled: one job, one voice, anti-jobs, coding or not, name, bot id, and initial queue. Coding bots get the Poteto bar. Other bots still get one job, one voice, and anti-jobs. The bot id is lowercase hyphen-case and unused. Done grilling when the user authorizes that exact proposal.

After authorization:

1. Create `~/.agents/bots/<bot-id>/` with the five records. Done when the files match the proposal and do not overwrite another identity.
2. Create a Codex task with the agreed name and bind the verified task id. Done when native task state matches `IDENTITY.json`, or the binding is left unverified.
3. Send that task its soul, queue, and C-Stack defaults, then tell the user where to continue. Done when the child task has that message.

Report the verified binding. File creation is not operational proof.
