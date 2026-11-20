# Global instruction files

`AGENTS.md` in this folder is the one source for the owner's global agent instructions. Every machine gets the same bytes. This folder installs nothing by itself.

## Where the text goes

An install step manages two files on each machine. These are the default paths.

| Harness | Installed file |
| --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |

Claude Code uses `CLAUDE_CONFIG_DIR` in place of `~/.claude` when that variable is set. Codex uses `CODEX_HOME` in place of `~/.codex` in the same way, and it prefers a non-empty `AGENTS.override.md` in the same folder. Claude Code skips the user file when its `managed-only` setting is on.

## Machine facts stay local

Facts about the owner's machines and accounts do not belong in this repository. Each machine keeps them in `~/.config/cstack/local.md`, which is never committed and never installed from here. `AGENTS.md` tells the agent to read that file when it exists. The installed bytes therefore stay the same on every machine.

## Install contract

The owner approves the text at one commit. The install step takes that commit as its input and installs the bytes of `AGENTS.md` at that commit on every machine. A later revision needs a new approval.

The install step must do the following, in this order:

1. Install the cstack skills first. In each skills folder that the first line of `AGENTS.md` names, confirm that `cstack-mode/SKILL.md` and `poteto-mode/SKILL.md` both exist.
2. Read the source bytes of `AGENTS.md` at the approved commit. `.gitattributes` pins its line endings to LF.
3. Inspect each destination without following links. A destination can be missing, a regular file, a symlink, or a one-line `@` import that points into another checkout.
4. When a destination is missing, create it as a regular file.
5. When a destination is a regular file that already holds the source bytes, change nothing.
6. In every other case, report the difference before any write. Then save the old entry as it is on disk, and save the text it resolved to. A symlink is replaced even when its target holds the source bytes.
7. Replace the destination entry itself with a regular file. Never write through a symlink.
8. Compare the digest of every installed file with the digest of the source at the approved commit.

## Proof of an install

On each machine, start a fresh session in each harness from a folder outside this repository. Check which instruction files the session loaded, and ask it to quote its rules on how to talk to the owner. The install is proven on that machine when the digests match and the session loaded the installed file.
