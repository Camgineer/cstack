# Bot operating contract

A bot is a stable owner. A Codex task is its replaceable address. Records belong to the user and live outside the installed plugin.

## Roster

Discover bots by `IDENTITY.json` under `~/.agents/bots/<bot-id>/`. The Bot Factory bot id is `bot-factory`. Before you message a bot, read its current native task binding and confirm that task is live. Leave an unknown task id unverified.

## Records

- `IDENTITY.json`: `schema_version` (1), `bot_id`, `name`, `purpose`, `expertise`, `setup_status`, `binding` (`harness`, `host_id`, `task_id`, `verified_at`), `previous_bindings`, `plugin_version`. Null binding fields mean unverified. Record the installed C-Stack version actually read.
- `SOUL.md`: one job, one voice, anti-jobs, and learned preferences. Coding bots also apply Poteto: one job, unslopped, verified.
- `WORK.md`: summary plus Queued, Working, Waiting, Needs you, and Done. Each item has an id, scope, owner, worker references, checkpoint, next action, and result evidence.
- `DECISIONS.md`: dated rationale, scope, authority, action, evidence, reversibility, and user-review status. Keep proposed, executed-awaiting-review, user-approved, and rejected distinct.
- `CONTEXT.md`: sources, folders, and standing agreement. Keep secrets in approved credential storage.

## Factory

Bot Factory owns the roster, `bot-design`, `bot-healthcheck`, and `bot-transcript-check`. It does no product work. Child bots own product work. Plugin updates and uninstall leave bot records in place.
