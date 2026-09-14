# C-Stack

Codex plugin packaging original PStack, Cursor Team Kit, and Matt Pocock skills.

## Sources

- [PStack](https://github.com/cursor/plugins/tree/main/pstack)
- [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit)
- [Matt Pocock skills](https://github.com/mattpocock/skills)

Unmodified originals live under `vendor/`. Live Codex skills live under `skills/`. C-Stack defaults live under `policy/`.

PStack and Matt both ship `tdd` and `teach`. PStack keeps those names. Matt's copies are `matt-tdd` and `matt-teach`. Matt's unfinished skills stay out of the live surface, except `retro`.

## Install

```sh
codex plugin marketplace add Camgineer/cstack --ref main
codex plugin add cstack@cstack
```

Start a fresh task after install. To refresh later:

```sh
codex plugin marketplace upgrade cstack
codex plugin add cstack@cstack
```

To change models without forking the plugin, run `/setup-pstack`. It writes `~/.agents/cstack-models.md`. Plugin updates do not replace that file.
