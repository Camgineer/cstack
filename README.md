# C-Stack

Personal local leads for Codex. This plugin packages original PStack, Cursor Team Kit, and Matt Pocock skills, then adds BotKit for persistent purpose-specific bots.

## Sources

- [PStack](https://github.com/cursor/plugins/tree/main/pstack)
- [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit)
- [Matt Pocock skills](https://github.com/mattpocock/skills)

Vendor trees stay intact under `vendor/`. Live Codex skills are copied into `skills/`.

PStack and Matt both ship `tdd` and `teach`. PStack keeps those names. Matt's copies are `matt-tdd` and `matt-teach`. Matt's unfinished skills stay out of the live surface, except `retro`.

## Install

```sh
codex plugin marketplace add /Users/cameron/repos/cstack
codex plugin add cstack@cstack-local
```

Start a fresh task after install. Invoke `$cstack:setup-bot` with a purpose. Bot records live under `~/.agents/bots/<bot-id>/`.
