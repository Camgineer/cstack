# CStack

[PStack](https://github.com/cursor/plugins/tree/main/pstack) engineering workflows for Codex CLI and Desktop. Created by [poteto](https://github.com/poteto) (Lauren Tan), adapted for Codex by Camgineer.

**The Codex port is in review. Install after [PR 1](https://github.com/Camgineer/cstack/pull/1) is merged and its remaining Desktop UI check passes.** CLI and the bundled Desktop runtime passed discovery, native delegation, activation, opt-out, resume, and manual compaction checks. Automatic compaction and the Desktop UI are not yet verified.

Browse the [skills](./skills/) and [playbooks](./skills/poteto-mode/playbooks/). The port uses native Codex agents and optional project profiles. Its two optional hooks restore confirmed session mode; they require normal project and hook trust. Python 3 is required for those helpers. Bun is required only for the bundled TypeScript helpers. The inherited Benny automation sources are dormant and are not a supported Codex integration.

## Development

Run `python3 -m unittest discover -s tests` for runtime checks and `python3 tests/discovery.py --codex /path/to/codex` for plugin lifecycle checks in a temporary, credential-free home. Audit the original import with `python3 scripts/audit_baseline.py`.

README is the only human guide. Other Markdown files contain agent instructions or examples consumed by workflows. Keep license notices and machine-readable provenance.

## Update PStack

Choose a full commit SHA from [cursor/plugins](https://github.com/cursor/plugins/commits/main/pstack). Preview it with `python3 scripts/update_pstack.py diff <sha>`. From a clean checkout, run `python3 scripts/update_pstack.py prepare <sha>` to create a review branch and stage the upstream changes. Both commands fetch from the pinned repository; `--source /path/to/cursor-plugins` uses a verified, complete local clone.

The update uses Git's three-way apply to preserve Codex edits. Removed files and excluded human docs stay out; the command lists every skipped change. If a conflict stops the apply, the pin stays unchanged. Resolve the patch on that branch, compare the full diff, and set the commit and tree in `upstream/pstack.json` to the reported target only after accounting for every included change. Check new upstream files for human docs, host-specific instructions, and license changes.

Review the staged diff, run the runtime and discovery checks, then commit and open a draft PR. You merge it. The updater does not commit, push, merge, install, schedule work, or run upstream code. Clean application proves textual compatibility only; workflow changes still need review. The initial source inventory remains unchanged.

## Credit

The initial commit is an exact copy of [PStack 0.15.5 at fae2c6e](https://github.com/cursor/plugins/tree/fae2c6ed95821bd85f614a73e4842e13229fa5e5/pstack). Codex adaptations are reviewed separately. The original [MIT license](./LICENSE), including **Copyright (c) 2026 Lauren Tan**, is unchanged.
