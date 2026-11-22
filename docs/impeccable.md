# Impeccable in cstack

cstack vendors [pbakaus/impeccable](https://github.com/pbakaus/impeccable), a frontend design skill, and installs it with the cstack skills.

## What is vendored

`vendor/impeccable/` holds the upstream Apache-2.0 `LICENSE`, the third-party notices in `NOTICE.md`, and `UPSTREAM.json`, which records the upstream commit and versions. It also holds six provider builds under `providers/`, one each for `agents`, `claude`, `antigravity`, `cursor`, `gemini`, and `opencode`. The `claude` and `cursor` builds each add five agent files, `agents/impeccable-*.md`.

The installer gives each target its own build. The `codex` target uses the `agents` build. The default targets are `agents`, `claude`, `codex`, and `antigravity`. The `cursor`, `gemini`, and `opencode` targets are opt-in through `--targets`.

For the `claude` and `cursor` targets, the installer copies the agent files as regular files into `~/.claude/agents/` (or `$CLAUDE_CONFIG_DIR/agents/`) and `~/.cursor/agents/`, so Windows needs no symlink privilege. It never overwrites an agent file it did not install, or one you edited after install, unless you pass `--force`.

## First rollout

On a machine that already runs cstack, run this once:

```sh
git pull --ff-only && node scripts/install.mjs --update
```

## Invocation

Claude Code, Antigravity, and Cursor run the skill as `/impeccable`. Codex runs it as `$impeccable`. OpenCode loads the skill through its native skill loading, and cstack installs no slash command for it. Gemini CLI lists it under `/skills list`. When both `~/.agents/skills` and `~/.gemini/skills` hold the skill, Gemini CLI uses the copy in `~/.agents/skills`.

## Engine prewarm

The skill's launcher downloads a native engine binary on first use. A sandbox without network access cannot do that, so run the probe once from a normal terminal first.

On macOS and Linux:

```sh
"${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/impeccable/scripts/impeccable" engine-probe
```

On Windows:

```bat
"%USERPROFILE%\.claude\skills\impeccable\scripts\impeccable.cmd" engine-probe
```

The probe prints `impeccable-engine` and the engine version once the engine is ready. When `IMPECCABLE_BIN` names an existing binary, the launcher runs that binary directly. The launcher checks every downloaded or cached binary against the SHA-256 sums in `scripts/engine-checksums.txt`. `node scripts/install.mjs --uninstall` leaves the `~/.impeccable/` cache in place.
