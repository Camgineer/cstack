# CStack

[PStack](https://github.com/cursor/plugins/tree/main/pstack) engineering workflows for Codex CLI and Desktop. Created by [poteto](https://github.com/poteto) (Lauren Tan), adapted for Codex by Camgineer.

**The Codex port is in review. Install after [PR 1](https://github.com/Camgineer/cstack/pull/1) is merged and its remaining Desktop UI check passes.** CLI and the bundled Desktop runtime passed discovery, native delegation, activation, opt-out, resume, and manual compaction checks. Automatic compaction and the Desktop UI are not yet verified.

Browse the [skills](./skills/) and [playbooks](./skills/poteto-mode/playbooks/). The port uses native Codex agents and optional project profiles. Its two optional hooks restore confirmed session mode; they require normal project and hook trust. Python 3 is required for those helpers. Bun is required only for the bundled TypeScript helpers. The inherited Benny automation sources are dormant and are not a supported Codex integration.

## Development

Run `python3 -m unittest discover -s tests` for runtime checks and `python3 tests/discovery.py --codex /path/to/codex` for plugin lifecycle checks in a temporary, credential-free home. Audit the original import with `python3 scripts/audit_baseline.py`.

README is the only human guide. Other Markdown files contain agent instructions or examples consumed by workflows. Keep license notices and machine-readable provenance.

## Credit

The initial commit is an exact copy of [PStack 0.15.5 at fae2c6e](https://github.com/cursor/plugins/tree/fae2c6ed95821bd85f614a73e4842e13229fa5e5/pstack). Codex adaptations are reviewed separately. The original [MIT license](./LICENSE), including **Copyright (c) 2026 Lauren Tan**, is unchanged.
