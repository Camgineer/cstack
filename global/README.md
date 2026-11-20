# Global instruction files

`AGENTS.md` in this folder is the one source for the owner's global agent instructions. Every machine gets the same text. No install step exists yet, and nothing reads this folder until one does.

## Where the text goes

| Harness | Installed file |
| --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |

Both installed files hold the same bytes. Neither is written by hand, so the two cannot drift apart.

Cursor, Gemini, Grok and OpenCode read their global instructions from other places. This folder does not cover them yet.

## Machine facts stay local

Facts about the owner's machines and accounts do not belong in this repository. Each machine keeps them in `~/.config/cstack/local.md`, which is never committed. The install step appends that file, when it exists, under the text from `AGENTS.md`. A harness loads an installed instruction file in full at session start, so a rule in the local file is always in context.

## Install contract

The install step must do the following:

1. Write `AGENTS.md`, plus the local file when it exists, to each path in the table above.
2. Back up a file it did not write before it replaces that file.
3. Report a file whose content differs from what it would write.

After an install, start a fresh session in each harness on each machine and ask it to quote its instructions on how to talk to the owner. The install is proven on that machine when the session quotes the "How to talk to me" section.
