# C-Stack

Personal local leads for Codex. This plugin packages original PStack, Cursor Team Kit, and Matt Pocock skills, then adds BotKit for persistent purpose-specific bots.

Nothing in this repository installs itself, creates a bot, or schedules work. Live Desktop qualification remains pending until you run it.

## Sources

- PStack 0.15.2 at `5bf2b1544db739998121a306340631963c2ff3de`
- Cursor Team Kit 1.2.0 at the same commit
- Matt Pocock skills 1.2.3 at `3cca18b368ae95cdbdebbff572ccafa662551015`

Vendor trees stay intact under `vendor/`. Live Codex skills are copied into `skills/`.

Matt `tdd` and `teach` keep the names `matt-tdd` and `matt-teach` because PStack already ships skills with those names. All other original skill names are preserved.

## Manual local install

Review source and hook permissions first. Run these yourself when ready:

```sh
codex plugin marketplace add /Users/cameron/repos/cstack
codex plugin add cstack@cstack-local
```

Start a fresh task and confirm the C-Stack hook receipt. Invoke `$cstack:setup-bot` with a purpose and ask for guided setup. Review the proposed bot identity before allowing record creation. Bot records live under `~/.agents/bots/<bot-id>/`.

A GitHub push does not prove an installed plugin or existing bot updated.
